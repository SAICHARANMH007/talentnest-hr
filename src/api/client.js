import { API_BASE_URL } from './config.js';

// ── Access token — persisted to sessionStorage so page refresh doesn't log out ─
// sessionStorage survives page refresh within the same tab but is cleared on
// tab close. This matches expected UX: refresh keeps you logged in, closing
// the browser/tab starts a fresh session.
const TOKEN_KEY = 'tn_token';

function jwtExp(token) {
  // Decode JWT payload (no signature check — just to read the exp claim)
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64)).exp || 0;
  } catch { return 0; }
}
export function tokenIsValid(token) {
  if (!token) return false;
  return jwtExp(token) > Date.now() / 1000 + 30; // 30s buffer
}

let _accessToken = null;
let _401firing = false; // declared before clearToken to avoid TDZ when bundled with adm-misc
export const setToken  = (t) => {
  _accessToken = t;
  clearCache(); // prevent stale data between users/impersonation
  if (t) {
    sessionStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(TOKEN_KEY, t); // Backup for cross-tab and browser-reopen sessions
    localStorage.setItem('tn_logged_in', 'true');
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('tn_logged_in');
  }
};
export const clearToken = () => {
  _accessToken = null;
  _401firing   = false;
  clearCache();
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem('tn_user');
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('tn_user');
  localStorage.removeItem('tn_logged_in');
};
export const getToken  = () => _accessToken;

// Global 401 handler — modules can subscribe to force-logout
// _401firing prevents multiple parallel failed requests from each triggering logout
let _on401     = null;
export function set401Handler(fn) { _on401 = fn; }

// In-flight deduplication: parallel GET calls to the same URL share one fetch
const _inflight = new Map();

// ── Response cache (TTL-based) ────────────────────────────────────────────────
// GET responses are cached for TTL_MS so navigating away and back is instant.
// Mutations (POST/PATCH/DELETE) on the same path invalidate the cache entry.
const _cache = new Map();
const TTL_MS = 10_000; // 10 seconds — balances freshness with API load

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) { _cache.delete(key); return null; }
  return entry.data;
}
function cacheSet(key, data) { _cache.set(key, { data, ts: Date.now() }); }
// Invalidate any cache entries whose path starts with prefix
function clearCacheByPrefix(prefix) {
  for (const k of _cache.keys()) { if (k.startsWith(prefix)) _cache.delete(k); }
}
export function clearCache() { _cache.clear(); }

// Token Refresh State (IAM Standard)
let _refreshing = null;
const _refreshPath = '/auth/refresh';

/**
 * initAuth — called once on app startup.
 * 1. If a valid JWT is in sessionStorage, restore immediately (no network call).
 * 2. Otherwise try the HTTP-only refresh cookie to get a new token.
 * 3. If network fails, signal networkError so caller uses cached user.
 * Returns { token, user } | { networkError: true } | null (force logout).
 */
export async function initAuth() {
  // Fast path: token still valid in sessionStorage or localStorage — restore immediately.
  const stored = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  // tn_user stored in both session and local so browser-reopen / new-tab restores session
  const storedUser = (() => {
    try { return JSON.parse(sessionStorage.getItem('tn_user') || localStorage.getItem('tn_user')); }
    catch { return null; }
  })();
  if (tokenIsValid(stored) && storedUser) {
    _accessToken = stored;
    return { token: stored, user: storedUser };
  }

  // Optimize: If we have no reason to believe the user is logged in (no hint in localStorage),
  // skip the silent refresh call to avoid a 401 error in the console for new visitors.
  if (!localStorage.getItem('tn_logged_in')) {
    return null;
  }

  // Slow path: token missing or expired — ask the server for a new one via cookie.
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s for cold starts
    const res = await fetch(`${API_BASE_URL}${_refreshPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'TalentNest' },
      credentials: 'include',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      // Refresh failed — but if we have a cached user, keep them logged in until
      // the next API call fails. Avoids flash-of-logout on slow Render cold starts.
      if (storedUser) {
        // Also restore the access token so the next API call sends an Authorization header.
        // Without this, the request goes out without a token → instant 401 → logout, even
        // though the backend is just cold-starting and the session is actually still valid.
        if (stored) _accessToken = stored;
        return { networkError: true };
      }
      return null;
    }
    const data = await res.json();
    if (data.token) {
      _accessToken = data.token;
      sessionStorage.setItem(TOKEN_KEY, data.token); // persist for next refresh
      return data;
    }
    return null;
  } catch {
    // Network error (timeout, offline, Render cold start) — keep any existing token
    // in memory so the next API call can at least try to authenticate.
    if (stored) _accessToken = stored;
    return { networkError: true };
  }
}

export async function req(method, path, body, auth = true) {
  if (method === 'GET') {
    // 1. Serve from cache if fresh
    const cached = cacheGet(path);
    if (cached !== null) return cached;
    // 2. Deduplicate concurrent in-flight requests to same URL
    if (_inflight.has(path)) return _inflight.get(path);
    const promise = _doReq(method, path, body, auth)
      .then(data => { cacheSet(path, data); return data; })
      .finally(() => _inflight.delete(path));
    _inflight.set(path, promise);
    return promise;
  }
  // Mutations — invalidate cache for the affected resource (and any sibling
  // GET routes under the same root, e.g. POST /nps/seed must also invalidate
  // the cached GET /nps/stats, not just GET /nps/seed which is never cached).
  const firstSegment = path.split('?')[0].split('/')[1];
  clearCacheByPrefix(`/${firstSegment}`);
  return _doReq(method, path, body, auth);
}

async function _doReq(method, path, body, auth = true, _retry = false) {
  const isFormData = body instanceof FormData;
  const headers = {
    'X-Requested-With': 'TalentNest',
  };
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (auth && _accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;

  // ── Global Request Timeout (30s) ──
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: auth ? 'include' : 'omit',
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('⏱️ Request timed out. Please check your connection.');
    const isProd = import.meta.env.PROD;
    const msg = isProd 
      ? `❌ Cannot reach server. The backend may be booting up — please refresh in 30 seconds.`
      : `❌ Backend Connection Refused (API_BASE_URL: ${API_BASE_URL})`;
    throw new Error(msg);
  } finally {
    clearTimeout(timeoutId);
  }

  // ── IAM Standard Background Token Refresh ──
  if (res.status === 401 && auth && !_retry) {
    try {
      if (!_refreshing) {
        _refreshing = fetch(`${API_BASE_URL}${_refreshPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'TalentNest' },
          credentials: 'include',
        }).then(r => r.json()).finally(() => { _refreshing = null; });
      }

      const refreshRes = await _refreshing;

      if (refreshRes?.token) {
        _accessToken = refreshRes.token;
        sessionStorage.setItem(TOKEN_KEY, refreshRes.token);
        localStorage.setItem(TOKEN_KEY, refreshRes.token);
        if (refreshRes.user) {
          const u = JSON.stringify(refreshRes.user);
          sessionStorage.setItem('tn_user', u);
          localStorage.setItem('tn_user', u);
        }
        return _doReq(method, path, body, auth, true);
      }
    } catch {
      _refreshing = null;
    }

    // Refresh failed — fire logout exactly once even if N parallel requests hit this path
    if (!_401firing) {
      _401firing   = true;
      _accessToken = null;
      if (_on401) _on401();
    }
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.message || `HTTP ${res.status}`);
    err.status = res.status;
    // Carry all extra fields from the response body (e.g. cooldownEndsAt, cooldownRemainingMs)
    Object.assign(err, data);
    throw err;
  }
  return data;
}

/** Download a binary file (Excel/CSV) from an authenticated endpoint, returns Blob */
export async function downloadBlob(path) {
  const headers = { 'X-Requested-With': 'TalentNest' };
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;
  const res = await fetch(`${API_BASE_URL}${path}`, { headers, credentials: 'include' });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  return res.blob();
}

/** Upload a FormData body (multipart) to an authenticated endpoint, returns parsed JSON */
export async function uploadFormData(method = 'POST', path, formData) {
  const headers = { 'X-Requested-With': 'TalentNest' };
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;
  const res = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: formData, credentials: 'include' });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(e.error || e.message || `Upload failed (${res.status})`);
  }
  return res.json();
}

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
function tokenIsValid(token) {
  if (!token) return false;
  return jwtExp(token) > Date.now() / 1000 + 30; // 30s buffer
}

let _accessToken = null;
export const setToken  = (t) => {
  _accessToken = t;
  if (t) sessionStorage.setItem(TOKEN_KEY, t);
  else sessionStorage.removeItem(TOKEN_KEY);
};
export const clearToken = () => { _accessToken = null; sessionStorage.removeItem(TOKEN_KEY); };
export const getToken  = () => _accessToken;

// Global 401 handler — modules can subscribe to force-logout
let _on401 = null;
export function set401Handler(fn) { _on401 = fn; }

// In-flight deduplication: parallel GET calls to the same URL share one fetch
const _inflight = new Map();

// ── Response cache (TTL-based) ────────────────────────────────────────────────
// GET responses are cached for TTL_MS so navigating away and back is instant.
// Mutations (POST/PATCH/DELETE) on the same path invalidate the cache entry.
const _cache = new Map();
const TTL_MS = 30_000; // 30 seconds — fresh enough for HR data

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) { _cache.delete(key); return null; }
  return entry.data;
}
function cacheSet(key, data) { _cache.set(key, { data, ts: Date.now() }); }
// Invalidate any cache entries whose path starts with prefix
function cacheInvalidate(prefix) {
  for (const k of _cache.keys()) { if (k.startsWith(prefix)) _cache.delete(k); }
}

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
  // Fast path: token still valid in sessionStorage — restore without hitting network.
  // This is the common case on page refresh (token is 15 min, refresh is instant).
  const stored = sessionStorage.getItem(TOKEN_KEY);
  const storedUser = (() => { try { return JSON.parse(sessionStorage.getItem('tn_user')); } catch { return null; } })();
  if (tokenIsValid(stored) && storedUser) {
    _accessToken = stored;
    return { token: stored, user: storedUser };
  }

  // Slow path: token missing or expired — ask the server for a new one via cookie.
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
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
      if (storedUser) return { networkError: true };
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
  // Mutations — invalidate cache for the affected resource path
  const base = path.split('?')[0].replace(/\/[a-f0-9]{24}(\/.*)?$/, '');
  cacheInvalidate(base);
  return _doReq(method, path, body, auth);
}

async function _doReq(method, path, body, auth = true, _retry = false) {
  const isFormData = body instanceof FormData;
  const headers = {
    'X-Requested-With': 'TalentNest', // CSRF guard header
  };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth && _accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include', // sends HTTP-only refresh cookie cross-origin (Vercel → Railway)
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  } catch (networkErr) {
    const isProd = import.meta.env.PROD;
    const msg = isProd 
      ? `❌ Cannot reach server at ${API_BASE_URL}. The backend may be booting up — please refresh in 30 seconds.`
      : `❌ Backend Connection Refused. Ensure the server is running on http://localhost:5000 (API_BASE_URL: ${API_BASE_URL})`;
    throw new Error(msg);
  }

  // ── IAM Standard Background Token Refresh ──────────────────────────────────
  if (res.status === 401 && auth && !_retry) {
    try {
      // Deduplicate parallel refresh calls
      if (!_refreshing) {
        _refreshing = fetch(`${API_BASE_URL}${_refreshPath}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'TalentNest',
          },
          credentials: 'include', // required for HTTP-only cookie to be sent
        }).then(r => r.json());
      }

      const refreshRes = await _refreshing;
      _refreshing = null;

      if (refreshRes.token) {
        _accessToken = refreshRes.token; // store in memory only
        if (refreshRes.user) sessionStorage.setItem('tn_user', JSON.stringify(refreshRes.user));
        // Retry original request with new token
        return _doReq(method, path, body, auth, true);
      }
    } catch (refreshErr) {
      _refreshing = null;
      console.error('Seamless refresh failed', refreshErr);
    }

    // Refresh failed → hard logout
    _accessToken = null;
    sessionStorage.removeItem('tn_user');
    if (_on401) _on401();
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
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

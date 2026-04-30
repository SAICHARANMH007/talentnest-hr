'use strict';
/**
 * Lightweight in-process response cache for read-heavy, rarely-changing routes.
 *
 * Usage:
 *   const { cacheRoute } = require('../middleware/cache');
 *   router.get('/stats', cacheRoute(30), asyncHandler(handler));  // 30-second TTL
 *
 * The cache is keyed on the full request URL (path + query string) so different
 * query params get different cache entries.  The cache is stored in Node process
 * memory — suitable for single-instance deployments on Render / Railway.
 */

const store = new Map(); // key → { body, headers, at }

/**
 * Returns an Express middleware that caches JSON responses for `ttlSeconds`.
 * Only caches GET requests that complete with HTTP 200.
 */
function cacheRoute(ttlSeconds = 60) {
  return function cacheMiddleware(req, res, next) {
    if (req.method !== 'GET') return next();

    // Critical fix: Key must be isolated by tenant and user role to prevent data leaks between organizations.
    const key = `${req.user?.tenantId || 'global'}:${req.user?.id || 'anon'}:${req.originalUrl || req.url}`;
    const cached = store.get(key);
    if (cached && Date.now() - cached.at < ttlSeconds * 1000) {
      res.set('X-Cache', 'HIT');
      res.set('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).send(cached.body);
    }

    // Intercept the response so we can cache it
    const origJson = res.json.bind(res);
    res.json = function (data) {
      if (res.statusCode === 200) {
        store.set(key, { body: JSON.stringify(data), at: Date.now() });
        // Evict if store grows too large (> 500 entries)
        if (store.size > 500) {
          const oldest = store.keys().next().value;
          store.delete(oldest);
        }
      }
      res.set('X-Cache', 'MISS');
      return origJson(data);
    };

    next();
  };
}

/** Manually invalidate cache entries matching a prefix. */
function invalidatePrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/** Clear the entire cache (useful after bulk mutations). */
function clearCache() {
  store.clear();
}

module.exports = { cacheRoute, invalidatePrefix, clearCache };

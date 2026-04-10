'use strict';
const AuditLog = require('../models/AuditLog');

/**
 * auditLogger — after-the-fact middleware that writes one AuditLog record
 * for every POST, PUT, PATCH, or DELETE request that completes successfully.
 *
 * Attaches a response listener so the record is only written after the
 * handler responds (avoids logging requests that crash before responding).
 *
 * Usage (global, in server.js):
 *   app.use(auditLogger);
 *
 * Or per-router:
 *   router.use(auditLogger);
 */
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const auditLogger = (req, res, next) => {
  if (!WRITE_METHODS.has(req.method)) return next();

  // Capture the original json/send so we can intercept after the handler runs
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    // Only log successful mutations (2xx responses)
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      // Derive a readable entity name from the URL path
      const segments = req.path.replace(/^\//, '').split('/').filter(Boolean);
      const entity   = segments[0] || 'unknown';
      const entityId = segments[1] && !segments[1].startsWith(':') ? segments[1] : undefined;

      // Fire-and-forget — do not block the response
      AuditLog.create({
        tenantId : req.user.tenantId || req.user.orgId || null,
        userId   : req.user._id || req.user.id || null,
        userName : req.user.name   || null,
        userRole : req.user.role   || null,
        action   : `${req.method} ${req.path}`,
        entity,
        entityId : entityId || null,
        details  : { body: sanitiseBody(req.body) },
        ip       : req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,
      }).catch(() => {
        // Silently swallow — audit failures must never break the main request
      });
    }

    return originalJson(body);
  };

  next();
};

// Strip sensitive fields before persisting to the audit log
function sanitiseBody(body) {
  if (!body || typeof body !== 'object') return body;
  const SENSITIVE = ['password', 'passwordHash', 'token', 'secret', 'otp', 'newPassword', 'currentPassword'];
  const clean = { ...body };
  SENSITIVE.forEach(k => { if (k in clean) clean[k] = '[REDACTED]'; });
  return clean;
}

module.exports = { auditLogger };

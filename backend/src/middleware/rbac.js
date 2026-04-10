'use strict';

/**
 * allowRoles(...roles) — RBAC middleware factory.
 * Returns 403 if req.user.role is not in the allowed list.
 *
 * Usage:
 *   router.get('/admin-only', authMiddleware, allowRoles('admin', 'super_admin'), handler)
 */
const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated.' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: `Access denied. Required role: ${roles.join(' or ')}.`,
    });
  }
  next();
};

module.exports = { allowRoles };

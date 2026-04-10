'use strict';
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = (() => {
  const s = process.env.JWT_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === 'production')
      throw new Error('FATAL: JWT_SECRET not set. Cannot start in production.');
    console.warn('⚠️  DEV: Using fallback JWT_SECRET. Set JWT_SECRET env var for production!');
    return 'talent_nest_dev_secret_key_2024_do_not_use_in_prod';
  }
  return s;
})();

const JWT_EXPIRES = process.env.JWT_EXPIRES || '15m';

// Sign a new access token — embeds userId, tenantId, and role
const signToken = (userId, tenantId, role) =>
  jwt.sign({ userId, tenantId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

/**
 * authMiddleware — verifies JWT and attaches userId, tenantId, role to req.user.
 * Named export only. Never default-exported.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      return res.status(401).json({ success: false, error: 'Authorization header missing or invalid' });

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.userId)
      .select('-passwordHash -resetPasswordToken -resetPasswordExpires')
      .lean();

    if (!user)       return res.status(401).json({ success: false, error: 'User no longer exists' });
    if (!user.isActive) return res.status(403).json({ success: false, error: 'Account is deactivated' });

    // Attach clean payload — tenantId from JWT (fast) falls back to user document
    req.user = {
      ...user,
      id      : user._id.toString(),
      userId  : user._id.toString(),
      tenantId: (decoded.tenantId || user.tenantId || user.orgId || '').toString(),
      role    : user.role,
    };
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Session expired — please log in again'
      : 'Invalid token';
    return res.status(401).json({ success: false, error: msg });
  }
};

// Backward-compatible alias used by existing routes
const authenticate = authMiddleware;

module.exports = { authMiddleware, authenticate, signToken, JWT_SECRET };

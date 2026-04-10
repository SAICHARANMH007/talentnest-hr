'use strict';
const express      = require('express');
const router       = express.Router();
const AuditLog     = require('../models/AuditLog');
const { authenticate } = require('../middleware/auth');
const { allowRoles }   = require('../middleware/rbac');
const asyncHandler     = require('../utils/asyncHandler');
const AppError         = require('../utils/AppError');

// POST /api/audit — save an audit event (auth required, any role)
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { action, resource, detail, level } = req.body;
  if (!action) throw new AppError('action is required.', 400);

  const log = await AuditLog.create({
    tenantId : req.user.tenantId || null,
    userId   : req.user.id || req.user._id,
    userName : req.user.name || '',
    userRole : req.user.role || '',
    action,
    entity   : resource || null,
    details  : { detail, level: level || 'info' },
    ip       : req.ip || req.headers['x-forwarded-for'] || '',
    userAgent: req.headers['user-agent'] || '',
  });

  res.status(201).json({ success: true, data: log });
}));

// GET /api/audit — retrieve last 200 logs (admin / super_admin only)
router.get('/', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;

  const logs = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  // Normalize to expected shape
  const data = logs.map(l => ({
    ...l,
    id      : l._id?.toString(),
    resource: l.entity || null,
    detail  : l.details?.detail || null,
    level   : l.details?.level  || 'info',
  }));

  res.json({ success: true, data });
}));

module.exports = router;

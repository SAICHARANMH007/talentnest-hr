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

// GET /api/audit — paginated audit logs (admin / super_admin)
router.get('/', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;
  if (req.query.action)   filter.action   = { $regex: req.query.action, $options: 'i' };
  if (req.query.userId)   filter.userId   = req.query.userId;
  if (req.query.level)    filter['details.level'] = req.query.level;

  const page  = Math.max(1, parseInt(req.query.page, 10)  || 1);
  const limit = Math.min(10000, Math.max(1, parseInt(req.query.limit, 10) || 200));
  const skip  = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  const data = logs.map(l => ({
    ...l,
    id      : l._id?.toString(),
    resource: l.entity  || null,
    detail  : l.details?.detail || null,
    level   : l.details?.level  || 'info',
  }));

  res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

module.exports = router;

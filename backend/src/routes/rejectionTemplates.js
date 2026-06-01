const express = require('express');
const router  = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard } = require('../middleware/tenantGuard');
const { allowRoles } = require('../middleware/rbac');
const RejectionTemplate = require('../models/RejectionTemplate');

const guard = [authMiddleware, tenantGuard];

// GET /api/rejection-templates — list all for tenant
router.get('/', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { stage } = req.query;
  const filter = { tenantId: req.user.tenantId, deletedAt: null };
  if (stage) filter.stage = stage;
  const templates = await RejectionTemplate.find(filter).sort({ isDefault: -1, createdAt: -1 }).lean();
  res.json({ success: true, data: templates });
}));

// POST /api/rejection-templates — create
router.post('/', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { name, stage, subject, body, isDefault } = req.body;
  if (!name || !subject || !body) throw new AppError('name, subject and body are required.', 400);
  if (isDefault) {
    await RejectionTemplate.updateMany({ tenantId: req.user.tenantId, deletedAt: null }, { $set: { isDefault: false } });
  }
  const tpl = await RejectionTemplate.create({ tenantId: req.user.tenantId, createdBy: req.user.id, name, stage: stage || '', subject, body, isDefault: !!isDefault });
  res.status(201).json({ success: true, data: tpl });
}));

// PATCH /api/rejection-templates/:id — update
router.patch('/:id', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const tpl = await RejectionTemplate.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
  if (!tpl) throw new AppError('Template not found.', 404);
  const { name, stage, subject, body, isDefault } = req.body;
  if (isDefault) {
    await RejectionTemplate.updateMany({ tenantId: req.user.tenantId, deletedAt: null, _id: { $ne: tpl._id } }, { $set: { isDefault: false } });
  }
  if (name    !== undefined) tpl.name    = name;
  if (stage   !== undefined) tpl.stage   = stage;
  if (subject !== undefined) tpl.subject = subject;
  if (body    !== undefined) tpl.body    = body;
  if (isDefault !== undefined) tpl.isDefault = isDefault;
  await tpl.save();
  res.json({ success: true, data: tpl });
}));

// DELETE /api/rejection-templates/:id — soft delete
router.delete('/:id', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const tpl = await RejectionTemplate.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
  if (!tpl) throw new AppError('Template not found.', 404);
  tpl.deletedAt = new Date();
  await tpl.save();
  res.json({ success: true });
}));

module.exports = router;

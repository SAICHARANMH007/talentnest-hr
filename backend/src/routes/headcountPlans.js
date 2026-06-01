const express = require('express');
const router  = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard } = require('../middleware/tenantGuard');
const { allowRoles } = require('../middleware/rbac');
const HeadcountPlan = require('../models/HeadcountPlan');

const guard = [authMiddleware, tenantGuard];

// GET /api/headcount-plans
router.get('/', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const plans = await HeadcountPlan.find({ tenantId: req.user.tenantId, deletedAt: null }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: plans });
}));

// POST /api/headcount-plans
router.post('/', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const { name, year, quarter, entries, status } = req.body;
  if (!name || !year) throw new AppError('name and year are required.', 400);
  const plan = await HeadcountPlan.create({ tenantId: req.user.tenantId, createdBy: req.user.id, name, year, quarter: quarter || 'Annual', entries: entries || [], status: status || 'draft' });
  res.status(201).json({ success: true, data: plan });
}));

// GET /api/headcount-plans/:id
router.get('/:id', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const plan = await HeadcountPlan.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }).lean();
  if (!plan) throw new AppError('Plan not found.', 404);
  res.json({ success: true, data: plan });
}));

// PATCH /api/headcount-plans/:id
router.patch('/:id', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const plan = await HeadcountPlan.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
  if (!plan) throw new AppError('Plan not found.', 404);
  const { name, year, quarter, entries, status } = req.body;
  if (name    !== undefined) plan.name    = name;
  if (year    !== undefined) plan.year    = year;
  if (quarter !== undefined) plan.quarter = quarter;
  if (entries !== undefined) plan.entries = entries;
  if (status  !== undefined) plan.status  = status;
  await plan.save();
  res.json({ success: true, data: plan });
}));

// DELETE /api/headcount-plans/:id
router.delete('/:id', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const plan = await HeadcountPlan.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
  if (!plan) throw new AppError('Plan not found.', 404);
  plan.deletedAt = new Date();
  await plan.save();
  res.json({ success: true });
}));

module.exports = router;

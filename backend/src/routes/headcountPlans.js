const express = require('express');
const router  = express.Router();
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard } = require('../middleware/tenantGuard');
const { allowRoles } = require('../middleware/rbac');
const HeadcountPlan = require('../models/HeadcountPlan');
const Job = require('../models/Job');
const Application = require('../models/Application');

const guard = [authMiddleware, tenantGuard];

// GET /api/headcount-plans — populate linked jobs + live hired counts
router.get('/', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const plans = await HeadcountPlan.find({ tenantId: req.user.tenantId, deletedAt: null })
    .sort({ createdAt: -1 })
    .populate('entries.jobId', 'title status _id')
    .lean();

  // For each entry with a linked job, get actual hired count
  const jobIds = plans.flatMap(p => p.entries.map(e => e.jobId?._id).filter(Boolean));
  let hiredMap = {};
  if (jobIds.length > 0) {
    const agg = await Application.aggregate([
      { $match: { jobId: { $in: jobIds }, currentStage: 'Hired', deletedAt: null } },
      { $group: { _id: '$jobId', count: { $sum: 1 } } },
    ]);
    agg.forEach(r => { hiredMap[r._id.toString()] = r.count; });
  }

  // Attach live hired count to each entry
  const enriched = plans.map(p => ({
    ...p,
    entries: p.entries.map(e => ({
      ...e,
      filled: e.jobId ? (hiredMap[e.jobId._id?.toString()] || 0) : (e.filled || 0),
    })),
  }));

  res.json({ success: true, data: enriched });
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

// PATCH /api/headcount-plans/:planId/entries/:entryId/link — link or unlink a job
router.patch('/:planId/entries/:entryId/link', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const plan = await HeadcountPlan.findOne({ _id: req.params.planId, tenantId: req.user.tenantId, deletedAt: null });
  if (!plan) throw new AppError('Plan not found.', 404);
  const entry = plan.entries.id(req.params.entryId);
  if (!entry) throw new AppError('Entry not found.', 404);
  entry.jobId = req.body.jobId || null;
  await plan.save();
  res.json({ success: true, data: plan });
}));

// POST /api/headcount-plans/:planId/entries/:entryId/create-job — create job from entry
router.post('/:planId/entries/:entryId/create-job', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const plan = await HeadcountPlan.findOne({ _id: req.params.planId, tenantId: req.user.tenantId, deletedAt: null });
  if (!plan) throw new AppError('Plan not found.', 404);
  const entry = plan.entries.id(req.params.entryId);
  if (!entry) throw new AppError('Entry not found.', 404);

  const job = await Job.create({
    tenantId   : req.user.tenantId,
    createdBy  : req.user.id,
    title      : entry.role,
    department : entry.department,
    description: `Hiring for ${entry.role} in ${entry.department}. Target: ${entry.targetCount} hires by ${entry.targetDate ? new Date(entry.targetDate).toLocaleDateString('en-IN') : 'TBD'}.`,
    numberOfOpenings: Math.max(1, entry.targetCount - (entry.currentCount || 0)),
    targetHireDate: entry.targetDate || null,
    status     : 'active',
    source     : 'headcount_plan',
  });

  entry.jobId = job._id;
  await plan.save();

  res.status(201).json({ success: true, data: { job, plan } });
}));

module.exports = router;

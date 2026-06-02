'use strict';
const express      = require('express');
const router       = express.Router();
const InterviewKit = require('../models/InterviewKit');
const Job          = require('../models/Job');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard }    = require('../middleware/tenantGuard');
const { allowRoles }     = require('../middleware/rbac');
const asyncHandler       = require('../utils/asyncHandler');
const AppError           = require('../utils/AppError');

const guard        = [authMiddleware, tenantGuard];
const adminGuard   = [...guard, allowRoles('admin', 'super_admin')];
const recruiterGuard = [...guard, allowRoles('admin', 'super_admin', 'recruiter')];

// GET /api/interview-kits — list all kits for the tenant
router.get('/', ...recruiterGuard, asyncHandler(async (req, res) => {
  const kits = await InterviewKit.find({ tenantId: req.user.tenantId, deletedAt: null })
    .sort({ isDefault: -1, createdAt: -1 })
    .populate('linkedJobIds', 'title status _id')
    .lean();
  res.json({ success: true, data: kits });
}));

// GET /api/interview-kits/:id — get single kit
router.get('/:id', ...recruiterGuard, asyncHandler(async (req, res) => {
  const kit = await InterviewKit.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null })
    .populate('linkedJobIds', 'title status _id')
    .lean();
  if (!kit) throw new AppError('Interview kit not found', 404);
  res.json({ success: true, data: kit });
}));

// POST /api/interview-kits — create a kit
router.post('/', ...adminGuard, asyncHandler(async (req, res) => {
  const { name, description, questions, screeningQuestions, linkedJobIds, isDefault } = req.body;
  if (!name?.trim()) throw new AppError('name is required', 400);
  if (!Array.isArray(questions) || questions.length === 0) throw new AppError('At least one interview question is required', 400);

  for (const q of questions) {
    if (!q.competency?.trim()) throw new AppError('Each interview question must have a competency', 400);
    if (!q.question?.trim())   throw new AppError('Each interview question must have question text', 400);
  }

  // Validate linked job IDs belong to this tenant
  let validJobIds = [];
  if (Array.isArray(linkedJobIds) && linkedJobIds.length) {
    const jobs = await Job.find({ _id: { $in: linkedJobIds }, tenantId: req.user.tenantId, deletedAt: null }).select('_id').lean();
    validJobIds = jobs.map(j => j._id);
  }

  // Only one default kit at a time
  if (isDefault) {
    await InterviewKit.updateMany({ tenantId: req.user.tenantId, deletedAt: null }, { $set: { isDefault: false } });
  }

  const kit = await InterviewKit.create({
    tenantId          : req.user.tenantId,
    name              : name.trim(),
    description       : description?.trim() || '',
    questions,
    screeningQuestions: Array.isArray(screeningQuestions) ? screeningQuestions : [],
    linkedJobIds      : validJobIds,
    isDefault         : !!isDefault,
  });

  const populated = await kit.populate('linkedJobIds', 'title status _id');
  res.status(201).json({ success: true, data: populated });
}));

// PUT /api/interview-kits/:id — update a kit
router.put('/:id', ...adminGuard, asyncHandler(async (req, res) => {
  const kit = await InterviewKit.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
  if (!kit) throw new AppError('Interview kit not found', 404);

  const { name, description, questions, screeningQuestions, linkedJobIds, isDefault } = req.body;
  if (name !== undefined)        kit.name        = name.trim();
  if (description !== undefined) kit.description = description.trim();
  if (questions !== undefined)   kit.questions   = questions;

  if (screeningQuestions !== undefined) {
    kit.screeningQuestions = Array.isArray(screeningQuestions) ? screeningQuestions : [];
  }

  if (Array.isArray(linkedJobIds)) {
    const jobs = await Job.find({ _id: { $in: linkedJobIds }, tenantId: req.user.tenantId, deletedAt: null }).select('_id').lean();
    kit.linkedJobIds = jobs.map(j => j._id);
  }

  if (isDefault !== undefined) {
    if (isDefault) {
      await InterviewKit.updateMany({ tenantId: req.user.tenantId, deletedAt: null, _id: { $ne: kit._id } }, { $set: { isDefault: false } });
    }
    kit.isDefault = isDefault;
  }

  await kit.save();
  const populated = await kit.populate('linkedJobIds', 'title status _id');
  res.json({ success: true, data: populated });
}));

// DELETE /api/interview-kits/:id — soft delete
router.delete('/:id', ...adminGuard, asyncHandler(async (req, res) => {
  const kit = await InterviewKit.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
  if (!kit) throw new AppError('Interview kit not found', 404);
  kit.deletedAt = new Date();
  await kit.save();
  // Remove from any jobs using this kit
  await Job.updateMany({ interviewKitId: kit._id, tenantId: req.user.tenantId }, { $unset: { interviewKitId: '' } }).catch(() => {});
  res.json({ success: true, message: 'Kit deleted' });
}));

module.exports = router;

'use strict';
const router       = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard }  = require('../middleware/tenantGuard');
const { allowRoles }   = require('../middleware/rbac');
const EmailSequence = require('../models/EmailSequence');
const Candidate    = require('../models/Candidate');
const email        = require('../utils/email');

const guard      = [authMiddleware, tenantGuard];
const canManage  = allowRoles('admin', 'super_admin', 'recruiter');

// List sequences
router.get('/', ...guard, canManage, asyncHandler(async (req, res) => {
  const seqs = await EmailSequence.find({ tenantId: req.user.tenantId, deletedAt: null })
    .select('-enrollments.stepsLog')
    .sort({ createdAt: -1 }).lean();
  res.json({ sequences: seqs });
}));

// Create sequence
router.post('/', ...guard, canManage, asyncHandler(async (req, res) => {
  const { name, steps } = req.body;
  if (!name || !Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({ message: 'name and at least one step required' });
  }
  const seq = await EmailSequence.create({
    tenantId : req.user.tenantId,
    createdBy: req.user._id,
    name, steps,
  });
  res.status(201).json({ sequence: seq });
}));

// Update sequence
router.patch('/:id', ...guard, canManage, asyncHandler(async (req, res) => {
  const { name, isActive, steps } = req.body;
  const seq = await EmailSequence.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
    { $set: { ...(name !== undefined ? { name } : {}), ...(isActive !== undefined ? { isActive } : {}), ...(steps ? { steps } : {}) } },
    { new: true }
  );
  if (!seq) return res.status(404).json({ message: 'Not found' });
  res.json({ sequence: seq });
}));

// Delete
router.delete('/:id', ...guard, canManage, asyncHandler(async (req, res) => {
  const seq = await EmailSequence.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
    { $set: { deletedAt: new Date() } }
  );
  if (!seq) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
}));

// Enroll a candidate
router.post('/:id/enroll', ...guard, canManage, asyncHandler(async (req, res) => {
  const { candidateId } = req.body;
  if (!candidateId) return res.status(400).json({ message: 'candidateId required' });

  const seq = await EmailSequence.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
  if (!seq) return res.status(404).json({ message: 'Sequence not found' });
  if (!seq.isActive) return res.status(400).json({ message: 'Sequence is not active' });
  if (!seq.steps.length) return res.status(400).json({ message: 'Sequence has no steps' });

  const cand = await Candidate.findOne({ _id: candidateId, tenantId: req.user.tenantId }).lean();
  if (!cand) return res.status(404).json({ message: 'Candidate not found' });

  const alreadyEnrolled = seq.enrollments.some(e => String(e.candidateId) === String(candidateId) && !e.completed);
  if (alreadyEnrolled) return res.status(409).json({ message: 'Candidate already enrolled' });

  const firstDelay = seq.steps[0].delayDays || 0;
  const nextSendAt = new Date(Date.now() + firstDelay * 86400000);

  seq.enrollments.push({
    candidateId,
    email      : cand.email,
    enrolledAt : new Date(),
    currentStep: 0,
    nextSendAt,
    completed  : false,
    stepsLog   : [],
  });
  await seq.save();
  res.json({ message: 'Enrolled', nextSendAt });
}));

// List enrollments for a sequence
router.get('/:id/enrollments', ...guard, canManage, asyncHandler(async (req, res) => {
  const seq = await EmailSequence.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null })
    .populate('enrollments.candidateId', 'firstName lastName email')
    .lean();
  if (!seq) return res.status(404).json({ message: 'Not found' });
  res.json({ enrollments: seq.enrollments || [] });
}));

module.exports = router;

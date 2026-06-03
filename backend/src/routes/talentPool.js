'use strict';
const router       = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard }  = require('../middleware/tenantGuard');
const { allowRoles }   = require('../middleware/rbac');
const TalentPool   = require('../models/TalentPool');
const Candidate    = require('../models/Candidate');

const guard = [authMiddleware, tenantGuard];
const adminOrRecruiter = allowRoles('admin', 'super_admin', 'recruiter');

// List pools
router.get('/', ...guard, adminOrRecruiter, asyncHandler(async (req, res) => {
  const rawPools = await TalentPool.find({ tenantId: req.user.tenantId, deletedAt: null })
    .sort({ createdAt: -1 })
    .lean();
  // Remove members with missing candidateId (legacy data issue) before populate
  for (const p of rawPools) {
    p.members = (p.members || []).filter(m => m.candidateId != null);
  }
  await TalentPool.populate(rawPools, { path: 'members.candidateId', select: 'name email' });
  res.json({ pools: rawPools });
}));

// Create pool
router.post('/', ...guard, adminOrRecruiter, asyncHandler(async (req, res) => {
  const { name, description, tags } = req.body;
  if (!name) return res.status(400).json({ message: 'Pool name required' });
  const pool = await TalentPool.create({
    tenantId : req.user.tenantId,
    name, description, tags: tags || [],
    createdBy: req.user._id,
  });
  res.status(201).json({ pool });
}));

// Get single pool
router.get('/:id', ...guard, adminOrRecruiter, asyncHandler(async (req, res) => {
  const pool = await TalentPool.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }).lean();
  if (!pool) return res.status(404).json({ message: 'Pool not found' });
  pool.members = (pool.members || []).filter(m => m.candidateId != null);
  await TalentPool.populate([pool], { path: 'members.candidateId', select: 'name email avatarUrl skills userId title location' });
  res.json({ pool });
}));

// Update pool metadata
router.patch('/:id', ...guard, adminOrRecruiter, asyncHandler(async (req, res) => {
  const { name, description, tags } = req.body;
  const pool = await TalentPool.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
    { $set: { name, description, tags } },
    { new: true }
  );
  if (!pool) return res.status(404).json({ message: 'Pool not found' });
  res.json({ pool });
}));

// Delete pool (soft)
router.delete('/:id', ...guard, adminOrRecruiter, asyncHandler(async (req, res) => {
  const pool = await TalentPool.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
    { $set: { deletedAt: new Date() } }
  );
  if (!pool) return res.status(404).json({ message: 'Pool not found' });
  res.json({ message: 'Pool deleted' });
}));

// Add candidate to pool
router.post('/:id/members', ...guard, adminOrRecruiter, asyncHandler(async (req, res) => {
  const { candidateId, notes } = req.body;
  if (!candidateId) return res.status(400).json({ message: 'candidateId required' });

  const candidate = await Candidate.findOne({ _id: candidateId, tenantId: req.user.tenantId });
  if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

  const pool = await TalentPool.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
  if (!pool) return res.status(404).json({ message: 'Pool not found' });

  const alreadyIn = pool.members.some(m => String(m.candidateId) === String(candidateId));
  if (alreadyIn) return res.status(409).json({ message: 'Candidate already in pool' });

  pool.members.push({ candidateId, addedBy: req.user._id, notes: notes || '' });
  await pool.save();
  res.json({ message: 'Added', memberCount: pool.members.length });
}));

// Remove candidate from pool
router.delete('/:id/members/:candidateId', ...guard, adminOrRecruiter, asyncHandler(async (req, res) => {
  const pool = await TalentPool.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
  if (!pool) return res.status(404).json({ message: 'Pool not found' });

  const before = pool.members.length;
  pool.members = pool.members.filter(m => String(m.candidateId) !== req.params.candidateId);
  if (pool.members.length === before) return res.status(404).json({ message: 'Member not found' });

  await pool.save();
  res.json({ message: 'Removed', memberCount: pool.members.length });
}));

// Update member notes
router.patch('/:id/members/:candidateId', ...guard, adminOrRecruiter, asyncHandler(async (req, res) => {
  const pool = await TalentPool.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
  if (!pool) return res.status(404).json({ message: 'Pool not found' });

  const member = pool.members.find(m => String(m.candidateId) === req.params.candidateId);
  if (!member) return res.status(404).json({ message: 'Member not found' });
  member.notes = req.body.notes || '';
  await pool.save();
  res.json({ message: 'Updated' });
}));

module.exports = router;

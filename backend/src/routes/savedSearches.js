'use strict';
const router       = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard }  = require('../middleware/tenantGuard');
const SavedSearch  = require('../models/SavedSearch');

const guard = [authMiddleware, tenantGuard];

// List my saved searches (optionally filtered by context)
router.get('/', ...guard, asyncHandler(async (req, res) => {
  const { context } = req.query;
  const q = { userId: req.user._id, deletedAt: null };
  if (context) q.context = context;
  const searches = await SavedSearch.find(q).sort({ createdAt: -1 }).lean();
  res.json({ searches });
}));

// Save a new search
router.post('/', ...guard, asyncHandler(async (req, res) => {
  const { name, context, filters } = req.body;
  if (!name) return res.status(400).json({ message: 'Name required' });
  const search = await SavedSearch.create({
    tenantId: req.user.tenantId,
    userId  : req.user._id,
    name, context: context || 'candidates', filters: filters || {},
  });
  res.status(201).json({ search });
}));

// Update search name/filters
router.patch('/:id', ...guard, asyncHandler(async (req, res) => {
  const { name, filters } = req.body;
  const search = await SavedSearch.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id, deletedAt: null },
    { $set: { ...(name ? { name } : {}), ...(filters ? { filters } : {}) } },
    { new: true }
  );
  if (!search) return res.status(404).json({ message: 'Not found' });
  res.json({ search });
}));

// Delete
router.delete('/:id', ...guard, asyncHandler(async (req, res) => {
  const search = await SavedSearch.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id, deletedAt: null },
    { $set: { deletedAt: new Date() } }
  );
  if (!search) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
}));

module.exports = router;

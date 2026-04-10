'use strict';
/**
 * Job Alerts — candidates opt-in to email notifications for new matching jobs
 *
 * GET    /api/job-alerts          — list own alerts
 * POST   /api/job-alerts          — create alert
 * PATCH  /api/job-alerts/:id      — update alert (keywords, frequency, etc.)
 * DELETE /api/job-alerts/:id      — remove alert
 */
const express      = require('express');
const router       = express.Router();
const JobAlert     = require('../models/JobAlert');
const { authenticate }  = require('../middleware/auth');
const asyncHandler      = require('../utils/asyncHandler');
const AppError          = require('../utils/AppError');

// All routes require auth
router.use(authenticate);

// GET /api/job-alerts
router.get('/', asyncHandler(async (req, res) => {
  const alerts = await JobAlert.find({ userId: req.user._id || req.user.id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: alerts.map(a => ({ ...a, id: a._id.toString() })) });
}));

// POST /api/job-alerts
router.post('/', asyncHandler(async (req, res) => {
  const { keywords, location, jobType, frequency } = req.body;
  if (!keywords?.length && !location && !jobType) throw new AppError('At least one filter (keywords, location, or jobType) is required.', 400);

  const count = await JobAlert.countDocuments({ userId: req.user._id || req.user.id, isActive: true });
  if (count >= 10) throw new AppError('Maximum 10 active alerts allowed.', 400);

  const alert = await JobAlert.create({
    userId   : req.user._id || req.user.id,
    email    : req.user.email,
    tenantId : req.user.tenantId || null,
    keywords : Array.isArray(keywords) ? keywords.map(k => k.trim().toLowerCase()).filter(Boolean) : [],
    location : location?.trim() || '',
    jobType  : jobType?.trim() || '',
    frequency: frequency || 'daily',
  });

  res.status(201).json({ success: true, data: { ...alert.toObject(), id: alert._id.toString() } });
}));

// PATCH /api/job-alerts/:id
router.patch('/:id', asyncHandler(async (req, res) => {
  const allowed = ['keywords', 'location', 'jobType', 'frequency', 'isActive'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  if (update.keywords) update.keywords = update.keywords.map(k => k.trim().toLowerCase()).filter(Boolean);

  const alert = await JobAlert.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id || req.user.id },
    { $set: update },
    { new: true }
  );
  if (!alert) throw new AppError('Alert not found.', 404);
  res.json({ success: true, data: { ...alert.toObject(), id: alert._id.toString() } });
}));

// DELETE /api/job-alerts/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await JobAlert.findOneAndDelete({ _id: req.params.id, userId: req.user._id || req.user.id });
  res.json({ success: true, message: 'Alert removed.' });
}));

module.exports = router;

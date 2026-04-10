'use strict';
const express      = require('express');
const Notification = require('../models/Notification');
const { authenticate: auth } = require('../middleware/auth');
const router       = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const AppError     = require('../utils/AppError');

// GET /api/notifications — get my notifications
router.get('/', auth, asyncHandler(async (req, res) => {
  const all = await Notification.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean({ virtuals: true });
  
  // Mongoose lean() doesn't include virtuals by default unless using a plugin,
  // so we ensure 'id' and 'body' are mapped if lean result lacks them.
  const result = all.map(n => ({
    ...n,
    id: n.id || n._id.toString(),
    body: n.body || n.message
  }));

  res.json(result);
}));

// PATCH /api/notifications/read-all — mark all read (Performance optimized)
router.patch('/read-all', auth, asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user.id, read: false },
    { $set: { read: true } }
  );
  res.json({ ok: true, message: 'All notifications marked as read' });
}));

// PATCH /api/notifications/:id/read — mark single read
router.patch('/:id/read', auth, asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { $set: { read: true } },
    { new: true }
  );
  
  if (!notif) throw new AppError('Notification not found or access denied.', 404);
  
  res.json({ ok: true });
}));

// DELETE /api/notifications — clear all notifications for this user
router.delete('/', auth, asyncHandler(async (req, res) => {
  await Notification.deleteMany({ userId: req.user.id });
  res.json({ ok: true, message: 'All notifications cleared' });
}));

module.exports = router;


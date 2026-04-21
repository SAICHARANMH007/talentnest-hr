'use strict';
const express        = require('express');
const router         = express.Router();
const DirectMessage  = require('../models/DirectMessage');
const User           = require('../models/User');
const { authenticate } = require('../middleware/auth');
const asyncHandler   = require('../utils/asyncHandler');

// POST /api/messages — send a message (recruiter → candidate only)
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { role, tenantId } = req.user;
  if (!['recruiter', 'admin', 'super_admin', 'candidate'].includes(role)) {
    return res.status(403).json({ success: false, error: 'Not allowed to send messages.' });
  }

  const { toUserId, message, jobId, jobTitle } = req.body;
  if (!toUserId || !message?.trim()) {
    return res.status(400).json({ success: false, error: 'toUserId and message are required.' });
  }

  const recipient = await User.findById(toUserId).lean();
  if (!recipient) return res.status(404).json({ success: false, error: 'Recipient not found.' });

  const msg = await DirectMessage.create({
    tenantId  : req.user.tenantId,
    fromUserId: req.user._id || req.user.id,
    toUserId,
    fromName  : req.user.name,
    fromRole  : role,
    message   : message.trim(),
    jobId     : jobId || null,
    jobTitle  : jobTitle || null,
  });

  res.json({ success: true, data: msg });
}));

// GET /api/messages/inbox — messages received by the current user
router.get('/inbox', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const msgs = await DirectMessage.find({ toUserId: userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // mark all unread as read
  await DirectMessage.updateMany(
    { toUserId: userId, readAt: null },
    { $set: { readAt: new Date() } }
  );

  res.json({ success: true, data: msgs });
}));

// GET /api/messages/unread-count — quick badge count
router.get('/unread-count', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const count  = await DirectMessage.countDocuments({ toUserId: userId, readAt: null });
  res.json({ success: true, data: { count } });
}));

module.exports = router;

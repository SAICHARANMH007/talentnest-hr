'use strict';
const express        = require('express');
const router         = express.Router();
const mongoose       = require('mongoose');
const DirectMessage  = require('../models/DirectMessage');
const User           = require('../models/User');
const { authenticate } = require('../middleware/auth');
const asyncHandler   = require('../utils/asyncHandler');
const socketRegistry = require('../socket/index');

// Deterministic conversation room name (mirrors chatSocket.js)
const convRoom = (a, b) => `conv:${[String(a), String(b)].sort().join(':')}`;

const CHAT_ROLES = ['recruiter', 'admin', 'super_admin', 'candidate'];

// POST /api/messages — send a message (text + optional attachment)
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { role } = req.user;
  if (!CHAT_ROLES.includes(role)) {
    return res.status(403).json({ success: false, error: 'Not allowed to send messages.' });
  }

  const { toUserId, message, jobId, jobTitle, attachment, replyTo } = req.body;
  if (!toUserId || (!message?.trim() && !attachment)) {
    return res.status(400).json({ success: false, error: 'toUserId and message or attachment are required.' });
  }

  // Validate attachment size (max 8 MB base64)
  if (attachment?.data && attachment.data.length > 11_000_000) {
    return res.status(400).json({ success: false, error: 'Attachment too large (max 8 MB).' });
  }

  const recipient = await User.findById(toUserId).lean();
  if (!recipient) return res.status(404).json({ success: false, error: 'Recipient not found.' });

  const msg = await DirectMessage.create({
    tenantId  : req.user.tenantId,
    fromUserId: req.user._id || req.user.id,
    toUserId,
    fromName  : req.user.name,
    fromRole  : role,
    message   : message?.trim() || '',
    jobId     : jobId || null,
    jobTitle  : jobTitle || null,
    attachment: attachment || null,
    replyTo   : replyTo   || null,
  });

  // Push to both participants via Socket.IO — real-time delivery
  const room = convRoom(req.user._id || req.user.id, toUserId);
  socketRegistry.emitTo('/chat', room, 'message:new', msg);
  // Also deliver to recipient's personal room in case they're not in conv room yet
  socketRegistry.emitTo('/chat', `user:${toUserId}`, 'message:new', msg);

  res.json({ success: true, data: msg });
}));

// GET /api/messages/contacts — list of people I've chatted with (for sidebar)
router.get('/contacts', authenticate, asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id || req.user.id);

  // Find all unique conversation partners
  const [sent, received] = await Promise.all([
    DirectMessage.find({ fromUserId: userId }).distinct('toUserId'),
    DirectMessage.find({ toUserId: userId }).distinct('fromUserId'),
  ]);

  const partnerIds = [...new Set([...sent, ...received].map(id => id.toString()))];

  // Fetch last message + unread count for each conversation
  const contacts = await Promise.all(partnerIds.map(async (pid) => {
    const pidObj = new mongoose.Types.ObjectId(pid);
    const [lastMsg, unread, user] = await Promise.all([
      DirectMessage.findOne({
        $or: [
          { fromUserId: userId, toUserId: pidObj },
          { fromUserId: pidObj, toUserId: userId },
        ]
      }).sort({ createdAt: -1 }).lean(),
      DirectMessage.countDocuments({ fromUserId: pidObj, toUserId: userId, readAt: null }),
      User.findById(pidObj).select('name role email').lean(),
    ]);
    if (!user) return null;
    return {
      userId   : pid,
      name     : user.name,
      role     : user.role,
      email    : user.email,
      lastMsg  : lastMsg?.message || (lastMsg?.attachment ? `📎 ${lastMsg.attachment.name}` : ''),
      lastAt   : lastMsg?.createdAt || null,
      unread,
    };
  }));

  const filtered = contacts.filter(Boolean).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
  res.json({ success: true, data: filtered });
}));

// GET /api/messages/thread/:userId — full conversation thread with a specific user
router.get('/thread/:userId', authenticate, asyncHandler(async (req, res) => {
  const myId      = new mongoose.Types.ObjectId(req.user._id || req.user.id);
  const partnerId = new mongoose.Types.ObjectId(req.params.userId);

  const msgs = await DirectMessage.find({
    $or: [
      { fromUserId: myId,      toUserId: partnerId },
      { fromUserId: partnerId, toUserId: myId      },
    ]
  }).sort({ createdAt: 1 }).limit(200).lean();

  // Mark as read
  await DirectMessage.updateMany(
    { fromUserId: partnerId, toUserId: myId, readAt: null },
    { $set: { readAt: new Date() } }
  );

  res.json({ success: true, data: msgs });
}));

// GET /api/messages/inbox — legacy inbox (kept for backward compat)
router.get('/inbox', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const msgs = await DirectMessage.find({ toUserId: userId })
    .sort({ createdAt: -1 }).limit(50).lean();
  await DirectMessage.updateMany(
    { toUserId: userId, readAt: null },
    { $set: { readAt: new Date() } }
  );
  res.json({ success: true, data: msgs });
}));

// GET /api/messages/unread-count
router.get('/unread-count', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const count  = await DirectMessage.countDocuments({ toUserId: userId, readAt: null });
  res.json({ success: true, data: { count } });
}));

module.exports = router;

'use strict';
const express    = require('express');
const router     = express.Router();
const mongoose   = require('mongoose');
const Connection = require('../models/Connection');
const User       = require('../models/User');
const { authMiddleware: auth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError   = require('../utils/AppError');

router.use(auth);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const USER_PUBLIC_FIELDS = 'name role title avatarUrl photoUrl location department';

function toId(v) {
  return String(v._id || v.id || v);
}

// ─── GET /api/connections — accepted connections list ─────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;

  const connections = await Connection.find({
    tenantId,
    status: 'accepted',
    $or: [{ fromUserId: uid }, { toUserId: uid }],
  }).lean();

  const peerIds = connections.map(c =>
    String(c.fromUserId) === uid ? c.toUserId : c.fromUserId
  );

  const users = await User.find({
    _id      : { $in: peerIds },
    tenantId,
    deletedAt: null,
  }).select(USER_PUBLIC_FIELDS).lean();

  res.json({ success: true, data: users, total: users.length });
}));

// ─── GET /api/connections/pending — incoming pending requests ─────────────────
router.get('/pending', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;

  const requests = await Connection.find({
    tenantId,
    toUserId: uid,
    status  : 'pending',
  }).lean();

  const senderIds = requests.map(r => r.fromUserId);

  const senderMap = {};
  const senders   = await User.find({
    _id      : { $in: senderIds },
    tenantId,
    deletedAt: null,
  }).select(USER_PUBLIC_FIELDS).lean();
  senders.forEach(u => { senderMap[String(u._id)] = u; });

  const data = requests.map(r => ({
    requestId : r._id,
    createdAt : r.createdAt,
    from      : senderMap[String(r.fromUserId)] || null,
  }));

  res.json({ success: true, data, total: data.length });
}));

// ─── GET /api/connections/sent — outgoing pending requests ───────────────────
router.get('/sent', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;

  const requests = await Connection.find({
    tenantId,
    fromUserId: uid,
    status    : 'pending',
  }).lean();

  const recipientIds = requests.map(r => r.toUserId);

  const recipientMap = {};
  const recipients   = await User.find({
    _id      : { $in: recipientIds },
    tenantId,
    deletedAt: null,
  }).select(USER_PUBLIC_FIELDS).lean();
  recipients.forEach(u => { recipientMap[String(u._id)] = u; });

  const data = requests.map(r => ({
    requestId: r._id,
    createdAt: r.createdAt,
    to       : recipientMap[String(r.toUserId)] || null,
  }));

  res.json({ success: true, data, total: data.length });
}));

// ─── GET /api/connections/suggestions — people you may know ──────────────────
router.get('/suggestions', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;

  // Collect all user IDs already connected or with a pending/rejected request
  const existing = await Connection.find({
    tenantId,
    $or: [{ fromUserId: uid }, { toUserId: uid }],
  }).select('fromUserId toUserId').lean();

  const excludedIds = new Set([uid]);
  existing.forEach(c => {
    excludedIds.add(String(c.fromUserId));
    excludedIds.add(String(c.toUserId));
  });

  const suggestions = await User.find({
    tenantId,
    deletedAt: null,
    isActive : true,
    _id      : { $nin: [...excludedIds].map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id) },
  }).select(USER_PUBLIC_FIELDS).limit(10).lean();

  res.json({ success: true, data: suggestions, total: suggestions.length });
}));

// ─── GET /api/connections/search?q= — search users by name/email ─────────────
router.get('/search', asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  if (q.trim().length < 2) throw new AppError('Search query must be at least 2 characters.', 400);

  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;
  const regex    = new RegExp(q.trim(), 'i');

  const users = await User.find({
    tenantId,
    deletedAt: null,
    _id      : { $ne: uid },
    $or      : [{ name: regex }, { email: regex }],
  }).select(USER_PUBLIC_FIELDS + ' email').limit(20).lean();

  // Fetch all connections involving the current user for status resolution
  const userIds = users.map(u => u._id);
  const connections = await Connection.find({
    tenantId,
    $or: [
      { fromUserId: uid, toUserId: { $in: userIds } },
      { toUserId: uid,   fromUserId: { $in: userIds } },
    ],
  }).lean();

  // Build a map: peerId -> connection
  const connMap = {};
  connections.forEach(c => {
    const peerId = String(c.fromUserId) === uid
      ? String(c.toUserId)
      : String(c.fromUserId);
    connMap[peerId] = c;
  });

  const data = users.map(u => {
    const conn = connMap[String(u._id)];
    let connectionStatus = null;
    if (conn) {
      if (conn.status === 'accepted') {
        connectionStatus = 'accepted';
      } else if (conn.status === 'pending') {
        connectionStatus = String(conn.fromUserId) === uid ? 'pending_sent' : 'pending_received';
      }
    }
    return { ...u, connectionStatus };
  });

  res.json({ success: true, data, total: data.length });
}));

// ─── POST /api/connections/request/:userId — send connection request ──────────
router.post('/request/:userId', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;
  const { userId } = req.params;

  if (String(userId) === uid) throw new AppError('You cannot connect with yourself.', 400);

  const target = await User.findOne({ _id: userId, tenantId, deletedAt: null }).lean();
  if (!target) throw new AppError('User not found.', 404);

  const existing = await Connection.findOne({
    tenantId,
    $or: [
      { fromUserId: uid,    toUserId: userId },
      { fromUserId: userId, toUserId: uid    },
    ],
  }).lean();

  if (existing) {
    throw new AppError('A connection request already exists between these users.', 400);
  }

  const connection = await Connection.create({
    tenantId,
    fromUserId: uid,
    toUserId  : userId,
    status    : 'pending',
  });

  res.status(201).json({ success: true, data: connection });
}));

// ─── POST /api/connections/accept/:requestId — accept incoming request ────────
router.post('/accept/:requestId', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;

  const connection = await Connection.findOne({
    _id     : req.params.requestId,
    tenantId,
    status  : 'pending',
  });

  if (!connection) throw new AppError('Connection request not found.', 404);
  if (String(connection.toUserId) !== uid) throw new AppError('Not authorized to accept this request.', 403);

  connection.status    = 'accepted';
  connection.updatedAt = new Date();
  await connection.save();

  res.json({ success: true, data: connection });
}));

// ─── POST /api/connections/reject/:requestId — reject incoming request ─────────
router.post('/reject/:requestId', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;

  const connection = await Connection.findOne({
    _id     : req.params.requestId,
    tenantId,
    status  : 'pending',
  });

  if (!connection) throw new AppError('Connection request not found.', 404);
  if (String(connection.toUserId) !== uid) throw new AppError('Not authorized to reject this request.', 403);

  connection.status    = 'rejected';
  connection.updatedAt = new Date();
  await connection.save();

  res.json({ success: true, data: connection });
}));

// ─── DELETE /api/connections/remove/:userId — remove accepted connection ──────
router.delete('/remove/:userId', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;
  const { userId } = req.params;

  const connection = await Connection.findOne({
    tenantId,
    status: 'accepted',
    $or: [
      { fromUserId: uid,    toUserId: userId },
      { fromUserId: userId, toUserId: uid    },
    ],
  });

  if (!connection) throw new AppError('Connection not found.', 404);

  await connection.deleteOne();

  res.json({ success: true });
}));

// ─── DELETE /api/connections/cancel/:requestId — cancel outgoing pending request
router.delete('/cancel/:requestId', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;

  const connection = await Connection.findOne({
    _id       : req.params.requestId,
    tenantId,
    fromUserId: uid,
    status    : 'pending',
  });

  if (!connection) throw new AppError('Pending request not found or you are not the sender.', 404);

  await connection.deleteOne();

  res.json({ success: true });
}));

module.exports = router;

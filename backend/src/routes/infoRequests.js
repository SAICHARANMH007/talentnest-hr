'use strict';
const express      = require('express');
const router       = express.Router();
const InfoRequest  = require('../models/InfoRequest');
const User         = require('../models/User');
const Notification = require('../models/Notification');
const { authMiddleware: auth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError     = require('../utils/AppError');

router.use(auth);

const USER_PUBLIC_FIELDS = 'name role title avatarUrl photoUrl location department';

function toId(v) {
  return String(v._id || v.id || v);
}

// ─── POST /api/info-requests/request/:userId — request someone's contact info ─
router.post('/request/:userId', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;
  const { userId } = req.params;

  if (String(userId) === uid) throw new AppError('You cannot request your own info.', 400);

  const target = await User.findOne({ _id: userId, tenantId, deletedAt: null }).lean();
  if (!target) throw new AppError('User not found.', 404);

  let request = await InfoRequest.findOne({ tenantId, fromUserId: uid, toUserId: userId });

  if (request) {
    if (request.status === 'pending')  throw new AppError('You already have a pending request for this person.', 400);
    if (request.status === 'accepted') throw new AppError('You already have access to this person\'s info.', 400);
    // Previously declined — allow re-requesting
    request.status    = 'pending';
    request.updatedAt = new Date();
    await request.save();
  } else {
    request = await InfoRequest.create({ tenantId, fromUserId: uid, toUserId: userId, status: 'pending' });
  }

  try {
    await Notification.create({
      userId : userId,
      tenantId,
      type   : 'info_request',
      title  : 'Personal info request',
      message: `${req.user.name || 'Someone'} would like to view your contact details.`,
      link   : '/app/people',
      metadata: { requestId: request._id, fromUserId: uid },
    });
  } catch {}

  res.status(201).json({ success: true, data: request });
}));

// ─── GET /api/info-requests/incoming — pending requests received ──────────────
router.get('/incoming', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;

  const requests = await InfoRequest.find({ tenantId, toUserId: uid, status: 'pending' }).lean();
  const senderIds = requests.map(r => r.fromUserId);

  const senders = await User.find({ _id: { $in: senderIds }, tenantId, deletedAt: null })
    .select(USER_PUBLIC_FIELDS).lean();
  const senderMap = {};
  senders.forEach(u => { senderMap[String(u._id)] = u; });

  const data = requests.map(r => ({
    requestId: r._id,
    createdAt: r.createdAt,
    from     : senderMap[String(r.fromUserId)] || null,
  }));

  res.json({ success: true, data, total: data.length });
}));

// ─── GET /api/info-requests/sent — requests sent, with status & unlocked info ─
router.get('/sent', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;

  const requests = await InfoRequest.find({ tenantId, fromUserId: uid }).lean();
  const targetIds = requests.map(r => r.toUserId);

  const targets = await User.find({ _id: { $in: targetIds }, tenantId, deletedAt: null })
    .select(USER_PUBLIC_FIELDS + ' email phone').lean();
  const targetMap = {};
  targets.forEach(u => { targetMap[String(u._id)] = u; });

  const data = requests.map(r => {
    const target = targetMap[String(r.toUserId)] || null;
    const accepted = r.status === 'accepted';
    return {
      requestId: r._id,
      status   : r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      to       : target ? {
        _id        : target._id,
        name       : target.name,
        role       : target.role,
        title      : target.title,
        avatarUrl  : target.avatarUrl,
        photoUrl   : target.photoUrl,
        location   : target.location,
        department : target.department,
        ...(accepted ? { email: target.email, phone: target.phone } : {}),
      } : null,
    };
  });

  res.json({ success: true, data, total: data.length });
}));

// ─── GET /api/info-requests/status/:userId — status between me and userId ─────
router.get('/status/:userId', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;
  const { userId } = req.params;

  const request = await InfoRequest.findOne({ tenantId, fromUserId: uid, toUserId: userId }).lean();
  if (!request) return res.json({ success: true, data: { status: null } });

  if (request.status === 'accepted') {
    const target = await User.findOne({ _id: userId, tenantId, deletedAt: null })
      .select('email phone').lean();
    return res.json({
      success: true,
      data: { status: 'accepted', requestId: request._id, contact: { email: target?.email, phone: target?.phone } },
    });
  }

  res.json({ success: true, data: { status: request.status, requestId: request._id } });
}));

// ─── POST /api/info-requests/accept/:requestId — accept incoming request ──────
router.post('/accept/:requestId', asyncHandler(async (req, res) => {
  const uid = toId(req.user);

  const request = await InfoRequest.findOne({ _id: req.params.requestId, status: 'pending' });
  if (!request) throw new AppError('Request not found.', 404);
  if (String(request.toUserId) !== uid) throw new AppError('Not authorized to accept this request.', 403);

  request.status    = 'accepted';
  request.updatedAt = new Date();
  await request.save();

  try {
    await Notification.create({
      userId : request.fromUserId,
      tenantId: request.tenantId,
      type   : 'info_request_accepted',
      title  : 'Info request accepted',
      message: `${req.user.name || 'Someone'} shared their contact details with you.`,
      link   : '/app/people',
      metadata: { requestId: request._id, toUserId: uid },
    });
  } catch {}

  res.json({ success: true, data: request });
}));

// ─── POST /api/info-requests/decline/:requestId — decline incoming request ────
router.post('/decline/:requestId', asyncHandler(async (req, res) => {
  const uid = toId(req.user);

  const request = await InfoRequest.findOne({ _id: req.params.requestId, status: 'pending' });
  if (!request) throw new AppError('Request not found.', 404);
  if (String(request.toUserId) !== uid) throw new AppError('Not authorized to decline this request.', 403);

  request.status    = 'declined';
  request.updatedAt = new Date();
  await request.save();

  res.json({ success: true, data: request });
}));

module.exports = router;

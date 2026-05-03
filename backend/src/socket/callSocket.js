'use strict';
const crypto       = require('crypto');
const CallRecord   = require('../models/CallRecord');
const User         = require('../models/User');
const Notification = require('../models/Notification');
const mongoose     = require('mongoose');

// Active calls: callId → call object
const activeCalls = new Map();
// Per-user in-call status: userId → callId
const userCallStatus = new Map();
// Connected users: userId → Set of socketIds (multiple tabs/devices)
const connectedUsers = new Map();

const RING_TIMEOUT_MS = 30_000;

function addConnected(userId, socketId) {
  if (!connectedUsers.has(userId)) connectedUsers.set(userId, new Set());
  connectedUsers.get(userId).add(socketId);
}
function removeConnected(userId, socketId) {
  const s = connectedUsers.get(userId);
  if (s) { s.delete(socketId); if (!s.size) connectedUsers.delete(userId); }
}
function isOnline(userId) {
  const s = connectedUsers.get(String(userId));
  return !!(s && s.size > 0);
}
// Deliver to ALL sockets of a user (handles multiple tabs/devices)
function deliverToUser(ns, userId, event, data) {
  const sids = connectedUsers.get(String(userId));
  if (sids && sids.size > 0) {
    sids.forEach(sid => ns.to(sid).emit(event, data));
    return true;
  }
  // Fallback to room-based delivery
  ns.to(`user:${userId}`).emit(event, data);
  return false;
}

function setupCallSocket(io) {
  const ns = io.of('/call');

  ns.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('AUTH_REQUIRED'));
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const rawId = decoded.userId || decoded.id;
      if (!rawId) return next(new Error('INVALID_TOKEN'));
      // Normalise to string regardless of ObjectId or string input
      socket.data.userId   = String(rawId);
      socket.data.tenantId = decoded.orgId || decoded.tenantId || '';
      try {
        const u = await User.findById(socket.data.userId).select('name').lean();
        socket.data.name = u?.name || decoded.name || 'User';
      } catch { socket.data.name = decoded.name || 'User'; }
      next();
    } catch (e) {
      next(new Error('AUTH_FAILED: ' + e.message));
    }
  });

  ns.on('connection', (socket) => {
    const userId = socket.data.userId;
    if (!userId) { socket.disconnect(); return; }

    // Register this socket in the connected-users map AND join the room
    socket.join(`user:${userId}`);
    addConnected(userId, socket.id);
    console.log(`[CallSocket] ${socket.data.name} (${userId}) connected — ${socket.id}`);

    // ── INITIATE CALL ──────────────────────────────────────────────────────
    socket.on('call:initiate', async ({ toUserId, callType, toName }) => {
      if (!toUserId || !callType) return;
      const toId = String(toUserId);

      // Check if receiver is actually connected before even trying
      if (!isOnline(toId)) {
        socket.emit('call:unavailable', {
          toUserId: toId,
          message: `${toName || 'User'} is not currently online.`,
        });
        return;
      }

      // Busy check
      if (userCallStatus.get(toId)) {
        socket.emit('call:busy', { toUserId: toId, toName }); return;
      }
      if (userCallStatus.get(userId)) {
        socket.emit('call:error', { message: 'You are already on a call.' }); return;
      }

      const callId = crypto.randomBytes(12).toString('hex');
      const call = {
        callId,
        fromUserId: userId,
        toUserId:   toId,
        fromSocket: socket.id,
        toSocket:   null,
        fromName:   socket.data.name,
        toName:     toName || '',
        callType,
        startedAt:  Date.now(),
        status:     'ringing',
        tenantId:   socket.data.tenantId,
      };
      activeCalls.set(callId, call);
      userCallStatus.set(userId, callId);

      try {
        await CallRecord.create({
          callId,
          tenantId:    call.tenantId || undefined,
          fromUserId:  call.fromUserId,
          toUserId:    call.toUserId,
          fromName:    call.fromName,
          toName:      call.toName,
          callType,
          outcome:     'missed',
        });
      } catch (e) { console.error('[callSocket] CallRecord create error:', e.message); }

      // Confirm to caller
      socket.emit('call:initiated', { callId, toUserId: toId, callType });

      // Deliver to ALL receiver sockets (multi-device support)
      deliverToUser(ns, toId, 'call:incoming', {
        callId,
        fromUserId: userId,
        fromName:   socket.data.name,
        callType,
      });
      console.log(`[CallSocket] Calling ${call.fromName} → ${toName} (${toId}), callId=${callId}`);

      // 30s ring timeout
      call._ringTimer = setTimeout(async () => {
        const c = activeCalls.get(callId);
        if (!c || c.status !== 'ringing') return;
        c.status = 'missed';
        activeCalls.delete(callId);
        userCallStatus.delete(userId);
        userCallStatus.delete(toId);

        socket.emit('call:no-answer', { callId });
        deliverToUser(ns, toId, 'call:missed', { callId, fromName: socket.data.name, callType });

        try { await CallRecord.updateOne({ callId }, { $set: { endedAt: new Date(), outcome: 'missed' } }); } catch {}

        // In-app notification for missed call (always created, visible on next login)
        try {
          await Notification.create({
            userId:   mongoose.Types.ObjectId.isValid(toId) ? new mongoose.Types.ObjectId(toId) : toId,
            tenantId: call.tenantId || undefined,
            type:     'system',
            title:    `📞 Missed ${callType === 'video' ? 'Video' : 'Audio'} Call`,
            message:  `You missed a call from ${call.fromName}. Open TalentNest to call back.`,
            link:     '/app/messages',
          });
        } catch (e) { console.error('[callSocket] Notification create error:', e.message); }
      }, RING_TIMEOUT_MS);
    });

    // ── ACCEPT ────────────────────────────────────────────────────────────
    socket.on('call:accept', ({ callId }) => {
      const call = activeCalls.get(callId);
      if (!call || call.status !== 'ringing') {
        socket.emit('call:error', { message: 'Call no longer available.' }); return;
      }
      clearTimeout(call._ringTimer);
      call.status   = 'active';
      call.toSocket = socket.id;
      call.answeredAt = Date.now();
      userCallStatus.set(call.toUserId, callId);

      socket.join(`call:${callId}`);
      // Tell caller the call was accepted
      ns.to(call.fromSocket).emit('call:accepted', { callId });
      socket.emit('call:join-room', { callId, peerSocketId: call.fromSocket });

      CallRecord.updateOne({ callId }, { $set: { answeredAt: new Date(), outcome: 'answered' } }).catch(() => {});
    });

    socket.on('call:join-room', ({ callId }) => {
      socket.join(`call:${callId}`);
    });

    // ── DECLINE ──────────────────────────────────────────────────────────
    socket.on('call:decline', async ({ callId }) => {
      const call = activeCalls.get(callId);
      if (!call) return;
      clearTimeout(call._ringTimer);
      activeCalls.delete(callId);
      userCallStatus.delete(call.fromUserId);
      userCallStatus.delete(call.toUserId);
      ns.to(call.fromSocket).emit('call:declined', { callId });
      try { await CallRecord.updateOne({ callId }, { $set: { endedAt: new Date(), outcome: 'declined' } }); } catch {}
    });

    // ── CANCEL ────────────────────────────────────────────────────────────
    socket.on('call:cancel', async ({ callId }) => {
      const call = activeCalls.get(callId);
      if (!call) return;
      clearTimeout(call._ringTimer);
      activeCalls.delete(callId);
      userCallStatus.delete(call.fromUserId);
      userCallStatus.delete(call.toUserId);
      deliverToUser(ns, call.toUserId, 'call:cancelled', { callId });
      try { await CallRecord.updateOne({ callId }, { $set: { endedAt: new Date(), outcome: 'cancelled' } }); } catch {}
    });

    // ── END ───────────────────────────────────────────────────────────────
    socket.on('call:end', async ({ callId }) => {
      const call = activeCalls.get(callId);
      if (!call) return;
      clearTimeout(call._ringTimer);
      const duration = call.answeredAt ? Math.round((Date.now() - call.answeredAt) / 1000) : 0;
      activeCalls.delete(callId);
      userCallStatus.delete(call.fromUserId);
      userCallStatus.delete(call.toUserId);
      ns.to(`call:${callId}`).emit('call:ended', { callId, duration });
      try { await CallRecord.updateOne({ callId }, { $set: { endedAt: new Date(), duration, outcome: 'answered' } }); } catch {}
    });

    // ── WebRTC SIGNALING ─────────────────────────────────────────────────
    socket.on('call:offer',  ({ callId, offer })     => socket.to(`call:${callId}`).emit('call:offer',  { from: socket.id, offer }));
    socket.on('call:answer', ({ callId, answer })    => socket.to(`call:${callId}`).emit('call:answer', { from: socket.id, answer }));
    socket.on('call:ice',    ({ callId, candidate }) => socket.to(`call:${callId}`).emit('call:ice',    { from: socket.id, candidate }));

    // ── DISCONNECT ────────────────────────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      removeConnected(userId, socket.id);
      console.log(`[CallSocket] ${socket.data.name} (${userId}) disconnected — ${reason}`);

      const callId = userCallStatus.get(userId);
      if (!callId) return;
      const call = activeCalls.get(callId);
      if (!call) { userCallStatus.delete(userId); return; }

      clearTimeout(call._ringTimer);
      const duration = call.answeredAt ? Math.round((Date.now() - call.answeredAt) / 1000) : 0;
      activeCalls.delete(callId);
      userCallStatus.delete(call.fromUserId);
      userCallStatus.delete(call.toUserId);

      const otherId = call.fromUserId === userId ? call.toUserId : call.fromUserId;
      deliverToUser(ns, otherId, 'call:ended', { callId, duration, reason: 'disconnected' });

      try {
        await CallRecord.updateOne(
          { callId },
          { $set: { endedAt: new Date(), duration, outcome: call.answeredAt ? 'answered' : 'failed' } }
        );
      } catch {}
    });
  });
}

module.exports = { setupCallSocket };

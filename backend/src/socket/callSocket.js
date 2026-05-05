'use strict';
const crypto       = require('crypto');
const CallRecord   = require('../models/CallRecord');
const User         = require('../models/User');
const Notification = require('../models/Notification');
const mongoose     = require('mongoose');

// Active calls and busy-status maps (cleared on restart — intentional, calls die on restart)
const activeCalls   = new Map(); // callId → call object
const userCallStatus = new Map(); // userId → callId

const RING_TIMEOUT_MS = 30_000;

/**
 * Deliver to a user's room (Socket.IO manages this — no in-memory map needed).
 * Room `user:${userId}` has all sockets for that user across tabs/devices.
 */
function deliverToUser(ns, userId, event, data) {
  ns.to(`user:${String(userId)}`).emit(event, data);
}

/**
 * Check if a user has any connected sockets using Socket.IO's native adapter.
 * This is the source of truth — immune to server-restart stale state.
 */
async function isUserOnline(ns, userId) {
  try {
    // Check both standard rooms and any potential fallback adapters
    const sockets = await ns.in(`user:${String(userId)}`).fetchSockets();
    return sockets.length > 0;
  } catch {
    return false;
  }
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

    socket.join(`user:${userId}`);
    console.log(`[CallSocket] ${socket.data.name} (${userId}) connected — ${socket.id}`);

    // ── INITIATE CALL ──────────────────────────────────────────────────────
    socket.on('call:initiate', async ({ toUserId, callType, toName, callMessage }) => {
      if (!toUserId || !callType) return;
      const toId = String(toUserId);

      // Use Socket.IO's native room check — correct even after server restart
      // Relaxed check: deliver anyway if possible, but give feedback if definitely offline
      const receiverOnline = await isUserOnline(ns, toId);
      // We don't return early here anymore — we attempt delivery to 'user:toId' room.
      // This handles cases where the online-check flickered but the user is actually reachable.

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
        callMessage: callMessage || '',
        startedAt:  Date.now(),
        status:     'ringing',
        tenantId:   socket.data.tenantId,
      };
      activeCalls.set(callId, call);
      userCallStatus.set(userId, callId);

      try {
        await CallRecord.create({
          callId, tenantId: call.tenantId || undefined,
          fromUserId: call.fromUserId, toUserId: call.toUserId,
          fromName: call.fromName, toName: call.toName,
          callType, callMessage: call.callMessage || undefined,
          outcome: 'missed',
        });
      } catch (e) { console.error('[callSocket] CallRecord create:', e.message); }

      socket.emit('call:initiated', { callId, toUserId: toId, callType });

      deliverToUser(ns, toId, 'call:incoming', {
        callId, fromUserId: userId, fromName: socket.data.name, callType,
        callMessage: call.callMessage || '',
      });
      console.log(`[CallSocket] ${call.fromName} → ${toName} (${toId}) callId=${callId}`);

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
        try {
          await Notification.create({
            userId: mongoose.Types.ObjectId.isValid(toId) ? new mongoose.Types.ObjectId(toId) : toId,
            tenantId: call.tenantId || undefined,
            type: 'system',
            title: `📞 Missed ${callType === 'video' ? 'Video' : 'Audio'} Call`,
            message: `You missed a call from ${call.fromName}. Open TalentNest to call back.`,
            link: '/app/messages',
          });
        } catch {}
      }, RING_TIMEOUT_MS);
    });

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
      ns.to(`user:${call.fromUserId}`).emit('call:accepted', { callId });
      socket.emit('call:join-room', { callId, peerSocketId: call.fromSocket });
      // Dismiss incoming call on OTHER tabs of the same user (multi-tab handling)
      socket.to(`user:${call.toUserId}`).emit('call:answered-elsewhere', { callId });
      CallRecord.updateOne({ callId }, { $set: { answeredAt: new Date(), outcome: 'answered' } }).catch(() => {});
    });

    socket.on('call:join-room', ({ callId }) => { socket.join(`call:${callId}`); });

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

    socket.on('call:end', async ({ callId }) => {
      if (!callId) return;
      const call = activeCalls.get(callId);
      const duration = call?.answeredAt ? Math.round((Date.now() - call.answeredAt) / 1000) : 0;

      // Notify everyone ELSE in the call room (not the sender — they already hung up locally)
      socket.to(`call:${callId}`).emit('call:ended', { callId, duration });

      if (!call) return;
      clearTimeout(call._ringTimer);
      activeCalls.delete(callId);
      userCallStatus.delete(call.fromUserId);
      userCallStatus.delete(call.toUserId);

      // Also deliver directly to the other user's personal room as a safety net
      // (covers edge cases where they lost call-room membership due to reconnect)
      const otherId = call.fromUserId === userId ? call.toUserId : call.fromUserId;
      deliverToUser(ns, otherId, 'call:ended', { callId, duration });

      try { await CallRecord.updateOne({ callId }, { $set: { endedAt: new Date(), duration, outcome: 'answered' } }); } catch {}
    });

    // WebRTC signaling
    // WebRTC signaling — ALWAYS deliver to the USER's room, not just the socket.
    // This ensures signaling survives socket-level reconnections during a call.
    socket.on('call:offer',  ({ callId, offer }) => {
      const call = activeCalls.get(callId);
      if (!call) return;
      const targetId = call.fromUserId === userId ? call.toUserId : call.fromUserId;
      ns.to(`user:${targetId}`).emit('call:offer', { from: socket.id, offer });
    });

    socket.on('call:answer', ({ callId, answer }) => {
      const call = activeCalls.get(callId);
      if (!call) return;
      const targetId = call.fromUserId === userId ? call.toUserId : call.fromUserId;
      ns.to(`user:${targetId}`).emit('call:answer', { from: socket.id, answer });
    });

    socket.on('call:ice', ({ callId, candidate }) => {
      const call = activeCalls.get(callId);
      if (!call) return;
      const targetId = call.fromUserId === userId ? call.toUserId : call.fromUserId;
      ns.to(`user:${targetId}`).emit('call:ice', { from: socket.id, candidate });
    });

    socket.on('disconnect', async (reason) => {
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

      // Deliver via BOTH the call room AND user room — covers all edge cases
      // (socket.to won't work here because the sender's socket is already gone)
      ns.to(`call:${callId}`).emit('call:ended', { callId, duration, reason: 'disconnected' });
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

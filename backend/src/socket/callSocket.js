'use strict';
const crypto       = require('crypto');
const CallRecord   = require('../models/CallRecord');
const User         = require('../models/User');
const Notification = require('../models/Notification');

// In-memory active calls: callId -> { fromUserId, toUserId, fromSocket, toSocket, type, startedAt, status }
const activeCalls = new Map();

// Per-user "in call" status for busy detection
const userCallStatus = new Map(); // userId -> callId | null

const RING_TIMEOUT_MS = 30_000;

function setupCallSocket(io) {
  const ns = io.of('/call');

  ns.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('AUTH_REQUIRED'));
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.userId   = decoded.userId || decoded.id;
      socket.data.tenantId = decoded.orgId  || decoded.tenantId || '';
      if (!socket.data.userId) return next(new Error('INVALID_TOKEN'));
      // Fetch name from DB (non-blocking — fallback to 'Unknown' on failure)
      try {
        const u = await User.findById(socket.data.userId).select('name').lean();
        socket.data.name = u?.name || decoded.name || 'Unknown';
      } catch { socket.data.name = decoded.name || 'Unknown'; }
      next();
    } catch (e) {
      // Send error to client so it knows auth failed (not silent disconnect)
      next(new Error('AUTH_FAILED: ' + e.message));
    }
  });

  ns.on('connection', (socket) => {
    const userId = socket.data.userId;
    if (!userId) { socket.disconnect(); return; }
    socket.join(`user:${userId}`);

    // ── INITIATE CALL ──────────────────────────────────────────────────────
    socket.on('call:initiate', async ({ toUserId, callType, toName }) => {
      if (!toUserId || !callType) return;

      // Busy check
      if (userCallStatus.get(String(toUserId))) {
        socket.emit('call:busy', { toUserId, toName });
        return;
      }
      if (userCallStatus.get(String(userId))) {
        socket.emit('call:error', { message: 'You are already on a call.' });
        return;
      }

      const callId = crypto.randomBytes(12).toString('hex');
      const call = {
        callId,
        fromUserId: String(userId),
        toUserId: String(toUserId),
        fromSocket: socket.id,
        toSocket: null,
        fromName: socket.data.name,
        toName: toName || '',
        callType,
        startedAt: Date.now(),
        status: 'ringing',
        tenantId: socket.data.tenantId,
      };
      activeCalls.set(callId, call);
      userCallStatus.set(String(userId), callId);

      // Save initial record to DB
      try {
        await CallRecord.create({
          callId,
          tenantId: call.tenantId || undefined,
          fromUserId: call.fromUserId,
          toUserId: call.toUserId,
          fromName: call.fromName,
          toName: call.toName,
          callType,
          outcome: 'missed',
        });
      } catch (e) { console.error('[callSocket] DB create error:', e.message); }

      // Confirm to caller
      socket.emit('call:initiated', { callId, toUserId, callType });

      // Ring the recipient (only to their personal room — no broadcast)
      ns.to(`user:${toUserId}`).emit('call:incoming', {
        callId,
        fromUserId: String(userId),
        fromName: socket.data.name,
        callType,
      });

      // Auto-cancel after 30s if no answer
      call._ringTimer = setTimeout(async () => {
        const c = activeCalls.get(callId);
        if (!c || c.status !== 'ringing') return;
        c.status = 'missed';
        activeCalls.delete(callId);
        userCallStatus.delete(String(userId));
        userCallStatus.delete(String(toUserId));

        socket.emit('call:no-answer', { callId });
        ns.to(`user:${toUserId}`).emit('call:missed', { callId, fromName: socket.data.name, callType });

        try {
          await CallRecord.updateOne({ callId }, { $set: { endedAt: new Date(), outcome: 'missed' } });
        } catch {}

        // Create in-app notification so candidate sees missed call even if socket wasn't active
        try {
          await Notification.create({
            userId: toUserId,
            tenantId: call.tenantId || undefined,
            type: 'system',
            title: `📞 Missed ${callType === 'video' ? 'Video' : 'Audio'} Call`,
            message: `You missed a call from ${call.fromName}. Open TalentNest to call back.`,
            link: '/app/messages',
          });
        } catch {}
      }, RING_TIMEOUT_MS);
    });

    // ── ACCEPT CALL ────────────────────────────────────────────────────────
    socket.on('call:accept', ({ callId }) => {
      const call = activeCalls.get(callId);
      if (!call || call.status !== 'ringing') { socket.emit('call:error', { message: 'Call no longer available.' }); return; }

      clearTimeout(call._ringTimer);
      call.status = 'active';
      call.toSocket = socket.id;
      call.answeredAt = Date.now();
      userCallStatus.set(String(call.toUserId), callId);

      // Join both to call room for signaling
      socket.join(`call:${callId}`);
      ns.to(call.fromSocket).emit('call:accepted', { callId });
      // The caller socket needs to join call room too — tell them
      socket.emit('call:join-room', { callId, peerSocketId: call.fromSocket });

      CallRecord.updateOne({ callId }, { $set: { answeredAt: new Date(), outcome: 'answered' } }).catch(() => {});
    });

    socket.on('call:join-room', ({ callId }) => {
      socket.join(`call:${callId}`);
    });

    // ── DECLINE ────────────────────────────────────────────────────────────
    socket.on('call:decline', async ({ callId }) => {
      const call = activeCalls.get(callId);
      if (!call) return;
      clearTimeout(call._ringTimer);
      activeCalls.delete(callId);
      userCallStatus.delete(String(call.fromUserId));
      userCallStatus.delete(String(call.toUserId));

      ns.to(`user:${call.fromUserId}`).emit('call:declined', { callId });
      try {
        await CallRecord.updateOne({ callId }, { $set: { endedAt: new Date(), outcome: 'declined' } });
      } catch {}
    });

    // ── CANCEL (caller cancels before answer) ──────────────────────────────
    socket.on('call:cancel', async ({ callId }) => {
      const call = activeCalls.get(callId);
      if (!call) return;
      clearTimeout(call._ringTimer);
      activeCalls.delete(callId);
      userCallStatus.delete(String(call.fromUserId));
      userCallStatus.delete(String(call.toUserId));

      ns.to(`user:${call.toUserId}`).emit('call:cancelled', { callId });
      try {
        await CallRecord.updateOne({ callId }, { $set: { endedAt: new Date(), outcome: 'cancelled' } });
      } catch {}
    });

    // ── END CALL ───────────────────────────────────────────────────────────
    socket.on('call:end', async ({ callId }) => {
      const call = activeCalls.get(callId);
      if (!call) return;
      clearTimeout(call._ringTimer);
      const duration = call.answeredAt ? Math.round((Date.now() - call.answeredAt) / 1000) : 0;
      activeCalls.delete(callId);
      userCallStatus.delete(String(call.fromUserId));
      userCallStatus.delete(String(call.toUserId));

      // Notify both participants
      ns.to(`call:${callId}`).emit('call:ended', { callId, duration });

      try {
        await CallRecord.updateOne({ callId }, { $set: { endedAt: new Date(), duration, outcome: 'answered' } });
      } catch {}
    });

    // ── WebRTC SIGNALING (peer-to-peer, only between call participants) ────
    socket.on('call:offer', ({ callId, offer }) => {
      socket.to(`call:${callId}`).emit('call:offer', { from: socket.id, offer });
    });

    socket.on('call:answer', ({ callId, answer }) => {
      socket.to(`call:${callId}`).emit('call:answer', { from: socket.id, answer });
    });

    socket.on('call:ice', ({ callId, candidate }) => {
      socket.to(`call:${callId}`).emit('call:ice', { from: socket.id, candidate });
    });

    // ── DISCONNECT cleanup ─────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const callId = userCallStatus.get(String(userId));
      if (!callId) return;
      const call = activeCalls.get(callId);
      if (!call) { userCallStatus.delete(String(userId)); return; }

      clearTimeout(call._ringTimer);
      const duration = call.answeredAt ? Math.round((Date.now() - call.answeredAt) / 1000) : 0;
      activeCalls.delete(callId);
      userCallStatus.delete(String(call.fromUserId));
      userCallStatus.delete(String(call.toUserId));

      const otherId = call.fromUserId === String(userId) ? call.toUserId : call.fromUserId;
      ns.to(`user:${otherId}`).emit('call:ended', { callId, duration, reason: 'disconnected' });

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

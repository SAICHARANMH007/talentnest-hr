'use strict';
const { authenticate } = require('../middleware/auth');

// Deterministic conversation room name — same for both participants always
function convRoom(uid1, uid2) {
  return `conv:${[String(uid1), String(uid2)].sort().join(':')}`;
}

function setupChatSocket(io) {
  const ns = io.of('/chat');

  // Lightweight auth middleware for Socket.IO
  ns.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('AUTH_REQUIRED'));
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.userId   = decoded.userId || decoded.id;
      socket.data.name     = decoded.name   || '';
      socket.data.role     = decoded.role   || '';
      socket.data.tenantId = decoded.orgId  || '';
      if (!socket.data.userId) return next(new Error('INVALID_TOKEN'));
      next();
    } catch (e) { next(new Error('AUTH_FAILED: ' + e.message)); }
  });

  ns.on('connection', (socket) => {
    const userId = socket.data.userId;
    if (!userId) { socket.disconnect(); return; }

    // Each user joins their personal room for direct delivery
    socket.join(`user:${userId}`);

    // ── Join conversation room ─────────────────────────────────────────────
    socket.on('join-conv', ({ withUserId }) => {
      if (!withUserId) return;
      const room = convRoom(userId, withUserId);
      socket.join(room);
      socket.data.activeConvRoom = room;
    });

    socket.on('leave-conv', ({ withUserId }) => {
      if (!withUserId) return;
      const room = convRoom(userId, withUserId);
      socket.leave(room);
      if (socket.data.activeConvRoom === room) socket.data.activeConvRoom = null;
    });

    // ── Typing indicators (isolated from messages) ─────────────────────────
    const typingTimers = new Map(); // withUserId -> timer

    socket.on('typing-start', ({ withUserId }) => {
      if (!withUserId) return;
      // Send only to the other person's personal room — not broadcast
      ns.to(`user:${withUserId}`).emit('typing', {
        fromUserId: userId,
        name: socket.data.name,
      });
      // Auto-stop after 3s if client doesn't send stop
      clearTimeout(typingTimers.get(withUserId));
      typingTimers.set(withUserId, setTimeout(() => {
        ns.to(`user:${withUserId}`).emit('typing-stop', { fromUserId: userId });
        typingTimers.delete(withUserId);
      }, 3000));
    });

    socket.on('typing-stop', ({ withUserId }) => {
      if (!withUserId) return;
      clearTimeout(typingTimers.get(withUserId));
      typingTimers.delete(withUserId);
      ns.to(`user:${withUserId}`).emit('typing-stop', { fromUserId: userId });
    });

    socket.on('disconnect', () => {
      typingTimers.forEach((t, uid) => {
        clearTimeout(t);
        ns.to(`user:${uid}`).emit('typing-stop', { fromUserId: userId });
      });
      typingTimers.clear();
    });
  });
}

module.exports = { setupChatSocket, convRoom: (uid1, uid2) => `conv:${[String(uid1), String(uid2)].sort().join(':')}` };

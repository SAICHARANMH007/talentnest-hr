'use strict';
const jwt = require('jsonwebtoken');

/**
 * /platform namespace — lightweight real-time channel for pipeline events.
 * Every authenticated user joins room `tenant:<tenantId>` so stage changes
 * can be broadcast to every tab/device in the same org instantly.
 */
function setupPlatformSocket(io) {
  const ns = io.of('/platform');

  ns.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('AUTH_REQUIRED'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      socket.data.userId   = String(decoded.userId || decoded.id || '');
      socket.data.tenantId = String(decoded.tenantId || decoded.orgId || '');
      next();
    } catch (e) {
      next(new Error('AUTH_FAILED'));
    }
  });

  ns.on('connection', socket => {
    const { tenantId, userId } = socket.data;
    if (!userId) { socket.disconnect(); return; }
    if (tenantId) socket.join(`tenant:${tenantId}`);
    socket.join(`user:${userId}`);
  });
}

/**
 * Emit an event to every connected user inside a tenant.
 * Safe to call even if io is null (server still starting up).
 */
function emitToTenant(io, tenantId, event, data) {
  if (!io || !tenantId) return;
  try {
    io.of('/platform').to(`tenant:${String(tenantId)}`).emit(event, data);
  } catch { /* non-fatal */ }
}

module.exports = { setupPlatformSocket, emitToTenant };

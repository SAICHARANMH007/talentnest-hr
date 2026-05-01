'use strict';
const VideoRoom = require('../models/VideoRoom');
const email     = require('../utils/email');

// In-memory room state for fast access (authoritative state is MongoDB)
// roomToken -> { participants: Map<socketId, {userId,name,role,isGuest,isHost}>, screenSharerId: null }
const rooms = new Map();

function getRoomState(roomToken) {
  if (!rooms.has(roomToken)) rooms.set(roomToken, { participants: new Map(), screenSharerId: null });
  return rooms.get(roomToken);
}

function buildParticipantList(state) {
  return Array.from(state.participants.entries()).map(([socketId, p]) => ({ socketId, ...p }));
}

function setupVideoSocket(io) {
  const ns = io.of('/video');

  ns.on('connection', (socket) => {

    // ── JOIN ROOM ────────────────────────────────────────────────────────────
    socket.on('join-room', async ({ roomToken, userId, name, email: userEmail, role, isGuest, isHost }) => {
      try {
        const room = await VideoRoom.findOne({ roomToken });
        if (!room || room.status === 'ended') {
          socket.emit('error', { code: 'ROOM_ENDED', message: 'This meeting has ended.' });
          return;
        }
        const now = new Date();
        if (now < room.validFrom) {
          socket.emit('error', { code: 'TOO_EARLY', message: 'Too early to join.', scheduledAt: room.scheduledAt, msUntil: room.validFrom - now });
          return;
        }

        socket.join(roomToken);

        const state = getRoomState(roomToken);
        const participant = { userId: userId || socket.id, name: name || 'Guest', email: userEmail || '', role: role || 'observer', isGuest: !!isGuest, isHost: !!isHost };
        state.participants.set(socket.id, participant);

        // Update DB
        if (room.status === 'scheduled') {
          room.status = 'live';
          room.startedAt = now;
        }
        // Remove any stale entry for this userId
        room.participants = room.participants.filter(p => p.socketId !== socket.id);
        room.participants.push({ socketId: socket.id, ...participant, joinedAt: now, active: true });
        await room.save();

        // Send current room state to new participant
        socket.emit('room-state', {
          participants: buildParticipantList(state),
          chatMessages: room.chatMessages.slice(-100),
          isRecording: room.isRecording,
          screenSharerId: state.screenSharerId,
          status: room.status,
          roomToken,
        });

        // Tell everyone else a new participant joined
        socket.to(roomToken).emit('user-joined', { socketId: socket.id, ...participant });

        // System chat message
        const sysMsg = { senderId: 'system', senderName: 'System', text: `${participant.name} joined the meeting`, type: 'system', timestamp: new Date() };
        room.chatMessages.push(sysMsg);
        await room.save();
        ns.to(roomToken).emit('new-message', sysMsg);

      } catch (err) {
        console.error('[videoSocket] join-room error:', err.message);
        socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to join room.' });
      }
    });

    // ── WebRTC SIGNALING ─────────────────────────────────────────────────────
    socket.on('offer', ({ to, offer }) => {
      ns.to(to).emit('offer', { from: socket.id, offer });
    });

    socket.on('answer', ({ to, answer }) => {
      ns.to(to).emit('answer', { from: socket.id, answer });
    });

    socket.on('ice-candidate', ({ to, candidate }) => {
      ns.to(to).emit('ice-candidate', { from: socket.id, candidate });
    });

    // ── CHAT ─────────────────────────────────────────────────────────────────
    socket.on('send-message', async ({ roomToken, text }) => {
      try {
        const state = getRoomState(roomToken);
        const p = state.participants.get(socket.id);
        if (!p || !text?.trim()) return;

        const msg = { senderId: socket.id, senderName: p.name, text: text.trim(), type: 'message', timestamp: new Date() };
        await VideoRoom.updateOne({ roomToken }, { $push: { chatMessages: msg } });
        ns.to(roomToken).emit('new-message', msg);
      } catch (err) {
        console.error('[videoSocket] send-message error:', err.message);
      }
    });

    socket.on('typing-start', ({ roomToken }) => {
      const p = getRoomState(roomToken).participants.get(socket.id);
      if (p) socket.to(roomToken).emit('typing', { socketId: socket.id, name: p.name });
    });

    socket.on('typing-stop', ({ roomToken }) => {
      socket.to(roomToken).emit('stop-typing', { socketId: socket.id });
    });

    // ── SCREEN SHARING ───────────────────────────────────────────────────────
    socket.on('start-screen-share', async ({ roomToken }) => {
      const state = getRoomState(roomToken);
      const p = state.participants.get(socket.id);
      if (!p) return;

      if (state.screenSharerId && state.screenSharerId !== socket.id) {
        // Someone else is already sharing — notify requester
        socket.emit('screen-share-blocked', { sharerSocketId: state.screenSharerId, sharerName: state.participants.get(state.screenSharerId)?.name });
        return;
      }

      state.screenSharerId = socket.id;
      ns.to(roomToken).emit('screen-share-started', { socketId: socket.id, name: p.name });

      const sysMsg = { senderId: 'system', senderName: 'System', text: `${p.name} started sharing their screen`, type: 'system', timestamp: new Date() };
      await VideoRoom.updateOne({ roomToken }, { $push: { chatMessages: sysMsg } });
      ns.to(roomToken).emit('new-message', sysMsg);
    });

    socket.on('stop-screen-share', async ({ roomToken }) => {
      const state = getRoomState(roomToken);
      const p = state.participants.get(socket.id);
      if (!p) return;

      if (state.screenSharerId === socket.id) {
        state.screenSharerId = null;
        ns.to(roomToken).emit('screen-share-stopped', { socketId: socket.id });

        const sysMsg = { senderId: 'system', senderName: 'System', text: `${p.name} stopped sharing their screen`, type: 'system', timestamp: new Date() };
        await VideoRoom.updateOne({ roomToken }, { $push: { chatMessages: sysMsg } });
        ns.to(roomToken).emit('new-message', sysMsg);
      }
    });

    // Takeover request (one participant asks to take screen share from another)
    socket.on('request-screen-share-takeover', ({ roomToken }) => {
      const state = getRoomState(roomToken);
      const p = state.participants.get(socket.id);
      if (!p || !state.screenSharerId) return;
      ns.to(state.screenSharerId).emit('takeover-request', { fromSocketId: socket.id, fromName: p.name });
    });

    socket.on('approve-takeover', ({ roomToken, toSocketId }) => {
      const state = getRoomState(roomToken);
      if (state.screenSharerId !== socket.id) return;
      state.screenSharerId = null;
      ns.to(toSocketId).emit('takeover-approved');
      ns.to(roomToken).emit('screen-share-stopped', { socketId: socket.id });
    });

    socket.on('deny-takeover', ({ toSocketId }) => {
      ns.to(toSocketId).emit('takeover-denied');
    });

    // ── HOST CONTROLS ────────────────────────────────────────────────────────
    socket.on('mute-participant', ({ roomToken, targetSocketId }) => {
      const state = getRoomState(roomToken);
      const p = state.participants.get(socket.id);
      if (!p?.isHost) return;
      ns.to(targetSocketId).emit('force-muted');
      ns.to(roomToken).emit('participant-muted', { socketId: targetSocketId });
    });

    socket.on('remove-participant', async ({ roomToken, targetSocketId }) => {
      const state = getRoomState(roomToken);
      const p = state.participants.get(socket.id);
      if (!p?.isHost) return;
      ns.to(targetSocketId).emit('removed-from-room');
    });

    socket.on('start-recording', async ({ roomToken }) => {
      const state = getRoomState(roomToken);
      const p = state.participants.get(socket.id);
      if (!p?.isHost) return;
      await VideoRoom.updateOne({ roomToken }, { $set: { isRecording: true, recordingStartedAt: new Date() } });
      ns.to(roomToken).emit('recording-started');
    });

    socket.on('stop-recording', async ({ roomToken }) => {
      const state = getRoomState(roomToken);
      const p = state.participants.get(socket.id);
      if (!p?.isHost) return;
      await VideoRoom.updateOne({ roomToken }, { $set: { isRecording: false } });
      ns.to(roomToken).emit('recording-stopped');
    });

    socket.on('end-meeting', async ({ roomToken }) => {
      const state = getRoomState(roomToken);
      const p = state.participants.get(socket.id);
      if (!p?.isHost) return;

      try {
        const room = await VideoRoom.findOne({ roomToken });
        if (!room) return;
        room.status = 'ended';
        room.endedAt = new Date();
        room.isRecording = false;
        await room.save();

        ns.to(roomToken).emit('meeting-ended');
        rooms.delete(roomToken);

        // Post-session summary email
        await sendPostSessionEmail(room);
      } catch (err) {
        console.error('[videoSocket] end-meeting error:', err.message);
      }
    });

    socket.on('leave-room', async ({ roomToken }) => {
      await handleLeave(socket, roomToken, ns);
    });

    // ── DISCONNECT ───────────────────────────────────────────────────────────
    socket.on('disconnecting', async () => {
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          await handleLeave(socket, room, ns);
        }
      }
    });
  });
}

async function handleLeave(socket, roomToken, ns) {
  try {
    const state = getRoomState(roomToken);
    const p = state.participants.get(socket.id);
    if (!p) return;

    state.participants.delete(socket.id);
    if (state.screenSharerId === socket.id) {
      state.screenSharerId = null;
      ns.to(roomToken).emit('screen-share-stopped', { socketId: socket.id });
    }

    socket.to(roomToken).emit('user-left', { socketId: socket.id, name: p.name });

    // DB update
    await VideoRoom.updateOne(
      { roomToken, 'participants.socketId': socket.id },
      { $set: { 'participants.$.active': false, 'participants.$.leftAt': new Date() } }
    );

    const sysMsg = { senderId: 'system', senderName: 'System', text: `${p.name} left the meeting`, type: 'system', timestamp: new Date() };
    await VideoRoom.updateOne({ roomToken }, { $push: { chatMessages: sysMsg } });
    ns.to(roomToken).emit('new-message', sysMsg);

    // If no one left, keep room alive — Render keep-alive handles this
  } catch (err) {
    console.error('[videoSocket] handleLeave error:', err.message);
  }
}

async function sendPostSessionEmail(room) {
  try {
    const durationMs = room.endedAt - (room.startedAt || room.scheduledAt);
    const durationMin = Math.round(durationMs / 60000);
    const h = Math.floor(durationMin / 60);
    const m = durationMin % 60;
    const durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

    const transcript = room.chatMessages
      .filter(m => m.type === 'message')
      .map(m => `[${new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}] ${m.senderName}: ${m.text}`)
      .join('\n');

    const participantNames = [...new Set(room.participants.map(p => p.name))].join(', ');

    const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
  <div style="background:linear-gradient(135deg,#0176D3,#0ea5e9);padding:32px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">📋 Meeting Summary</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0">${room.jobTitle} — ${room.orgName}</p>
  </div>
  <div style="padding:32px;background:#F8FAFC;border-radius:0 0 12px 12px">
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr><td style="padding:10px;background:#fff;font-weight:700;width:40%;border-radius:6px">Date</td><td style="padding:10px">${room.endedAt?.toLocaleDateString('en-IN', { weekday:'long',day:'2-digit',month:'long',year:'numeric' })}</td></tr>
      <tr><td style="padding:10px;background:#fff;font-weight:700;border-radius:6px;margin-top:4px">Duration</td><td style="padding:10px">${durationStr}</td></tr>
      <tr><td style="padding:10px;background:#fff;font-weight:700;border-radius:6px">Participants</td><td style="padding:10px">${participantNames}</td></tr>
    </table>
    ${transcript ? `<div style="background:#fff;border-radius:8px;padding:20px"><h3 style="margin:0 0 12px;color:#0176D3;font-size:14px;text-transform:uppercase;letter-spacing:1px">Chat Transcript</h3><pre style="font-family:monospace;font-size:12px;color:#374151;white-space:pre-wrap;line-height:1.6">${transcript}</pre></div>` : '<p style="color:#94A3B8;text-align:center">No chat messages recorded.</p>'}
    <p style="text-align:center;color:#94A3B8;font-size:12px;margin-top:24px">TalentNest HR · Interview Platform</p>
  </div>
</div>`;

    const emails = [...new Set(room.participants.filter(p => p.email).map(p => p.email))];
    for (const addr of emails) {
      email.sendEmailWithRetry(addr, `Meeting Summary — ${room.jobTitle} | ${room.orgName}`, html).catch(() => {});
    }
  } catch (err) {
    console.error('[videoSocket] post-session email error:', err.message);
  }
}

module.exports = { setupVideoSocket };

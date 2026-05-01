import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import GuestJoin from './GuestJoin.jsx';
import { API_BASE_URL } from '../../api/config.js';

// ── Config ───────────────────────────────────────────────────────────────────
const SOCKET_URL = API_BASE_URL.replace('/api', '');
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// ── Participant Tile ─────────────────────────────────────────────────────────
function VideoTile({ stream, name, isMuted, isCamOff, isLocal, isHost, onMute, onRemove, showControls }) {
  const vidRef = useRef(null);
  useEffect(() => {
    if (vidRef.current && stream) vidRef.current.srcObject = stream;
  }, [stream]);

  const initials = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ position: 'relative', background: '#1E293B', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {stream && !isCamOff ? (
        <video ref={vidRef} autoPlay playsInline muted={isLocal} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#0176D3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#fff' }}>
          {initials}
        </div>
      )}
      {/* Name + mic status */}
      <div style={{ position: 'absolute', bottom: 8, left: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
          {name}{isLocal ? ' (You)' : ''}
        </span>
        {isMuted && <span style={{ background: 'rgba(0,0,0,0.65)', padding: '3px 6px', borderRadius: 6, fontSize: 12 }}>🔇</span>}
      </div>
      {/* Host controls */}
      {showControls && !isLocal && (
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
          <button onClick={onMute} style={tileBtn} title="Mute">🔇</button>
          <button onClick={onRemove} style={{ ...tileBtn, background: 'rgba(220,38,38,0.8)' }} title="Remove">✕</button>
        </div>
      )}
    </div>
  );
}

const tileBtn = { background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 };

// ── Screen Share View ────────────────────────────────────────────────────────
function ScreenShareView({ stream, sharerName }) {
  const vidRef = useRef(null);
  useEffect(() => {
    if (vidRef.current && stream) vidRef.current.srcObject = stream;
  }, [stream]);
  return (
    <div style={{ position: 'relative', background: '#000', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, overflow: 'hidden' }}>
      <video ref={vidRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(1,118,211,0.9)', color: '#fff', padding: '4px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700 }}>
        📺 {sharerName} is sharing their screen
      </div>
    </div>
  );
}

// ── Chat Panel ───────────────────────────────────────────────────────────────
function ChatPanel({ messages, onSend, typingUsers, roomToken, socket }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const isTyping = useRef(false);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleTyping = (val) => {
    setText(val);
    if (!isTyping.current) {
      isTyping.current = true;
      socket?.emit('typing-start', { roomToken });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
      socket?.emit('typing-stop', { roomToken });
    }, 2000);
  };

  const send = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
    if (isTyping.current) {
      isTyping.current = false;
      socket?.emit('typing-stop', { roomToken });
    }
  };

  const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div style={{ width: 300, background: '#0F172A', display: 'flex', flexDirection: 'column', borderRadius: '0 0 0 12px', borderLeft: '1px solid #1E293B' }}>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #1E293B' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>💬 Chat</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map((m, i) => m.type === 'system' ? (
          <div key={i} style={{ textAlign: 'center' }}>
            <span style={{ background: '#1E293B', color: '#94A3B8', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>{m.text}</span>
          </div>
        ) : (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: '#0ea5e9', fontSize: 11, fontWeight: 700 }}>{m.senderName}</span>
              <span style={{ color: '#475569', fontSize: 10 }}>{fmtTime(m.timestamp)}</span>
            </div>
            <div style={{ background: '#1E293B', borderRadius: '0 8px 8px 8px', padding: '8px 10px', color: '#E2E8F0', fontSize: 13, wordBreak: 'break-word' }}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {typingUsers.length > 0 && (
        <div style={{ padding: '4px 12px', color: '#64748B', fontSize: 11, fontStyle: 'italic' }}>
          {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}
      <div style={{ padding: 12, borderTop: '1px solid #1E293B', display: 'flex', gap: 8 }}>
        <input
          value={text}
          onChange={e => handleTyping(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Message..."
          style={{ flex: 1, background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }}
        />
        <button onClick={send} disabled={!text.trim()} style={{ background: '#0176D3', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer', fontSize: 16, opacity: text.trim() ? 1 : 0.5 }}>➤</button>
      </div>
    </div>
  );
}

// ── Control Bar ──────────────────────────────────────────────────────────────
function ControlBar({ micOn, camOn, isSharingScreen, chatOpen, isRecording, isHost, onToggleMic, onToggleCam, onToggleScreen, onToggleChat, onToggleParticipants, onToggleRecording, onLeave, onEndMeeting }) {
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0F172A', borderTop: '1px solid #1E293B', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 100 }}>
      <CtrlBtn icon={micOn ? '🎙️' : '🔇'} label={micOn ? 'Mute' : 'Unmute'} active={micOn} onClick={onToggleMic} danger={!micOn} />
      <CtrlBtn icon={camOn ? '📹' : '📵'} label={camOn ? 'Stop Video' : 'Start Video'} active={camOn} onClick={onToggleCam} danger={!camOn} />
      <CtrlBtn icon={isSharingScreen ? '🛑' : '🖥️'} label={isSharingScreen ? 'Stop Share' : 'Share Screen'} active={isSharingScreen} onClick={onToggleScreen} />
      <CtrlBtn icon="💬" label="Chat" active={chatOpen} onClick={onToggleChat} />
      <CtrlBtn icon="👥" label="People" active={false} onClick={onToggleParticipants} />
      {isHost && <CtrlBtn icon={isRecording ? '⏹️' : '⏺️'} label={isRecording ? 'Stop Rec' : 'Record'} active={isRecording} onClick={onToggleRecording} style={{ color: isRecording ? '#EF4444' : undefined }} />}
      <div style={{ flex: 1 }} />
      {isHost ? (
        <CtrlBtn icon="📵" label="End Meeting" onClick={onEndMeeting} danger />
      ) : (
        <CtrlBtn icon="🚪" label="Leave" onClick={onLeave} danger />
      )}
    </div>
  );
}

function CtrlBtn({ icon, label, active, onClick, danger }) {
  return (
    <button onClick={onClick} title={label} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      background: danger ? '#DC2626' : (active ? '#0176D3' : '#1E293B'),
      border: 'none', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', color: '#fff', minWidth: 64,
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}

// ── Participants Panel ───────────────────────────────────────────────────────
function ParticipantsPanel({ participants, localSocketId, isHost, onMute, onRemove, onClose }) {
  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 80, width: 280, background: '#0F172A', borderLeft: '1px solid #1E293B', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontWeight: 700 }}>👥 Participants ({participants.length})</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 18 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {participants.map(p => (
          <div key={p.socketId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 8, marginBottom: 4, background: '#1E293B' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: p.isHost ? '#0176D3' : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
              {(p.name || '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name} {p.socketId === localSocketId ? '(You)' : ''} {p.isHost ? '👑' : ''}
              </div>
              <div style={{ color: '#64748B', fontSize: 11, textTransform: 'capitalize' }}>{p.role || 'participant'}</div>
            </div>
            {isHost && p.socketId !== localSocketId && (
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => onMute(p.socketId)} style={{ ...smallBtn }} title="Mute">🔇</button>
                <button onClick={() => onRemove(p.socketId)} style={{ ...smallBtn, background: '#7F1D1D' }} title="Remove">✕</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const smallBtn = { background: '#334155', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12 };

// ── Main Meeting Room ────────────────────────────────────────────────────────
export default function MeetingRoom() {
  const { roomToken } = useParams();

  // Auth check
  const storedUser = (() => { try { return JSON.parse(sessionStorage.getItem('tn_user')); } catch { return null; } })();
  const isAuthenticated = !!(storedUser?.id || storedUser?._id);

  const [guestIdentity, setGuestIdentity] = useState(null);
  const [joined, setJoined] = useState(false);

  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [peers, setPeers] = useState({}); // socketId -> { stream, name, role, isHost, isMuted, isCamOff }
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [screenSharerId, setScreenSharerId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [chatOpen, setChatOpen] = useState(true);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [roomMeta, setRoomMeta] = useState(null);
  const [permError, setPermError] = useState('');
  const [toast, setToast] = useState('');
  const [takeoverRequest, setTakeoverRequest] = useState(null);

  const socketRef = useRef(null);
  const peerConnsRef = useRef({}); // socketId -> RTCPeerConnection
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  const mySocketId = socketRef.current?.id;

  const identity = isAuthenticated
    ? { userId: storedUser.id || storedUser._id, name: storedUser.name, email: storedUser.email, role: storedUser.role === 'recruiter' || storedUser.role === 'admin' || storedUser.role === 'super_admin' ? 'interviewer' : 'candidate', isGuest: false, isHost: false }
    : (guestIdentity ? { ...guestIdentity } : null);

  // ── Show guest form if not authenticated ─────────────────────────────────
  if (!isAuthenticated && !guestIdentity) {
    return <GuestJoin roomToken={roomToken} onJoin={(g) => setGuestIdentity(g)} />;
  }

  // ── Join Room ─────────────────────────────────────────────────────────────
  const enterRoom = useCallback(async () => {
    if (joined) return;
    setJoined(true);

    // 1. Get user media
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (e) {
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setPermError('Camera and microphone access was denied. Please allow access in your browser settings and reload the page.');
        return;
      }
      // Try audio only
      try { stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true }); }
      catch { stream = new MediaStream(); }
    }
    localStreamRef.current = stream;
    setLocalStream(stream);

    // 2. Connect to Socket.IO
    const token = sessionStorage.getItem('tn_token') || '';
    const socket = io(`${SOCKET_URL}/video`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', {
        roomToken,
        userId: identity.userId,
        name: identity.name,
        email: identity.email,
        role: identity.role,
        isGuest: identity.isGuest,
        isHost: identity.isHost,
      });
    });

    socket.on('room-state', ({ participants: pList, chatMessages: msgs, isRecording: rec, screenSharerId: ssId, status }) => {
      if (status === 'ended') { setMeetingEnded(true); return; }
      setChatMessages(msgs || []);
      setIsRecording(rec || false);
      setScreenSharerId(ssId || null);
      setParticipants(pList || []);

      // Initiate offers to all existing participants
      pList.forEach(p => {
        if (p.socketId !== socket.id) {
          initiateCall(socket, p.socketId, stream);
        }
      });
    });

    socket.on('user-joined', (participant) => {
      setParticipants(prev => [...prev.filter(p => p.socketId !== participant.socketId), participant]);
      showToast(`${participant.name} joined`);
    });

    socket.on('user-left', ({ socketId, name }) => {
      setParticipants(prev => prev.filter(p => p.socketId !== socketId));
      setPeers(prev => { const n = { ...prev }; delete n[socketId]; return n; });
      if (peerConnsRef.current[socketId]) {
        peerConnsRef.current[socketId].close();
        delete peerConnsRef.current[socketId];
      }
      showToast(`${name} left`);
    });

    // WebRTC signaling
    socket.on('offer', async ({ from, offer }) => {
      const pc = createPeerConn(socket, from, stream);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { to: from, answer });
    });

    socket.on('answer', async ({ from, answer }) => {
      const pc = peerConnsRef.current[from];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice-candidate', ({ from, candidate }) => {
      const pc = peerConnsRef.current[from];
      if (pc && candidate) pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    });

    // Chat
    socket.on('new-message', (msg) => setChatMessages(prev => [...prev, msg]));
    socket.on('typing', ({ socketId, name }) => setTypingUsers(prev => [...prev.filter(u => u.socketId !== socketId), { socketId, name }]));
    socket.on('stop-typing', ({ socketId }) => setTypingUsers(prev => prev.filter(u => u.socketId !== socketId)));

    // Screen share
    socket.on('screen-share-started', ({ socketId, name }) => {
      setScreenSharerId(socketId);
      if (socketId !== socket.id) showToast(`${name} is sharing their screen`);
    });
    socket.on('screen-share-stopped', ({ socketId }) => {
      setScreenSharerId(null);
      if (socketId === socket.id) {
        setIsSharingScreen(false);
        if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(t => t.stop()); screenStreamRef.current = null; setScreenStream(null); }
      }
    });
    socket.on('screen-share-blocked', ({ sharerName }) => showToast(`${sharerName} is already sharing. Request takeover?`));
    socket.on('takeover-request', ({ fromSocketId, fromName }) => setTakeoverRequest({ fromSocketId, fromName }));
    socket.on('takeover-approved', () => startScreenShareAfterApproval(socket, stream));
    socket.on('takeover-denied', () => showToast('Takeover request was denied.'));

    // Host controls
    socket.on('force-muted', () => { setMicOn(false); localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = false; }); showToast('You were muted by the host'); });
    socket.on('removed-from-room', () => { setMeetingEnded(true); showToast('You were removed from the meeting'); });
    socket.on('recording-started', () => { setIsRecording(true); showToast('Recording started'); });
    socket.on('recording-stopped', () => { setIsRecording(false); showToast('Recording stopped'); });
    socket.on('meeting-ended', () => setMeetingEnded(true));

    socket.on('error', ({ code, message }) => {
      if (code === 'TOO_EARLY') { /* handled in GuestJoin */ }
      else if (code === 'ROOM_ENDED') setMeetingEnded(true);
      else showToast(message);
    });

  }, [roomToken, joined, identity?.userId]);

  // Auto-enter room once identity is set
  useEffect(() => { if (identity && !joined) enterRoom(); }, [identity, joined]);

  // Cleanup on unmount
  useEffect(() => () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    Object.values(peerConnsRef.current).forEach(pc => pc.close());
    socketRef.current?.disconnect();
  }, []);

  // ── WebRTC helpers ───────────────────────────────────────────────────────
  function createPeerConn(socket, remoteSocketId, stream) {
    if (peerConnsRef.current[remoteSocketId]) return peerConnsRef.current[remoteSocketId];
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnsRef.current[remoteSocketId] = pc;

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.onicecandidate = ({ candidate }) => { if (candidate) socket.emit('ice-candidate', { to: remoteSocketId, candidate }); };

    pc.ontrack = (e) => {
      const remoteStream = e.streams[0];
      setPeers(prev => ({ ...prev, [remoteSocketId]: { ...prev[remoteSocketId], stream: remoteStream } }));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        pc.restartIce();
      }
    };

    return pc;
  }

  async function initiateCall(socket, remoteSocketId, stream) {
    const pc = createPeerConn(socket, remoteSocketId, stream);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('offer', { to: remoteSocketId, offer });
  }

  // ── Controls ─────────────────────────────────────────────────────────────
  const toggleMic = () => {
    const tracks = localStreamRef.current?.getAudioTracks();
    if (!tracks?.length) return;
    const newState = !micOn;
    tracks.forEach(t => { t.enabled = newState; });
    setMicOn(newState);
  };

  const toggleCam = () => {
    const tracks = localStreamRef.current?.getVideoTracks();
    if (!tracks?.length) return;
    const newState = !camOn;
    tracks.forEach(t => { t.enabled = newState; });
    setCamOn(newState);
  };

  const toggleScreenShare = async () => {
    if (isSharingScreen) {
      socketRef.current?.emit('stop-screen-share', { roomToken });
    } else {
      if (screenSharerId && screenSharerId !== socketRef.current?.id) {
        socketRef.current?.emit('request-screen-share-takeover', { roomToken });
        return;
      }
      try {
        const ss = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = ss;
        setScreenStream(ss);
        setIsSharingScreen(true);

        // Replace video track in all peer connections
        const screenTrack = ss.getVideoTracks()[0];
        Object.values(peerConnsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        ss.getVideoTracks()[0].onended = () => {
          socketRef.current?.emit('stop-screen-share', { roomToken });
        };

        socketRef.current?.emit('start-screen-share', { roomToken });
      } catch (e) {
        if (e.name !== 'NotAllowedError') console.error('Screen share error:', e.message);
      }
    }
  };

  const startScreenShareAfterApproval = async (socket, stream) => {
    try {
      const ss = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = ss;
      setScreenStream(ss);
      setIsSharingScreen(true);
      const screenTrack = ss.getVideoTracks()[0];
      Object.values(peerConnsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
      });
      ss.getVideoTracks()[0].onended = () => socket.emit('stop-screen-share', { roomToken });
      socket.emit('start-screen-share', { roomToken });
    } catch (e) { /* user cancelled */ }
  };

  const sendMessage = (text) => {
    socketRef.current?.emit('send-message', { roomToken, text });
  };

  const toggleRecording = () => {
    if (isRecording) socketRef.current?.emit('stop-recording', { roomToken });
    else socketRef.current?.emit('start-recording', { roomToken });
  };

  const endMeeting = () => socketRef.current?.emit('end-meeting', { roomToken });

  const leaveMeeting = () => {
    socketRef.current?.emit('leave-room', { roomToken });
    socketRef.current?.disconnect();
    setMeetingEnded(true);
  };

  const muteParticipant = (targetSocketId) => socketRef.current?.emit('mute-participant', { roomToken, targetSocketId });
  const removeParticipant = (targetSocketId) => socketRef.current?.emit('remove-participant', { roomToken, targetSocketId });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ── Build participant list from peers + local ────────────────────────────
  const participantEntries = [
    { socketId: socketRef.current?.id || 'local', stream: localStream, name: identity?.name || 'You', isLocal: true, isHost: identity?.isHost, isMuted: !micOn, isCamOff: !camOn },
    ...Object.entries(peers).map(([sid, p]) => {
      const meta = participants.find(x => x.socketId === sid) || {};
      return { socketId: sid, stream: p.stream, name: meta.name || 'Participant', isLocal: false, isHost: meta.isHost, isMuted: false, isCamOff: false };
    }),
  ].filter(Boolean);

  const screenSharer = participantEntries.find(p => p.socketId === screenSharerId);

  // ── Ended State ──────────────────────────────────────────────────────────
  if (meetingEnded) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0F172A,#1E293B)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 48, textAlign: 'center', maxWidth: 440 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: '#0F172A', marginBottom: 8 }}>Meeting Ended</h2>
        <p style={{ color: '#64748B', marginBottom: 24 }}>Thank you for your time. A meeting summary will be sent to your email.</p>
        <button onClick={() => window.close()} style={{ background: '#0176D3', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Close</button>
      </div>
    </div>
  );

  // ── Permission Error ──────────────────────────────────────────────────────
  if (permError) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0F172A,#1E293B)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 48, textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎙️</div>
        <h2 style={{ color: '#DC2626', marginBottom: 12 }}>Camera/Microphone Blocked</h2>
        <p style={{ color: '#374151', lineHeight: 1.6 }}>{permError}</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: 24, background: '#0176D3', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Try Again</button>
      </div>
    </div>
  );

  // ── Grid layout ──────────────────────────────────────────────────────────
  const numParticipants = participantEntries.length;
  const gridCols = numParticipants <= 1 ? 1 : numParticipants <= 2 ? 2 : numParticipants <= 4 ? 2 : 3;

  const isLocalHost = identity?.isHost;

  return (
    <div style={{ minHeight: '100vh', background: '#0A1628', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: '#0F172A', borderBottom: '1px solid #1E293B', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#0176D3', fontWeight: 900, fontSize: 16 }}>TalentNest</span>
          <span style={{ color: '#334155', fontSize: 14 }}>|</span>
          <span style={{ color: '#94A3B8', fontSize: 13 }}>{roomMeta?.jobTitle || 'Interview Room'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isRecording && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#7F1D1D', padding: '4px 12px', borderRadius: 20 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite' }} />
              <span style={{ color: '#FCA5A5', fontSize: 12, fontWeight: 700 }}>REC</span>
            </div>
          )}
          <span style={{ color: '#64748B', fontSize: 12 }}>{participantEntries.length} participant{participantEntries.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', paddingBottom: 80 }}>
        {/* Video area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px', gap: 12, overflow: 'hidden' }}>
          {screenSharerId ? (
            // Screen share layout
            <div style={{ flex: 1, display: 'flex', gap: 12 }}>
              <ScreenShareView
                stream={screenSharerId === (socketRef.current?.id) ? screenStream : peers[screenSharerId]?.stream}
                sharerName={screenSharer?.name || 'Participant'}
              />
              {/* Thumbnail strip */}
              <div style={{ width: 180, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                {participantEntries.map(p => (
                  <div key={p.socketId} style={{ height: 100, flexShrink: 0 }}>
                    <VideoTile {...p} showControls={isLocalHost} onMute={() => muteParticipant(p.socketId)} onRemove={() => removeParticipant(p.socketId)} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Normal grid
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 12, alignContent: 'start' }}>
              {participantEntries.map(p => (
                <VideoTile key={p.socketId} {...p} showControls={isLocalHost} onMute={() => muteParticipant(p.socketId)} onRemove={() => removeParticipant(p.socketId)} />
              ))}
            </div>
          )}
        </div>

        {/* Chat Panel */}
        {chatOpen && (
          <ChatPanel messages={chatMessages} onSend={sendMessage} typingUsers={typingUsers.filter(u => u.socketId !== socketRef.current?.id)} roomToken={roomToken} socket={socketRef.current} />
        )}

        {/* Participants Panel */}
        {participantsOpen && (
          <ParticipantsPanel
            participants={participants}
            localSocketId={socketRef.current?.id}
            isHost={isLocalHost}
            onMute={muteParticipant}
            onRemove={removeParticipant}
            onClose={() => setParticipantsOpen(false)}
          />
        )}
      </div>

      {/* Control Bar */}
      <ControlBar
        micOn={micOn}
        camOn={camOn}
        isSharingScreen={isSharingScreen}
        chatOpen={chatOpen}
        isRecording={isRecording}
        isHost={isLocalHost}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onToggleScreen={toggleScreenShare}
        onToggleChat={() => setChatOpen(v => !v)}
        onToggleParticipants={() => setParticipantsOpen(v => !v)}
        onToggleRecording={toggleRecording}
        onLeave={leaveMeeting}
        onEndMeeting={endMeeting}
      />

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,23,42,0.92)', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 999, backdropFilter: 'blur(10px)', border: '1px solid #1E293B', pointerEvents: 'none' }}>
          {toast}
        </div>
      )}

      {/* Takeover request */}
      {takeoverRequest && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#1E293B', border: '1px solid #334155', borderRadius: 14, padding: 28, zIndex: 200, textAlign: 'center', width: 320 }}>
          <p style={{ color: '#fff', marginBottom: 16 }}><strong>{takeoverRequest.fromName}</strong> wants to take over screen sharing.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => { socketRef.current?.emit('approve-takeover', { roomToken, toSocketId: takeoverRequest.fromSocketId }); setTakeoverRequest(null); setIsSharingScreen(false); }} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700 }}>Allow</button>
            <button onClick={() => { socketRef.current?.emit('deny-takeover', { toSocketId: takeoverRequest.fromSocketId }); setTakeoverRequest(null); }} style={{ background: '#475569', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700 }}>Deny</button>
          </div>
        </div>
      )}
    </div>
  );
}

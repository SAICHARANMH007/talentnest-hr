import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import GuestJoin from './GuestJoin.jsx';
import { api, initAuth, setToken } from '../../api/api.js';
import { SOCKET_BASE_URL } from '../../api/config.js';

// ── Config ───────────────────────────────────────────────────────────────────
const SOCKET_URL = SOCKET_BASE_URL;
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  // TURN relay — required for corporate networks, mobile data, and strict firewalls
  { urls: 'turn:openrelay.metered.ca:80',  username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
];

const btnP = { background: 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 800, fontSize: 13, cursor: 'pointer' };
const btnG = { background: '#1E293B', color: '#fff', border: '1px solid #334155', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer' };

// ── Reschedule Modal ─────────────────────────────────────────────────────────
function RescheduleModal({ onSave, onClose, initialDate }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialDate) {
      const d = new Date(initialDate);
      setDate(d.toISOString().split('T')[0]);
      setTime(d.toTimeString().slice(0, 5));
    }
  }, [initialDate]);

  const handleSave = async () => {
    if (!date || !time) return;
    setSaving(true);
    await onSave({ date, time });
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 24, padding: 32, width: '100%', maxWidth: 400, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>Reschedule Interview</h3>
        <p style={{ color: '#94A3B8', fontSize: 14, margin: '0 0 24px' }}>Choose a new date and time. Both parties will be notified via email.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>DATE</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 10, background: '#1E293B', border: '1px solid #334155', color: '#fff', outline: 'none' }} />
          </div>
          <div>
            <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>TIME</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 10, background: '#1E293B', border: '1px solid #334155', color: '#fff', outline: 'none' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handleSave} disabled={saving} style={{ ...btnP, flex: 1, padding: 14 }}>{saving ? 'Updating...' : 'Update Schedule'}</button>
          <button onClick={onClose} style={{ ...btnG, flex: 1, padding: 14 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Participant Tile ─────────────────────────────────────────────────────────
function VideoTile({ stream, name, isMuted, isCamOff, isLocal, isHost, onMute, onRemove, showControls }) {
  const vidRef = useRef(null);
  const audioRef = useRef(null); // dedicated <audio> for remote participants — avoids React muted-prop bug

  useEffect(() => {
    if (!stream) return;
    // Video element: always muted (audio routed separately below for remote peers)
    if (vidRef.current) {
      vidRef.current.srcObject = stream;
      vidRef.current.muted = true; // video element stays muted — audio below handles it
      vidRef.current.play().catch(() => {});
    }
    // Audio element: remote peers only — plays their voice
    if (!isLocal && audioRef.current) {
      audioRef.current.srcObject = stream;
      audioRef.current.muted = false;
      audioRef.current.volume = 1;
      audioRef.current.play().catch(() => {});
    }
  }, [stream, isLocal]);

  const initials = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ position: 'relative', background: '#1E293B', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Hidden audio element for remote participants — avoids React muted-prop bug on <video> */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />}
      {stream && !isCamOff ? (
        <video ref={vidRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
function ControlBar({ micOn, camOn, isSharingScreen, chatOpen, isRecording, isHost, onToggleMic, onToggleCam, onToggleScreen, onToggleChat, onToggleParticipants, onToggleRecording, onLeave, onEndMeeting, onReschedule, onCopyLink }) {
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 100 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <CtrlBtn icon={micOn ? '🎙️' : '🔇'} label={micOn ? 'Mute' : 'Unmute'} active={micOn} onClick={onToggleMic} danger={!micOn} />
        <CtrlBtn icon={camOn ? '📹' : '📵'} label={camOn ? 'Stop Video' : 'Start Video'} active={camOn} onClick={onToggleCam} danger={!camOn} />
      </div>
      
      <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />

      <div style={{ display: 'flex', gap: 8 }}>
        <CtrlBtn icon={isSharingScreen ? '🛑' : '🖥️'} label={isSharingScreen ? 'Stop Share' : 'Share'} active={isSharingScreen} onClick={onToggleScreen} />
        <CtrlBtn icon="💬" label="Chat" active={chatOpen} onClick={onToggleChat} />
        <CtrlBtn icon="👥" label="People" active={false} onClick={onToggleParticipants} />
        {isHost && <CtrlBtn icon={isRecording ? '⏹️' : '⏺️'} label={isRecording ? 'Stop Rec' : 'Record'} active={isRecording} onClick={onToggleRecording} style={{ color: isRecording ? '#EF4444' : undefined }} />}
        <CtrlBtn icon="🔗" label="Invite" onClick={onCopyLink} />
        {isHost && <CtrlBtn icon="📅" label="Reschedule" onClick={onReschedule} />}
      </div>

      <div style={{ flex: 1 }} />
      {isHost ? (
        <button onClick={onEndMeeting} style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 16px rgba(239, 68, 68, 0.25)' }}>
          <span style={{ fontSize: 18 }}>📵</span> End Meeting
        </button>
      ) : (
        <button onClick={onLeave} style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🚪</span> Leave Room
        </button>
      )}
    </div>
  );
}

function CtrlBtn({ icon, label, active, onClick, danger, style }) {
  return (
    <button onClick={onClick} title={label} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      background: danger ? 'rgba(220, 38, 38, 0.15)' : (active ? 'rgba(1, 118, 211, 0.15)' : 'rgba(255,255,255,0.05)'),
      border: `1px solid ${danger ? '#EF4444' : (active ? '#0176D3' : 'rgba(255,255,255,0.1)')}`,
      borderRadius: 14, padding: '10px 14px', cursor: 'pointer', color: danger ? '#EF4444' : (active ? '#38BDF8' : '#94A3B8'), minWidth: 64,
      transition: 'all 0.2s', ...style
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</span>
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

  // ── Auth bootstrap ─────────────────────────────────────────────────────────
  // sessionStorage is tab-isolated — a new tab (window.open) starts empty.
  // We call initAuth() which exchanges the HTTP-only refresh cookie for a
  // fresh access token, exactly the same way App.jsx bootstraps on load.
  // While auth is resolving we show a loader — never the guest join form.
  const [authLoading, setAuthLoading] = useState(true);
  const [storedUser, setStoredUser] = useState(() => {
    // Try sessionStorage first — works when navigating within the same tab
    try { return JSON.parse(sessionStorage.getItem('tn_user')); } catch { return null; }
  });

  useEffect(() => {
    // If we already have the user in sessionStorage (same-tab navigation), skip initAuth
    if (storedUser?.id || storedUser?._id) {
      setAuthLoading(false);
      return;
    }
    // New tab: no sessionStorage — try the refresh-token cookie
    initAuth().then(result => {
      if (result?.user) {
        sessionStorage.setItem('tn_user', JSON.stringify(result.user));
        if (result.token) setToken(result.token);
        setStoredUser(result.user);
      }
      // If result is null the user is genuinely not logged in — guest form shown
    }).catch(() => {
      // Network error — leave storedUser as null, guest form shown
    }).finally(() => setAuthLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isAuthenticated = !!(storedUser?.id || storedUser?._id);
  const isPossiblyLoggedIn = localStorage.getItem('tn_logged_in') === 'true';

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
  const [meetingNotHappened, setMeetingNotHappened] = useState(false);
  const [hasHadConnection, setHasHadConnection] = useState(false);
  const [roomMeta, setRoomMeta] = useState(null);
  const [permError, setPermError] = useState('');
  const [toast, setToast] = useState('');
  const [takeoverRequest, setTakeoverRequest] = useState(null);
  const [showReschedule, setShowReschedule] = useState(false);

  const socketRef = useRef(null);
  const peerConnsRef = useRef({}); // socketId -> RTCPeerConnection
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  const mySocketId = socketRef.current?.id;

  const isRecruiter = storedUser?.role === 'recruiter' || storedUser?.role === 'admin' || storedUser?.role === 'super_admin';
  const identity = isAuthenticated
    ? { 
        userId: storedUser.id || storedUser._id, 
        name: storedUser.name, 
        email: storedUser.email, 
        role: isRecruiter ? 'interviewer' : 'candidate', 
        isGuest: false, 
        isHost: isRecruiter 
      }
    : (guestIdentity ? { 
        ...guestIdentity, 
        userId: `guest_${Math.random().toString(36).slice(2, 9)}`, 
        role: 'candidate', 
        isHost: false 
      } : null);

  // ── Load Room Metadata ────────────────────────────────────────────────────
  useEffect(() => {
    api.getRoom(roomToken)
      .then(data => setRoomMeta(data?.data || data))
      .catch(err => console.error('[Room] Load failed:', err));
  }, [roomToken]);


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
      // 3. Notify the other party via the global signaling socket (/call namespace)
      const notifySocket = io(`${SOCKET_URL}/call`, { auth: { token } });
      notifySocket.emit('meeting:notify-join', { roomToken, name: identity.name, role: identity.role });
      setTimeout(() => notifySocket.disconnect(), 5000); 
    });

    socket.on('room-state', ({ participants: pList, chatMessages: msgs, isRecording: rec, screenSharerId: ssId, status }) => {
      setParticipants(pList);
      if (pList.length >= 2) setHasHadConnection(true);
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

  // ── Interview Lifecycle & Expiry ──────────────────────────────────────────
  useEffect(() => {
    if (!roomMeta) return;
    const check = () => {
      const now = new Date();
      const scheduled = roomMeta.scheduledAt ? new Date(roomMeta.scheduledAt) : null;
      if (scheduled && (now - scheduled) > (2 * 60 * 60 * 1000)) {
        if (!hasHadConnection && (roomMeta.participants?.length || 0) < 2) {
          setMeetingNotHappened(true);
        } else {
          setMeetingEnded(true);
        }
      }
    };
    check();
    const inv = setInterval(check, 60000); // Check every minute
    return () => clearInterval(inv);
  }, [roomMeta, hasHadConnection]);

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

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Invite link copied to clipboard');
  };

  const handleReschedule = async ({ date, time }) => {
    if (!roomMeta?.interviewId) return;
    try {
      const res = await api.scheduleInterview(roomMeta.interviewId, { date, time, format: 'video' });
      if (res.success) {
        showToast('Interview rescheduled successfully');
        setShowReschedule(false);
        // Sync local metadata
        setRoomMeta(prev => ({ ...prev, scheduledAt: new Date(`${date}T${time}`) }));
        // Notify others via chat
        sendMessage(`📅 Interview rescheduled to ${new Date(`${date}T${time}`).toLocaleString('en-IN')}`);
      } else showToast(res.message || 'Reschedule failed');
    } catch (err) { showToast('Error rescheduling interview'); }
  };

  // ── Build participant list from peers + local ────────────────────────────
  const participantEntries = [
    { socketId: socketRef.current?.id || 'local', stream: localStream, name: identity?.name || 'You', isLocal: true, isHost: identity?.isHost, isMuted: !micOn, isCamOff: !camOn },
    ...Object.entries(peers).map(([sid, p]) => {
      const meta = participants.find(x => x.socketId === sid) || {};
      return { socketId: sid, stream: p.stream, name: meta.name || 'Participant', isLocal: false, isHost: meta.isHost, isMuted: false, isCamOff: false };
    }),
  ].filter(Boolean);

  const screenSharer = participantEntries.find(p => p.socketId === screenSharerId);

  // ── Show guest form only if NOT authenticated and NOT even trying to authenticate ──
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
        <div style={{ width: 50, height: 50, border: '3px solid rgba(1,118,211,0.1)', borderTopColor: '#0176D3', borderRadius: '50%', animation: 'tn-spin 1s linear infinite' }} />
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#fff', margin: '0 0 4px', fontSize: 18 }}>Restoring your session...</h3>
          <p style={{ color: '#64748B', margin: 0, fontSize: 14 }}>Connecting to TalentNest secure meeting servers</p>
        </div>
        <style>{`@keyframes tn-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated && !guestIdentity) {
    // If localStorage says we are logged in, but initAuth failed (e.g. cold start), show a re-sync option instead of guest form
    if (isPossiblyLoggedIn) {
      return (
        <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 40, maxWidth: 400, textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🔑</div>
            <h2 style={{ color: '#0F172A', fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Session Synchronization</h2>
            <p style={{ color: '#64748B', lineHeight: 1.6, marginBottom: 24 }}>
              We detected you are logged in, but your session needs a quick refresh to enter this meeting room as an interviewer.
            </p>
            <button onClick={() => window.location.reload()} style={{ ...btnP, width: '100%', padding: '14px' }}>
              Refresh Session
            </button>
            <button 
              onClick={() => setGuestIdentity({ name: 'Guest User', email: '', isGuest: true })} 
              style={{ background: 'none', border: 'none', color: '#64748B', marginTop: 16, cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}
            >
              Continue as Guest instead
            </button>
          </div>
        </div>
      );
    }
    return <GuestJoin roomToken={roomToken} onJoin={(g) => setGuestIdentity(g)} />;
  }

  // ── Ended State ──────────────────────────────────────────────────────────
  if (meetingNotHappened) {
    return (
      <div style={{ height: '100dvh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 460, width: '100%', background: '#fff', borderRadius: 24, padding: 40, textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>📅</div>
          <h2 style={{ color: '#0F172A', fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Meeting Did Not Happen</h2>
          <p style={{ color: '#64748B', lineHeight: 1.6, marginBottom: 32 }}>
            This interview session was scheduled but no connection was established. The link has now expired.
          </p>
          {isHost ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button 
                onClick={() => window.location.href = `/app/interviews`}
                style={{ ...btnP, width: '100%', padding: '14px' }}
              >
                Reschedule Interview
              </button>
              <button onClick={() => window.location.href = '/app/dashboard'} style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Back to Dashboard</button>
            </div>
          ) : (
            <button onClick={() => window.location.href = '/app/dashboard'} style={btnP}>Return to Dashboard</button>
          )}
        </div>
      </div>
    );
  }

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
    <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 48, textAlign: 'center', maxWidth: 500, boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>📷</div>
        <h2 style={{ color: '#E11D48', fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Camera & Mic Blocked</h2>
        <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: 32 }}>
          TalentNest needs access to your camera and microphone to start the interview. 
          Please click the <b>Lock Icon</b> 🔒 in your browser's address bar and set <b>Camera</b> and <b>Microphone</b> to <b>"Allow"</b>.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => window.location.reload()} style={{ ...btnP, padding: '16px' }}>I've enabled permissions — Reload</button>
          <p style={{ fontSize: 12, color: '#94A3B8' }}>Tip: Make sure no other apps (Zoom, Teams, etc.) are using your camera.</p>
        </div>
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px', gap: 12, overflow: 'hidden', position: 'relative' }}>
          {participantEntries.length === 1 && !meetingEnded && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,22,40,0.6)', borderRadius: 12, backdropFilter: 'blur(4px)' }}>
               <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
               <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>Waiting for others...</h3>
               <p style={{ color: '#94A3B8', fontSize: 14 }}>The interview will begin once participants join.</p>
               <button onClick={copyInviteLink} style={{ ...btnG, marginTop: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                 🔗 Copy Invite Link
               </button>
            </div>
          )}
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
        onReschedule={() => setShowReschedule(true)}
        onCopyLink={copyInviteLink}
      />

      {showReschedule && (
        <RescheduleModal
          initialDate={roomMeta?.scheduledAt}
          onSave={handleReschedule}
          onClose={() => setShowReschedule(false)}
        />
      )}

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

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import GuestJoin from './GuestJoin.jsx';
import { api, initAuth, setToken } from '../../api/api.js';
import { SOCKET_BASE_URL } from '../../api/config.js';

const SOCKET_URL = SOCKET_BASE_URL;

const STATIC_FALLBACK_ICE = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'turn:freestun.net:3479',     username: 'free', credential: 'free' },
  { urls: 'turn:freestun.net:5350',     username: 'free', credential: 'free' },
  { urls: 'turn:openrelay.metered.ca:80',  username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
];

const btnP = { background: 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 800, fontSize: 13, cursor: 'pointer' };
const btnG = { background: '#1E293B', color: '#fff', border: '1px solid #334155', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer' };

// ── Reschedule Modal ──────────────────────────────────────────────────────────
function RescheduleModal({ onSave, onClose, initialDate }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (initialDate) {
      const d = new Date(initialDate);
      setDate(d.toISOString().split('T')[0]);
      setTime(d.toTimeString().slice(0, 5));
    }
  }, [initialDate]);

  const handleSave = async () => {
    if (!date || !time) { setFormError('Please select a date and time.'); return; }
    if (new Date(`${date}T${time}`) <= new Date()) { setFormError('Please choose a future date and time.'); return; }
    setSaving(true);
    setFormError('');
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
            <input type="date" value={date} disabled={saving} onChange={e => { setDate(e.target.value); setFormError(''); }} style={{ width: '100%', padding: '12px', borderRadius: 10, background: '#1E293B', border: '1px solid #334155', color: '#fff', outline: 'none', opacity: saving ? 0.6 : 1 }} />
          </div>
          <div>
            <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>TIME</label>
            <input type="time" value={time} disabled={saving} onChange={e => { setTime(e.target.value); setFormError(''); }} style={{ width: '100%', padding: '12px', borderRadius: 10, background: '#1E293B', border: '1px solid #334155', color: '#fff', outline: 'none', opacity: saving ? 0.6 : 1 }} />
          </div>
          {formError && <p style={{ color: '#EF4444', fontSize: 13, margin: 0 }}>{formError}</p>}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handleSave} disabled={saving} style={{ ...btnP, flex: 1, padding: 14, opacity: saving ? 0.7 : 1 }}>{saving ? 'Updating...' : 'Update Schedule'}</button>
          <button onClick={onClose} disabled={saving} style={{ ...btnG, flex: 1, padding: 14 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Video Tile ────────────────────────────────────────────────────────────────
function VideoTile({ stream, name, isMuted, isCamOff, isLocal, isHost, onRemove, showControls }) {
  const vidRef  = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!stream) return;
    if (vidRef.current) { vidRef.current.srcObject = stream; vidRef.current.muted = true; vidRef.current.play().catch(() => {}); }
    if (!isLocal && audioRef.current) { audioRef.current.srcObject = stream; audioRef.current.muted = false; audioRef.current.play().catch(() => {}); }
  }, [stream, isLocal]);

  const initials = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ position: 'relative', background: '#1E293B', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: isLocal ? '2px solid #0176D3' : '1px solid #334155' }}>
      {!isLocal && <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />}
      {stream && stream.getVideoTracks().length > 0 && !isCamOff
        ? <video ref={vidRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#0176D3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff' }}>{initials}</div>
      }
      <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ background: 'rgba(15,23,42,0.85)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, backdropFilter: 'blur(4px)' }}>
          {name}{isLocal ? ' (You)' : ''}{isHost ? ' 👑' : ''}
        </span>
        {isMuted && <span style={{ background: 'rgba(239,68,68,0.85)', padding: '3px 7px', borderRadius: 6, fontSize: 11 }}>🔇</span>}
      </div>
      {showControls && !isLocal && (
        <button onClick={onRemove} title="Remove participant" aria-label="Remove participant" style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(239,68,68,0.85)', color: '#fff', border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      )}
    </div>
  );
}

// ── Chat Panel ────────────────────────────────────────────────────────────────
function ChatPanel({ messages, onSend, isMobile, onClose }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = () => { if (!text.trim()) return; onSend(text.trim()); setText(''); };

  const containerStyle = isMobile
    ? { position: 'fixed', bottom: 82, left: 0, right: 0, height: '55vh', background: '#0F172A', zIndex: 200, display: 'flex', flexDirection: 'column', borderTop: '2px solid #0176D3', boxShadow: '0 -8px 32px rgba(0,0,0,0.5)' }
    : { width: 320, minWidth: 320, background: '#0F172A', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #1E293B' };

  return (
    <div style={containerStyle}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>💬 Room Chat</span>
        <button onClick={onClose} aria-label="Close chat" style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '2px 6px' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', marginTop: 24 }}>No messages yet. Say hello!</p>}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3, alignSelf: m.senderName === 'System' ? 'center' : 'flex-start' }}>
            {m.senderName !== 'System' && <span style={{ color: '#0ea5e9', fontSize: 11, fontWeight: 800 }}>{m.senderName}</span>}
            <div style={{ background: m.senderName === 'System' ? '#1E293B' : '#334155', borderRadius: 10, padding: '8px 12px', color: '#fff', fontSize: 13, maxWidth: 240, wordBreak: 'break-word' }}>{m.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: 12, borderTop: '1px solid #1E293B', display: 'flex', gap: 8, flexShrink: 0 }}>
        <input
          aria-label="Chat message"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message..."
          style={{ flex: 1, background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', color: '#fff', outline: 'none', fontSize: 14 }}
        />
        <button onClick={send} aria-label="Send" style={{ background: '#0176D3', border: 'none', borderRadius: 10, padding: '10px 14px', color: '#fff', cursor: 'pointer', minWidth: 44, minHeight: 44 }}>➤</button>
      </div>
    </div>
  );
}

// ── Participants Panel ────────────────────────────────────────────────────────
function ParticipantsPanel({ participants, localSocketId, isHost, onRemove, onClose, isMobile }) {
  const containerStyle = isMobile
    ? { position: 'fixed', bottom: 82, left: 0, right: 0, height: '55vh', background: '#0F172A', zIndex: 200, display: 'flex', flexDirection: 'column', borderTop: '2px solid #0176D3', boxShadow: '0 -8px 32px rgba(0,0,0,0.5)' }
    : { width: 320, minWidth: 320, background: '#0F172A', borderLeft: '1px solid #1E293B', display: 'flex', flexDirection: 'column' };

  return (
    <div style={containerStyle}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>👥 People ({participants.length + 1})</span>
        <button onClick={onClose} aria-label="Close people" style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '2px 6px' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
        {participants.map(p => (
          <div key={p.socketId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, marginBottom: 6, background: '#1E293B' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: p.isHost ? '#0176D3' : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{(p.name || '?')[0].toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}{p.socketId === localSocketId ? ' (You)' : ''}</div>
              <div style={{ color: '#64748B', fontSize: 11 }}>{p.role || 'participant'}</div>
            </div>
            {isHost && p.socketId !== localSocketId && (
              <button onClick={() => onRemove(p.socketId)} aria-label={`Remove ${p.name}`} style={{ background: '#7F1D1D', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, minWidth: 36, minHeight: 36 }}>✕</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Control Bar ───────────────────────────────────────────────────────────────
function CtrlBtn({ icon, label, active, onClick, danger, compact }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={!!active}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? 2 : 3,
        background: danger ? 'rgba(239,68,68,0.15)' : active ? 'rgba(1,118,211,0.2)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${danger ? 'rgba(239,68,68,0.5)' : active ? '#0176D3' : '#334155'}`,
        borderRadius: 12, padding: compact ? '8px 6px' : '9px 8px',
        minWidth: compact ? 50 : 56, minHeight: compact ? 50 : 54,
        cursor: 'pointer', color: danger ? '#F87171' : active ? '#38BDF8' : '#94A3B8',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: compact ? 18 : 20 }}>{icon}</span>
      <span style={{ fontSize: compact ? 7 : 8, fontWeight: 800, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}

function ControlBar({ micOn, camOn, isSharingScreen, chatOpen, participantsOpen, isHost, onToggleMic, onToggleCam, onToggleScreen, onToggleChat, onToggleParticipants, onLeave, onEndMeeting, onReschedule, onCopyLink, isMobile }) {
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(20px)', borderTop: '1px solid #1E293B', padding: isMobile ? '8px 6px' : '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 5 : 8, zIndex: 100, flexWrap: 'nowrap', overflowX: 'auto' }}>
      <CtrlBtn icon={micOn ? '🎙️' : '🔇'} label={micOn ? 'Mute' : 'Unmute'} active={micOn} danger={!micOn} onClick={onToggleMic} compact={isMobile} />
      <CtrlBtn icon={camOn ? '📹' : '📵'} label={camOn ? 'Stop Video' : 'Start Video'} active={camOn} danger={!camOn} onClick={onToggleCam} compact={isMobile} />
      <div style={{ width: 1, height: 30, background: '#1E293B', flexShrink: 0, margin: '0 2px' }} />
      <CtrlBtn icon={isSharingScreen ? '🛑' : '🖥️'} label="Share" active={isSharingScreen} onClick={onToggleScreen} compact={isMobile} />
      <CtrlBtn icon="💬" label="Chat" active={chatOpen} onClick={onToggleChat} compact={isMobile} />
      <CtrlBtn icon="👥" label="People" active={participantsOpen} onClick={onToggleParticipants} compact={isMobile} />
      <CtrlBtn icon="🔗" label="Invite" onClick={onCopyLink} compact={isMobile} />
      {isHost && !isMobile && <CtrlBtn icon="📅" label="Reschedule" onClick={onReschedule} compact={false} />}
      <div style={{ flex: 1 }} />
      {isHost
        ? <button onClick={onEndMeeting} aria-label="End meeting for all" style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 10, padding: isMobile ? '10px 14px' : '11px 22px', fontWeight: 800, cursor: 'pointer', flexShrink: 0, fontSize: isMobile ? 12 : 14 }}>End</button>
        : <button onClick={onLeave} aria-label="Leave meeting" style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: 10, padding: isMobile ? '10px 14px' : '11px 22px', fontWeight: 800, cursor: 'pointer', flexShrink: 0, fontSize: isMobile ? 12 : 14 }}>Leave</button>
      }
    </div>
  );
}

// ── Meeting Ended ─────────────────────────────────────────────────────────────
function MeetingEndedScreen() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 40, maxWidth: 400 }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>👋</div>
        <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 800, marginBottom: 10 }}>You've left the meeting</h2>
        <p style={{ color: '#64748B', fontSize: 15, marginBottom: 32 }}>The interview session has ended.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate(-1)} style={{ ...btnP, padding: '13px 24px', fontSize: 14, borderRadius: 12 }}>Go Back</button>
          <button onClick={() => navigate('/')} style={{ ...btnG, padding: '13px 24px', fontSize: 14, borderRadius: 12 }}>Home</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Room ─────────────────────────────────────────────────────────────────
export default function MeetingRoom() {
  const { roomToken } = useParams();

  const [authLoading, setAuthLoading] = useState(true);
  const [syncStatus, setSyncStatus]   = useState('idle');
  const [storedUser, setStoredUser]   = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('tn_user') || localStorage.getItem('tn_user')); }
    catch { return null; }
  });

  useEffect(() => {
    if (storedUser?.id || storedUser?._id) { setAuthLoading(false); setSyncStatus('success'); return; }
    setSyncStatus('syncing');
    initAuth().then(r => {
      if (r?.user) {
        sessionStorage.setItem('tn_user', JSON.stringify(r.user));
        localStorage.setItem('tn_user', JSON.stringify(r.user));
        if (r.token) setToken(r.token);
        setStoredUser(r.user);
        setSyncStatus('success');
      } else if (r?.networkError) { setSyncStatus('network_error'); }
      else { setSyncStatus('failed'); }
    }).catch(() => setSyncStatus('failed')).finally(() => setAuthLoading(false));
  }, []);

  const isAuthenticated = !!(storedUser?.id || storedUser?._id);
  const isRecruiter = storedUser?.role === 'recruiter' || storedUser?.role === 'admin' || storedUser?.role === 'super_admin';

  const [guestIdentity, setGuestIdentity] = useState(null);
  const [joined, setJoined]               = useState(false);
  const [localStream, setLocalStream]     = useState(null);
  const [peers, setPeers]                 = useState({});
  const [micOn, setMicOn]                 = useState(true);
  const [camOn, setCamOn]                 = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [chatMessages, setChatMessages]   = useState([]);
  const [chatOpen, setChatOpen]           = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [participants, setParticipants]   = useState([]);
  const [isRecording]                     = useState(false);
  const [meetingEnded, setMeetingEnded]   = useState(false);
  const [roomMeta, setRoomMeta]           = useState(null);
  const [permError, setPermError]         = useState('');
  const [toast, setToast]                 = useState('');
  const [showReschedule, setShowReschedule] = useState(false);
  const [tooEarly, setTooEarly]           = useState(false);
  const [tooEarlyMs, setTooEarlyMs]       = useState(0);
  const [noConnWarning, setNoConnWarning] = useState(false);
  const [isMobile, setIsMobile]           = useState(() => window.innerWidth < 768);

  const socketRef        = useRef(null);
  const peerConnsRef     = useRef({});
  const remoteStreamsRef = useRef({});
  const localStreamRef   = useRef(null);
  const screenStreamRef  = useRef(null);
  const iceServersRef    = useRef(STATIC_FALLBACK_ICE);
  const mySocketIdRef    = useRef(null);
  const roomMetaRef      = useRef(null);
  const identityRef      = useRef(null);
  const lastToastRef     = useRef('');
  const connTimeoutRef   = useRef(null);

  // Detect mobile / desktop
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // Set tab title during meeting
  useEffect(() => {
    const prev = document.title;
    document.title = '🎥 TalentNest Room';
    return () => { document.title = prev; };
  }, []);

  const guestUserIdRef = useRef(null);
  if (guestIdentity && !guestUserIdRef.current) guestUserIdRef.current = `guest_${Date.now().toString(36)}`;

  const identity = isAuthenticated
    ? { userId: storedUser.id || storedUser._id, name: storedUser.name, role: isRecruiter ? 'interviewer' : 'candidate', isHost: isRecruiter }
    : (guestIdentity ? { ...guestIdentity, userId: guestUserIdRef.current, role: 'candidate', isHost: false } : null);
  identityRef.current = identity;

  // Fetch room meta
  useEffect(() => {
    api.getRoom(roomToken).then(r => {
      const m = r?.data || r;
      setRoomMeta(m);
      roomMetaRef.current = m;
    }).catch(() => {});
  }, [roomToken]);

  // Fetch TURN credentials
  useEffect(() => {
    api.getTurnCredentials()
      .then(r => {
        const servers = r?.iceServers || r?.data?.iceServers;
        if (Array.isArray(servers) && servers.length > 0) {
          iceServersRef.current = servers;
          console.log('[TURN] Using credentials from:', r?.source || 'server');
        }
      })
      .catch(() => console.warn('[TURN] Could not fetch credentials, using fallback servers'));
  }, []);

  // Auto-retry join when "too early" — tick countdown and retry every 30s
  useEffect(() => {
    if (!tooEarly) return;
    const retry = () => {
      if (!socketRef.current?.connected) return;
      const id = identityRef.current;
      if (id) socketRef.current.emit('join-room', { roomToken, ...id });
    };
    const tick = setInterval(() => {
      setTooEarlyMs(prev => {
        const next = Math.max(0, prev - 1000);
        if (prev > 0 && next === 0) retry();
        return next;
      });
    }, 1000);
    const poll = setInterval(retry, 30_000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [tooEarly, roomToken]);

  useEffect(() => { if (identity && !joined) enterRoom(); }, [identity, joined]);

  const showToast = (msg) => {
    if (msg === lastToastRef.current) return;
    lastToastRef.current = msg;
    setToast(msg);
    setTimeout(() => { setToast(''); lastToastRef.current = ''; }, 3500);
  };

  const enterRoom = async () => {
    if (joined) return;
    setJoined(true);

    // Step 1 — acquire media
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        setPermError('Camera not available — audio only.');
        setCamOn(false);
      } catch {
        stream = new MediaStream();
        setPermError('Camera & mic blocked. Check browser permissions and refresh.');
        setCamOn(false);
        setMicOn(false);
      }
    }
    localStreamRef.current = stream;
    setLocalStream(stream);

    // Step 2 — connect socket
    const token = sessionStorage.getItem('tn_token') || localStorage.getItem('tn_token') || '';
    const socket = io(`${SOCKET_URL}/video`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    const doJoin = () => {
      mySocketIdRef.current = socket.id;
      const id = identityRef.current;
      if (id) socket.emit('join-room', { roomToken, ...id });
      // If no room-state within 8s, show network warning
      clearTimeout(connTimeoutRef.current);
      connTimeoutRef.current = setTimeout(() => setNoConnWarning(true), 8000);
    };

    socket.on('connect', doJoin);

    // On reconnect: tear down stale peer connections then re-join
    socket.on('reconnect', () => {
      Object.values(peerConnsRef.current).forEach(pc => pc.close());
      peerConnsRef.current = {};
      remoteStreamsRef.current = {};
      setPeers({});
      setParticipants([]);
      doJoin();
    });

    // Step 3 — room events
    socket.on('room-state', ({ participants: pList, chatMessages: msgs }) => {
      setTooEarly(false);
      setNoConnWarning(false);
      clearTimeout(connTimeoutRef.current);
      setParticipants(pList);
      setChatMessages(msgs || []);
      pList.forEach(p => { if (p.socketId !== socket.id) initiateCall(socket, p.socketId); });
    });

    socket.on('user-joined', p => {
      setParticipants(prev => prev.some(x => x.socketId === p.socketId) ? prev : [...prev, p]);
      showToast(`${p.name} joined`);
    });

    socket.on('user-left', ({ socketId, name }) => {
      setParticipants(p => p.filter(x => x.socketId !== socketId));
      setPeers(pr => { const n = { ...pr }; delete n[socketId]; return n; });
      if (peerConnsRef.current[socketId]) { peerConnsRef.current[socketId].close(); delete peerConnsRef.current[socketId]; }
      delete remoteStreamsRef.current[socketId];
      showToast(`${name || 'A participant'} left`);
    });

    // Step 4 — WebRTC signalling
    socket.on('offer', async ({ from, offer }) => {
      const pc = createPeerConn(socket, from);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { to: from, answer });
      } catch (err) { console.error('[WebRTC] offer handling failed:', err); }
    });

    socket.on('answer', async ({ from, answer }) => {
      const pc = peerConnsRef.current[from];
      if (pc) {
        try { await pc.setRemoteDescription(new RTCSessionDescription(answer)); }
        catch (err) { console.error('[WebRTC] answer handling failed:', err); }
      }
    });

    socket.on('ice-candidate', ({ from, candidate }) => {
      const pc = peerConnsRef.current[from];
      if (pc && candidate) pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.warn('[WebRTC] ICE candidate failed:', e.message));
    });

    socket.on('new-message',   m  => setChatMessages(prev => [...prev, m]));
    socket.on('meeting-ended', () => setMeetingEnded(true));
    socket.on('removed-from-room', () => { setMeetingEnded(true); socket.disconnect(); });

    socket.on('error', ({ code, message }) => {
      if (code === 'ROOM_ENDED') {
        setMeetingEnded(true);
      } else if (code === 'TOO_EARLY' || (message && message.toLowerCase().includes('too early'))) {
        clearTimeout(connTimeoutRef.current);
        setNoConnWarning(false);
        const meta = roomMetaRef.current;
        let ms = 0;
        if (meta?.validFrom)    ms = Math.max(0, new Date(meta.validFrom).getTime() - Date.now());
        else if (meta?.scheduledAt) ms = Math.max(0, new Date(meta.scheduledAt).getTime() - 15 * 60 * 1000 - Date.now());
        setTooEarlyMs(ms);
        setTooEarly(true);
      } else {
        showToast(`⚠️ ${message || 'Could not join room'}`);
      }
    });

    socket.on('connect_error', err => {
      showToast('⚠️ Connection lost — retrying…');
      console.warn('[MeetingRoom] connect_error', err.message);
    });
  };

  const createPeerConn = (socket, sid) => {
    if (peerConnsRef.current[sid]) return peerConnsRef.current[sid];

    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current, iceTransportPolicy: 'all', bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require' });
    peerConnsRef.current[sid] = pc;

    const s = localStreamRef.current;
    if (s) s.getTracks().forEach(t => pc.addTrack(t, s));

    pc.onicecandidate = ({ candidate }) => { if (candidate) socket.emit('ice-candidate', { to: sid, candidate }); };

    pc.ontrack = e => {
      if (e.track.readyState === 'ended') return;
      if (!remoteStreamsRef.current[sid]) remoteStreamsRef.current[sid] = new MediaStream();
      const rs = remoteStreamsRef.current[sid];
      if (!rs.getTracks().includes(e.track)) rs.addTrack(e.track);
      setPeers(prev => ({ ...prev, [sid]: { stream: rs } }));
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'failed') {
        console.warn('[WebRTC] connection failed with', sid, '— restarting ICE');
        pc.restartIce?.();
        setTimeout(async () => {
          try {
            if (pc.signalingState === 'stable') {
              const offer = await pc.createOffer({ iceRestart: true });
              await pc.setLocalDescription(offer);
              socket.emit('offer', { to: sid, offer });
            }
          } catch { /* already cleaned up */ }
        }, 2000);
      }
      if (state === 'disconnected') showToast('⚠️ Connection unstable — reconnecting…');
    };

    return pc;
  };

  const initiateCall = async (socket, sid) => {
    const pc = createPeerConn(socket, sid);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { to: sid, offer });
    } catch (err) { console.error('[WebRTC] initiateCall failed:', err); }
  };

  const toggleMic = () => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !micOn; setMicOn(!micOn); }
  };

  const toggleCam = async () => {
    const existing = localStreamRef.current?.getVideoTracks()[0];
    if (existing) {
      existing.enabled = !camOn;
      setCamOn(!camOn);
    } else if (!camOn) {
      try {
        const cs = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        const ct = cs.getVideoTracks()[0];
        if (ct && localStreamRef.current) {
          localStreamRef.current.addTrack(ct);
          Object.values(peerConnsRef.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(ct); else pc.addTrack(ct, localStreamRef.current);
          });
          setCamOn(true);
          setPermError(p => p.startsWith('Camera') ? '' : p);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }
      } catch (e) {
        const msg = e.name === 'NotAllowedError'
          ? '⚠️ Camera permission denied. Tap the lock icon in your address bar.'
          : e.name === 'NotFoundError'
          ? '⚠️ No camera found on this device.'
          : '⚠️ Could not access camera.';
        showToast(msg);
      }
    }
  };

  const sendMessage = text => socketRef.current?.emit('send-message', { roomToken, text });

  const handleEndMeeting = () => {
    socketRef.current?.emit('end-meeting', { roomToken });
    setMeetingEnded(true);
    socketRef.current?.disconnect();
  };

  const handleLeave = () => { socketRef.current?.disconnect(); setMeetingEnded(true); };

  const handleToggleScreen = async () => {
    if (isSharingScreen) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      setIsSharingScreen(false);
      socketRef.current?.emit('screen-share-stop', { roomToken });
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screen;
        setIsSharingScreen(true);
        socketRef.current?.emit('screen-share-start', { roomToken });
        screen.getVideoTracks()[0].onended = () => {
          screenStreamRef.current = null;
          setIsSharingScreen(false);
          socketRef.current?.emit('screen-share-stop', { roomToken });
        };
      } catch { /* user cancelled */ }
    }
  };

  const handleReschedule = async ({ date, time }) => {
    try {
      const scheduledAt = new Date(`${date}T${time}`).toISOString();
      await api.updateInterview(roomMeta?.interviewId || roomMeta?._id, { scheduledAt });
      setShowReschedule(false);
      showToast('✅ Meeting rescheduled! Participants will be notified.');
    } catch (e) {
      console.error('[MeetingRoom] Reschedule failed:', e);
      showToast('Could not reschedule. Please try from the Interviews page.');
      setShowReschedule(false);
    }
  };

  const copyMeetingLink = () => {
    const url = window.location.href;
    const fallback = () => {
      const el = document.createElement('textarea');
      el.value = url; el.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
      showToast('✅ Meeting link copied!');
    };
    if (navigator.clipboard) { navigator.clipboard.writeText(url).then(() => showToast('✅ Meeting link copied!')).catch(fallback); }
    else { fallback(); }
  };

  // ── Render guards ─────────────────────────────────────────────────────────
  if (authLoading || syncStatus === 'syncing') {
    return (
      <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: '3px solid #0176D3', borderTopColor: 'transparent', borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite' }} />
        <span style={{ color: '#94A3B8', fontSize: 14 }}>Syncing session…</span>
        <style>{`@keyframes tn-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  if (!isAuthenticated && !guestIdentity) return <GuestJoin roomToken={roomToken} onJoin={setGuestIdentity} />;
  if (meetingEnded) return <MeetingEndedScreen />;

  // Build tile list: self first, then remote peers
  const localSocketId = mySocketIdRef.current;
  const participantEntries = [
    { socketId: localSocketId || 'local', name: identity?.name || 'You', stream: localStream, isMuted: !micOn, isCamOff: !camOn, isLocal: true, isHost: identity?.isHost || false },
    ...participants
      .filter(p => p.socketId !== localSocketId)
      .map(p => ({ ...p, stream: peers[p.socketId]?.stream || null, isMuted: false, isCamOff: false, isLocal: false })),
  ];

  const gridCols = participantEntries.length <= 1 ? 1 : participantEntries.length <= 2 ? 2 : participantEntries.length <= 4 ? 2 : 3;

  return (
    <div style={{ minHeight: '100vh', background: '#0A1628', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ background: '#0F172A', padding: isMobile ? '10px 12px' : '12px 24px', borderBottom: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ color: '#0176D3', fontWeight: 900, fontSize: 15, whiteSpace: 'nowrap' }}>TalentNest Room</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          {isRecording && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '4px 10px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'inline-block', animation: 'tn-rec 1.2s ease-in-out infinite' }} />
              <span style={{ color: '#EF4444', fontSize: 11, fontWeight: 800 }}>RECORDING</span>
            </div>
          )}
          {permError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '5px 10px' }}>
              <span style={{ color: '#EF4444', fontSize: 11 }}>⚠️ {permError}</span>
              <button
                onClick={async () => {
                  try {
                    const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    localStreamRef.current?.getTracks().forEach(t => t.stop());
                    localStreamRef.current = s; setLocalStream(s); setPermError(''); setCamOn(true); setMicOn(true);
                    Object.entries(peerConnsRef.current).forEach(([, pc]) => {
                      s.getTracks().forEach(t => {
                        const sender = pc.getSenders().find(send => send.track?.kind === t.kind);
                        if (sender) sender.replaceTrack(t); else pc.addTrack(t, s);
                      });
                    });
                  } catch { showToast('Still blocked. Allow camera/mic in browser settings and refresh.'); }
                }}
                style={{ fontSize: 11, background: '#EF4444', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}
              >
                🔄 Retry
              </button>
            </div>
          )}
        </div>

        <span style={{ color: '#94A3B8', fontSize: 12, whiteSpace: 'nowrap' }}>{participantEntries.length} Active</span>
      </div>

      {/* ── Too Early Banner ── */}
      {tooEarly && (
        <div style={{ background: '#1E3A5F', borderBottom: '1px solid #0176D3', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
          <span>⏳</span>
          <span style={{ color: '#94A3B8', fontSize: 14 }}>Room not open yet.</span>
          {tooEarlyMs > 0 && (
            <span style={{ color: '#38BDF8', fontWeight: 700, fontSize: 14 }}>
              Opens in {Math.floor(tooEarlyMs / 60000)}m {Math.floor((tooEarlyMs % 60000) / 1000)}s
            </span>
          )}
          <span style={{ color: '#64748B', fontSize: 12 }}>· Will auto-join when ready</span>
        </div>
      )}

      {/* ── Network Warning ── */}
      {noConnWarning && !tooEarly && (
        <div style={{ background: 'rgba(234,179,8,0.08)', borderBottom: '1px solid rgba(234,179,8,0.3)', padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ color: '#EAB308', fontSize: 13 }}>⚠️ Connecting to room… If this takes long, check your network and refresh.</span>
        </div>
      )}

      {/* ── Video Grid + Side Panels ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', paddingBottom: isMobile ? 76 : 96 }}>
        <div style={{ flex: 1, padding: isMobile ? 8 : 16, display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: isMobile ? 8 : 14, alignContent: 'center' }}>
          {participantEntries.map(p => (
            <VideoTile
              key={p.socketId}
              {...p}
              showControls={identity?.isHost}
              onRemove={() => socketRef.current?.emit('remove-participant', { roomToken, targetSocketId: p.socketId })}
            />
          ))}
        </div>
        {!isMobile && chatOpen && <ChatPanel messages={chatMessages} onSend={sendMessage} isMobile={false} onClose={() => setChatOpen(false)} />}
        {!isMobile && participantsOpen && (
          <ParticipantsPanel
            participants={participants} localSocketId={mySocketIdRef.current} isHost={identity?.isHost}
            onRemove={sid => socketRef.current?.emit('remove-participant', { roomToken, targetSocketId: sid })}
            onClose={() => setParticipantsOpen(false)} isMobile={false}
          />
        )}
      </div>

      {/* Mobile overlays */}
      {isMobile && chatOpen && <ChatPanel messages={chatMessages} onSend={sendMessage} isMobile={true} onClose={() => setChatOpen(false)} />}
      {isMobile && participantsOpen && (
        <ParticipantsPanel
          participants={participants} localSocketId={mySocketIdRef.current} isHost={identity?.isHost}
          onRemove={sid => socketRef.current?.emit('remove-participant', { roomToken, targetSocketId: sid })}
          onClose={() => setParticipantsOpen(false)} isMobile={true}
        />
      )}

      <ControlBar
        micOn={micOn} camOn={camOn} chatOpen={chatOpen} participantsOpen={participantsOpen}
        isHost={identity?.isHost || false} isSharingScreen={isSharingScreen}
        onToggleMic={toggleMic} onToggleCam={toggleCam} onToggleScreen={handleToggleScreen}
        onToggleChat={() => { setChatOpen(c => !c); setParticipantsOpen(false); }}
        onToggleParticipants={() => { setParticipantsOpen(p => !p); setChatOpen(false); }}
        onLeave={handleLeave} onEndMeeting={handleEndMeeting}
        onReschedule={() => setShowReschedule(true)} onCopyLink={copyMeetingLink}
        isMobile={isMobile}
      />

      {showReschedule && <RescheduleModal initialDate={roomMeta?.scheduledAt} onSave={handleReschedule} onClose={() => setShowReschedule(false)} />}

      {toast && (
        <div role="alert" aria-live="polite" style={{ position: 'fixed', bottom: isMobile ? 96 : 116, left: '50%', transform: 'translateX(-50%)', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '10px 20px', borderRadius: 24, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 400, whiteSpace: 'nowrap', maxWidth: 'calc(100vw - 32px)', textAlign: 'center' }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes tn-rec { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
      `}</style>
    </div>
  );
}

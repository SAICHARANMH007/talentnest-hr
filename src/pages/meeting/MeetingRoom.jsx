import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import GuestJoin from './GuestJoin.jsx';
import { api, initAuth, setToken } from '../../api/api.js';
import { SOCKET_BASE_URL } from '../../api/config.js';

// ── Config ───────────────────────────────────────────────────────────────────
const SOCKET_URL = SOCKET_BASE_URL;

// ICE servers are fetched dynamically from your own backend before every call.
// Static fallback used only if the fetch fails.
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
  const audioRef = useRef(null);

  useEffect(() => {
    if (!stream) return;
    if (vidRef.current) {
      vidRef.current.srcObject = stream;
      vidRef.current.muted = true;
      vidRef.current.play().catch(() => {});
    }
    if (!isLocal && audioRef.current) {
      audioRef.current.srcObject = stream;
      audioRef.current.muted = false;
      audioRef.current.play().catch(() => {});
    }
  }, [stream, isLocal]);

  const initials = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ position: 'relative', background: '#1E293B', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: isLocal ? '2px solid #0176D3' : '1px solid #334155' }}>
      {!isLocal && <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />}
      {stream && stream.getVideoTracks().length > 0 && !isCamOff ? (
        <video ref={vidRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#0176D3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: '#fff' }}>
          {initials}
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ background: 'rgba(15, 23, 42, 0.8)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, backdropFilter: 'blur(4px)' }}>
          {name}{isLocal ? ' (You)' : ''} {isHost ? '👑' : ''}
        </span>
        {isMuted && <span style={{ background: 'rgba(239, 68, 68, 0.8)', padding: '4px 8px', borderRadius: 8, fontSize: 12 }}>🔇</span>}
      </div>
      {showControls && !isLocal && (
        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
          <button onClick={onMute} style={tileBtn} title="Mute">🔇</button>
          <button onClick={onRemove} style={{ ...tileBtn, background: '#EF4444' }} title="Remove">✕</button>
        </div>
      )}
    </div>
  );
}
const tileBtn = { background: 'rgba(15, 23, 42, 0.6)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 13 };

// ── Screen Share View ────────────────────────────────────────────────────────
function ScreenShareView({ stream, sharerName }) {
  const vidRef = useRef(null);
  useEffect(() => { if (vidRef.current && stream) vidRef.current.srcObject = stream; }, [stream]);
  return (
    <div style={{ position: 'relative', background: '#000', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, overflow: 'hidden', border: '2px solid #0176D3' }}>
      <video ref={vidRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(1,118,211,0.95)', color: '#fff', padding: '6px 16px', borderRadius: 10, fontSize: 14, fontWeight: 800, boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }}>
        📺 {sharerName} is sharing their screen
      </div>
    </div>
  );
}

// ── Chat Panel ───────────────────────────────────────────────────────────────
function ChatPanel({ messages, onSend, typingUsers, roomToken, socket }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = () => { if (!text.trim()) return; onSend(text.trim()); setText(''); };
  return (
    <div style={{ width: 320, background: '#0F172A', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #1E293B' }}>
      <div style={{ padding: '20px 16px', borderBottom: '1px solid #1E293B' }}><span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>💬 Room Chat</span></div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignSelf: m.senderName === 'System' ? 'center' : 'flex-start' }}>
            {m.senderName !== 'System' && <span style={{ color: '#0ea5e9', fontSize: 11, fontWeight: 800 }}>{m.senderName}</span>}
            <div style={{ background: m.senderName === 'System' ? '#1E293B' : '#334155', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: 13, maxWidth: 240, wordBreak: 'break-word' }}>{m.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: 16, borderTop: '1px solid #1E293B', display: 'flex', gap: 10 }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Message..." style={{ flex: 1, background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', color: '#fff', outline: 'none' }} />
        <button onClick={send} style={{ background: '#0176D3', border: 'none', borderRadius: 10, padding: '10px 16px', color: '#fff', cursor: 'pointer' }}>➤</button>
      </div>
    </div>
  );
}

// ── Participants Panel ───────────────────────────────────────────────────────
function ParticipantsPanel({ participants, localSocketId, isHost, onMute, onRemove, onClose }) {
  return (
    <div style={{ width: 320, background: '#0F172A', borderLeft: '1px solid #1E293B', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 16px', borderBottom: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontWeight: 800 }}>👥 People ({participants.length})</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 20 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {participants.map(p => (
          <div key={p.socketId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, marginBottom: 8, background: '#1E293B' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: p.isHost ? '#0176D3' : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>{(p.name || '?')[0].toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name} {p.socketId === localSocketId ? '(You)' : ''}</div>
              <div style={{ color: '#64748B', fontSize: 11 }}>{p.role}</div>
            </div>
            {isHost && p.socketId !== localSocketId && <button onClick={() => onRemove(p.socketId)} style={{ background: '#7F1D1D', border: 'none', color: '#fff', padding: '6px', borderRadius: 8, cursor: 'pointer' }}>✕</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Control Bar ──────────────────────────────────────────────────────────────
function ControlBar({ micOn, camOn, isSharingScreen, chatOpen, participantsOpen, isRecording, isHost, onToggleMic, onToggleCam, onToggleScreen, onToggleChat, onToggleParticipants, onToggleRecording, onLeave, onEndMeeting, onReschedule, onCopyLink }) {
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid #1E293B', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 100 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <CtrlBtn icon={micOn ? '🎙️' : '🔇'} label={micOn ? 'Mute' : 'Unmute'} active={micOn} onClick={onToggleMic} danger={!micOn} />
        <CtrlBtn icon={camOn ? '📹' : '📵'} label={camOn ? 'Stop Video' : 'Start Video'} active={camOn} onClick={onToggleCam} danger={!camOn} />
      </div>
      <div style={{ width: 1, height: 40, background: '#1E293B', margin: '0 8px' }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <CtrlBtn icon={isSharingScreen ? '🛑' : '🖥️'} label="Share" active={isSharingScreen} onClick={onToggleScreen} />
        <CtrlBtn icon="💬" label="Chat" active={chatOpen} onClick={onToggleChat} />
        <CtrlBtn icon="👥" label="People" active={participantsOpen} onClick={onToggleParticipants} />
        <CtrlBtn icon="🔗" label="Invite" onClick={onCopyLink} />
        {isHost && <CtrlBtn icon="📅" label="Reschedule" onClick={onReschedule} />}
      </div>
      <div style={{ flex: 1 }} />
      {isHost ? (
        <button onClick={onEndMeeting} style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 800, cursor: 'pointer' }}>End Meeting</button>
      ) : (
        <button onClick={onLeave} style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 800, cursor: 'pointer' }}>Leave</button>
      )}
    </div>
  );
}
function CtrlBtn({ icon, label, active, onClick, danger }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: active ? 'rgba(1, 118, 211, 0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${active ? '#0176D3' : '#334155'}`, borderRadius: 14, padding: '10px', minWidth: 60, cursor: 'pointer', color: active ? '#38BDF8' : '#94A3B8' }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>{label}</span>
    </button>
  );
}

// ── Main Meeting Room ────────────────────────────────────────────────────────
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
  const isPossiblyLoggedIn = localStorage.getItem('tn_logged_in') === 'true';
  const [guestIdentity, setGuestIdentity] = useState(null);
  const [joined, setJoined] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({});
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
  const [showReschedule, setShowReschedule] = useState(false);

  const socketRef = useRef(null);
  const peerConnsRef = useRef({});
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const iceServersRef = useRef(STATIC_FALLBACK_ICE); // replaced by dynamic creds on mount
  // Stable own socket ID — set on connect, used to filter participantEntries correctly.
  const mySocketIdRef = useRef(null);

  const isRecruiter = storedUser?.role === 'recruiter' || storedUser?.role === 'admin' || storedUser?.role === 'super_admin';
  // Stable guest userId — generated once when guestIdentity is first set, never changes on re-render
  const guestUserIdRef = useRef(null);
  if (guestIdentity && !guestUserIdRef.current) {
    guestUserIdRef.current = `guest_${Date.now().toString(36)}`;
  }
  const identity = isAuthenticated
    ? { userId: storedUser.id || storedUser._id, name: storedUser.name, role: isRecruiter ? 'interviewer' : 'candidate', isHost: isRecruiter }
    : (guestIdentity ? { ...guestIdentity, userId: guestUserIdRef.current, role: 'candidate', isHost: false } : null);

  useEffect(() => { api.getRoom(roomToken).then(r => setRoomMeta(r?.data || r)); }, [roomToken]);

  // Fetch TURN credentials from YOUR OWN backend before joining.
  // If your coturn server is configured (TURN_HOST + TURN_SECRET env vars on Render),
  // this returns self-hosted credentials. If not yet configured, returns free fallback servers.
  useEffect(() => {
    api.getTurnCredentials()
      .then(r => {
        const servers = r?.iceServers || r?.data?.iceServers;
        if (Array.isArray(servers) && servers.length > 0) {
          iceServersRef.current = servers;
          console.log('[TURN] Using credentials from:', r?.source || 'server');
        }
      })
      .catch(() => {
        // Keep static fallback — join still works
        console.warn('[TURN] Could not fetch credentials, using fallback servers');
      });
  }, []);

  useEffect(() => { if (identity && !joined) enterRoom(); }, [identity, joined]);

  const enterRoom = async () => {
    if (joined) return;
    setJoined(true);

    // ── Step 1: Request camera + mic with clear fallback chain ───────────────
    let stream;
    // Try video + audio first (ideal case)
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      // Camera blocked or not available — try audio only
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        setPermError('Camera not available — audio only.');
      } catch {
        // Both blocked — join chat only
        stream = new MediaStream();
        setPermError('Camera & mic blocked. Check browser permissions and refresh.');
      }
    }
    localStreamRef.current = stream;
    setLocalStream(stream);

    // ── Step 2: Connect socket ───────────────────────────────────────────────
    const token = sessionStorage.getItem('tn_token') || localStorage.getItem('tn_token') || '';
    const socket = io(`${SOCKET_URL}/video`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    // Snapshot identity at join-time so the closure is always correct
    const joinIdentity = identity;

    const doJoin = () => {
      mySocketIdRef.current = socket.id;
      socket.emit('join-room', { roomToken, ...joinIdentity });
    };

    socket.on('connect',   doJoin);
    socket.on('reconnect', doJoin);

    // ── Step 3: Room events ──────────────────────────────────────────────────
    socket.on('room-state', ({ participants: pList, chatMessages: msgs }) => {
      setParticipants(pList);
      setChatMessages(msgs || []);
      // Initiate a call to every participant already in the room (not ourselves)
      pList.forEach(p => {
        if (p.socketId !== socket.id) {
          initiateCall(socket, p.socketId);
        }
      });
    });

    socket.on('user-joined', (p) => {
      setParticipants(prev => {
        if (prev.some(x => x.socketId === p.socketId)) return prev;
        return [...prev, p];
      });
      showToast(`${p.name} joined`);
    });

    socket.on('user-left', ({ socketId, name }) => {
      setParticipants(p => p.filter(x => x.socketId !== socketId));
      setPeers(pr => { const n = { ...pr }; delete n[socketId]; return n; });
      if (peerConnsRef.current[socketId]) {
        peerConnsRef.current[socketId].close();
        delete peerConnsRef.current[socketId];
      }
      showToast(`${name || 'A participant'} left`);
    });

    // ── Step 4: WebRTC signalling ────────────────────────────────────────────
    socket.on('offer', async ({ from, offer }) => {
      // CRITICAL: always read localStreamRef.current — never use a stale closure variable
      const pc = createPeerConn(socket, from);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { to: from, answer });
      } catch (err) {
        console.error('[WebRTC] offer handling failed:', err);
      }
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
      if (pc && candidate) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
    });

    socket.on('new-message',   (m) => setChatMessages(prev => [...prev, m]));
    socket.on('meeting-ended', ()  => setMeetingEnded(true));

    socket.on('error', ({ code, message }) => {
      if (code === 'ROOM_ENDED') setMeetingEnded(true);
      else showToast(`⚠️ ${message || 'Could not join room'}`);
    });

    socket.on('connect_error', (err) => {
      showToast('⚠️ Connection lost — retrying…');
      console.warn('[MeetingRoom] connect_error', err.message);
    });
  };

  // Create or return an existing RTCPeerConnection for a remote peer.
  // Always reads localStreamRef.current so tracks are always current.
  const createPeerConn = (socket, sid) => {
    if (peerConnsRef.current[sid]) return peerConnsRef.current[sid];

    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current,   // dynamic creds from your own backend
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });
    peerConnsRef.current[sid] = pc;

    // Add ALL current local tracks — use ref, never a stale closure
    const currentStream = localStreamRef.current;
    if (currentStream) {
      currentStream.getTracks().forEach(t => pc.addTrack(t, currentStream));
    }

    // Trickle ICE — send candidates as soon as they arrive
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit('ice-candidate', { to: sid, candidate });
    };

    // When remote tracks arrive, update peers state → VideoTile shows video
    pc.ontrack = (e) => {
      const remoteStream = e.streams?.[0];
      if (remoteStream) {
        setPeers(prev => ({ ...prev, [sid]: { stream: remoteStream } }));
      }
    };

    // Auto-restart ICE if connection fails
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'failed') {
        console.warn('[WebRTC] connection failed with', sid, '— attempting ICE restart');
        pc.restartIce?.();
        // Re-offer after a brief delay so ICE restart completes
        setTimeout(async () => {
          try {
            if (pc.signalingState === 'stable') {
              const offer = await pc.createOffer({ iceRestart: true });
              await pc.setLocalDescription(offer);
              socket.emit('offer', { to: sid, offer });
            }
          } catch { /* ignore if connection was already cleaned up */ }
        }, 2000);
      }
      if (state === 'disconnected') {
        showToast('⚠️ Connection unstable — attempting to reconnect…');
      }
    };

    return pc;
  };

  // Initiate a call to a remote peer (late-joiner calls early-joiner)
  const initiateCall = async (socket, sid) => {
    const pc = createPeerConn(socket, sid);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { to: sid, offer });
    } catch (err) {
      console.error('[WebRTC] initiateCall failed:', err);
    }
  };

  const toggleMic = () => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !micOn; setMicOn(!micOn); }
  };

  const toggleCam = async () => {
    const existingTrack = localStreamRef.current?.getVideoTracks()[0];
    if (existingTrack) {
      // Track exists — just toggle enabled
      existingTrack.enabled = !camOn;
      setCamOn(!camOn);
    } else if (!camOn) {
      // No track and user wants to turn ON — request camera now
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        const camTrack  = camStream.getVideoTracks()[0];
        if (camTrack && localStreamRef.current) {
          localStreamRef.current.addTrack(camTrack);
          // Replace track in all active peer connections so remote sees video
          Object.values(peerConnsRef.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(camTrack);
            else pc.addTrack(camTrack, localStreamRef.current);
          });
          setCamOn(true);
          setPermError('');
          setLocalStream(new MediaStream(localStreamRef.current.getTracks())); // trigger re-render
        }
      } catch {
        showToast('⚠️ Could not access camera. Check browser permissions.');
      }
    }
  };
  const sendMessage = (text) => socketRef.current?.emit('send-message', { roomToken, text });
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const handleEndMeeting = () => {
    socketRef.current?.emit('end-meeting', { roomToken });
    setMeetingEnded(true);
    socketRef.current?.disconnect();
  };

  const handleLeave = () => {
    socketRef.current?.disconnect();
    setMeetingEnded(true);
  };

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
          setIsSharingScreen(false);
          screenStreamRef.current = null;
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
      showToast('Meeting rescheduled! Participants will be notified.');
    } catch { showToast('Could not reschedule. Please try from the Interviews page.'); setShowReschedule(false); }
  };

  if (authLoading || syncStatus === 'syncing') return <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Syncing session...</div>;
  if (!isAuthenticated && !guestIdentity) return <GuestJoin roomToken={roomToken} onJoin={setGuestIdentity} />;
  if (meetingEnded) return <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><h2>Meeting Ended</h2></div>;

  // Build the participant list for rendering — local user first, then remote peers.
  // Use mySocketIdRef (set in connect handler) not socketRef.current?.id
  // because socket.id is undefined until after the connect event fires.
  const localSocketId = mySocketIdRef.current || socketRef.current?.id;
  const participantEntries = [
    {
      socketId: localSocketId || 'local',
      name: identity?.name || 'You',
      stream: localStream,
      isMuted: !micOn,
      isCamOff: !camOn,
      isLocal: true,
      isHost: identity?.isHost || false,
      role: identity?.role || 'candidate',
    },
    ...participants
      .filter(p => p.socketId !== localSocketId)
      .map(p => ({
        ...p,
        stream: peers[p.socketId]?.stream || null,
        isMuted: false,
        isCamOff: false,
        isLocal: false,
      })),
  ];

  const numParticipants = participantEntries.length;
  const gridCols = numParticipants <= 1 ? 1 : numParticipants <= 2 ? 2 : numParticipants <= 4 ? 2 : 3;

  return (
    <div style={{ minHeight: '100vh', background: '#0A1628', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#0F172A', padding: '12px 24px', borderBottom: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#0176D3', fontWeight: 900 }}>TalentNest Room</span>
        {permError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '6px 12px' }}>
            <span style={{ color: '#EF4444', fontSize: 12 }}>⚠️ {permError}</span>
            <button
              onClick={async () => {
                try {
                  const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                  localStreamRef.current?.getTracks().forEach(t => t.stop());
                  localStreamRef.current = s;
                  setLocalStream(s);
                  setPermError('');
                  setCamOn(true);
                  setMicOn(true);
                  // Restart ICE for all existing connections with new tracks
                  Object.entries(peerConnsRef.current).forEach(([sid, pc]) => {
                    s.getTracks().forEach(t => {
                      const sender = pc.getSenders().find(send => send.track?.kind === t.kind);
                      if (sender) sender.replaceTrack(t);
                      else pc.addTrack(t, s);
                    });
                  });
                } catch {
                  showToast('Still blocked. Click the camera icon in your browser address bar and allow permissions, then refresh.');
                }
              }}
              style={{ fontSize: 11, background: '#EF4444', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              🔄 Retry Camera
            </button>
          </div>
        )}
        <span style={{ color: '#94A3B8', fontSize: 13 }}>{participants.length} Active</span>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', paddingBottom: 100 }}>
        <div style={{ flex: 1, padding: 20, display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 16, alignContent: 'center' }}>
          {participantEntries.map(p => (
            <VideoTile key={p.socketId} {...p} showControls={identity.isHost} onRemove={(sid) => socketRef.current?.emit('remove-user', { targetSocketId: sid })} />
          ))}
        </div>
        {chatOpen && <ChatPanel messages={chatMessages} onSend={sendMessage} roomToken={roomToken} socket={socketRef.current} />}
        {participantsOpen && <ParticipantsPanel participants={participants} localSocketId={socketRef.current?.id} isHost={identity.isHost} onClose={() => setParticipantsOpen(false)} />}
      </div>

      <ControlBar
        micOn={micOn} camOn={camOn} chatOpen={chatOpen} participantsOpen={participantsOpen}
        isHost={identity?.isHost || false} isSharingScreen={isSharingScreen} isRecording={isRecording}
        onToggleMic={toggleMic} onToggleCam={toggleCam}
        onToggleScreen={handleToggleScreen}
        onToggleChat={() => { setChatOpen(!chatOpen); setParticipantsOpen(false); }}
        onToggleParticipants={() => { setParticipantsOpen(!participantsOpen); setChatOpen(false); }}
        onToggleRecording={() => setIsRecording(r => !r)}
        onLeave={handleLeave}
        onEndMeeting={handleEndMeeting}
        onReschedule={() => setShowReschedule(true)}
        onCopyLink={() => { navigator.clipboard.writeText(window.location.href); showToast('Link Copied!'); }}
      />
      {showReschedule && (
        <RescheduleModal
          initialDate={roomMeta?.scheduledAt}
          onSave={handleReschedule}
          onClose={() => setShowReschedule(false)}
        />
      )}
      {toast && <div style={{ position: 'fixed', bottom: 120, left: '50%', transform: 'translateX(-50%)', background: '#334155', color: '#fff', padding: '8px 16px', borderRadius: 20 }}>{toast}</div>}
    </div>
  );
}

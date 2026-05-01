import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import useWebRTC from '../../hooks/useWebRTC.js';
import { API_BASE_URL } from '../../api/config.js';

const SOCKET_URL = API_BASE_URL.replace('/api', '');
const RING_DURATION = 30000;

// ── Video tile ────────────────────────────────────────────────────────────────
function VideoTile({ stream, name, muted = false, style = {} }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && stream) ref.current.srcObject = stream; }, [stream]);
  const initials = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{ position: 'relative', background: '#0F172A', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      {stream ? (
        <video ref={ref} autoPlay playsInline muted={muted} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#0176D3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff' }}>{initials}</div>
      )}
      <div style={{ position: 'absolute', bottom: 8, left: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>{name}</div>
    </div>
  );
}

// ── Duration timer ────────────────────────────────────────────────────────────
function CallTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{`${m}:${s.toString().padStart(2, '0')}`}</span>;
}

// ── Incoming ring sound ───────────────────────────────────────────────────────
function useRingSound(ringing) {
  const audioRef = useRef(null);
  useEffect(() => {
    if (!ringing) { audioRef.current?.pause(); return; }
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
      };
      playTone();
      const interval = setInterval(playTone, 2000);
      return () => { clearInterval(interval); ctx.close(); };
    } catch {}
  }, [ringing]);
}

export default function CallManager({ user }) {
  const myId   = user?.id || user?._id;
  const myName = user?.name || 'You';

  const socketRef = useRef(null);
  const peerSocketId = useRef(null); // remote socket id for signaling

  // Call state machine
  const [callState, setCallState] = useState('idle'); // idle|outgoing|incoming|active|ended
  const [callInfo, setCallInfo]   = useState(null);   // { callId, peerId, peerName, callType }
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStartedAt, setCallStartedAt] = useState(null);
  const [endReason, setEndReason] = useState('');

  const ringTimer = useRef(null);
  const endTimer  = useRef(null);

  useRingSound(callState === 'incoming');

  const { localStream, micOn, camOn, permError, startLocalMedia, initiateCall, handleOffer, handleAnswer, handleIce, toggleMic, toggleCam, stopAll, peerConnsRef } = useWebRTC({
    video: callInfo?.callType === 'video',
    audio: true,
    onRemoteStream: (sid, stream) => { peerSocketId.current = sid; setRemoteStream(stream); },
  });

  // ── Connect socket ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!myId) return;
    const token = sessionStorage.getItem('tn_token') || '';
    const socket = io(`${SOCKET_URL}/call`, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('call:incoming', ({ callId, fromUserId, fromName, callType }) => {
      setCallInfo({ callId, peerId: fromUserId, peerName: fromName, callType });
      setCallState('incoming');
    });

    socket.on('call:accepted', ({ callId }) => {
      // Recipient accepted — join room then initiate WebRTC offer
      socket.emit('call:join-room', { callId });
      startLocalMedia().then(stream => {
        if (!stream) return;
        setCallState('active');
        setCallStartedAt(Date.now());
        // Small delay to ensure remote joined
        setTimeout(() => initiateOffer(callId, stream), 500);
      });
    });

    socket.on('call:declined', () => { endCall('Declined'); });
    socket.on('call:cancelled', () => { if (callState === 'incoming') endCall('Caller cancelled'); });
    socket.on('call:no-answer', () => { endCall('No answer'); });
    socket.on('call:busy', ({ toName }) => { endCall(`${toName || 'User'} is on another call`); });
    socket.on('call:ended', ({ duration, reason }) => { endCall(reason === 'disconnected' ? 'Connection lost' : 'Call ended'); });
    socket.on('call:error', ({ message }) => { endCall(message); });

    // WebRTC signaling
    socket.on('call:offer', ({ from, offer }) => {
      peerSocketId.current = from;
      const sigEvts = makeSignalingEvents(socket, callInfo?.callId);
      handleOffer(from, offer, sigEvts, localStream || undefined).then(() => {
        setCallStartedAt(Date.now());
      });
    });
    socket.on('call:answer', ({ from, answer }) => handleAnswer(from, answer));
    socket.on('call:ice',    ({ from, candidate }) => handleIce(from, candidate));

    return () => { socket.disconnect(); };
  }, [myId]); // eslint-disable-line

  const makeSignalingEvents = (socket, callId) => ({
    sendOffer:  (sid, offer)     => socket.emit('call:offer',  { callId, offer }),
    sendAnswer: (sid, answer)    => socket.emit('call:answer', { callId, answer }),
    sendIce:    (sid, candidate) => socket.emit('call:ice',    { callId, candidate }),
  });

  const initiateOffer = async (callId, stream) => {
    // The remote socket ID is not known until they send an offer/answer — use placeholder
    // Actually we use the call room so signaling goes to the room
    const socket = socketRef.current;
    if (!socket) return;
    const sigEvts = makeSignalingEvents(socket, callId);
    const fakePeerId = 'peer'; // room-scoped — server routes to the other participant
    await initiateCall(fakePeerId, socket, sigEvts, stream);
  };

  // ── Start outgoing call ───────────────────────────────────────────────────
  const startCall = useCallback(async (toUserId, toName, callType) => {
    if (!socketRef.current) return;
    // Pre-fetch media so UI is smooth
    await startLocalMedia();
    setCallInfo({ callId: null, peerId: toUserId, peerName: toName, callType });
    setCallState('outgoing');
    socketRef.current.emit('call:initiate', { toUserId, callType, toName });
    // Ring timeout fallback (server handles 30s but also do client-side)
    clearTimeout(ringTimer.current);
    ringTimer.current = setTimeout(() => endCall('No answer'), RING_DURATION + 2000);
  }, [startLocalMedia]);

  // ── Accept incoming call ──────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!callInfo) return;
    await startLocalMedia();
    socketRef.current?.emit('call:accept', { callId: callInfo.callId });
    // active state set on 'call:accepted' event
  }, [callInfo, startLocalMedia]);

  // ── Decline incoming call ─────────────────────────────────────────────────
  const declineCall = useCallback(() => {
    if (!callInfo) return;
    socketRef.current?.emit('call:decline', { callId: callInfo.callId });
    endCall('');
  }, [callInfo]);

  // ── Cancel outgoing call ──────────────────────────────────────────────────
  const cancelCall = useCallback(() => {
    if (!callInfo) return;
    socketRef.current?.emit('call:cancel', { callId: callInfo.callId });
    endCall('');
  }, [callInfo]);

  // ── Hang up ───────────────────────────────────────────────────────────────
  const hangUp = useCallback(() => {
    if (!callInfo) return;
    socketRef.current?.emit('call:end', { callId: callInfo.callId });
    endCall('');
  }, [callInfo]);

  const endCall = (reason = '') => {
    clearTimeout(ringTimer.current);
    stopAll();
    setRemoteStream(null);
    setCallState('ended');
    setEndReason(reason);
    clearTimeout(endTimer.current);
    endTimer.current = setTimeout(() => {
      setCallState('idle');
      setCallInfo(null);
      setEndReason('');
      setCallStartedAt(null);
    }, 2500);
  };

  // Expose startCall globally so ChatPanel can trigger it
  useEffect(() => {
    window.__tnStartCall = startCall;
    return () => { delete window.__tnStartCall; };
  }, [startCall]);

  if (callState === 'idle') return null;

  const isVideo = callInfo?.callType === 'video';

  // ── Incoming call overlay ─────────────────────────────────────────────────
  if (callState === 'incoming') return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 8 }}>{isVideo ? '📹' : '📞'}</div>
        <div style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', marginBottom: 4 }}>Incoming {isVideo ? 'Video' : 'Audio'} Call</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 32 }}>{callInfo?.peerName}</div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <CallBtn icon="📵" label="Decline" color="#DC2626" onClick={declineCall} />
          <CallBtn icon="📞" label="Accept" color="#16a34a" onClick={acceptCall} />
        </div>
      </div>
    </div>
  );

  // ── Outgoing call overlay ─────────────────────────────────────────────────
  if (callState === 'outgoing') return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 8 }}>{isVideo ? '📹' : '📞'}</div>
        <div style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', marginBottom: 4 }}>Calling…</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 8 }}>{callInfo?.peerName}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 32 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#0176D3', animation: `pulse-dot 1.2s ${i * 0.4}s infinite` }} />)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <CallBtn icon="📵" label="Cancel" color="#DC2626" onClick={cancelCall} />
        </div>
      </div>
    </div>
  );

  // ── Active call ───────────────────────────────────────────────────────────
  if (callState === 'active') return (
    <div style={{ ...overlay, background: 'rgba(0,0,0,0.95)' }}>
      {isVideo ? (
        <div style={{ position: 'relative', width: '100%', maxWidth: 700, height: '80vh', maxHeight: 520 }}>
          {/* Remote video */}
          <VideoTile stream={remoteStream} name={callInfo?.peerName} style={{ width: '100%', height: '100%' }} />
          {/* Local PiP */}
          {localStream && (
            <VideoTile stream={localStream} name="You" muted style={{ position: 'absolute', bottom: 16, right: 16, width: 140, height: 90, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }} />
          )}
        </div>
      ) : (
        <div style={card}>
          <div style={{ fontSize: 56, textAlign: 'center', marginBottom: 12 }}>📞</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 4 }}>{callInfo?.peerName}</div>
          <div style={{ fontSize: 13, color: '#22c55e', textAlign: 'center', marginBottom: 32 }}>
            <CallTimer startedAt={callStartedAt} />
          </div>
        </div>
      )}
      {/* Controls */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 24 }}>
        <CallBtn icon={micOn ? '🎙️' : '🔇'} label={micOn ? 'Mute' : 'Unmute'} color={micOn ? '#334155' : '#DC2626'} onClick={toggleMic} />
        {isVideo && <CallBtn icon={camOn ? '📹' : '📵'} label={camOn ? 'Cam Off' : 'Cam On'} color={camOn ? '#334155' : '#DC2626'} onClick={toggleCam} />}
        <CallBtn icon="📵" label="Hang Up" color="#DC2626" onClick={hangUp} />
      </div>
      {isVideo && callStartedAt && (
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 14px', borderRadius: 20, fontSize: 13 }}>
          <CallTimer startedAt={callStartedAt} />
        </div>
      )}
    </div>
  );

  // ── Ended screen ──────────────────────────────────────────────────────────
  if (callState === 'ended') return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>📵</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', textAlign: 'center', marginBottom: 4 }}>{endReason || 'Call Ended'}</div>
      </div>
    </div>
  );

  return null;
}

function CallBtn({ icon, label, color, onClick }) {
  return (
    <button onClick={onClick} style={{ background: color, border: 'none', borderRadius: '50%', width: 64, height: 64, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{label}</span>
    </button>
  );
}

const overlay = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: 'rgba(0,0,0,0.85)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  backdropFilter: 'blur(8px)',
};
const card = {
  background: '#1E293B', borderRadius: 20, padding: '40px 48px',
  minWidth: 320, border: '1px solid #334155',
};

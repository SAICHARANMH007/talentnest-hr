import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import useWebRTC from '../../hooks/useWebRTC.js';
import { SOCKET_BASE_URL } from '../../api/config.js';

const SOCKET_URL = SOCKET_BASE_URL;
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

function CallTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  const m = Math.floor(elapsed / 60), s = elapsed % 60;
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{`${m}:${s.toString().padStart(2, '0')}`}</span>;
}

function useRingSound(ringing) {
  useEffect(() => {
    if (!ringing) return;
    let ctx, interval;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const play = () => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 440; gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
      };
      play(); interval = setInterval(play, 2000);
    } catch {}
    return () => { clearInterval(interval); try { ctx?.close(); } catch {} };
  }, [ringing]);
}

export default function CallManager({ user }) {
  // Always convert to string — handles ObjectId objects and plain strings
  const myId = String(user?.id || user?._id || '').trim() || null;

  const socketRef    = useRef(null);
  // ── KEY FIX: use refs for anything accessed inside socket handlers ──────────
  // State variables read inside socket.on() closures MUST be refs, not state,
  // because the handlers are registered once and capture the initial (stale) value.
  const callInfoRef  = useRef(null);   // mirrors callInfo state — always current
  const localStreamRef2 = useRef(null); // mirrors localStream from useWebRTC

  const ringTimer  = useRef(null);
  const endTimer   = useRef(null);

  const [callState, setCallState]     = useState('idle');
  const [callInfo,  setCallInfo_]     = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStartedAt, setCallStartedAt] = useState(null);
  const [endReason, setEndReason]     = useState('');

  // Always keep ref in sync with state
  const setCallInfo = (val) => { callInfoRef.current = val; setCallInfo_(val); };

  const { localStream, micOn, camOn, startLocalMedia, initiateCall,
          handleOffer, handleAnswer, handleIce, toggleMic, toggleCam, stopAll } = useWebRTC({
    video: callInfoRef.current?.callType === 'video',
    audio: true,
    onRemoteStream: (_sid, stream) => setRemoteStream(stream),
  });

  // Keep localStream ref in sync
  useEffect(() => { localStreamRef2.current = localStream; }, [localStream]);

  useRingSound(callState === 'incoming');

  // ── Socket connection ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!myId) return;
    const token = sessionStorage.getItem('tn_token') || '';
    const socket = io(`${SOCKET_URL}/call`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,       // fast reconnect — 500ms first attempt
      reconnectionDelayMax: 4000,   // cap at 4s — don't wait too long
      reconnectionAttempts: Infinity,
      timeout: 10000,
    });
    socketRef.current = socket;

    // Helper — always uses callInfoRef for current callId
    const sigEvts = (callId) => ({
      sendOffer:  (_s, offer)     => socket.emit('call:offer',  { callId, offer }),
      sendAnswer: (_s, answer)    => socket.emit('call:answer', { callId, answer }),
      sendIce:    (_s, candidate) => socket.emit('call:ice',    { callId, candidate }),
    });

    // ── INCOMING ─────────────────────────────────────────────────────────────
    socket.on('call:incoming', ({ callId, fromUserId, fromName, callType }) => {
      setCallInfo({ callId, peerId: fromUserId, peerName: fromName, callType });
      setCallState('incoming');
      try {
        if (Notification.permission === 'granted') {
          new Notification(`Incoming ${callType === 'video' ? 'Video' : 'Audio'} Call`, {
            body: `${fromName} is calling you on TalentNest`, icon: '/logo.svg',
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      } catch {}
    });

    // ── ACCEPTED (fires on caller side) ──────────────────────────────────────
    socket.on('call:accepted', ({ callId }) => {
      clearTimeout(ringTimer.current);
      socket.emit('call:join-room', { callId });
      startLocalMedia().then(stream => {
        if (!stream) return;
        setCallState('active');
        setCallStartedAt(Date.now());
        setTimeout(async () => {
          await initiateCall('peer', socket, sigEvts(callId), stream);
        }, 600);
      });
    });

    // ── SIGNALING — use refs for callId and stream ────────────────────────────
    socket.on('call:offer', ({ from, offer }) => {
      const cid = callInfoRef.current?.callId;
      if (!cid) return;
      handleOffer(from, offer, sigEvts(cid), localStreamRef2.current || undefined)
        .then(() => setCallStartedAt(Date.now()))
        .catch(() => {});
    });

    socket.on('call:answer', ({ from, answer }) => handleAnswer(from, answer).catch(() => {}));
    socket.on('call:ice',    ({ from, candidate }) => handleIce(from, candidate).catch(() => {}));

    // ── STATE TRANSITIONS ─────────────────────────────────────────────────────
    socket.on('call:declined',   ()                => { clearTimeout(ringTimer.current); endCallInternal('Declined'); });
    socket.on('call:cancelled',  ()                => { clearTimeout(ringTimer.current); endCallInternal('Caller cancelled'); });
    socket.on('call:no-answer',  ()                => { endCallInternal('No answer'); });
    socket.on('call:busy',       ({ toName })      => { endCallInternal(`${toName || 'User'} is on another call`); });
    socket.on('call:ended',      ({ reason })      => { endCallInternal(reason === 'disconnected' ? 'Connection lost' : 'Call ended'); });
    socket.on('call:error',      ({ message })     => { endCallInternal(message); });
    // Receiver is not online — instant feedback instead of waiting 30s
    socket.on('call:unavailable', ({ message })   => { clearTimeout(ringTimer.current); endCallInternal(message || 'User is not online'); });

    // ── CONNECTION HEALTH ────────────────────────────────────────────────────
    socket.on('connect', () => { console.log('[Call] Socket connected:', socket.id); });
    socket.on('connect_error', (err) => { console.warn('[Call] Socket connect error:', err.message); });
    socket.on('disconnect', (reason) => { console.warn('[Call] Socket disconnected:', reason); });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [myId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── endCall (internal — no deps on stale callInfo) ────────────────────────
  const endCallInternal = (reason = '') => {
    clearTimeout(ringTimer.current);
    clearTimeout(endTimer.current);
    stopAll();
    setRemoteStream(null);
    setCallState('ended');
    setEndReason(reason);
    endTimer.current = setTimeout(() => {
      setCallState('idle');
      setCallInfo(null);
      setEndReason('');
      setCallStartedAt(null);
    }, 2500);
  };

  // ── Public actions ────────────────────────────────────────────────────────
  const startCall = useCallback(async (toUserId, toName, callType) => {
    if (!socketRef.current) return;
    setCallInfo({ callId: null, peerId: toUserId, peerName: toName, callType });
    setCallState('outgoing');
    socketRef.current.emit('call:initiate', { toUserId, callType, toName });
    clearTimeout(ringTimer.current);
    ringTimer.current = setTimeout(() => endCallInternal('No answer'), RING_DURATION + 2000);
  }, []); // eslint-disable-line

  const acceptCall = useCallback(async () => {
    const cid = callInfoRef.current?.callId;
    if (!cid) return;
    const stream = await startLocalMedia();
    if (!stream) return;
    localStreamRef2.current = stream; // sync ref immediately — offer may arrive before useEffect
    setCallState('active');
    socketRef.current?.emit('call:accept', { callId: cid });
  }, [startLocalMedia]);

  const declineCall = useCallback(() => {
    socketRef.current?.emit('call:decline', { callId: callInfoRef.current?.callId });
    endCallInternal('');
  }, []); // eslint-disable-line

  const cancelCall = useCallback(() => {
    socketRef.current?.emit('call:cancel', { callId: callInfoRef.current?.callId });
    endCallInternal('');
  }, []); // eslint-disable-line

  const hangUp = useCallback(() => {
    socketRef.current?.emit('call:end', { callId: callInfoRef.current?.callId });
    endCallInternal('');
  }, []); // eslint-disable-line

  // Expose to ChatPanel via window
  useEffect(() => {
    window.__tnStartCall = startCall;
    return () => { delete window.__tnStartCall; };
  }, [startCall]);

  if (callState === 'idle') return null;

  const isVideo = callInfo?.callType === 'video';

  // ── Incoming — top banner + full overlay (impossible to miss) ────────────
  if (callState === 'incoming') return (
    <>
      {/* Top banner — visible even over other modals */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
        background: 'linear-gradient(135deg, #0176D3, #0ea5e9)',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 4px 24px rgba(1,118,211,0.5)',
        animation: 'ring-pulse 1s ease-in-out infinite',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 28, animation: 'ring-shake 0.5s ease-in-out infinite' }}>
            {isVideo ? '📹' : '📞'}
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{callInfo?.peerName}</div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>
              Incoming {isVideo ? 'Video' : 'Audio'} Call
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={declineCall} style={{ background: '#DC2626', border: 'none', borderRadius: 24, padding: '10px 22px', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            📵 Decline
          </button>
          <button onClick={acceptCall} style={{ background: '#16a34a', border: 'none', borderRadius: 24, padding: '10px 22px', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            📞 Accept
          </button>
        </div>
      </div>
      {/* Dimming overlay behind everything */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 99990, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} />
      <style>{`
        @keyframes ring-pulse { 0%,100%{opacity:1} 50%{opacity:0.9} }
        @keyframes ring-shake { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-15deg)} 75%{transform:rotate(15deg)} }
      `}</style>
    </>
  );

  // ── Outgoing ──────────────────────────────────────────────────────────────
  if (callState === 'outgoing') return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ fontSize: 56, textAlign: 'center', marginBottom: 4 }}>{isVideo ? '📹' : '📞'}</div>
        <div style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', marginBottom: 4 }}>Calling…</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 12 }}>{callInfo?.peerName}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 32 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#0176D3', animation: `pulse-dot 1.2s ${i*0.4}s infinite` }} />)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <CallBtn icon="📵" label="Cancel" color="#DC2626" onClick={cancelCall} />
        </div>
      </div>
    </div>
  );

  // ── Active ────────────────────────────────────────────────────────────────
  if (callState === 'active') return (
    <div style={{ ...overlay, background: 'rgba(0,0,0,0.95)', flexDirection: 'column', gap: 16 }}>
      {isVideo ? (
        <div style={{ position: 'relative', width: '90vw', maxWidth: 700, height: '70vh', maxHeight: 500 }}>
          <VideoTile stream={remoteStream} name={callInfo?.peerName} style={{ width: '100%', height: '100%' }} />
          {localStream && (
            <VideoTile stream={localStream} name="You" muted style={{ position: 'absolute', bottom: 12, right: 12, width: 140, height: 90, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }} />
          )}
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.65)', color: '#22c55e', padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
            <CallTimer startedAt={callStartedAt} />
          </div>
        </div>
      ) : (
        <div style={card}>
          <div style={{ fontSize: 56, textAlign: 'center', marginBottom: 8 }}>📞</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 4 }}>{callInfo?.peerName}</div>
          <div style={{ fontSize: 13, color: '#22c55e', textAlign: 'center' }}><CallTimer startedAt={callStartedAt} /></div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        <CallBtn icon={micOn ? '🎙️' : '🔇'} label={micOn ? 'Mute' : 'Unmute'} color={micOn ? '#334155' : '#DC2626'} onClick={toggleMic} />
        {isVideo && <CallBtn icon={camOn ? '📹' : '📵'} label={camOn ? 'Cam Off' : 'Cam On'} color={camOn ? '#334155' : '#DC2626'} onClick={toggleCam} />}
        <CallBtn icon="📵" label="Hang Up" color="#DC2626" onClick={hangUp} />
      </div>
    </div>
  );

  // ── Ended ─────────────────────────────────────────────────────────────────
  return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 8 }}>📵</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', textAlign: 'center' }}>{endReason || 'Call Ended'}</div>
      </div>
    </div>
  );
}

function CallBtn({ icon, label, color, onClick }) {
  return (
    <button onClick={onClick} style={{ background: color, border: 'none', borderRadius: '50%', width: 64, height: 64, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{label}</span>
    </button>
  );
}

const overlay = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: 'rgba(0,0,0,0.88)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  backdropFilter: 'blur(8px)',
};
const card = {
  background: '#1E293B', borderRadius: 20, padding: '36px 48px',
  minWidth: 300, border: '1px solid #334155', textAlign: 'center',
};

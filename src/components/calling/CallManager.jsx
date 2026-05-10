import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import useWebRTC from '../../hooks/useWebRTC.js';
import { SOCKET_BASE_URL } from '../../api/config.js';

const SOCKET_URL = SOCKET_BASE_URL;
const RING_DURATION = 30000;

// ── Video tile ────────────────────────────────────────────────────────────────
function VideoTile({ stream, name, muted = false, style = {} }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !stream) return;
    ref.current.srcObject = stream;
    // CRITICAL: Set muted imperatively — React's `muted` prop does NOT reliably
    // unmute <video> elements because the attribute is set at creation time only.
    // Without this, remote video streams are permanently silent.
    ref.current.muted = !!muted;
    ref.current.volume = muted ? 0 : 1;
    ref.current.play().catch(() => {});
  }, [stream, muted]);
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
    } catch { }
    return () => { clearInterval(interval); try { ctx?.close(); } catch { } };
  }, [ringing]);
}

export default function CallManager({ user }) {
  // Always convert to string — handles ObjectId objects and plain strings
  const myId = String(user?.id || user?._id || '').trim() || null;

  const socketRef = useRef(null);
  // ── KEY FIX: use refs for anything accessed inside socket handlers ──────────
  // State variables read inside socket.on() closures MUST be refs, not state,
  // because the handlers are registered once and capture the initial (stale) value.
  const callInfoRef = useRef(null);   // mirrors callInfo state — always current
  const localStreamRef2 = useRef(null); // mirrors localStream from useWebRTC

  const ringTimer = useRef(null);
  const endTimer = useRef(null);
  const endingRef = useRef(false); // prevents re-entrant endCallInternal calls
  const audioCtxRef = useRef(null);  // AudioContext used to unlock mobile audio

  const [callState, setCallState] = useState('idle');
  const [connectionState, setConnectionState] = useState('new');
  const [callInfo, setCallInfo_] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStartedAt, setCallStartedAt] = useState(null);
  const [meetingNotice, setMeetingNotice] = useState(null);
  const [endReason, setEndReason] = useState('');

  // Always keep ref in sync with state
  const setCallInfo = (val) => { callInfoRef.current = val; setCallInfo_(val); };

  const remoteAudioRef = useRef(null); // hidden <audio> element — plays remote audio for ALL call types

  // ── Unlock audio pipeline on mobile ────────────────────────────────────────
  // Mobile browsers (iOS Safari, Chrome Android) block audio playback unless
  // initiated during a user gesture. This MUST be called inside onClick handlers.
  const unlockAudio = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => { });
      }
      // Also try to resume any existing remote audio element
      if (remoteAudioRef.current) {
        remoteAudioRef.current.play().catch(() => { });
      }
    } catch (err) {
      console.warn('[WebRTC] Audio unlock failed:', err);
    }
  }, []);

  // ── Global click failsafe ──────────────────────────────────────────────────
  // Any click on the page during a call will attempt to resume the audio context.
  // This is a foolproof way to bypass aggressive browser autoplay blocks.
  useEffect(() => {
    if (callState === 'active') {
      window.addEventListener('click', unlockAudio);
      window.addEventListener('touchstart', unlockAudio);
      return () => {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };
    }
  }, [callState, unlockAudio]);

  // ── Attach remote audio ────────────────────────────────────────────────────
  // Uses only the HTML5 <audio> element — do NOT also route via AudioContext as
  // that causes duplicate audio sources (both playing simultaneously) which results
  // in the browser silencing both or causing distortion/echo.
  const attachRemoteAudio = useCallback((stream) => {
    const el = remoteAudioRef.current;
    if (!el) return;

    // Route audio through the hidden <audio> element for ALL call types.
    // Previously video calls relied on VideoTile's <video> for audio, but React's
    // `muted` prop doesn't reliably unmute <video> elements — causing silence.
    // Using a dedicated <audio> element is cleaner and more reliable across all browsers.
    // VideoTile now only renders VIDEO track (muted=true); audio comes from here.
    if (el.srcObject !== stream) el.srcObject = stream;
    el.muted = false;
    el.volume = 1;

    const tryPlay = () => {
      const p = el.play();
      if (p?.catch) {
        p.catch((err) => {
          console.warn('[Call] audio.play() blocked:', err.name, '— retrying after AudioContext resume');
          // Resume AudioContext (if suspended by autoplay policy) then retry
          const ctx = audioCtxRef.current;
          if (ctx && ctx.state === 'suspended') {
            ctx.resume().then(() => el.play().catch(() => {})).catch(() => {});
          } else {
            setTimeout(() => { if (el.srcObject) el.play().catch(() => {}); }, 600);
          }
        });
      }
    };

    tryPlay();
    // Re-try whenever an audio track unmutes (e.g. after network recovery)
    stream?.getAudioTracks().forEach(track => { track.onunmute = tryPlay; });
  }, []);

  // ── Reactive Watchdog ──────────────────────────────────────────────────────
  // If remoteStream is available but the audio element wasn't ready earlier,
  // this useEffect will ensure the stream is attached as soon as the ref is populated.
  useEffect(() => {
    if (remoteStream && remoteAudioRef.current && callState === 'active') {
      attachRemoteAudio(remoteStream);
    }
  }, [remoteStream, callState, attachRemoteAudio]);

  const { localStream, micOn, camOn, startLocalMedia, initiateCall,
    handleOffer, handleAnswer, handleIce, toggleMic, toggleCam, stopAll } = useWebRTC({
      video: callInfoRef.current?.callType === 'video',
      audio: true,
      onRemoteStream: (sid, stream) => {
        console.log(`[WebRTC] Received remote stream from ${sid}`);
        setRemoteStream(stream);
        attachRemoteAudio(stream);
      },
      onConnectionChange: (sid, state) => {
        console.log(`[WebRTC] Connection state with ${sid}: ${state}`);
        setConnectionState(state);
      },
    });

  // Keep localStream ref in sync
  useEffect(() => { localStreamRef2.current = localStream; }, [localStream]);

  useRingSound(callState === 'incoming');

  // ── Socket connection ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!myId) return;
    const socket = io(`${SOCKET_URL}/call`, {
      // Use function form so Socket.IO re-reads token on EVERY reconnect.
      // Static { token } would reuse an expired JWT after the 15-min TTL.
      auth: (cb) => cb({ token: sessionStorage.getItem('tn_token') || '' }),
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
      reconnectionAttempts: Infinity,
      timeout: 10000,
    });
    socketRef.current = socket;

    // Helper — always uses callInfoRef for current callId
    const sigEvts = (callId) => ({
      sendOffer: (_s, offer) => socket.emit('call:offer', { callId, offer }),
      sendAnswer: (_s, answer) => socket.emit('call:answer', { callId, answer }),
      sendIce: (_s, candidate) => socket.emit('call:ice', { callId, candidate }),
    });

    socket.on('call:initiated', ({ callId }) => {
      setCallInfo({ ...(callInfoRef.current || {}), callId });
    });

    // ── INCOMING ─────────────────────────────────────────────────────────────
    socket.on('call:incoming', ({ callId, fromUserId, fromName, callType, callMessage }) => {
      setCallInfo({ callId, peerId: fromUserId, peerName: fromName, callType, callMessage: callMessage || '' });
      setCallState('incoming');
      try {
        if (Notification.permission === 'granted') {
          new Notification(`Incoming ${callType === 'video' ? 'Video' : 'Audio'} Call`, {
            body: `${fromName} is calling you on TalentNest`, icon: '/logo.svg',
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      } catch { }
    });

    // ── ACCEPTED (fires on caller side) ──────────────────────────────────────
    socket.on('call:accepted', ({ callId }) => {
      clearTimeout(ringTimer.current);
      setCallInfo({ ...(callInfoRef.current || {}), callId });
      socket.emit('call:join-room', { callId });
      const isVideo = callInfoRef.current?.callType === 'video';
      startLocalMedia(isVideo).then(stream => {
        if (!stream) return;
        localStreamRef2.current = stream;
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
        .catch(() => { });
    });

    socket.on('call:answer', ({ from, answer }) => handleAnswer(from, answer).catch(() => { }));
    socket.on('call:ice', ({ from, candidate }) => handleIce(from, candidate).catch(() => { }));

    // ── STATE TRANSITIONS ─────────────────────────────────────────────────────
    socket.on('call:declined', () => { clearTimeout(ringTimer.current); endCallInternal('Declined'); });
    socket.on('call:cancelled', () => { clearTimeout(ringTimer.current); endCallInternal('Caller cancelled'); });
    socket.on('call:no-answer', () => { endCallInternal('No answer'); });
    socket.on('call:busy', ({ toName }) => { endCallInternal(`${toName || 'User'} is on another call`); });
    socket.on('call:ended', ({ reason }) => { endCallInternal(reason === 'disconnected' ? 'Connection lost' : 'Call ended'); });
    socket.on('call:error', ({ message }) => { endCallInternal(message); });
    // Multi-tab: another tab of mine answered this call — silently dismiss here
    socket.on('call:answered-elsewhere', () => { endCallInternal(''); });
    // Receiver is not online — instant feedback instead of waiting 30s
    socket.on('call:unavailable', ({ message }) => { clearTimeout(ringTimer.current); endCallInternal(message || 'User is not online'); });

    // ── MEETING NOTIFICATIONS ───────────────────────────────────────────────
    socket.on('meeting:joined', ({ roomToken, name, role }) => {
      setMeetingNotice({ roomToken, name, role });
      // Auto-hide after 8 seconds
      setTimeout(() => setMeetingNotice(null), 8000);
    });

    // ── CONNECTION HEALTH ────────────────────────────────────────────────────
    socket.on('connect', () => {
      console.log('[Call] Socket connected:', socket.id);
      // If we reconnect during an active call, ensure we're back in the call room
      // so we continue to receive signaling events.
      const cid = callInfoRef.current?.callId;
      if (cid && (callState === 'active' || callState === 'outgoing' || callState === 'incoming')) {
        socket.emit('call:join-room', { callId: cid });
      }
    });
    socket.on('connect_error', (err) => { console.warn('[Call] Socket connect error:', err.message); });
    socket.on('disconnect', (reason) => { console.warn('[Call] Socket disconnected:', reason); });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [myId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── endCall (internal — idempotent, guards against duplicate call:ended events) ──
  const endCallInternal = (reason = '') => {
    // Skip if we're already in the ending/ended flow — prevents duplicate timeouts
    if (endingRef.current) return;
    endingRef.current = true;
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
      endingRef.current = false; // ready for next call
    }, 2500);
  };

  // ── Public actions ────────────────────────────────────────────────────────
  const startCall = useCallback(async (toUserId, toName, callType, callMessage) => {
    if (!socketRef.current) return;
    // Reset ending guard in case previous call's endTimer hasn't fired yet
    endingRef.current = false;
    clearTimeout(endTimer.current);
    setCallInfo({ callId: null, peerId: toUserId, peerName: toName, callType, callMessage: callMessage || '' });
    setCallState('outgoing');
    
    // START MEDIA IMMEDIATELY for the caller so it's ready when recipient accepts
    const stream = await startLocalMedia(callType === 'video');
    if (!stream) {
      endCallInternal('Media access denied');
      return;
    }
    localStreamRef2.current = stream;

    socketRef.current.emit('call:initiate', { toUserId, callType, toName, callMessage: callMessage || '' });
    clearTimeout(ringTimer.current);
    ringTimer.current = setTimeout(() => endCallInternal('No answer'), RING_DURATION + 2000);
  }, []); // eslint-disable-line

  const acceptCall = useCallback(async () => {
    unlockAudio(); // MUST run during user gesture — unlocks mobile audio output
    const cid = callInfoRef.current?.callId;
    if (!cid) return;
    const isVideo = callInfoRef.current?.callType === 'video';
    const stream = await startLocalMedia(isVideo); 
    if (!stream) {
      // If media fails, we can't answer properly. Show reason.
      const msg = permError || 'Could not access camera/microphone';
      socketRef.current?.emit('call:decline', { callId: cid, reason: msg });
      endCallInternal(msg);
      return;
    }
    localStreamRef2.current = stream;
    setCallState('active');
    socketRef.current?.emit('call:accept', { callId: cid });
  }, [startLocalMedia, unlockAudio]);

  const declineCall = useCallback(() => {
    socketRef.current?.emit('call:decline', { callId: callInfoRef.current?.callId });
    endCallInternal('');
  }, []); // eslint-disable-line

  const cancelCall = useCallback(() => {
    socketRef.current?.emit('call:cancel', { callId: callInfoRef.current?.callId });
    endCallInternal('');
  }, []); // eslint-disable-line

  const hangUp = useCallback(() => {
    const cid = callInfoRef.current?.callId;
    if (cid) socketRef.current?.emit('call:end', { callId: cid });
    endCallInternal('');
  }, []); // eslint-disable-line

  // Expose to ChatPanel via window
  useEffect(() => {
    window.__tnStartCall = startCall;
    return () => { delete window.__tnStartCall; };
  }, [startCall]);

  // Hidden audio element — ALWAYS rendered (even when idle) so the ref is available
  // when unlockAudio() is called during startCall/acceptCall before React re-renders.
  const audioEl = (
    <audio
      ref={remoteAudioRef}
      autoPlay
      playsInline
      style={{ position: 'fixed', width: 1, height: 1, opacity: 0, pointerEvents: 'none', zIndex: -1 }}
    />
  );

  // ── Meeting Notice Banner ────────────────────────────────────────────────
  const MeetingBanner = meetingNotice && (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 100001, background: '#0176D3', color: '#fff',
      padding: '12px 24px', borderRadius: 16, display: 'flex', alignItems: 'center',
      gap: 16, boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
      animation: 'tn-slide-down 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
    }}>
      <div style={{ fontSize: 24 }}>🎥</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14 }}>{meetingNotice.name} is in the room</div>
        <div style={{ fontSize: 11, opacity: 0.9 }}>{meetingNotice.role === 'interviewer' ? 'The recruiter' : 'The candidate'} has joined the interview room.</div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
        <button 
          onClick={() => { setMeetingNotice(null); window.open(`/meeting/${meetingNotice.roomToken}`, '_blank'); }}
          style={{ background: '#fff', color: '#0176D3', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          Join Now
        </button>
        <button 
          onClick={() => setMeetingNotice(null)}
          style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>
      <style>{`
        @keyframes tn-slide-down { from { transform: translate(-50%, -40px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
      `}</style>
    </div>
  );

  // When idle, render audio + meeting notice
  if (callState === 'idle') return (
    <>
      {audioEl}
      {MeetingBanner}
    </>
  );

  const isVideo = callInfo?.callType === 'video';
  const callMsg = callInfo?.callMessage || '';

  // Reusable call-message bubble (shown across all screens when message exists)
  const MessageBubble = callMsg ? (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 14, padding: '10px 16px',
      maxWidth: 380, width: '100%', marginTop: 8,
    }}>
      <span style={{ fontSize: 16, lineHeight: 1.3, flexShrink: 0 }}>💬</span>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.92)', lineHeight: 1.5, fontStyle: 'italic', wordBreak: 'break-word' }}>
        "{callMsg}"
      </div>
    </div>
  ) : null;

  // ── Incoming — top banner + full overlay (impossible to miss) ────────────
  if (callState === 'incoming') return (
    <>
      {/* Top banner — visible even over other modals */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
        background: 'linear-gradient(135deg, #0176D3, #0ea5e9)',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10,
        boxShadow: '0 4px 24px rgba(1,118,211,0.5)',
        animation: 'ring-pulse 1s ease-in-out infinite',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 28, animation: 'ring-shake 0.5s ease-in-out infinite', flexShrink: 0 }}>
            {isVideo ? '📹' : '📞'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{callInfo?.peerName}</div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>
              Incoming {isVideo ? 'Video' : 'Audio'} Call
            </div>
            {callMsg && (
              <div style={{
                marginTop: 6, display: 'flex', alignItems: 'flex-start', gap: 6,
                background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 10, padding: '6px 12px', maxWidth: 340,
              }}>
                <span style={{ fontSize: 13, lineHeight: 1.3, flexShrink: 0 }}>💬</span>
                <span style={{ fontSize: 12, color: '#fff', fontStyle: 'italic', lineHeight: 1.45, wordBreak: 'break-word' }}>
                  "{callMsg}"
                </span>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
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
      {audioEl}
    </>
  );

  // ── Outgoing ──────────────────────────────────────────────────────────────
  if (callState === 'outgoing') return (
    <>
      {audioEl}
      <div style={overlay}>
        <div style={card}>
          <div style={{ fontSize: 56, textAlign: 'center', marginBottom: 4 }}>{isVideo ? '📹' : '📞'}</div>
          <div style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', marginBottom: 4 }}>Calling…</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 4 }}>{callInfo?.peerName}</div>
          {/* Show the message you're sending */}
          {MessageBubble && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              {MessageBubble}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 32 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#0176D3', animation: `pulse-dot 1.2s ${i * 0.4}s infinite` }} />)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <CallBtn icon="📵" label="Cancel" color="#DC2626" onClick={cancelCall} />
          </div>
        </div>
      </div>
    </>
  );

  // ── Active ────────────────────────────────────────────────────────────────
  const isPoorNetwork = connectionState === 'disconnected' || connectionState === 'failed' || connectionState === 'checking';
  if (callState === 'active') return (
    <>
      {audioEl}
      <div style={{ ...overlay, background: 'rgba(0,0,0,0.95)', flexDirection: 'column', gap: 16 }}>
        {/* Network quality warning */}
        {isPoorNetwork && (
          <div style={{ position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', background: 'rgba(245,158,11,0.95)', color: '#fff', padding: '8px 20px', borderRadius: 20, fontSize: 13, fontWeight: 700, zIndex: 99999, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            <span>⚠️</span>
            {connectionState === 'failed' ? 'Connection lost — trying to reconnect…' : 'Weak network — voice may be affected'}
          </div>
        )}
        {isVideo ? (
          <div style={{ position: 'relative', width: '90vw', maxWidth: 700, height: '70vh', maxHeight: 500 }}>
            {/* Remote video tile: muted=true because audio is played through hidden <audio> element above */}
            <VideoTile stream={remoteStream} name={callInfo?.peerName} muted style={{ width: '100%', height: '100%' }} />
            {localStream && (
              <VideoTile stream={localStream} name="You" muted style={{ position: 'absolute', bottom: 12, right: 12, width: 140, height: 90, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }} />
            )}
            <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.65)', color: '#22c55e', padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
              <CallTimer startedAt={callStartedAt} />
            </div>
            {/* Call message — bottom left of video */}
            {callMsg && (
              <div style={{
                position: 'absolute', bottom: 12, left: 12,
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
                borderRadius: 10, padding: '6px 12px', maxWidth: 280,
              }}>
                <span style={{ fontSize: 12, flexShrink: 0 }}>💬</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  "{callMsg}"
                </span>
              </div>
            )}
          </div>
        ) : (
          <div style={card}>
            <div style={{ fontSize: 56, textAlign: 'center', marginBottom: 8 }}>📞</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 4 }}>{callInfo?.peerName}</div>
            <div style={{ fontSize: 13, color: '#22c55e', textAlign: 'center' }}><CallTimer startedAt={callStartedAt} /></div>
            {/* Call message — in audio card */}
            {MessageBubble && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
                {MessageBubble}
              </div>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <CallBtn icon={micOn ? '🎙️' : '🔇'} label={micOn ? 'Mute' : 'Unmute'} color={micOn ? '#334155' : '#DC2626'} onClick={toggleMic} />
          {isVideo && <CallBtn icon={camOn ? '📹' : '📵'} label={camOn ? 'Cam Off' : 'Cam On'} color={camOn ? '#334155' : '#DC2626'} onClick={toggleCam} />}
          <CallBtn icon="📵" label="Hang Up" color="#DC2626" onClick={hangUp} />
        </div>
      </div>
    </>
  );

  // ── Ended ─────────────────────────────────────────────────────────────────
  return (
    <>
      {audioEl}
      <div style={overlay}>
        <div style={card}>
          <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 8 }}>📵</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', textAlign: 'center' }}>{endReason || 'Call Ended'}</div>
        </div>
      </div>
      {MeetingBanner}
    </>
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

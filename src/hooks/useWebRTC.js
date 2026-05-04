import { useRef, useState, useCallback, useEffect } from 'react';

// Multiple STUN servers across providers — prevents rate-limit failures at scale
// (50 simultaneous calls from same IP could exhaust Google's STUN rate limits)
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.nextcloud.com:443' },
  // Free TURN relay — fallback for users behind strict NAT/firewalls
  // without this, calls fail in corporate networks and mobile data
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

const MAX_RECONNECT_ATTEMPTS = 8; // more attempts for production reliability

/**
 * Shared WebRTC engine used by both chat calls and interview meeting rooms.
 * @param {object} opts
 * @param {boolean} opts.video - request camera
 * @param {boolean} opts.audio - request mic (always true)
 * @param {function} opts.onRemoteStream - called with (socketId, stream) when remote track arrives
 * @param {function} opts.onConnectionChange - called with (socketId, state)
 */
export default function useWebRTC({ video = true, audio = true, onRemoteStream, onConnectionChange } = {}) {
  const [localStream, setLocalStream]   = useState(null);
  const [micOn, setMicOn]               = useState(true);
  const [camOn, setCamOn]               = useState(video);
  const [permError, setPermError]       = useState('');

  // Refs that mirror state — used inside toggleMic/toggleCam to avoid stale closures
  const micOnRef = useRef(true);
  const camOnRef = useRef(video);

  const localStreamRef   = useRef(null);
  const peerConnsRef     = useRef({});   // socketId -> RTCPeerConnection
  const reconnectCount   = useRef({});   // socketId -> attempts
  const pendingIceRef    = useRef({});   // socketId -> RTCIceCandidateInit[]

  const getPeerKey = useCallback((socketId) => {
    if (peerConnsRef.current[socketId]) return socketId;
    const keys = Object.keys(peerConnsRef.current);
    return keys.length === 1 ? keys[0] : socketId;
  }, []);

  const flushPendingIce = useCallback(async (socketId) => {
    const key = getPeerKey(socketId);
    const pc = peerConnsRef.current[key];
    const queued = pendingIceRef.current[key];
    if (!pc || !pc.remoteDescription || !queued?.length) return;

    pendingIceRef.current[key] = [];
    for (const item of queued) {
      try { await pc.addIceCandidate(new RTCIceCandidate(item)); } catch {}
    }
  }, [getPeerKey]);

  // ── Get user media ────────────────────────────────────────────────────────
  // wantVideo overrides the hook-level `video` flag so call type is respected
  // even though the hook was initialized with video:false (callInfoRef was null)
  const startLocalMedia = useCallback(async (wantVideo) => {
    const useVideo = wantVideo !== undefined ? wantVideo : video;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: useVideo, audio });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setPermError('');
      // Reset mic/cam state to match actual track state (all enabled by default)
      setMicOn(true);  micOnRef.current = true;
      setCamOn(useVideo); camOnRef.current = useVideo;
      return stream;
    } catch (e) {
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setPermError('Camera/microphone access denied. Please allow access in browser settings.');
      } else {
        // Try audio-only fallback
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          localStreamRef.current = stream;
          setLocalStream(stream);
          // Audio-only fallback — mic on, cam off
          setMicOn(true);  micOnRef.current = true;
          setCamOn(false); camOnRef.current = false;
          return stream;
        } catch {
          setPermError('Could not access microphone. Please check permissions.');
        }
      }
      return null;
    }
  }, [video, audio]);

  // ── Create peer connection ────────────────────────────────────────────────
  const createPeer = useCallback((socketId, socket, signalingEvents, stream) => {
    if (peerConnsRef.current[socketId]) return peerConnsRef.current[socketId];

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceTransportPolicy: 'all',       // try direct first, relay as fallback
      bundlePolicy: 'max-bundle',      // reduces port usage — important at scale
      rtcpMuxPolicy: 'require',        // single port for RTP+RTCP
    });
    peerConnsRef.current[socketId] = pc;
    reconnectCount.current[socketId] = 0;

    const src = stream || localStreamRef.current;
    if (src) src.getTracks().forEach(t => pc.addTrack(t, src));

    // Trickle ICE — send candidates as they arrive for faster connection
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) signalingEvents.sendIce(socketId, candidate);
    };

    // Build or reuse a remote MediaStream for this peer
    // e.streams[0] can be undefined if the remote side's tracks haven't
    // been associated with a stream yet — use e.track directly as fallback.
    let remoteStream = null;
    pc.ontrack = (e) => {
      if (!remoteStream) {
        remoteStream = e.streams?.[0] || new MediaStream();
      }
      // Add the track if not already in the stream (prevents duplicates)
      if (!remoteStream.getTracks().find(t => t.id === e.track.id)) {
        remoteStream.addTrack(e.track);
      }
      // Always fire — caller will play audio/video from this stream
      onRemoteStream?.(socketId, remoteStream);
      e.track.onunmute = () => onRemoteStream?.(socketId, remoteStream);
    };

    pc.onconnectionstatechange = () => {
      onConnectionChange?.(socketId, pc.connectionState);
      if (pc.connectionState === 'failed') {
        const attempts = reconnectCount.current[socketId] || 0;
        if (attempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectCount.current[socketId] = attempts + 1;
          const delay = Math.min(500 * 2 ** attempts, 8000); // faster backoff
          setTimeout(() => { try { pc.restartIce(); } catch {} }, delay);
        }
      }
      if (pc.connectionState === 'disconnected') {
        // Try ICE restart after 3s
        setTimeout(() => { try { if (pc.connectionState !== 'closed') pc.restartIce(); } catch {} }, 3000);
      }
    };

    return pc;
  }, [onRemoteStream, onConnectionChange]);

  // ── Initiate call (create offer) ──────────────────────────────────────────
  const initiateCall = useCallback(async (socketId, socket, signalingEvents, stream) => {
    const pc = createPeer(socketId, socket, signalingEvents, stream);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    signalingEvents.sendOffer(socketId, offer);
  }, [createPeer]);

  // ── Handle incoming offer ─────────────────────────────────────────────────
  const handleOffer = useCallback(async (socketId, offer, signalingEvents, stream) => {
    const pc = createPeer(socketId, null, signalingEvents, stream);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    await flushPendingIce(socketId);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    signalingEvents.sendAnswer(socketId, answer);
  }, [createPeer, flushPendingIce]);

  // ── Handle incoming answer ────────────────────────────────────────────────
  // In 1:1 calls the caller creates the peer with key 'peer' but the answer
  // arrives with from=recipientSocketId — fall back to the only existing peer.
  const handleAnswer = useCallback(async (socketId, answer) => {
    const key = getPeerKey(socketId);
    const pc = peerConnsRef.current[key];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await flushPendingIce(key);
    }
  }, [flushPendingIce, getPeerKey]);

  // ── Handle ICE candidate ──────────────────────────────────────────────────
  const handleIce = useCallback(async (socketId, candidate) => {
    if (!candidate) return;
    const key = getPeerKey(socketId);
    const pc = peerConnsRef.current[key];

    if (!pc || !pc.remoteDescription) {
      pendingIceRef.current[key] = [...(pendingIceRef.current[key] || []), candidate];
      return;
    }

    await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {
      pendingIceRef.current[key] = [...(pendingIceRef.current[key] || []), candidate];
    });
  }, [getPeerKey]);

  // ── Replace video track (screen share or camera swap) ────────────────────
  const replaceVideoTrack = useCallback((newTrack) => {
    Object.values(peerConnsRef.current).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(newTrack).catch(() => {});
    });
  }, []);

  // ── Toggle mic ───────────────────────────────────────────────────────────
  // Uses ref instead of state dependency to avoid stale closures
  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const newState = !micOnRef.current;
    stream.getAudioTracks().forEach(t => { t.enabled = newState; });
    micOnRef.current = newState;
    setMicOn(newState);
  }, []);

  // ── Toggle camera ─────────────────────────────────────────────────────────
  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const newState = !camOnRef.current;
    stream.getVideoTracks().forEach(t => { t.enabled = newState; });
    camOnRef.current = newState;
    setCamOn(newState);
  }, []);

  // ── Close a specific peer ─────────────────────────────────────────────────
  const closePeer = useCallback((socketId) => {
    const pc = peerConnsRef.current[socketId];
    if (pc) { try { pc.close(); } catch {} delete peerConnsRef.current[socketId]; }
  }, []);

  // ── Stop all and cleanup ──────────────────────────────────────────────────
  const stopAll = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    Object.values(peerConnsRef.current).forEach(pc => { try { pc.close(); } catch {} });
    peerConnsRef.current = {};
    reconnectCount.current = {};
    pendingIceRef.current = {};
    // Reset mic/cam state so next call starts fresh (mic on, cam off until decided)
    setMicOn(true);  micOnRef.current = true;
    setCamOn(false); camOnRef.current = false;
  }, []);

  useEffect(() => () => stopAll(), []);

  return {
    localStream, micOn, camOn, permError,
    startLocalMedia, initiateCall, handleOffer, handleAnswer, handleIce,
    replaceVideoTrack, toggleMic, toggleCam, closePeer, stopAll,
    peerConnsRef, localStreamRef,
  };
}

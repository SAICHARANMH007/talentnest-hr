import { useRef, useState, useCallback, useEffect } from 'react';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const MAX_RECONNECT_ATTEMPTS = 5;

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

  const localStreamRef   = useRef(null);
  const peerConnsRef     = useRef({});   // socketId -> RTCPeerConnection
  const reconnectCount   = useRef({});   // socketId -> attempts

  // ── Get user media ────────────────────────────────────────────────────────
  const startLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setPermError('');
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

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnsRef.current[socketId] = pc;
    reconnectCount.current[socketId] = 0;

    const src = stream || localStreamRef.current;
    if (src) src.getTracks().forEach(t => pc.addTrack(t, src));

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) signalingEvents.sendIce(socketId, candidate);
    };

    pc.ontrack = (e) => {
      onRemoteStream?.(socketId, e.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      onConnectionChange?.(socketId, pc.connectionState);
      if (pc.connectionState === 'failed') {
        const attempts = reconnectCount.current[socketId] || 0;
        if (attempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectCount.current[socketId] = attempts + 1;
          const delay = Math.min(1000 * 2 ** attempts, 16000); // exponential backoff
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
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    signalingEvents.sendAnswer(socketId, answer);
  }, [createPeer]);

  // ── Handle incoming answer ────────────────────────────────────────────────
  const handleAnswer = useCallback(async (socketId, answer) => {
    const pc = peerConnsRef.current[socketId];
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }, []);

  // ── Handle ICE candidate ──────────────────────────────────────────────────
  const handleIce = useCallback(async (socketId, candidate) => {
    const pc = peerConnsRef.current[socketId];
    if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
  }, []);

  // ── Replace video track (screen share or camera swap) ────────────────────
  const replaceVideoTrack = useCallback((newTrack) => {
    Object.values(peerConnsRef.current).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(newTrack).catch(() => {});
    });
  }, []);

  // ── Toggle mic ───────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const newState = !micOn;
    stream.getAudioTracks().forEach(t => { t.enabled = newState; });
    setMicOn(newState);
  }, [micOn]);

  // ── Toggle camera ─────────────────────────────────────────────────────────
  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const newState = !camOn;
    stream.getVideoTracks().forEach(t => { t.enabled = newState; });
    setCamOn(newState);
  }, [camOn]);

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
  }, []);

  useEffect(() => () => stopAll(), []);

  return {
    localStream, micOn, camOn, permError,
    startLocalMedia, initiateCall, handleOffer, handleAnswer, handleIce,
    replaceVideoTrack, toggleMic, toggleCam, closePeer, stopAll,
    peerConnsRef, localStreamRef,
  };
}

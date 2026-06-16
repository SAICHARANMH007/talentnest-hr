/**
 * FaceVerificationWidget — Silent proctoring during assessments.
 *
 * Mounts a small camera preview. Every `intervalSecs` seconds it captures a
 * frame, extracts the 128-d descriptor via face-api.js, and POSTs it to
 * /api/face/proctor-check. On repeated failures it adds a violation to the
 * parent assessment anti-cheat count (via `onViolation` callback).
 *
 * Only activates when the candidate has face enrolled. If not enrolled, renders
 * nothing and the existing behaviour-based anti-cheat runs as before.
 */
import React, { useRef, useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import { loadFaceApi, openFrontCamera } from './faceUtils.js';

function captureBase64(videoEl) {
  const c = document.createElement('canvas');
  c.width  = videoEl.videoWidth  || 320;
  c.height = videoEl.videoHeight || 240;
  c.getContext('2d').drawImage(videoEl, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.7);
}

export default function FaceVerificationWidget({
  submissionId,
  enabled = true,           // false = skip (anti-cheat disabled or user not enrolled)
  intervalSecs = 60,        // how often to check
  maxFailures  = 2,         // consecutive failures before calling onViolation
  onViolation,              // () => void — called when identity check fails repeatedly
}) {
  const [ready,   setReady]   = useState(false);
  const [status,  setStatus]  = useState('loading'); // loading | active | error | skip
  const [lastScore, setScore] = useState(null);
  const [failCount, setFail]  = useState(0);
  const [enrolled, setEnrolled] = useState(false);

  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const timerRef   = useRef(null);
  const faceapiRef = useRef(null);
  const failRef    = useRef(0);

  // Check enrollment status first
  useEffect(() => {
    if (!enabled || !submissionId) { setStatus('skip'); return; }
    api.getFaceStatus()
      .then(r => {
        const data = r?.data || r;
        if (data?.enrolled) {
          setEnrolled(true);
          initCamera();
        } else {
          setStatus('skip'); // not enrolled — skip silently
        }
      })
      .catch(() => setStatus('skip'));
  }, [enabled, submissionId]);

  const initCamera = async () => {
    try {
      const stream = await openFrontCamera(); // robust cross-browser fallback
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      const faceapi = await loadFaceApi(); // shared singleton — already cached if FRS was used
      faceapiRef.current = faceapi;
      setReady(true);
      setStatus('active');
    } catch {
      setStatus('error');
    }
  };

  // Periodic check
  useEffect(() => {
    if (!ready || status !== 'active') return;

    const check = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const faceapi = faceapiRef.current;
        const result  = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks(true)   // true = tiny landmark net
          .withFaceDescriptor();

        let anomaly = null;
        if (!result) anomaly = 'no_face';

        const descriptor = result ? Array.from(result.descriptor) : null;
        const snapshot   = (!result) ? captureBase64(videoRef.current) : undefined;

        const res = await api.proctorCheck({
          submissionId,
          descriptor: descriptor || [],
          snapshot,
          anomaly,
        });

        const score = res?.score ?? 0;
        const passed = res?.passed ?? false;
        setScore(Math.round(score * 100));

        if (!passed) {
          const newFail = failRef.current + 1;
          failRef.current = newFail;
          setFail(newFail);
          if (newFail >= maxFailures) {
            failRef.current = 0;
            onViolation?.();
          }
        } else {
          failRef.current = 0;
          setFail(0);
        }
      } catch { /* ignore individual check errors */ }
    };

    // First check 10s after start, then every intervalSecs
    const initial = setTimeout(check, 10_000);
    timerRef.current = setInterval(check, intervalSecs * 1000);

    return () => {
      clearTimeout(initial);
      clearInterval(timerRef.current);
    };
  }, [ready, status, submissionId, intervalSecs, maxFailures]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  if (status === 'skip' || !enabled) return null;

  return (
    <div style={{
      position:'fixed', bottom:80, right:16, zIndex:1000,
      background:'#fff', border:'2px solid #0176D3', borderRadius:14,
      boxShadow:'0 4px 20px rgba(1,118,211,0.2)', overflow:'hidden',
      width:120, fontSize:10,
    }}>
      {/* Camera preview */}
      <div style={{ position:'relative', background:'#000' }}>
        <video ref={videoRef} autoPlay playsInline muted
          style={{ width:'100%', display:'block', transform:'scaleX(-1)' }} />
        {/* Status dot */}
        <div style={{
          position:'absolute', top:4, right:4, width:8, height:8, borderRadius:'50%',
          background: status === 'active' ? '#22c55e' : status === 'error' ? '#ef4444' : '#f59e0b',
          boxShadow:'0 0 4px rgba(0,0,0,0.4)',
        }} />
      </div>

      {/* Score / status line */}
      <div style={{ padding:'4px 6px', textAlign:'center', fontSize:10, fontWeight:700,
        color: status === 'loading' ? '#6b7280' : failCount >= 1 ? '#dc2626' : '#15803d' }}>
        {status === 'loading' && '⏳ Starting…'}
        {status === 'active'  && (lastScore !== null ? `🔐 ${lastScore}% match` : '🔐 Monitoring')}
        {status === 'error'   && '⚠️ Camera error'}
        {failCount >= 1 && ` ⚠️ ${failCount} warning${failCount > 1 ? 's' : ''}`}
      </div>
    </div>
  );
}

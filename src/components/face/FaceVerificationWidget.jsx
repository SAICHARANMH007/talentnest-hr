/**
 * FaceVerificationWidget — Identity monitoring during assessments.
 *
 * A1 Consent & Disclosure Rebuild:
 *   - ALWAYS shows an explicit disclosure modal before camera activates.
 *   - If candidate has not given proctoring consent (new consent system), the modal
 *     includes a consent checkbox; they must opt in or skip.
 *   - Legacy users (faceConsentGiven=true, faceConsentLogin=false) see the
 *     disclosure-only modal (no extra checkbox — their old consent covers it).
 *   - If candidate skips, widget status = skip (no camera, no violations).
 *   - Camera NEVER activates silently.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { api } from '../../api/api.js';
import { loadFaceApi, openFrontCamera } from './faceUtils.js';

function captureBase64(videoEl) {
  const c = document.createElement('canvas');
  c.width  = videoEl.videoWidth  || 320;
  c.height = videoEl.videoHeight || 240;
  c.getContext('2d').drawImage(videoEl, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.7);
}

// ── Just-in-time Disclosure Modal ────────────────────────────────────────────
function DisclosureModal({ needsProctoringConsent, onAccept, onSkip }) {
  const [proctoringChecked, setProctoringChecked] = useState(false);
  const canProceed = !needsProctoringConsent || proctoringChecked;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '24px 24px 20px',
        maxWidth: 440, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
          🔐 Identity Monitoring — This Assessment
        </div>

        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#1e40af', lineHeight: 1.7,
        }}>
          <strong>Before this assessment begins, please read carefully:</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            <li>Your <strong>front camera will activate</strong> for the duration of this assessment.</li>
            <li>Every ~60 seconds, a frame is captured and compared to your enrolled facial biometric.</li>
            <li>Frames that fail the identity check are saved for recruiter review.</li>
            <li>3 consecutive failures will trigger <strong>automatic assessment submission</strong>.</li>
            <li>Results are used only to verify your identity — not shared externally.</li>
          </ul>
        </div>

        {needsProctoringConsent ? (
          <div style={{ background: '#faf5ff', border: '1.5px solid #d8b4fe', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 8 }}>
              Separate consent required for assessment monitoring
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={proctoringChecked}
                onChange={e => setProctoringChecked(e.target.checked)}
                style={{ marginTop: 3, accentColor: '#7c3aed', flexShrink: 0 }}
              />
              <span style={{ fontSize: 12, color: '#5b21b6', lineHeight: 1.6 }}>
                I consent to my face being monitored during this assessment to verify my identity
                and prevent impersonation. I understand that frames will be captured periodically
                and stored if an anomaly is detected.
              </span>
            </label>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
            You previously consented to assessment monitoring as part of your Face ID enrollment.
            Click <strong>Start Monitoring</strong> to proceed.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onSkip}
            style={{
              flex: 1, fontSize: 13, fontWeight: 600, padding: '9px 0',
              borderRadius: 9, border: '1.5px solid #cbd5e1',
              background: '#fff', color: '#64748b', cursor: 'pointer',
            }}>
            Skip Monitoring
          </button>
          <button
            onClick={() => canProceed && onAccept(proctoringChecked)}
            disabled={!canProceed}
            style={{
              flex: 2, fontSize: 13, fontWeight: 700, padding: '9px 0',
              borderRadius: 9, border: 'none',
              background: canProceed ? '#0176D3' : '#e2e8f0',
              color: canProceed ? '#fff' : '#94a3b8',
              cursor: canProceed ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s',
            }}>
            🔐 Start Monitoring
          </button>
        </div>

        <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
          Skipping monitoring is allowed. The assessment will still run, but your identity will not be verified.
        </div>
      </div>
    </div>
  );
}

export default function FaceVerificationWidget({
  submissionId,
  enabled = true,
  intervalSecs = 60,
  maxFailures  = 3,
  onViolation,
}) {
  const [ready,         setReady]         = useState(false);
  const [status,        setStatus]        = useState('loading');
  const [lastScore,     setScore]         = useState(null);
  const [failCount,     setFail]          = useState(0);
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [needsProctoringConsent, setNeedsProctoringConsent] = useState(false);

  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const timerRef   = useRef(null);
  const faceapiRef = useRef(null);
  const failRef    = useRef(0);

  // Step 1: Check enrollment + consent status. Always show disclosure modal before camera.
  useEffect(() => {
    if (!enabled || !submissionId) { setStatus('skip'); return; }

    api.getFaceStatus()
      .then(r => {
        const data = r?.data || r;
        if (!data?.enrolled) {
          setStatus('skip');
          return;
        }

        // Determine whether the candidate is on the new consent system
        const usedNewConsent    = !!data.consentLogin;
        const hasProctorConsent = !!data.consentProctoring;
        const hasLegacyConsent  = !!data.consentGiven && !usedNewConsent;

        if (usedNewConsent && !hasProctorConsent) {
          // New consent system: proctoring consent NOT given → show modal with consent checkbox
          setNeedsProctoringConsent(true);
          setShowDisclosure(true);
        } else if (hasLegacyConsent || hasProctorConsent) {
          // Legacy consent OR new consent with proctoring → show informational disclosure only
          setNeedsProctoringConsent(false);
          setShowDisclosure(true);
        } else {
          setStatus('skip');
        }
      })
      .catch(() => setStatus('skip'));
  }, [enabled, submissionId]);

  const initCamera = useCallback(async () => {
    try {
      const stream = await openFrontCamera();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      const faceapi = await loadFaceApi();
      faceapiRef.current = faceapi;
      setReady(true);
      setStatus('active');
    } catch {
      setStatus('error');
    }
  }, []);

  // Called when user clicks "Start Monitoring" in the disclosure modal
  const handleAccept = useCallback(async (gaveNewConsent) => {
    setShowDisclosure(false);
    // If they just gave proctoring consent via the modal checkbox, persist it
    if (gaveNewConsent) {
      try { await api.updateFaceConsent({ consentProctoring: true }); } catch { /* non-fatal */ }
    }
    await initCamera();
  }, [initCamera]);

  // Called when user clicks "Skip Monitoring"
  const handleSkip = useCallback(() => {
    setShowDisclosure(false);
    setStatus('skip');
  }, []);

  // Periodic identity check
  useEffect(() => {
    if (!ready || status !== 'active') return;

    const check = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const faceapi = faceapiRef.current;
        const result  = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks(true)
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

        const score  = res?.score ?? 0;
        const passed = res?.passed ?? false;
        setScore(Math.round(score * 100));

        if (!passed) {
          await new Promise(r => setTimeout(r, 5000));
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          const retryResult = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
            .withFaceLandmarks(true)
            .withFaceDescriptor()
            .catch(() => null);
          const retryDesc = retryResult ? Array.from(retryResult.descriptor) : null;
          const retryRes = await api.proctorCheck({
            submissionId,
            descriptor: retryDesc || [],
            snapshot: !retryResult ? captureBase64(videoRef.current) : undefined,
            anomaly: !retryResult ? 'no_face' : null,
          }).catch(() => null);

          if (retryRes?.passed) {
            failRef.current = 0;
            setFail(0);
          } else {
            const newFail = failRef.current + 1;
            failRef.current = newFail;
            setFail(newFail);
            if (newFail >= maxFailures) {
              failRef.current = 0;
              onViolation?.();
            }
          }
        } else {
          failRef.current = 0;
          setFail(0);
        }
      } catch { /* ignore per-check errors */ }
    };

    const initial = setTimeout(check, 10_000);
    timerRef.current = setInterval(check, intervalSecs * 1000);

    return () => {
      clearTimeout(initial);
      clearInterval(timerRef.current);
    };
  }, [ready, status, submissionId, intervalSecs, maxFailures]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  if (status === 'skip' || !enabled) return null;

  return (
    <>
      {showDisclosure && (
        <DisclosureModal
          needsProctoringConsent={needsProctoringConsent}
          onAccept={handleAccept}
          onSkip={handleSkip}
        />
      )}

      {!showDisclosure && (
        <div style={{
          position: 'fixed', bottom: 80, right: 16, zIndex: 1000,
          background: '#fff', border: '2px solid #0176D3', borderRadius: 14,
          boxShadow: '0 4px 20px rgba(1,118,211,0.2)', overflow: 'hidden',
          width: 120, fontSize: 10,
        }}>
          <div style={{ position: 'relative', background: '#000' }}>
            <video ref={videoRef} autoPlay playsInline muted
              style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' }} />
            <div style={{
              position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%',
              background: status === 'active' ? '#22c55e' : status === 'error' ? '#ef4444' : '#f59e0b',
              boxShadow: '0 0 4px rgba(0,0,0,0.4)',
            }} />
          </div>

          <div style={{ padding: '4px 6px', textAlign: 'center', fontSize: 10, fontWeight: 700,
            color: status === 'loading' ? '#6b7280' : failCount >= 1 ? '#dc2626' : '#15803d' }}>
            {status === 'loading' && '⏳ Starting…'}
            {status === 'active'  && (lastScore !== null ? `🔐 ${lastScore}% match` : '🔐 Monitoring')}
            {status === 'error'   && '⚠️ Camera error'}
            {failCount >= 1 && ` ⚠️ ${failCount} warning${failCount > 1 ? 's' : ''}`}
          </div>
        </div>
      )}
    </>
  );
}

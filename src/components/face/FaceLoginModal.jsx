/**
 * FaceLoginModal — Secure face-based login
 *
 * Flow:
 *   Step 1: User enters their registered email
 *   Step 2: Camera opens; stable-frame liveness (15 consecutive good frames)
 *   Step 3: Auto 3-2-1 countdown per pose → 3 poses auto-captured
 *   Step 4: Averaged descriptor POSTed to /api/face/login
 *   Step 5a: Match → onSuccess(user, token)
 *   Step 5b: No match → OTP sent to email → user enters OTP → login
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { api } from '../../api/api.js';
import {
  loadFaceApi,
  openFrontCamera,
  detectFaceRaw,
  drawEnhancedFaceMesh,
  captureEnhancedFrame,
  scoreFaceQuality,
  averageDescriptors,
} from './faceUtils.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const STABLE_NEEDED = 15;
const MIN_QUALITY   = 0.30;
const LOGIN_POSES   = [
  { label: 'Look straight at the camera', icon: '👁️' },
  { label: 'Tilt your head slightly left', icon: '↙️' },
  { label: 'Tilt your head slightly right', icon: '↘️' },
];

// ── Styles ────────────────────────────────────────────────────────────────────
const overlay = {
  position:'fixed', inset:0, zIndex:99999,
  background:'rgba(0,0,0,0.82)',
  display:'flex', alignItems:'center', justifyContent:'center',
};
const card = {
  background:'#0d1b2d', border:'1px solid rgba(255,255,255,0.1)',
  borderRadius:20, padding:'28px 24px', width:'100%', maxWidth:420,
  display:'flex', flexDirection:'column', gap:16, boxShadow:'0 24px 80px rgba(0,0,0,0.6)',
};
const titleStyle = { color:'#fff', fontSize:18, fontWeight:800, margin:0, display:'flex', alignItems:'center', gap:8 };
const sub        = { color:'rgba(255,255,255,0.45)', fontSize:12, marginTop:3 };
const inp        = {
  width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.06)',
  border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, color:'#fff',
  fontSize:14, fontWeight:500, padding:'11px 14px', outline:'none',
};
const btnP = { fontSize:13, fontWeight:700, padding:'12px 0', borderRadius:11,
  border:'none', background:'#0176D3', color:'#fff', cursor:'pointer', width:'100%' };
const btnS = { ...btnP, background:'transparent', border:'1px solid rgba(255,255,255,0.15)',
  color:'rgba(255,255,255,0.6)' };

function Spin() {
  return (
    <div style={{ width:18, height:18, border:'2.5px solid rgba(255,255,255,0.2)',
      borderTop:'2.5px solid #fff', borderRadius:'50%',
      animation:'flSpin 0.8s linear infinite', display:'inline-block', verticalAlign:'middle', marginRight:6 }} />
  );
}

export default function FaceLoginModal({ prefillEmail = '', onSuccess, onClose }) {
  // ── Step state ───────────────────────────────────────────────────────────────
  const [step, setStep]         = useState('email'); // email|camera|submitting|otp|error
  const [email, setEmail]       = useState(prefillEmail);
  const [emailError, setEmailError] = useState('');

  // ── Camera state ─────────────────────────────────────────────────────────────
  const [modelReady, setModelReady]   = useState(false);
  const [modelLoading, setMLoading]   = useState(false);
  const [modelPct, setModelPct]       = useState(0);
  const [faceapi, setFaceapi]         = useState(null);
  const [streamReady, setStreamReady] = useState(false);
  const [liveResult, setLiveResult]   = useState(null);
  const [stableFrames, setStableFrames] = useState(0);
  const [livenessOk, setLivenessOk]   = useState(false);
  const [capturedCount, setCapturedCount] = useState(0);
  const [countdown, setCountdown]     = useState(null);
  const [qualityWarn, setQualityWarn] = useState(false);
  const [camError, setCamError]       = useState('');
  const [serverError, setServerError] = useState('');
  const [openingCamera, setOpeningCamera] = useState(false);

  // ── OTP state ────────────────────────────────────────────────────────────────
  const [otp, setOtp]               = useState('');
  const [otpError, setOtpError]     = useState('');
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [resending, setResending]   = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const videoRef       = useRef(null);
  const canvasRef      = useRef(null);
  const streamRef      = useRef(null);
  const rafRef         = useRef(null);
  const descsRef       = useRef([]);
  const stableCountRef = useRef(0);
  const livenessOkRef  = useRef(false);
  const liveResultRef  = useRef(null);
  const countdownRef   = useRef(null);
  const isCapturingRef = useRef(false);
  const faceapiRef     = useRef(null);

  // ── Attach stream to video element once it mounts ───────────────────────────
  useEffect(() => {
    if (!streamReady || !streamRef.current) return;
    const vid = videoRef.current;
    if (!vid) return;
    vid.srcObject = streamRef.current;
    vid.play().catch(() => {});
  }, [streamReady]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => () => stopAll(), []);

  // ── Pre-load AI models as soon as the modal opens (email step) ─────────────
  // This hides the 6-second download behind the time user takes to type email.
  useEffect(() => {
    setMLoading(true); setModelPct(0);
    loadFaceApi(pct => setModelPct(pct))
      .then(fa => { setFaceapi(fa); faceapiRef.current = fa; setModelReady(true); })
      .catch(() => { /* model load failure shown only when user tries to proceed */ })
      .finally(() => setMLoading(false));
  }, []); // run once on mount

  // ── RAF detection loop ───────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'camera' || !modelReady || !faceapi || !streamReady) return;
    let active = true;

    const loop = async () => {
      if (!active) return;
      const vid = videoRef.current;
      // readyState >= 2 (HAVE_CURRENT_DATA) guards against Chrome's race where
      // videoWidth > 0 but the first decoded frame isn't available yet
      if (vid && vid.videoWidth > 0 && vid.readyState >= 2) {
        try {
          const r = await detectFaceRaw(faceapi, vid);
          if (!active) return;
          liveResultRef.current = r || null;
          setLiveResult(r || null);

          if (canvasRef.current && vid) {
            drawEnhancedFaceMesh(canvasRef.current, vid, r?.landmarks);
          }

          // Stable-frame liveness: 15 consecutive good detections = live
          if (r && scoreFaceQuality(r, vid) >= MIN_QUALITY) {
            stableCountRef.current++;
            setStableFrames(Math.min(stableCountRef.current, STABLE_NEEDED));
            if (!livenessOkRef.current && stableCountRef.current >= STABLE_NEEDED) {
              livenessOkRef.current = true;
              setLivenessOk(true);
            }
          } else {
            stableCountRef.current = Math.max(0, stableCountRef.current - 2);
            setStableFrames(Math.max(0, stableCountRef.current));
            if (stableCountRef.current < 5) {
              // Only reset liveness if really dropped
              if (livenessOkRef.current && stableCountRef.current === 0) {
                livenessOkRef.current = false;
                setLivenessOk(false);
              }
            }
          }
        } catch { /* ignore frame errors */ }
      }
      if (active) rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { active = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [step, modelReady, faceapi, streamReady]);

  // ── Auto-countdown when liveness OK and more poses needed ───────────────────
  useEffect(() => {
    if (!livenessOk || capturedCount >= LOGIN_POSES.length) return;
    if (countdownRef.current || isCapturingRef.current) return;
    startCountdown();
  }, [livenessOk, capturedCount]);

  const startCountdown = useCallback(() => {
    if (isCapturingRef.current) return;
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    let c = 3;
    setCountdown(c);
    countdownRef.current = setInterval(() => {
      c--;
      if (c > 0) {
        setCountdown(c);
      } else {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        setCountdown(null);
        doCapture();
      }
    }, 1000);
  }, []);

  const cancelCountdown = useCallback(() => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setCountdown(null);
  }, []);

  const doCapture = useCallback(async () => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;

    const fa  = faceapiRef.current;
    const vid = videoRef.current;
    const r   = liveResultRef.current || (fa && vid ? await detectFaceRaw(fa, vid).catch(() => null) : null);

    if (!r || !vid || scoreFaceQuality(r, vid) < MIN_QUALITY) {
      isCapturingRef.current = false;
      setQualityWarn(true);
      setTimeout(() => setQualityWarn(false), 2000);
      setTimeout(() => {
        if (livenessOkRef.current && descsRef.current.length < LOGIN_POSES.length) startCountdown();
      }, 2500);
      return;
    }

    descsRef.current.push(Array.from(r.descriptor));
    const newCount = descsRef.current.length;
    setCapturedCount(newCount);
    isCapturingRef.current = false;

    if (newCount >= LOGIN_POSES.length) {
      await submitFace();
    }
    // else: useEffect on [livenessOk, capturedCount] fires startCountdown for next pose
  }, [startCountdown]);

  const submitFace = async () => {
    stopAll();
    setStep('submitting');
    try {
      const avgDesc = averageDescriptors(descsRef.current);
      const result  = await api.faceLogin({ email: email.trim().toLowerCase(), descriptor: avgDesc });
      onSuccess(result.user, result.token);
    } catch (e) {
      // Face didn't match → send OTP fallback
      if (e?.status === 401 || (e?.message || '').toLowerCase().includes('not recogni')) {
        await sendOtpFallback();
      } else {
        setServerError(e?.message || 'Face verification failed. Please try again.');
        setStep('error');
      }
    }
  };

  const sendOtpFallback = async () => {
    try {
      await api.sendFaceOtp({ email: email.trim().toLowerCase() });
      setStep('otp');
    } catch (e) {
      setServerError(e?.message || 'Could not send verification code. Please try password login.');
      setStep('error');
    }
  };

  const verifyOtp = async () => {
    const code = otp.trim();
    if (!code || code.length < 6) { setOtpError('Enter the 6-digit code from your email.'); return; }
    setOtpSubmitting(true);
    setOtpError('');
    try {
      const result = await api.verifyFaceOtp({ email: email.trim().toLowerCase(), otp: code });
      onSuccess(result.user, result.token);
    } catch (e) {
      setOtpError(e?.message || 'Invalid or expired code. Please try again.');
    }
    setOtpSubmitting(false);
  };

  const resendOtp = async () => {
    setResending(true);
    setOtpError('');
    try {
      await api.sendFaceOtp({ email: email.trim().toLowerCase() });
      setOtpError('');
    } catch {}
    setResending(false);
  };

  const stopAll = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    cancelCountdown();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError('Camera not available. Make sure the page is open over HTTPS.');
      return;
    }
    if (!modelReady) {
      setCamError('AI models are still loading. Please wait a moment and try again.');
      return;
    }
    setCamError(''); setOpeningCamera(true);
    try {
      const stream = await openFrontCamera(); // robust fallback chain from faceUtils
      streamRef.current = stream;
      setStreamReady(true);
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
    } catch (err) {
      setCamError(err.message || 'Camera error. Try reloading the page.');
    } finally {
      setOpeningCamera(false);
    }
  };

  const proceedToCamera = () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/\S+@\S+\.\S+/.test(trimmed)) { setEmailError('Enter a valid email address.'); return; }
    if (!modelReady) { setEmailError('AI models are still loading. Please wait a moment.'); return; }
    setEmailError('');
    setEmail(trimmed);
    setStep('camera');
  };

  const retryCamera = () => {
    stopAll();
    streamRef.current = null;
    setStreamReady(false);
    setLiveResult(null); liveResultRef.current = null;
    setStableFrames(0); stableCountRef.current = 0;
    setLivenessOk(false); livenessOkRef.current = false;
    setCapturedCount(0); descsRef.current = [];
    isCapturingRef.current = false;
    setServerError(''); setCamError('');
    setStep('camera');
  };

  const livenessProgress = Math.round((stableFrames / STABLE_NEEDED) * 100);

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <style>{`
        @keyframes flSpin { to { transform:rotate(360deg); } }
        @keyframes flFade { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
      `}</style>
      <div style={{ ...card, animation:'flFade 0.22s ease' }}>
        {/* Header */}
        <div>
          <h2 style={titleStyle}>🔐 Face Login</h2>
          <p style={sub}>Enter your email, then verify your face to sign in securely.</p>
        </div>

        {/* ── Step 1: Email ──────────────────────────────────────────────────── */}
        {step === 'email' && (
          <>
            <div>
              <label style={{ color:'rgba(255,255,255,0.55)', fontSize:11, fontWeight:700, display:'block', marginBottom:6, letterSpacing:0.5 }}>
                REGISTERED EMAIL
              </label>
              <input
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                onKeyDown={e => e.key === 'Enter' && proceedToCamera()}
                placeholder="you@example.com"
                type="email"
                autoFocus
                autoComplete="email"
                style={{ ...inp, borderColor: emailError ? '#ef4444' : undefined }}
              />
              {emailError && <div style={{ color:'#ef4444', fontSize:11, marginTop:4 }}>{emailError}</div>}
            </div>
            <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'10px 12px', fontSize:12, color:'rgba(255,255,255,0.5)', lineHeight:1.6 }}>
              ✅ Face login uses AI to verify your identity with enhanced mesh detection.<br />
              ✅ If face recognition fails, a backup OTP will be sent to your email.
            </div>
            {/* AI model pre-load progress shown while user types email */}
            {!modelReady && (
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>
                    <Spin /> Loading AI models… ({modelPct}%)
                  </span>
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>one-time</span>
                </div>
                <div style={{ height:3, background:'rgba(255,255,255,0.08)', borderRadius:3 }}>
                  <div style={{ height:'100%', borderRadius:3, width:`${modelPct}%`,
                    background:'#0176D3', transition:'width 0.4s ease' }} />
                </div>
              </div>
            )}
            <button style={{ ...btnP, opacity: (!modelReady && modelPct < 100) ? 0.6 : 1 }} onClick={proceedToCamera}>
              {modelReady ? 'Continue →' : `Loading… ${modelPct}%`}
            </button>
            <button style={btnS} onClick={onClose}>Cancel</button>
          </>
        )}

        {/* ── Step 2: Camera ────────────────────────────────────────────────── */}
        {step === 'camera' && (
          <>
            {!streamReady ? (
              <div style={{ display:'flex', flexDirection:'column', gap:14, textAlign:'center' }}>
                {camError ? (
                  <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'10px 14px', color:'#fca5a5', fontSize:12, lineHeight:1.5 }}>
                    ⚠️ {camError}
                  </div>
                ) : (
                  <div style={{ color:'rgba(255,255,255,0.5)', fontSize:13, lineHeight:1.6 }}>
                    Tap below to open your camera.<br />Allow camera access when prompted.
                  </div>
                )}
                <button style={{ ...btnP, opacity: openingCamera ? 0.7 : 1 }}
                  disabled={openingCamera} onClick={openCamera}>
                  {openingCamera ? <><Spin /> Opening…</> : camError ? '🔄 Try Again' : '📸 Open Camera'}
                </button>
                <button style={btnS} onClick={onClose}>Cancel</button>
              </div>
            ) : (
              <>
                {/* Liveness progress bar */}
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                    <span style={{ fontSize:11, fontWeight:700, color: livenessOk ? '#4ade80' : 'rgba(255,255,255,0.55)' }}>
                      {livenessOk ? '✅ Liveness confirmed — auto-capturing…' : '👁️ Hold still to verify you are live…'}
                    </span>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>{livenessProgress}%</span>
                  </div>
                  <div style={{ height:4, background:'rgba(255,255,255,0.1)', borderRadius:4 }}>
                    <div style={{ height:'100%', borderRadius:4, width:`${livenessProgress}%`,
                      background: livenessOk ? '#4ade80' : '#0176D3',
                      transition:'width 0.2s ease, background 0.3s ease' }} />
                  </div>
                </div>

                {/* Video + mesh overlay */}
                <div style={{ position:'relative', borderRadius:14, overflow:'hidden',
                  border: qualityWarn ? '2px solid #ef4444' : livenessOk ? '2px solid rgba(34,197,94,0.6)' : '2px solid rgba(1,118,211,0.4)' }}>
                  <video ref={videoRef} autoPlay playsInline muted
                    {...{'webkit-playsinline': 'true'}}
                    onLoadedMetadata={e => e.target.play().catch(() => {})}
                    onCanPlay={e => e.target.play().catch(() => {})}
                    onPlaying={() => {}}
                    style={{ width:'100%', display:'block', transform:'scaleX(-1)', borderRadius:12 }} />
                  <canvas ref={canvasRef}
                    style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%',
                      transform:'scaleX(-1)', pointerEvents:'none' }} />

                  {/* Oval face guide */}
                  <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-54%)',
                    width:'48%', paddingBottom:'64%', border:'2.5px solid rgba(0,220,130,0.5)',
                    borderRadius:'50%', pointerEvents:'none' }} />

                  {/* Countdown overlay */}
                  {countdown !== null && (
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.35)', borderRadius:12 }}>
                      <div style={{ fontSize:72, fontWeight:900, color:'#fff',
                        textShadow:'0 0 30px rgba(0,200,130,0.8)', lineHeight:1 }}>{countdown}</div>
                    </div>
                  )}

                  {/* Quality warning */}
                  {qualityWarn && (
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(239,68,68,0.2)', borderRadius:12 }}>
                      <div style={{ color:'#fca5a5', fontWeight:700, fontSize:13, textAlign:'center', padding:'0 16px' }}>
                        ⚠️ Position your face inside the oval
                      </div>
                    </div>
                  )}

                  {/* Progress dots */}
                  <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)', display:'flex', gap:8 }}>
                    {LOGIN_POSES.map((_, i) => (
                      <div key={i} style={{ width:10, height:10, borderRadius:'50%',
                        background: i < capturedCount ? '#22c55e' : i === capturedCount ? '#0176D3' : 'rgba(255,255,255,0.3)',
                        border:'2px solid rgba(255,255,255,0.7)', transition:'all 0.2s',
                        boxShadow: i === capturedCount ? '0 0 8px rgba(1,118,211,0.8)' : 'none' }} />
                    ))}
                  </div>

                  {/* Quality badge */}
                  {liveResult && videoRef.current && (
                    <div style={{ position:'absolute', top:8, right:8, fontSize:10, fontWeight:700,
                      background:'rgba(0,0,0,0.65)', borderRadius:20, padding:'2px 8px',
                      color: scoreFaceQuality(liveResult, videoRef.current) >= MIN_QUALITY ? '#22c55e' : '#f59e0b' }}>
                      {Math.round(scoreFaceQuality(liveResult, videoRef.current) * 100)}%
                    </div>
                  )}
                </div>

                {/* Pose instruction */}
                {livenessOk && capturedCount < LOGIN_POSES.length && (
                  <div style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.3)',
                    borderRadius:10, padding:'7px 14px', textAlign:'center', fontSize:12, fontWeight:700, color:'#4ade80' }}>
                    <span style={{ fontSize:16, marginRight:6 }}>{LOGIN_POSES[capturedCount].icon}</span>
                    {LOGIN_POSES[capturedCount].label}
                    {countdown !== null && <span style={{ marginLeft:8, color:'#fbbf24' }}>capturing in {countdown}…</span>}
                  </div>
                )}

                {/* Detection status */}
                <div style={{ fontSize:11, fontWeight:600, textAlign:'center',
                  color: liveResult ? '#4ade80' : '#6b7280' }}>
                  {modelLoading ? '⏳ Loading AI models…'
                    : !liveResult ? '❌ No face detected — face the camera in good light'
                    : `✅ Face detected — ${capturedCount}/${LOGIN_POSES.length} poses captured`}
                </div>

                <button style={{ ...btnS }} onClick={() => { stopAll(); onClose(); }}>Cancel</button>
              </>
            )}
          </>
        )}

        {/* ── Step 3: Submitting ────────────────────────────────────────────── */}
        {step === 'submitting' && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <Spin />
            <div style={{ color:'rgba(255,255,255,0.7)', fontSize:14, fontWeight:600, marginTop:12 }}>
              Verifying your face…
            </div>
            <div style={{ color:'rgba(255,255,255,0.35)', fontSize:12, marginTop:6 }}>
              Comparing against your enrolled Face ID
            </div>
          </div>
        )}

        {/* ── Step 4: OTP Fallback ──────────────────────────────────────────── */}
        {step === 'otp' && (
          <>
            <div style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)',
              borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
              <div style={{ fontSize:24, marginBottom:6 }}>📧</div>
              <div style={{ color:'#fbbf24', fontSize:13, fontWeight:700, marginBottom:4 }}>
                Face not recognised
              </div>
              <div style={{ color:'rgba(255,255,255,0.6)', fontSize:12, lineHeight:1.5 }}>
                A 6-digit verification code has been sent to<br />
                <strong style={{ color:'#fff' }}>{email}</strong>
              </div>
            </div>

            <div>
              <label style={{ color:'rgba(255,255,255,0.55)', fontSize:11, fontWeight:700, display:'block', marginBottom:6, letterSpacing:0.5 }}>
                VERIFICATION CODE
              </label>
              <input
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g,'').slice(0,6)); setOtpError(''); }}
                onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                placeholder="6-digit code"
                type="tel"
                autoFocus
                maxLength={6}
                style={{ ...inp, fontSize:20, fontWeight:900, letterSpacing:6, textAlign:'center',
                  borderColor: otpError ? '#ef4444' : undefined }}
              />
              {otpError && <div style={{ color:'#ef4444', fontSize:11, marginTop:4 }}>{otpError}</div>}
            </div>

            <button style={{ ...btnP, opacity: otpSubmitting ? 0.7 : 1 }}
              disabled={otpSubmitting || otp.length < 6} onClick={verifyOtp}>
              {otpSubmitting ? <><Spin /> Verifying…</> : '✓ Verify & Sign In'}
            </button>

            <div style={{ display:'flex', gap:8 }}>
              <button style={{ ...btnS, flex:1, fontSize:12 }}
                onClick={resendOtp} disabled={resending}>
                {resending ? 'Sending…' : '🔄 Resend Code'}
              </button>
              <button style={{ ...btnS, flex:1, fontSize:12 }} onClick={retryCamera}>
                📸 Try Face Again
              </button>
            </div>
            <button style={btnS} onClick={onClose}>Use Password Login</button>
          </>
        )}

        {/* ── Step 5: Error ─────────────────────────────────────────────────── */}
        {step === 'error' && (
          <>
            <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
              borderRadius:12, padding:'14px 16px', color:'#fca5a5', fontSize:13, textAlign:'center' }}>
              ⚠️ {serverError}
            </div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', textAlign:'center', lineHeight:1.5 }}>
              Tips: ensure good lighting, remove glasses if worn, and face the camera directly.
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ ...btnS, flex:1 }} onClick={onClose}>Use Password</button>
              <button style={{ ...btnP, flex:1 }} onClick={retryCamera}>Try Again</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * FaceLoginModal — Secure face-based login
 *
 * Flow:
 *   Step 1: User enters their registered email
 *   Step 2: Camera opens; liveness blink check required
 *   Step 3: 3-frame multi-angle capture (enhanced for low-light)
 *   Step 4: Averaged descriptor POSTed to /api/face/login (email-scoped)
 *   Step 5: On match → onSuccess(user, token) — caller stores the session
 *
 * Security:
 *  • Email-scoped: only compares against the enrolled descriptor for THAT email
 *  • Liveness (blink EAR) prevents photo spoofing
 *  • Low-light enhancement ensures accuracy in dim conditions
 *  • Multi-frame averaging reduces noise (3 frames averaged)
 *  • Server enforces 0.65 cosine+euclidean combined threshold
 *  • Rate-limited: 5 attempts per 15 min per IP
 */
import React, { useRef, useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import {
  loadFaceApi,
  detectFaceRaw,
  drawFaceMesh,
  captureEnhancedFrame,
  scoreFaceQuality,
  getEAR,
  BLINK_THRESHOLD,
  averageDescriptors,
} from './faceUtils.js';

// ── Styles ────────────────────────────────────────────────────────────────────
const overlay = {
  position:'fixed', inset:0, zIndex:99999,
  background:'rgba(0,0,0,0.82)',
  display:'flex', alignItems:'center', justifyContent:'center',
  animation:'faceLoginFadeIn 0.2s ease',
};
const card = {
  background:'#0d1b2d', border:'1px solid rgba(255,255,255,0.1)',
  borderRadius:20, padding:'28px 24px', width:'100%', maxWidth:420,
  display:'flex', flexDirection:'column', gap:16, boxShadow:'0 24px 80px rgba(0,0,0,0.6)',
  animation:'faceLoginFadeIn 0.25s ease',
};
const title = { color:'#fff', fontSize:18, fontWeight:800, margin:0, display:'flex', alignItems:'center', gap:8 };
const sub   = { color:'rgba(255,255,255,0.45)', fontSize:12, marginTop:3 };
const inp   = {
  width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.06)',
  border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, color:'#fff',
  fontSize:14, fontWeight:500, padding:'11px 14px', outline:'none',
};
const btnP  = { fontSize:13, fontWeight:700, padding:'12px 0', borderRadius:11,
  border:'none', background:'#0176D3', color:'#fff', cursor:'pointer', width:'100%' };
const btnS  = { ...btnP, background:'transparent', border:'1px solid rgba(255,255,255,0.15)',
  color:'rgba(255,255,255,0.6)' };

function Spin() {
  return (
    <div style={{ width:18, height:18, border:'2.5px solid rgba(255,255,255,0.2)',
      borderTop:'2.5px solid #fff', borderRadius:'50%',
      animation:'faceLoginSpin 0.8s linear infinite', display:'inline-block', verticalAlign:'middle', marginRight:6 }} />
  );
}

function StatusDot({ ok }) {
  return <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%',
    background: ok ? '#22c55e' : '#6b7280', marginRight:6, verticalAlign:'middle' }} />;
}

// Login prompts — 3 angles to average descriptor
const LOGIN_PROMPTS = [
  { label:'Look straight at the camera', icon:'👁️' },
  { label:'Tilt head slightly left',     icon:'↙️' },
  { label:'Tilt head slightly right',    icon:'↘️' },
];
const MIN_QUALITY = 0.42;

export default function FaceLoginModal({ prefillEmail = '', onSuccess, onClose }) {
  // Step: 'email' | 'camera' | 'submitting' | 'error'
  const [step, setStep]           = useState('email');
  const [email, setEmail]         = useState(prefillEmail);
  const [emailError, setEmailError] = useState('');

  // Camera states
  const [modelReady, setModelReady]   = useState(false);
  const [modelLoading, setMLoading]   = useState(false);
  const [faceapi, setFaceapi]         = useState(null);
  const [liveResult, setLiveResult]   = useState(null);
  const [liveness, setLiveness]       = useState(false); // blink confirmed
  const [eyesClosed, setEyesClosed]   = useState(false);
  const [promptIdx, setPromptIdx]     = useState(0);
  const [frames, setFrames]           = useState([]);
  const [descs, setDescs]             = useState([]);
  const [submitting, setSubmitting]   = useState(false);
  const [qualityWarn, setQualityWarn] = useState(false);
  const [camError, setCamError]       = useState('');
  const [serverError, setServerError] = useState('');

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef    = useRef(null);
  const earRef    = useRef({ belowCount:0 }); // track consecutive closed frames

  // ── Start camera when entering step 'camera' ────────────────────────────────
  useEffect(() => {
    if (step !== 'camera') return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video:{ facingMode:'user', width:{ ideal:640 }, height:{ ideal:480 } }
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Fire play() but never await — autoPlay attr handles it; awaiting throws on Android
          videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        if (!cancelled) setCamError('Camera access denied. Please allow camera and try again.');
      }
    })();
    return () => { cancelled = true; stopCamera(); };
  }, [step]);

  // ── Load face-api models when camera starts ─────────────────────────────────
  useEffect(() => {
    if (step !== 'camera') return;
    setMLoading(true);
    loadFaceApi()
      .then(fa => { setFaceapi(fa); setModelReady(true); })
      .catch(() => setCamError('Failed to load AI models. Check your internet connection.'))
      .finally(() => setMLoading(false));
  }, [step]);

  // ── Live detection + EAR blink tracking loop ────────────────────────────────
  useEffect(() => {
    if (step !== 'camera' || !modelReady || !faceapi || !videoRef.current) return;
    let active = true;

    const loop = async () => {
      if (!active) return;
      const vid = videoRef.current;
      if (vid && (vid.readyState >= 2 || vid.videoWidth > 0)) {
        try {
          const r = await detectFaceRaw(faceapi, videoRef.current);
          if (!active) return;
          setLiveResult(r || null);
          if (canvasRef.current && videoRef.current) {
            drawFaceMesh(canvasRef.current, videoRef.current, r?.landmarks);
          }

          // EAR blink liveness
          if (r?.landmarks) {
            const ear = getEAR(r.landmarks);
            if (ear < BLINK_THRESHOLD) {
              earRef.current.belowCount++;
              setEyesClosed(true);
            } else {
              if (earRef.current.belowCount >= 2) {
                setLiveness(true); // confirmed blink
              }
              earRef.current.belowCount = 0;
              setEyesClosed(false);
            }
          }
        } catch { /* ignore frame errors */ }
      }
      if (active) rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { active = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [step, modelReady, faceapi]);

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  // ── Email validation ─────────────────────────────────────────────────────────
  const proceedToCamera = () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/\S+@\S+\.\S+/.test(trimmed)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError('');
    setEmail(trimmed);
    setStep('camera');
  };

  // ── Capture one frame ────────────────────────────────────────────────────────
  const capture = async () => {
    if (!liveResult || !videoRef.current) return;

    const quality = scoreFaceQuality(liveResult, videoRef.current);
    if (quality < MIN_QUALITY) {
      setQualityWarn(true);
      setTimeout(() => setQualityWarn(false), 2000);
      return;
    }

    const frame = captureEnhancedFrame(videoRef.current);
    const desc  = Array.from(liveResult.descriptor);

    const nf = [...frames, frame];
    const nd = [...descs, desc];
    setFrames(nf); setDescs(nd);

    if (nf.length < LOGIN_PROMPTS.length) {
      setPromptIdx(nf.length);
    } else {
      // All frames captured — submit
      stopCamera();
      setSubmitting(true);
      setStep('submitting');
      try {
        const result = await api.faceLogin({ email: email.trim().toLowerCase(), descriptor: averageDescriptors(nd) });
        onSuccess(result.user, result.token);
      } catch (e) {
        setServerError(e.message || 'Face not recognised. Please try again or use password login.');
        setStep('error');
        setSubmitting(false);
      }
    }
  };

  const retryCamera = () => {
    setServerError('');
    setFrames([]); setDescs([]); setPromptIdx(0);
    setLiveness(false); earRef.current.belowCount = 0;
    setLiveResult(null);
    setStep('camera');
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Self-contained keyframes — no dependency on global CSS */}
      <style>{`
        @keyframes faceLoginFadeIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
        @keyframes faceLoginSpin   { to { transform:rotate(360deg); } }
      `}</style>
      <div style={card}>
        {/* Header */}
        <div>
          <h2 style={title}>🔐 Face Login</h2>
          <p style={sub}>Enter your registered email, then scan your face to sign in securely.</p>
        </div>

        {/* ── Step 1: Email ─────────────────────────────────────────────────── */}
        {step === 'email' && (
          <>
            <div>
              <label style={{ color:'rgba(255,255,255,0.55)', fontSize:11, fontWeight:700,
                display:'block', marginBottom:6, letterSpacing:0.5 }}>REGISTERED EMAIL</label>
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
            <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'10px 12px',
              fontSize:12, color:'rgba(255,255,255,0.5)', lineHeight:1.6 }}>
              <StatusDot ok />Face login is only available if you have enrolled your Face ID
              on your profile page.<br />
              <StatusDot ok />A blink liveness check + 3-angle face scan will be performed.
            </div>
            <button style={btnP} onClick={proceedToCamera}>Continue →</button>
            <button style={btnS} onClick={onClose}>Cancel</button>
          </>
        )}

        {/* ── Step 2: Camera ────────────────────────────────────────────────── */}
        {step === 'camera' && (
          <>
            {camError ? (
              <div style={{ color:'#ef4444', fontSize:13, textAlign:'center' }}>{camError}</div>
            ) : (
              <>
                {/* Liveness banner */}
                {!liveness ? (
                  <div style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.35)',
                    borderRadius:10, padding:'8px 14px', fontSize:12, fontWeight:700,
                    color:'#fbbf24', textAlign:'center' }}>
                    👁️ Please <strong>blink once</strong> to confirm you are live
                    {eyesClosed && <span style={{ marginLeft:8, color:'#a3e635' }}>detecting…</span>}
                  </div>
                ) : (
                  <div style={{ background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.35)',
                    borderRadius:10, padding:'6px 14px', fontSize:12, fontWeight:700,
                    color:'#4ade80', textAlign:'center' }}>
                    ✅ Liveness confirmed — follow the prompts below
                  </div>
                )}

                {/* Video */}
                <div style={{ position:'relative', borderRadius:14, overflow:'hidden',
                  border: qualityWarn ? '2px solid #ef4444' : '2px solid rgba(1,118,211,0.4)' }}>
                  <video ref={videoRef} autoPlay playsInline muted
                    style={{ width:'100%', display:'block', transform:'scaleX(-1)', borderRadius:12 }} />
                  <canvas ref={canvasRef}
                    style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%',
                      transform:'scaleX(-1)', pointerEvents:'none' }} />
                  {/* Oval guide */}
                  <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-54%)',
                    width:'48%', paddingBottom:'64%', border:'2.5px solid rgba(0,200,100,0.6)',
                    borderRadius:'50%', pointerEvents:'none' }} />
                  {/* Progress dots */}
                  <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)',
                    display:'flex', gap:8 }}>
                    {LOGIN_PROMPTS.map((_, i) => (
                      <div key={i} style={{ width:9, height:9, borderRadius:'50%',
                        background: i < frames.length ? '#22c55e' : i===frames.length ? '#0176D3' : 'rgba(255,255,255,0.3)',
                        border:'2px solid rgba(255,255,255,0.7)', transition:'all 0.2s' }} />
                    ))}
                  </div>
                  {/* Quality badge */}
                  {liveResult && (
                    <div style={{ position:'absolute', top:8, right:8, fontSize:10, fontWeight:700,
                      background:'rgba(0,0,0,0.6)', borderRadius:20, padding:'2px 7px',
                      color: scoreFaceQuality(liveResult, videoRef.current||{}) >= MIN_QUALITY ? '#22c55e' : '#f59e0b' }}>
                      {Math.round(scoreFaceQuality(liveResult, videoRef.current||{}) * 100)}% quality
                    </div>
                  )}
                </div>

                {/* Pose prompt */}
                {liveness && promptIdx < LOGIN_PROMPTS.length && (
                  <div style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.3)',
                    borderRadius:10, padding:'7px 14px', textAlign:'center',
                    fontSize:12, fontWeight:700, color:'#4ade80' }}>
                    <span style={{ fontSize:16, marginRight:6 }}>{LOGIN_PROMPTS[promptIdx].icon}</span>
                    {LOGIN_PROMPTS[promptIdx].label}
                  </div>
                )}

                {/* Detection status */}
                <div style={{ fontSize:11, fontWeight:600, textAlign:'center',
                  color: liveResult ? '#4ade80' : '#6b7280' }}>
                  {modelLoading
                    ? '⏳ Loading AI models…'
                    : !liveResult
                      ? '❌ No face detected — face the camera directly in good light'
                      : '✅ Face detected'}
                </div>

                <div style={{ display:'flex', gap:8 }}>
                  <button style={{ ...btnS, flex:1 }} onClick={() => { stopCamera(); onClose(); }}>
                    Cancel
                  </button>
                  <button
                    style={{ ...btnP, flex:2, opacity:(!liveResult||!liveness||!modelReady)?0.4:1 }}
                    disabled={!liveResult || !liveness || !modelReady}
                    onClick={capture}>
                    📸 Capture ({frames.length + 1}/{LOGIN_PROMPTS.length})
                  </button>
                </div>
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

        {/* ── Step 4: Error ─────────────────────────────────────────────────── */}
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

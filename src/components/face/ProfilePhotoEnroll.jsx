/**
 * ProfilePhotoEnroll — Two clearly-separated panels:
 *
 * Panel A — PROFILE PHOTO:
 *   Simple file-picker or camera snap → uploads to Cloudinary via POST /api/face/photo
 *   No AI, no biometrics, always available.
 *
 * Panel B — FACE ID (FRS):
 *   Guided 3-frame camera capture → extracts 128-d face descriptor with face-api.js
 *   (lazy-loaded from CDN ~6 MB one-time) → stores descriptor via POST /api/face/enroll
 *   Requires explicit consent. Completely independent of Panel A.
 *
 * face-api.js models are loaded only when the user enters Panel B — zero bundle impact
 * for users who never enroll.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { api } from '../../api/api.js';

const MODEL_CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

// ── Shared styles ──────────────────────────────────────────────────────────────
const S = {
  card     : { background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:14, padding:'20px 20px 16px', display:'flex', flexDirection:'column', gap:12 },
  cardTitle: { fontSize:13, fontWeight:800, color:'#0f172a', letterSpacing:0.5, display:'flex', alignItems:'center', gap:6, marginBottom:2 },
  avatar   : { width:80, height:80, borderRadius:'50%', objectFit:'cover', border:'3px solid #0176D3', boxShadow:'0 4px 16px rgba(1,118,211,0.2)' },
  initials : { width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,#0176D3,#014486)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:28 },
  badge    : { fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, display:'inline-flex', alignItems:'center', gap:4 },
  btnPri   : { fontSize:12, fontWeight:700, padding:'7px 16px', borderRadius:9, border:'none', background:'#0176D3', color:'#fff', cursor:'pointer', transition:'opacity 0.15s' },
  btnSec   : { fontSize:12, fontWeight:700, padding:'7px 16px', borderRadius:9, border:'1.5px solid #0176D3', background:'#fff', color:'#0176D3', cursor:'pointer' },
  btnDanger: { fontSize:11, fontWeight:700, padding:'5px 12px', borderRadius:9, border:'1.5px solid #dc2626', background:'#fff', color:'#dc2626', cursor:'pointer' },
  row      : { display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' },
  toast    : (ok) => ({ fontSize:12, fontWeight:600, color: ok ? '#15803d' : '#dc2626', marginTop:2 }),
  divider  : { height:1, background:'#f1f5f9', margin:'4px 0' },
};

function Spinner() {
  return (
    <div style={{ width:18, height:18, border:'2.5px solid #e2e8f0', borderTop:'2.5px solid #0176D3',
      borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block', verticalAlign:'middle', marginRight:6 }} />
  );
}

// ── face-api lazy loader (singleton) ──────────────────────────────────────────
let _faceapi     = null;
let _modelsReady = false;

async function loadFaceApi() {
  if (_faceapi && _modelsReady) return _faceapi;
  if (!_faceapi) _faceapi = await import('@vladmandic/face-api');
  if (!_modelsReady) {
    await Promise.all([
      _faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_CDN),
      _faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_CDN),
      _faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_CDN),
    ]);
    _modelsReady = true;
  }
  return _faceapi;
}

async function detectFace(faceapi, videoEl) {
  return faceapi
    .detectSingleFace(videoEl, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
}

function drawLandmarks(canvas, videoEl, landmarks) {
  const ctx = canvas.getContext('2d');
  canvas.width  = videoEl.videoWidth  || videoEl.clientWidth;
  canvas.height = videoEl.videoHeight || videoEl.clientHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!landmarks) return;
  const pts = landmarks.positions || [];
  ctx.fillStyle = 'rgba(0,200,100,0.85)';
  pts.forEach(pt => { ctx.beginPath(); ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI*2); ctx.fill(); });
  const line = (idxs, closed=false) => {
    ctx.strokeStyle='rgba(0,200,100,0.4)'; ctx.lineWidth=1; ctx.beginPath();
    idxs.forEach((i,n) => n===0 ? ctx.moveTo(pts[i].x,pts[i].y) : ctx.lineTo(pts[i].x,pts[i].y));
    if (closed) ctx.closePath(); ctx.stroke();
  };
  line([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);
  line([17,18,19,20,21]); line([22,23,24,25,26]);
  line([27,28,29,30]); line([30,31,32,33,34,35,30]);
  line([36,37,38,39,40,41],true); line([42,43,44,45,46,47],true);
  line([48,49,50,51,52,53,54,55,56,57,58,59],true); line([60,61,62,63,64,65,66,67],true);
}

function captureVideoFrame(videoEl) {
  const c = document.createElement('canvas');
  c.width = videoEl.videoWidth || 320; c.height = videoEl.videoHeight || 240;
  c.getContext('2d').drawImage(videoEl, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.9);
}

const PROMPTS = [
  { label:'Look straight at the camera',  icon:'👁️' },
  { label:'Tilt your head slightly left',  icon:'↙️' },
  { label:'Tilt your head slightly right', icon:'↘️' },
];

function avg(arrays) {
  if (!arrays.length) return [];
  const len = arrays[0].length;
  const out = new Array(len).fill(0);
  arrays.forEach(a => a.forEach((v,i) => { out[i] += v; }));
  return out.map(v => v / arrays.length);
}

// ── Panel A — Profile Photo ────────────────────────────────────────────────────
function PhotoPanel({ photoUrl, onPhotoUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [toast, setToast]         = useState({ msg:'', ok:true });
  const fileRef = useRef(null);

  const flash = (msg, ok=true) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg:'', ok:true }), 4000); };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = ev => res(ev.target.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const result = await api.uploadPhoto({ photo: base64 });
      const url = result?.photoUrl || result?.data?.photoUrl;
      onPhotoUpdated?.(url);
      flash('✅ Photo updated!');
    } catch (err) {
      flash('Upload failed: ' + (err.message || 'Unknown error'), false);
    }
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>
        <span style={{ fontSize:16 }}>📷</span>
        <span>Profile Photo</span>
      </div>
      <div style={S.divider} />

      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        {photoUrl
          ? <img src={photoUrl} alt="Profile" style={S.avatar} />
          : <div style={S.initials}>?</div>}

        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, color:'#64748b', marginBottom:8, lineHeight:1.5 }}>
            Upload a clear photo of yourself. This appears on your profile, applications, and recruiter view.
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="user" style={{ display:'none' }} onChange={handleFile} />
          <button style={{ ...S.btnPri, opacity: uploading ? 0.6 : 1 }} disabled={uploading}
            onClick={() => fileRef.current?.click()}>
            {uploading ? <><Spinner />Uploading…</> : '📷 Change Photo'}
          </button>
        </div>
      </div>

      {toast.msg && <div style={S.toast(toast.ok)}>{toast.msg}</div>}
    </div>
  );
}

// ── Panel B — Face ID Camera UI ───────────────────────────────────────────────
function FaceCamera({ onDone, onCancel }) {
  const [modelReady, setModelReady]   = useState(false);
  const [modelLoading, setMLoading]   = useState(false);
  const [faceapi, setFaceapi]         = useState(null);
  const [liveResult, setLiveResult]   = useState(null);
  const [promptIdx, setPromptIdx]     = useState(0);
  const [frames, setFrames]           = useState([]);
  const [descs, setDescs]             = useState([]);
  const [lms, setLms]                 = useState([]);
  const [submitting, setSubmitting]   = useState(false);
  const [toast, setToast]             = useState({ msg:'', ok:true });

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef    = useRef(null);

  const flash = (msg, ok=true) => setToast({ msg, ok });

  // Start camera on mount
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video:{ width:640,height:480,facingMode:'user' } });
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      } catch { flash('Camera access denied. Please allow camera permissions.', false); }
    })();
    return () => stopCamera();
  }, []);

  // Load models
  useEffect(() => {
    setMLoading(true);
    flash('Loading AI face models (one-time ~6 MB)…', true);
    loadFaceApi()
      .then(fa => { setFaceapi(fa); setModelReady(true); setToast({ msg:'', ok:true }); })
      .catch(() => flash('Failed to load face models. Check your connection.', false))
      .finally(() => setMLoading(false));
  }, []);

  // Live detection loop
  useEffect(() => {
    if (!modelReady || !faceapi || !videoRef.current) return;
    let active = true;
    const loop = async () => {
      if (!active) return;
      if (videoRef.current?.readyState >= 2) {
        try {
          const r = await detectFace(faceapi, videoRef.current);
          if (active) {
            setLiveResult(r || null);
            if (canvasRef.current && videoRef.current) drawLandmarks(canvasRef.current, videoRef.current, r?.landmarks);
          }
        } catch { /* ignore frame errors */ }
      }
      if (active) rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { active = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [modelReady, faceapi]);

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const capture = async () => {
    if (!videoRef.current || !liveResult) { flash('No face detected — look at the camera.', false); return; }
    const frame  = captureVideoFrame(videoRef.current);
    const desc   = Array.from(liveResult.descriptor);
    const lmPts  = liveResult.landmarks.positions.flatMap(p => [p.x, p.y]);
    const nf = [...frames, frame], nd = [...descs, desc], nl = [...lms, lmPts];
    setFrames(nf); setDescs(nd); setLms(nl);

    if (nf.length < PROMPTS.length) {
      setPromptIdx(nf.length);
      flash('✅ Captured! Follow the next prompt.', true);
    } else {
      // All frames — submit
      stopCamera();
      setSubmitting(true);
      flash('Uploading face data…', true);
      try {
        const result = await api.enrollFace({
          descriptor     : avg(nd),
          landmarks      : avg(nl),
          photos         : nf,
          bestPhotoIndex : 0,
          consent        : true,
        });
        onDone(result?.photoUrl || result?.data?.photoUrl);
      } catch (e) {
        flash('Enrollment failed: ' + (e.message || 'Unknown error'), false);
        setSubmitting(false);
        // Reset for retry
        setFrames([]); setDescs([]); setLms([]); setPromptIdx(0);
      }
    }
  };

  const cancel = () => { stopCamera(); onCancel(); };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10, maxWidth:420 }}>
      <div style={{ position:'relative', borderRadius:14, overflow:'hidden', boxShadow:'0 8px 32px rgba(1,118,211,0.18)' }}>
        <video ref={videoRef} autoPlay playsInline muted
          style={{ width:'100%', borderRadius:14, display:'block', transform:'scaleX(-1)' }} />
        <canvas ref={canvasRef}
          style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', transform:'scaleX(-1)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-54%)',
          width:'52%', paddingBottom:'68%', border:'3px solid rgba(0,200,100,0.7)', borderRadius:'50%', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)', display:'flex', gap:8 }}>
          {PROMPTS.map((_, i) => (
            <div key={i} style={{ width:10, height:10, borderRadius:'50%',
              background: i < frames.length ? '#22c55e' : i===frames.length ? '#0176D3' : 'rgba(255,255,255,0.4)',
              border:'2px solid rgba(255,255,255,0.8)', transition:'all 0.2s' }} />
          ))}
        </div>
      </div>

      {promptIdx < PROMPTS.length && (
        <div style={{ background:'#f0fdf4', border:'1.5px solid #22c55e', borderRadius:10, padding:'8px 16px', textAlign:'center' }}>
          <span style={{ fontSize:18, marginRight:6 }}>{PROMPTS[promptIdx].icon}</span>
          <span style={{ fontSize:13, fontWeight:700, color:'#15803d' }}>{PROMPTS[promptIdx].label}</span>
        </div>
      )}

      <div style={{ fontSize:12, fontWeight:600, textAlign:'center', color: liveResult ? '#15803d' : '#9ca3af' }}>
        {modelLoading ? '⏳ Loading AI models…' : liveResult ? '✅ Face detected — ready' : '❌ No face detected — look at the camera'}
      </div>

      <div style={S.row}>
        <button onClick={cancel} style={{ ...S.btnSec, flex:1 }} disabled={submitting}>Cancel</button>
        <button onClick={capture} disabled={!modelReady || !liveResult || submitting}
          style={{ ...S.btnPri, flex:2, opacity:(!modelReady||!liveResult||submitting)?0.5:1 }}>
          {submitting ? <><Spinner />Uploading…</> : `📸 Capture (${frames.length+1}/${PROMPTS.length})`}
        </button>
      </div>

      {toast.msg && <div style={S.toast(toast.ok)}>{toast.msg}</div>}
    </div>
  );
}

// ── Panel B — Face ID (idle / enrolled states) ────────────────────────────────
function FaceIdPanel({ frsStatus, onEnrolled }) {
  const [showCamera, setShowCamera]   = useState(false);
  const [consent, setConsent]         = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [toast, setToast]             = useState({ msg:'', ok:true });

  const flash = (msg, ok=true) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg:'', ok:true }), 5000); };

  const enrolled  = !!frsStatus?.enrolled;
  const enrolledAt = frsStatus?.enrolledAt
    ? new Date(frsStatus.enrolledAt).toLocaleDateString() : null;

  const handleDelete = async () => {
    if (!window.confirm('Remove your Face ID? You can re-enroll at any time.')) return;
    setDeleting(true);
    try {
      await api.deleteFace();
      onEnrolled({ enrolled: false, photoUrl: frsStatus?.photoUrl });
      flash('Face ID removed.', true);
    } catch { flash('Failed to remove Face ID.', false); }
    setDeleting(false);
  };

  const handleDone = (newPhotoUrl) => {
    setShowCamera(false);
    setConsent(false);
    onEnrolled({ enrolled: true, photoUrl: newPhotoUrl });
    flash('✅ Face ID enrolled! You are now verified for assessments.', true);
  };

  if (showCamera) {
    return (
      <div style={S.card}>
        <div style={S.cardTitle}><span style={{ fontSize:16 }}>🔐</span><span>Face ID — Camera</span></div>
        <div style={S.divider} />
        <FaceCamera onDone={handleDone} onCancel={() => setShowCamera(false)} />
      </div>
    );
  }

  return (
    <div style={S.card}>
      <div style={S.cardTitle}><span style={{ fontSize:16 }}>🔐</span><span>Face ID (FRS)</span></div>
      <div style={S.divider} />

      {enrolled ? (
        // ── Enrolled state ─────────────────────────────────────────────────────
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ ...S.badge, background:'#dcfce7', color:'#15803d', fontSize:12 }}>
              🔒 Face Enrolled{enrolledAt ? ` · ${enrolledAt}` : ''}
            </div>
          </div>
          <div style={{ fontSize:12, color:'#475569', lineHeight:1.6 }}>
            Your facial biometric is active. Assessments will verify your identity every 60 seconds.
            To log in with your face, use the Face Login option on the sign-in screen (coming soon).
          </div>
          <div style={S.row}>
            <button style={S.btnSec} onClick={() => { setConsent(true); setShowCamera(true); }}>
              🔄 Re-enroll Face
            </button>
            <button style={S.btnDanger} disabled={deleting} onClick={handleDelete}>
              {deleting ? <><Spinner />Removing…</> : '🗑️ Remove Face ID'}
            </button>
          </div>
        </div>
      ) : (
        // ── Not enrolled state ─────────────────────────────────────────────────
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ fontSize:12, color:'#475569', lineHeight:1.6 }}>
            Enroll your face to:<br />
            <span style={{ color:'#0176D3' }}>✓</span> Verify your identity during online assessments<br />
            <span style={{ color:'#0176D3' }}>✓</span> Log in with your face (coming soon)<br />
            <span style={{ color:'#0176D3' }}>✓</span> Prevent impersonation
          </div>

          {!consent ? (
            <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:10, padding:'10px 14px' }}>
              <label style={{ display:'flex', alignItems:'flex-start', gap:8, cursor:'pointer' }}>
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                  style={{ marginTop:3, accentColor:'#0176D3', flexShrink:0 }} />
                <span style={{ fontSize:12, color:'#0369a1', lineHeight:1.5 }}>
                  I consent to storing my facial biometric data for identity verification.
                  I can remove this data at any time from this page.
                </span>
              </label>
            </div>
          ) : (
            <button style={S.btnPri} onClick={() => setShowCamera(true)}>
              🔐 Start Face Enrollment
            </button>
          )}
        </div>
      )}

      {toast.msg && <div style={S.toast(toast.ok)}>{toast.msg}</div>}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function ProfilePhotoEnroll({ user, onPhotoUpdated }) {
  const [frsStatus, setFrsStatus] = useState(null); // null = loading

  useEffect(() => {
    api.getFaceStatus()
      .then(r => setFrsStatus(r?.data || r))
      .catch(() => setFrsStatus({ enrolled: false }));
  }, []);

  const photoUrl = frsStatus?.photoUrl || user?.photoUrl;

  const handlePhotoUpdated = (url) => {
    setFrsStatus(s => ({ ...(s||{}), photoUrl: url }));
    onPhotoUpdated?.(url);
  };

  const handleFrsUpdated = (update) => {
    setFrsStatus(s => ({ ...(s||{}), ...update }));
    if (update.photoUrl) onPhotoUpdated?.(update.photoUrl);
  };

  if (frsStatus === null) {
    return <div style={{ ...S.card, alignItems:'center', padding:24 }}><Spinner /><span style={{ fontSize:12, color:'#94a3b8', marginTop:8 }}>Loading…</span></div>;
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Panel A — Profile Photo */}
      <PhotoPanel photoUrl={photoUrl} onPhotoUpdated={handlePhotoUpdated} />

      {/* Panel B — Face ID */}
      <FaceIdPanel frsStatus={frsStatus} onEnrolled={handleFrsUpdated} />
    </div>
  );
}

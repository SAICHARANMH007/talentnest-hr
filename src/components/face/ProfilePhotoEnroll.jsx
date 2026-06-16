/**
 * ProfilePhotoEnroll — Two clearly-separated panels:
 *
 * Panel A — PROFILE PHOTO:
 *   Simple file-picker → /api/face/photo  (no AI, always available)
 *
 * Panel B — FACE ID (FRS):
 *   5-frame guided camera enrollment + liveness blink check
 *   → /api/face/enroll  (requires consent)
 *
 * Uses shared faceUtils.js for all AI operations.
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
  averageLandmarks,
} from './faceUtils.js';

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

// ── Crop Modal ─────────────────────────────────────────────────────────────────
function CropModal({ src, onConfirm, onCancel }) {
  const CROP_SIZE = 280;
  const [pos, setPos]         = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ w: CROP_SIZE, h: CROP_SIZE });
  const [dragging, setDrag]   = useState(false);
  const lastRef = useRef({ x: 0, y: 0 });
  const imgRef  = useRef(null);

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const getXY  = (e) => { const t = e.touches?.[0] || e; return { x: t.clientX, y: t.clientY }; };

  const onLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const r = img.naturalWidth / img.naturalHeight;
    const w = r >= 1 ? CROP_SIZE * r : CROP_SIZE;
    const h = r >= 1 ? CROP_SIZE : CROP_SIZE / r;
    setImgSize({ w, h });
    setPos({ x: -(w - CROP_SIZE) / 2, y: -(h - CROP_SIZE) / 2 });
  };

  const startDrag = (e) => { e.preventDefault(); lastRef.current = getXY(e); setDrag(true); };
  const moveDrag  = (e) => {
    if (!dragging) return;
    const cur = getXY(e);
    const dx = cur.x - lastRef.current.x;
    const dy = cur.y - lastRef.current.y;
    lastRef.current = cur;
    setPos(p => ({
      x: clamp(p.x + dx, CROP_SIZE - imgSize.w, 0),
      y: clamp(p.y + dy, CROP_SIZE - imgSize.h, 0),
    }));
  };
  const stopDrag = () => setDrag(false);

  const confirm = () => {
    const img = imgRef.current;
    if (!img) return;
    const sx = img.naturalWidth  / imgSize.w;
    const sy = img.naturalHeight / imgSize.h;
    const c  = document.createElement('canvas');
    c.width = 512; c.height = 512;
    c.getContext('2d').drawImage(img, (-pos.x) * sx, (-pos.y) * sy, CROP_SIZE * sx, CROP_SIZE * sy, 0, 0, 512, 512);
    onConfirm(c.toDataURL('image/jpeg', 0.92));
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:99999, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:14, padding:'20px 20px 16px', maxWidth:360, width:'100%', display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ fontWeight:800, fontSize:14, color:'#0f172a' }}>📷 Position Your Photo</div>
        <div style={{ fontSize:12, color:'#64748b', lineHeight:1.5 }}>Drag to center your face inside the circle, then tap <strong>Use Photo</strong>.</div>
        {/* Circular crop viewport */}
        <div
          style={{ width:CROP_SIZE, height:CROP_SIZE, borderRadius:'50%', overflow:'hidden', border:'3px solid #0176D3', position:'relative', margin:'0 auto', cursor:dragging?'grabbing':'grab', userSelect:'none', touchAction:'none', boxShadow:'0 4px 20px rgba(1,118,211,0.25)' }}
          onMouseDown={startDrag} onMouseMove={moveDrag} onMouseUp={stopDrag} onMouseLeave={stopDrag}
          onTouchStart={startDrag} onTouchMove={moveDrag} onTouchEnd={stopDrag}>
          <img
            ref={imgRef} src={src} alt="crop" draggable={false}
            style={{ position:'absolute', left:pos.x, top:pos.y, width:imgSize.w, height:imgSize.h, maxWidth:'none', display:'block', pointerEvents:'none' }}
            onLoad={onLoad}
          />
        </div>
        <div style={{ fontSize:11, color:'#94a3b8', textAlign:'center' }}>Drag to reposition · Uploads as 512×512 px</div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onCancel} style={{ ...S.btnSec, flex:1 }}>Cancel</button>
          <button onClick={confirm}  style={{ ...S.btnPri, flex:2 }}>✅ Use Photo</button>
        </div>
      </div>
    </div>
  );
}

// Enrollment prompts — 5 angles for maximum descriptor stability
const PROMPTS = [
  { label:'Look straight at the camera',    icon:'👁️' },
  { label:'Tilt your head slightly left',   icon:'↙️' },
  { label:'Tilt your head slightly right',  icon:'↘️' },
  { label:'Raise your chin slightly',       icon:'⬆️' },
  { label:'Lower your chin slightly',       icon:'⬇️' },
];

const MIN_QUALITY = 0.45; // reject frames below this quality score

// ── Panel A — Profile Photo ────────────────────────────────────────────────────
function PhotoPanel({ photoUrl, onPhotoUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [toast, setToast]         = useState({ msg:'', ok:true });
  const [cropSrc, setCropSrc]     = useState(null);
  const fileRef = useRef(null);

  const flash = (msg, ok=true) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg:'', ok:true }), 4000); };

  // Step 1: file selected → show crop modal
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = ''; // allow re-selecting the same file
  };

  // Step 2: crop confirmed → upload to Cloudinary
  const doUpload = async (base64) => {
    setCropSrc(null);
    setUploading(true);
    try {
      const result = await api.uploadPhoto({ photo: base64 });
      const url = result?.photoUrl || result?.data?.photoUrl;
      onPhotoUpdated?.(url);
      flash('✅ Photo updated!');
    } catch (err) {
      flash('Upload failed: ' + (err.message || 'Unknown error'), false);
    }
    setUploading(false);
  };

  return (
    <>
      {cropSrc && <CropModal src={cropSrc} onConfirm={doUpload} onCancel={() => setCropSrc(null)} />}
      <div style={S.card}>
        <div style={S.cardTitle}><span style={{ fontSize:16 }}>📷</span><span>Profile Photo</span></div>
        <div style={S.divider} />
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          {photoUrl
            ? <img src={photoUrl} alt="Profile" style={S.avatar} />
            : <div style={S.initials}>?</div>}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, color:'#64748b', marginBottom:8, lineHeight:1.5 }}>
              Upload a clear photo from your gallery or take a new one. Appears on your profile, resume, and recruiter view.
            </div>
            {/* No capture attr — lets user choose camera or gallery */}
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile} />
            <button style={{ ...S.btnPri, opacity: uploading ? 0.6 : 1 }} disabled={uploading}
              onClick={() => fileRef.current?.click()}>
              {uploading ? <><Spinner />Uploading…</> : '📷 Change Photo'}
            </button>
          </div>
        </div>
        {toast.msg && <div style={S.toast(toast.ok)}>{toast.msg}</div>}
      </div>
    </>
  );
}

// ── Camera sub-component (used by Panel B) ────────────────────────────────────
// stream prop: MediaStream obtained from the parent button click (user gesture context)
function FaceCamera({ stream, onDone, onCancel }) {
  const [cameraReady, setCameraReady] = useState(false);
  const [modelReady, setModelReady]   = useState(false);
  const [modelLoading, setMLoading]   = useState(false);
  const [faceapi, setFaceapi]         = useState(null);
  const [liveResult, setLiveResult]   = useState(null);
  const [liveness, setLiveness]       = useState('waiting'); // waiting | blinking | confirmed
  const [blinkCount, setBlinkCount]   = useState(0);
  const [eyesClosed, setEyesClosed]   = useState(false);
  const [promptIdx, setPromptIdx]     = useState(0);
  const [frames, setFrames]           = useState([]);
  const [descs, setDescs]             = useState([]);
  const [lms, setLms]                 = useState([]);
  const [submitting, setSubmitting]   = useState(false);
  const [qualityWarn, setQualityWarn] = useState(false);
  const [toast, setToast]             = useState({ msg:'', ok:true });

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef    = useRef(null);

  const flash = (msg, ok=true) => setToast({ msg, ok });

  // Attach parent-provided stream to video element
  useEffect(() => {
    if (!stream) return;
    streamRef.current = stream;
    const vid = videoRef.current;
    if (vid) {
      vid.srcObject = stream;
      if (vid.readyState >= 1) vid.play().catch(() => {});
    }
    return () => stopCamera();
  }, [stream]);

  // Load models
  useEffect(() => {
    setMLoading(true);
    flash('Loading AI face models (one-time ~6 MB)…', true);
    loadFaceApi()
      .then(fa => { setFaceapi(fa); setModelReady(true); setToast({ msg:'', ok:true }); })
      .catch(() => flash('Failed to load face models. Check your connection.', false))
      .finally(() => setMLoading(false));
  }, []);

  // Live detection + liveness EAR loop — only starts once video is confirmed playing
  useEffect(() => {
    if (!modelReady || !faceapi || !cameraReady) return;
    let active = true;
    let earBelowCount = 0; // consecutive frames with eyes closed

    const loop = async () => {
      if (!active) return;
      const vid = videoRef.current;
      if (vid && (vid.readyState >= 2 || vid.videoWidth > 0)) {
        try {
          const r = await detectFaceRaw(faceapi, videoRef.current);
          if (active) {
            setLiveResult(r || null);
            if (canvasRef.current && videoRef.current) {
              drawFaceMesh(canvasRef.current, videoRef.current, r?.landmarks);
            }

            // Liveness: track EAR for blink detection
            if (r?.landmarks) {
              const ear = getEAR(r.landmarks);
              if (ear < BLINK_THRESHOLD) {
                earBelowCount++;
                setEyesClosed(true);
              } else {
                if (earBelowCount >= 2) {
                  // Eyes were closed for ≥2 frames → confirmed blink
                  setLiveness('confirmed');
                  setBlinkCount(c => c + 1);
                }
                earBelowCount = 0;
                setEyesClosed(false);
              }
            }
          }
        } catch { /* ignore frame errors */ }
      }
      if (active) rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { active = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [modelReady, faceapi, cameraReady]);

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const capture = async () => {
    if (!videoRef.current || !liveResult) {
      flash('No face detected — look at the camera.', false);
      return;
    }

    // Quality gate
    const quality = scoreFaceQuality(liveResult, videoRef.current);
    if (quality < MIN_QUALITY) {
      setQualityWarn(true);
      flash('Frame quality too low — check your lighting and face the camera directly.', false);
      setTimeout(() => setQualityWarn(false), 2500);
      return;
    }

    const frame = captureEnhancedFrame(videoRef.current); // low-light enhanced
    const desc  = Array.from(liveResult.descriptor);
    const lmPts = liveResult.landmarks.positions.flatMap(p => [p.x, p.y]);

    const nf = [...frames, frame];
    const nd = [...descs, desc];
    const nl = [...lms, lmPts];
    setFrames(nf); setDescs(nd); setLms(nl);

    if (nf.length < PROMPTS.length) {
      setPromptIdx(nf.length);
      flash(`✅ Frame ${nf.length}/${PROMPTS.length} captured!`, true);
    } else {
      stopCamera();
      setSubmitting(true);
      flash('Uploading face data…', true);
      try {
        const result = await api.enrollFace({
          descriptor     : averageDescriptors(nd),
          landmarks      : averageLandmarks(nl),
          photos         : nf,
          bestPhotoIndex : 0,
          consent        : true,
        });
        onDone(result?.photoUrl || result?.data?.photoUrl);
      } catch (e) {
        flash('Enrollment failed: ' + (e.message || 'Unknown error'), false);
        setSubmitting(false);
        setFrames([]); setDescs([]); setLms([]); setPromptIdx(0);
      }
    }
  };

  const livenessConfirmed = liveness === 'confirmed' || blinkCount >= 1;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10, maxWidth:440 }}>
      {/* Liveness banner */}
      {!livenessConfirmed && (
        <div style={{ background:'#fef3c7', border:'1.5px solid #f59e0b', borderRadius:10, padding:'8px 14px',
          fontSize:12, fontWeight:700, color:'#92400e', textAlign:'center' }}>
          👁️ Liveness check — please <strong>blink once</strong> to confirm you're live
          {eyesClosed && <span style={{ marginLeft:8, color:'#15803d' }}>👁️‍🗨️ Detecting…</span>}
        </div>
      )}
      {livenessConfirmed && (
        <div style={{ background:'#dcfce7', border:'1.5px solid #22c55e', borderRadius:10, padding:'6px 14px',
          fontSize:12, fontWeight:700, color:'#15803d', textAlign:'center' }}>
          ✅ Liveness confirmed — now capture your face poses
        </div>
      )}

      {/* Video + mesh overlay */}
      <div style={{ position:'relative', borderRadius:14, overflow:'hidden', boxShadow:'0 8px 32px rgba(1,118,211,0.18)',
        border: qualityWarn ? '2.5px solid #ef4444' : '2.5px solid transparent' }}>
        <video ref={videoRef} autoPlay playsInline muted
          onLoadedMetadata={e => { e.target.play().catch(() => {}); setCameraReady(true); }}
          onPlaying={() => setCameraReady(true)}
          style={{ width:'100%', borderRadius:14, display:'block', transform:'scaleX(-1)' }} />
        <canvas ref={canvasRef}
          style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', transform:'scaleX(-1)', pointerEvents:'none' }} />
        {/* Oval face guide */}
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-54%)',
          width:'50%', paddingBottom:'66%', border:'3px solid rgba(0,200,100,0.65)',
          borderRadius:'50%', pointerEvents:'none' }} />
        {/* Frame progress dots */}
        <div style={{ position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)', display:'flex', gap:8 }}>
          {PROMPTS.map((_, i) => (
            <div key={i} style={{ width:10, height:10, borderRadius:'50%',
              background: i < frames.length ? '#22c55e' : i===frames.length ? '#0176D3' : 'rgba(255,255,255,0.35)',
              border:'2px solid rgba(255,255,255,0.8)', transition:'all 0.2s' }} />
          ))}
        </div>
        {/* Quality indicator */}
        {liveResult && (
          <div style={{ position:'absolute', top:10, right:10, fontSize:10, fontWeight:700,
            background:'rgba(0,0,0,0.55)', color: scoreFaceQuality(liveResult, videoRef.current||{}) >= MIN_QUALITY ? '#22c55e' : '#f59e0b',
            padding:'3px 7px', borderRadius:20 }}>
            {Math.round(scoreFaceQuality(liveResult, videoRef.current||{}) * 100)}% quality
          </div>
        )}
      </div>

      {/* Current pose prompt */}
      {promptIdx < PROMPTS.length && livenessConfirmed && (
        <div style={{ background:'#f0fdf4', border:'1.5px solid #22c55e', borderRadius:10, padding:'8px 16px', textAlign:'center' }}>
          <span style={{ fontSize:18, marginRight:6 }}>{PROMPTS[promptIdx].icon}</span>
          <span style={{ fontSize:13, fontWeight:700, color:'#15803d' }}>{PROMPTS[promptIdx].label}</span>
        </div>
      )}

      {/* Detection status */}
      <div style={{ fontSize:12, fontWeight:600, textAlign:'center',
        color: liveResult ? '#15803d' : '#9ca3af' }}>
        {!cameraReady
          ? '📷 Starting camera…'
          : modelLoading
            ? '⏳ Loading AI models…'
            : !liveResult
              ? '❌ No face detected — face the camera directly'
              : '✅ Face detected — ready to capture'}
      </div>

      <div style={S.row}>
        <button onClick={() => { stopCamera(); onCancel(); }} style={{ ...S.btnSec, flex:1 }} disabled={submitting}>
          Cancel
        </button>
        <button
          onClick={capture}
          disabled={!modelReady || !liveResult || submitting || !livenessConfirmed}
          style={{ ...S.btnPri, flex:2, opacity:(!modelReady||!liveResult||submitting||!livenessConfirmed)?0.45:1 }}>
          {submitting
            ? <><Spinner />Uploading…</>
            : `📸 Capture ${frames.length+1}/${PROMPTS.length}`}
        </button>
      </div>

      {toast.msg && <div style={S.toast(toast.ok)}>{toast.msg}</div>}
    </div>
  );
}

// ── Panel B — Face ID ──────────────────────────────────────────────────────────
function FaceIdPanel({ frsStatus, onEnrolled }) {
  const [showCamera, setShowCamera]     = useState(false);
  const [pendingStream, setPendingStream] = useState(null);
  const [consent, setConsent]           = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [toast, setToast]               = useState({ msg:'', ok:true });

  const flash = (msg, ok=true) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg:'', ok:true }), 5000); };

  // Acquire camera in user gesture context, then show FaceCamera
  const handleStartCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      setPendingStream(s);
      setShowCamera(true);
    } catch {
      flash('Camera access denied. Please allow camera permissions in your browser.', false);
    }
  };

  const enrolled   = !!frsStatus?.enrolled;
  const enrolledAt = frsStatus?.enrolledAt ? new Date(frsStatus.enrolledAt).toLocaleDateString() : null;

  const handleDelete = async () => {
    if (!window.confirm('Remove your Face ID? You can re-enroll at any time.')) return;
    setDeleting(true);
    try {
      await api.deleteFace();
      onEnrolled({ enrolled:false, photoUrl:frsStatus?.photoUrl });
      flash('Face ID removed.', true);
    } catch { flash('Failed to remove Face ID.', false); }
    setDeleting(false);
  };

  const handleDone = (newPhotoUrl) => {
    setShowCamera(false);
    setConsent(false);
    onEnrolled({ enrolled:true, photoUrl:newPhotoUrl });
    flash('✅ Face ID enrolled! You are now verified for assessments and face login.', true);
  };

  if (showCamera) {
    return (
      <div style={S.card}>
        <div style={S.cardTitle}><span style={{ fontSize:16 }}>🔐</span><span>Face ID — Enrollment Camera</span></div>
        <div style={S.divider} />
        <FaceCamera
          stream={pendingStream}
          onDone={handleDone}
          onCancel={() => { setPendingStream(null); setShowCamera(false); }}
        />
      </div>
    );
  }

  return (
    <div style={S.card}>
      <div style={S.cardTitle}><span style={{ fontSize:16 }}>🔐</span><span>Face ID (FRS)</span></div>
      <div style={S.divider} />

      {enrolled ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ ...S.badge, background:'#dcfce7', color:'#15803d', fontSize:12, alignSelf:'flex-start' }}>
            🔒 Face Enrolled{enrolledAt ? ` · ${enrolledAt}` : ''}
          </div>
          <div style={{ fontSize:12, color:'#475569', lineHeight:1.6 }}>
            Your facial biometric is active. You can:<br />
            <span style={{ color:'#0176D3' }}>✓</span> Log in using your email + face scan<br />
            <span style={{ color:'#0176D3' }}>✓</span> Get verified automatically during assessments
          </div>
          <div style={S.row}>
            <button style={S.btnSec} onClick={handleStartCamera}>
              🔄 Re-enroll Face
            </button>
            <button style={S.btnDanger} disabled={deleting} onClick={handleDelete}>
              {deleting ? <><Spinner />Removing…</> : '🗑️ Remove Face ID'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ fontSize:12, color:'#475569', lineHeight:1.6 }}>
            Enroll your face to unlock:<br />
            <span style={{ color:'#0176D3' }}>✓</span> Face login — enter email + scan face (no password!)<br />
            <span style={{ color:'#0176D3' }}>✓</span> Automatic identity verification during assessments<br />
            <span style={{ color:'#0176D3' }}>✓</span> Anti-impersonation protection
          </div>
          <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:10, padding:'8px 12px', fontSize:11, color:'#9a3412' }}>
            🔒 5-angle capture + blink liveness check ensures maximum security.
          </div>

          {!consent ? (
            <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:10, padding:'10px 14px' }}>
              <label style={{ display:'flex', alignItems:'flex-start', gap:8, cursor:'pointer' }}>
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                  style={{ marginTop:3, accentColor:'#0176D3', flexShrink:0 }} />
                <span style={{ fontSize:12, color:'#0369a1', lineHeight:1.5 }}>
                  I consent to storing my facial biometric data for identity verification and face login.
                  I can remove this data at any time from this page.
                </span>
              </label>
            </div>
          ) : (
            <button style={S.btnPri} onClick={handleStartCamera}>
              🔐 Start Face Enrollment (5 angles + blink)
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
  const [frsStatus, setFrsStatus] = useState(null);

  useEffect(() => {
    api.getFaceStatus()
      .then(r => setFrsStatus(r?.data || r))
      .catch(() => setFrsStatus({ enrolled:false }));
  }, []);

  const photoUrl = frsStatus?.photoUrl || user?.photoUrl;

  const handlePhotoUpdated = (url) => {
    setFrsStatus(s => ({ ...(s||{}), photoUrl:url }));
    onPhotoUpdated?.(url);
  };

  const handleFrsUpdated = (update) => {
    setFrsStatus(s => ({ ...(s||{}), ...update }));
    if (update.photoUrl) onPhotoUpdated?.(update.photoUrl);
  };

  if (frsStatus === null) {
    return (
      <div style={{ ...S.card, alignItems:'center', padding:24 }}>
        <Spinner />
        <span style={{ fontSize:12, color:'#94a3b8', marginTop:8 }}>Loading…</span>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <PhotoPanel photoUrl={photoUrl} onPhotoUpdated={handlePhotoUpdated} />
      <FaceIdPanel frsStatus={frsStatus} onEnrolled={handleFrsUpdated} />
    </div>
  );
}

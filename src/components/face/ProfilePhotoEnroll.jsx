/**
 * ProfilePhotoEnroll — Two clearly-separated panels:
 *
 * Panel A — PROFILE PHOTO:
 *   Simple file-picker → /api/face/photo  (no AI, always available)
 *
 * Panel B — FACE ID (FRS):
 *   5-pose guided camera enrollment + stable-frame liveness check
 *   → /api/face/enroll  (requires consent)
 *   Stores 2,546 data points per pose × 5 poses = 12,730 facial data points
 *
 * Uses shared faceUtils.js for all AI operations.
 */
import React, { useRef, useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import {
  loadFaceApi,
  openFrontCamera,
  detectFaceRaw,
  drawFaceMesh,
  captureEnhancedFrame,
  scoreFaceQuality,
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

// Inject keyframes (idempotent)
if (typeof document !== 'undefined' && !document.getElementById('frs-kf')) {
  const st = document.createElement('style');
  st.id = 'frs-kf';
  st.textContent = '@keyframes spin{to{transform:rotate(360deg)}} @keyframes frsGrow{from{transform:scale(0.8);opacity:0}to{transform:scale(1);opacity:1}}';
  document.head.appendChild(st);
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

// Enrollment poses — 5 angles for maximum descriptor stability
const PROMPTS = [
  { label:'Look straight at the camera',   icon:'👁️' },
  { label:'Tilt head slightly left',        icon:'↙️' },
  { label:'Tilt head slightly right',       icon:'↘️' },
  { label:'Raise your chin slightly',       icon:'⬆️' },
  { label:'Lower your chin slightly',       icon:'⬇️' },
];

const MIN_QUALITY = 0.30; // lowered for mobile cameras

// ── Panel A — Profile Photo ────────────────────────────────────────────────────
function PhotoPanel({ photoUrl, onPhotoUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [toast, setToast]         = useState({ msg:'', ok:true });
  const [cropSrc, setCropSrc]     = useState(null);
  const fileRef = useRef(null);

  const flash = (msg, ok=true) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg:'', ok:true }), 4000); };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

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

// ── FaceCamera — industry-grade 5-pose enrollment ─────────────────────────────
//
// Liveness method: counts 20 consecutive good face detections (~1.2 s at 15 fps)
// — replaces EAR blink which is unreliable on most mobile cameras.
//
// Data captured per pose:
//   136  normalised landmark coords (68 landmarks × x,y)
//  2278  pairwise Euclidean distances (68×67/2, normalised by face width)
//   128  face-api descriptor
//     4  bounding-box ratios
// ─────────────────────────────────────────────────────────────────────────────
//   2,546 values × 5 poses = 12,730 facial data points per enrollment
//
// After liveness passes, a 3-2-1 auto-countdown fires for each pose.
// The manual "Capture" button is always available once liveness passes.
function FaceCamera({ stream, onDone, onCancel }) {
  const [cameraReady, setCameraReady]     = useState(false);
  const [modelReady, setModelReady]       = useState(false);
  const [modelLoading, setMLoading]       = useState(false);
  const [faceapi, setFaceapi]             = useState(null);
  const [liveResult, setLiveResult]       = useState(null);
  const [livenessOk, setLivenessOk]      = useState(false);
  const [stableFrames, setStableFrames]   = useState(0);
  const [capturedCount, setCapturedCount] = useState(0);
  const [countdown, setCountdown]         = useState(null); // 3 | 2 | 1 | null
  const [submitting, setSubmitting]       = useState(false);
  const [qualityWarn, setQualityWarn]     = useState(false);
  const [toast, setToast]                 = useState({ msg:'', ok:true });

  const videoRef          = useRef(null);
  const canvasRef         = useRef(null);
  const streamRef         = useRef(null);
  const rafRef            = useRef(null);
  const liveResultRef     = useRef(null);   // always fresh — avoids React state lag in capture()
  const clearFaceRef      = useRef(null);   // debounce timer for face-lost state
  const stableCountRef    = useRef(0);
  const livenessOkRef     = useRef(false);
  const capturedFramesRef = useRef([]);     // { photo, extFeat } per pose
  const countdownRef      = useRef(null);   // setInterval handle
  const isCapturingRef    = useRef(false);  // guard against double-capture

  const STABLE_FOR_LIVE = 20; // consecutive good detections → confirmed live
  const flash = (msg, ok = true) => setToast({ msg, ok });

  // ── Compute 12,730 facial data points ───────────────────────────────────────
  const computeExtFeatures = (detection, video) => {
    const pos   = detection.landmarks.positions; // 68 landmarks
    const w     = video.videoWidth  || video.clientWidth  || 640;
    const h     = video.videoHeight || video.clientHeight || 480;
    const box   = detection.detection.box;
    const faceW = Math.max(box.width, 1);

    // 136 normalised coordinates
    const normCoords = pos.flatMap(p => [p.x / w, p.y / h]);
    // 136 raw pixel coordinates (for averageLandmarks compatibility)
    const rawCoords  = pos.flatMap(p => [p.x, p.y]);

    // 2,278 pairwise distances (all unique pairs, normalised by face width)
    const dists = [];
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        dists.push(Math.sqrt(dx * dx + dy * dy) / faceW);
      }
    }

    const descriptor = Array.from(detection.descriptor);                       // 128 values
    const boxFeat    = [box.x / w, box.y / h, box.width / w, box.height / h]; // 4 values

    // Total: 136 + 2278 + 128 + 4 = 2,546 per pose
    return { normCoords, rawCoords, dists, descriptor, boxFeat };
  };

  // ── Attach stream ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!stream) return;
    streamRef.current = stream;
    const vid = videoRef.current;
    if (vid) { vid.srcObject = stream; vid.play().catch(() => {}); }
    return () => stopAll();
  }, [stream]);

  // ── Load face models ─────────────────────────────────────────────────────────
  useEffect(() => {
    setMLoading(true);
    let pct = 0;
    flash(`Loading AI models… ${pct}%`, true);
    loadFaceApi(p => { pct = p; flash(`Loading AI models… ${p}%`, true); })
      .then(fa => { setFaceapi(fa); setModelReady(true); setToast({ msg:'', ok:true }); })
      .catch(() => flash('Failed to load face models. Check your connection and reload.', false))
      .finally(() => setMLoading(false));
  }, []);

  // ── Detection RAF loop ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!modelReady || !faceapi || !cameraReady) return;
    let active = true;

    const loop = async () => {
      if (!active) return;
      const vid = videoRef.current;
      // readyState >= 2 AND videoWidth > 0 prevents Chrome race where metadata is
      // loaded but the first decodable frame isn't available yet
      if (vid && vid.videoWidth > 0 && vid.readyState >= 2) {
        try {
          const r = await detectFaceRaw(faceapi, vid);
          if (active) {
            if (r) {
              // Face detected — update ref immediately; debounce is cancelled
              liveResultRef.current = r;
              setLiveResult(r);
              if (clearFaceRef.current) { clearTimeout(clearFaceRef.current); clearFaceRef.current = null; }

              // Stable-frame liveness: count consecutive good detections (no blink needed)
              if (!livenessOkRef.current) {
                stableCountRef.current = Math.min(stableCountRef.current + 1, STABLE_FOR_LIVE);
                setStableFrames(stableCountRef.current);
                if (stableCountRef.current >= STABLE_FOR_LIVE) {
                  livenessOkRef.current = true;
                  setLivenessOk(true);
                }
              }
            } else {
              // Face lost — clear ref immediately; decay stable count; debounce UI state
              liveResultRef.current = null;
              if (!livenessOkRef.current) {
                stableCountRef.current = Math.max(0, stableCountRef.current - 3);
                setStableFrames(stableCountRef.current);
              }
              if (!clearFaceRef.current) {
                clearFaceRef.current = setTimeout(() => {
                  setLiveResult(null);
                  clearFaceRef.current = null;
                }, 600);
              }
            }
            if (canvasRef.current && vid) drawFaceMesh(canvasRef.current, vid, r?.landmarks);
          }
        } catch { /* ignore per-frame errors */ }
      }
      if (active) rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { active = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [modelReady, faceapi, cameraReady]);

  // ── Auto-capture: 3-2-1 countdown fires after liveness or each pose ──────────
  useEffect(() => {
    if (!livenessOk || submitting || isCapturingRef.current) return;
    if (capturedFramesRef.current.length >= PROMPTS.length) return;
    // Short pause so user reads the pose instruction first
    const t = setTimeout(() => startCountdown(), 900);
    return () => clearTimeout(t);
  }, [livenessOk, capturedCount]); // capturedCount bumps after each successful pose

  const startCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (isCapturingRef.current || capturedFramesRef.current.length >= PROMPTS.length) return;
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
  };

  const cancelCountdown = () => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setCountdown(null);
  };

  const stopAll = () => {
    cancelCountdown();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (clearFaceRef.current) { clearTimeout(clearFaceRef.current); clearFaceRef.current = null; }
    liveResultRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  // ── Capture one pose ─────────────────────────────────────────────────────────
  const doCapture = async () => {
    if (isCapturingRef.current) return;
    const vid = videoRef.current;
    if (!vid) { flash('Camera not ready.', false); return; }

    // Use ref first (always fresh); fallback to on-demand detection
    let result = liveResultRef.current;
    if (!result && faceapi) {
      try { result = await detectFaceRaw(faceapi, vid); } catch {}
    }
    if (!result) {
      flash('No face in frame — look at the camera directly.', false);
      setTimeout(() => startCountdown(), 2500);
      return;
    }

    const quality = scoreFaceQuality(result, vid);
    if (quality < MIN_QUALITY) {
      setQualityWarn(true);
      flash('Image quality low — improve lighting and hold still.', false);
      setTimeout(() => { setQualityWarn(false); startCountdown(); }, 2500);
      return;
    }

    isCapturingRef.current = true;
    const photo   = captureEnhancedFrame(vid);
    const extFeat = computeExtFeatures(result, vid);
    capturedFramesRef.current = [...capturedFramesRef.current, { photo, extFeat }];
    const count = capturedFramesRef.current.length;

    if (count < PROMPTS.length) {
      flash(`✅ Pose ${count}/${PROMPTS.length} captured! Follow the next instruction.`, true);
      isCapturingRef.current = false;
      setCapturedCount(count); // triggers auto-countdown useEffect for next pose
    } else {
      // All 5 poses done → build final feature set and enroll
      flash('✅ All poses captured — saving your Face ID…', true);
      isCapturingRef.current = false;
      stopAll();
      setSubmitting(true);
      setCapturedCount(count);

      const allFeat  = capturedFramesRef.current.map(f => f.extFeat);
      const avgDesc  = averageDescriptors(allFeat.map(f => f.descriptor));
      const avgLms   = averageLandmarks(allFeat.map(f => f.rawCoords));
      const avgDists = allFeat[0].dists.map((_, i) =>
        allFeat.reduce((s, f) => s + f.dists[i], 0) / allFeat.length
      );
      const totalPoints = allFeat.length *
        (allFeat[0].normCoords.length + allFeat[0].dists.length +
         allFeat[0].descriptor.length + allFeat[0].boxFeat.length);

      try {
        const res = await api.enrollFace({
          descriptor     : avgDesc,
          landmarks      : avgLms,
          photos         : capturedFramesRef.current.map(f => f.photo),
          bestPhotoIndex : 0,
          consent        : true,
          extFeatures    : { perFrame: allFeat, avgDists, totalPoints },
        });
        onDone(res?.photoUrl || res?.data?.photoUrl);
      } catch (e) {
        flash('Enrollment failed: ' + (e.message || 'Unknown error'), false);
        setSubmitting(false);
        capturedFramesRef.current = [];
        setCapturedCount(0);
      }
    }
  };

  const livenessProgress = Math.round((stableFrames / STABLE_FOR_LIVE) * 100);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10, maxWidth:440 }}>

      {/* Liveness progress bar — replaces broken EAR blink detection */}
      {!livenessOk && (
        <div style={{ background:'#fff7ed', border:'1.5px solid #f59e0b', borderRadius:10, padding:'10px 14px' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#92400e', marginBottom:6, textAlign:'center' }}>
            👁️ Hold still — verifying you're live ({livenessProgress}%)
          </div>
          <div style={{ background:'#fde68a', borderRadius:20, height:8, overflow:'hidden' }}>
            <div style={{ width:`${livenessProgress}%`, height:'100%', borderRadius:20, transition:'width 0.12s',
              background: livenessProgress > 70 ? '#16a34a' : '#f59e0b' }} />
          </div>
          <div style={{ fontSize:11, color:'#92400e', textAlign:'center', marginTop:4 }}>
            {!liveResult ? 'Face the camera to begin' : livenessProgress < 60 ? 'Keep still…' : 'Almost confirmed…'}
          </div>
        </div>
      )}
      {livenessOk && (
        <div style={{ background:'#dcfce7', border:'1.5px solid #22c55e', borderRadius:10, padding:'6px 14px',
          fontSize:12, fontWeight:700, color:'#15803d', textAlign:'center' }}>
          ✅ Live identity verified — pose {Math.min(capturedCount + 1, PROMPTS.length)} of {PROMPTS.length}
        </div>
      )}

      {/* Video + mesh + overlays */}
      <div style={{ position:'relative', borderRadius:14, overflow:'hidden',
        boxShadow:'0 8px 32px rgba(1,118,211,0.18)',
        border: qualityWarn ? '2.5px solid #ef4444' : livenessOk ? '2.5px solid #22c55e' : '2.5px solid #f59e0b' }}>

        <video ref={videoRef} autoPlay playsInline muted
          {...{'webkit-playsinline': 'true'}}
          onLoadedMetadata={e => { e.target.play().catch(() => {}); setCameraReady(true); }}
          onCanPlay={e => { e.target.play().catch(() => {}); setCameraReady(true); }}
          onPlaying={() => setCameraReady(true)}
          style={{ width:'100%', borderRadius:14, display:'block', transform:'scaleX(-1)' }} />

        <canvas ref={canvasRef}
          style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', transform:'scaleX(-1)', pointerEvents:'none' }} />

        {/* Oval face guide */}
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-54%)',
          width:'50%', paddingBottom:'66%', borderRadius:'50%', pointerEvents:'none',
          border:`3px solid ${livenessOk ? 'rgba(34,197,94,0.85)' : 'rgba(245,158,11,0.75)'}` }} />

        {/* 3-2-1 countdown overlay */}
        {countdown !== null && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
            background:'rgba(0,0,0,0.28)', borderRadius:14 }}>
            <div style={{ width:80, height:80, borderRadius:'50%', background:'rgba(1,118,211,0.93)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:44, fontWeight:900, color:'#fff',
              boxShadow:'0 0 28px rgba(1,118,211,0.7)', animation:'frsGrow 0.25s ease' }}>
              {countdown}
            </div>
          </div>
        )}

        {/* Pose progress dots */}
        <div style={{ position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)', display:'flex', gap:9 }}>
          {PROMPTS.map((_, i) => (
            <div key={i} style={{ width:12, height:12, borderRadius:'50%',
              border:'2px solid rgba(255,255,255,0.85)', transition:'all 0.2s',
              background: i < capturedCount ? '#22c55e' : i === capturedCount ? '#0176D3' : 'rgba(255,255,255,0.3)',
              boxShadow: i === capturedCount ? '0 0 8px rgba(1,118,211,0.9)' : 'none' }} />
          ))}
        </div>

        {/* Quality badge */}
        {liveResult && (
          <div style={{ position:'absolute', top:10, right:10, fontSize:10, fontWeight:700,
            padding:'3px 8px', borderRadius:20, background:'rgba(0,0,0,0.55)',
            color: scoreFaceQuality(liveResult, videoRef.current || {}) >= MIN_QUALITY ? '#22c55e' : '#fbbf24' }}>
            {Math.round(scoreFaceQuality(liveResult, videoRef.current || {}) * 100)}%
          </div>
        )}
      </div>

      {/* Pose instruction card */}
      {livenessOk && capturedCount < PROMPTS.length && !submitting && (
        <div style={{ background:'#eff6ff', border:'1.5px solid #0176D3', borderRadius:10,
          padding:'10px 16px', textAlign:'center' }}>
          <div style={{ fontSize:26, marginBottom:2 }}>{PROMPTS[capturedCount].icon}</div>
          <div style={{ fontSize:13, fontWeight:800, color:'#1e40af' }}>{PROMPTS[capturedCount].label}</div>
          <div style={{ fontSize:11, color:'#64748b', marginTop:3 }}>
            {countdown !== null
              ? `Auto-capturing in ${countdown}s — or tap button below to capture now`
              : 'Hold this pose — auto-capture starting…'}
          </div>
        </div>
      )}

      {/* Status line */}
      <div style={{ fontSize:12, fontWeight:600, textAlign:'center', color: liveResult ? '#15803d' : '#9ca3af' }}>
        {!cameraReady    ? '📷 Starting camera…'
          : modelLoading ? '⏳ Loading AI models…'
          : submitting   ? '⬆️ Saving your Face ID…'
          : !liveResult  ? '❌ No face detected — look at the camera'
          : livenessOk   ? `✅ ${capturedCount}/${PROMPTS.length} poses captured`
          : '🔍 Checking liveness — hold still'}
      </div>

      <div style={S.row}>
        <button onClick={() => { cancelCountdown(); stopAll(); onCancel(); }}
          style={{ ...S.btnSec, flex:1 }} disabled={submitting}>
          Cancel
        </button>
        <button
          onClick={() => { cancelCountdown(); doCapture(); }}
          disabled={!modelReady || submitting || !livenessOk || capturedCount >= PROMPTS.length}
          style={{ ...S.btnPri, flex:2,
            opacity:(!modelReady || submitting || !livenessOk || capturedCount >= PROMPTS.length) ? 0.45 : 1 }}>
          {submitting
            ? <><Spinner />Saving…</>
            : countdown !== null
              ? `⏱ ${countdown}… (tap to capture now)`
              : `📸 Capture Pose ${Math.min(capturedCount + 1, PROMPTS.length)} / ${PROMPTS.length}`}
        </button>
      </div>

      {toast.msg && <div style={S.toast(toast.ok)}>{toast.msg}</div>}
    </div>
  );
}

// ── Panel B — Face ID ──────────────────────────────────────────────────────────
function FaceIdPanel({ frsStatus, onEnrolled }) {
  const [showCamera, setShowCamera]       = useState(false);
  const [pendingStream, setPendingStream] = useState(null);
  const [consent, setConsent]             = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [toast, setToast]                 = useState({ msg:'', ok:true });

  const flash = (msg, ok=true) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg:'', ok:true }), 5000); };

  const handleStartCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      flash('Camera not available. Open this page over https:// in Chrome or Safari.', false);
      return;
    }
    try {
      const stream = await openFrontCamera(); // robust fallback chain from faceUtils
      setPendingStream(stream);
      setShowCamera(true);
    } catch (err) {
      flash(err.message || 'Camera error. Please try again.', false);
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
    flash('✅ Face ID enrolled! You can now log in with your face and get verified during assessments.', true);
  };

  if (showCamera) {
    return (
      <div style={S.card}>
        <div style={S.cardTitle}><span style={{ fontSize:16 }}>🔐</span><span>Face ID — Enrollment</span></div>
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
            <button style={S.btnSec} onClick={handleStartCamera}>🔄 Re-enroll Face</button>
            <button style={S.btnDanger} disabled={deleting} onClick={handleDelete}>
              {deleting ? <><Spinner />Removing…</> : '🗑️ Remove Face ID'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ fontSize:12, color:'#475569', lineHeight:1.6 }}>
            Enroll your face to unlock:<br />
            <span style={{ color:'#0176D3' }}>✓</span> Face login — enter email + scan (no password!)<br />
            <span style={{ color:'#0176D3' }}>✓</span> Automatic identity verification during assessments<br />
            <span style={{ color:'#0176D3' }}>✓</span> Anti-impersonation protection
          </div>
          <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:10, padding:'8px 12px', fontSize:11, color:'#9a3412' }}>
            🔒 5-pose capture + stable-frame liveness · 12,730 facial data points · industry-standard security
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
              🔐 Start Face Enrollment (5 poses · auto-capture)
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

/**
 * ProfilePhotoEnroll — Profile photo upload + optional FRS face enrollment
 *
 * Simple mode (default):   user picks/takes a photo → uploads to Cloudinary via /api/face/photo
 * Enroll mode (on demand): guides user through 3-frame capture → extracts 128-d face descriptor
 *                           via face-api.js (lazy-loaded) → stores in DB via /api/face/enroll
 *
 * face-api.js models are loaded from jsDelivr CDN on first mount of enrollment
 * mode — no bundle-size impact for users who never enroll.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { api } from '../../api/api.js';

const MODEL_CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  wrap   : { display:'flex', flexDirection:'column', alignItems:'center', gap:12 },
  avatar : { width:100, height:100, borderRadius:'50%', objectFit:'cover', border:'3px solid #0176D3', boxShadow:'0 4px 16px rgba(1,118,211,0.25)' },
  initials: { width:100, height:100, borderRadius:'50%', background:'linear-gradient(135deg,#0176D3,#014486)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:34 },
  badge  : { fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, display:'inline-flex', alignItems:'center', gap:4 },
  btnSm  : { fontSize:12, fontWeight:700, padding:'6px 14px', borderRadius:8, border:'1.5px solid #0176D3', background:'#fff', color:'#0176D3', cursor:'pointer' },
  btnP   : { fontSize:12, fontWeight:700, padding:'6px 14px', borderRadius:8, border:'none', background:'#0176D3', color:'#fff', cursor:'pointer' },
  btnDanger: { fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8, border:'1.5px solid #dc2626', background:'#fff', color:'#dc2626', cursor:'pointer' },
};

function Spinner() {
  return <div style={{ width:20, height:20, border:'2.5px solid #e2e8f0', borderTop:'2.5px solid #0176D3', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }} />;
}

// ── face-api.js lazy loader ────────────────────────────────────────────────────
let faceapiModule = null;
let modelsLoaded  = false;

async function loadFaceApi() {
  if (faceapiModule && modelsLoaded) return faceapiModule;
  if (!faceapiModule) {
    faceapiModule = await import('@vladmandic/face-api');
  }
  const faceapi = faceapiModule;
  if (!modelsLoaded) {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_CDN),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_CDN),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_CDN),
    ]);
    modelsLoaded = true;
  }
  return faceapi;
}

async function getDescriptorFromVideo(faceapi, videoEl) {
  const result = await faceapi
    .detectSingleFace(videoEl, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return result;
}

// Draw 68 landmark dots on a canvas overlay
function drawLandmarks(canvas, videoEl, landmarks) {
  const ctx = canvas.getContext('2d');
  canvas.width  = videoEl.videoWidth  || videoEl.clientWidth;
  canvas.height = videoEl.videoHeight || videoEl.clientHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!landmarks) return;
  const pts = landmarks.positions || [];
  ctx.fillStyle = 'rgba(0, 200, 100, 0.85)';
  pts.forEach(pt => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
  // Draw mesh lines (eyes, brows, nose, mouth, jaw outline)
  const drawPath = (idxs, closed = false) => {
    ctx.strokeStyle = 'rgba(0,200,100,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    idxs.forEach((i, n) => n === 0 ? ctx.moveTo(pts[i].x, pts[i].y) : ctx.lineTo(pts[i].x, pts[i].y));
    if (closed) ctx.closePath();
    ctx.stroke();
  };
  // Jaw
  drawPath([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);
  // Left brow
  drawPath([17,18,19,20,21]);
  // Right brow
  drawPath([22,23,24,25,26]);
  // Nose bridge
  drawPath([27,28,29,30]);
  // Nose
  drawPath([30,31,32,33,34,35,30]);
  // Left eye
  drawPath([36,37,38,39,40,41], true);
  // Right eye
  drawPath([42,43,44,45,46,47], true);
  // Outer mouth
  drawPath([48,49,50,51,52,53,54,55,56,57,58,59], true);
  // Inner mouth
  drawPath([60,61,62,63,64,65,66,67], true);
}

// Capture a frame from video as base64 JPEG
function captureFrame(videoEl) {
  const canvas = document.createElement('canvas');
  canvas.width  = videoEl.videoWidth  || 320;
  canvas.height = videoEl.videoHeight || 240;
  canvas.getContext('2d').drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}

// ── Enrollment prompts ─────────────────────────────────────────────────────────
const PROMPTS = [
  { label: 'Look straight at the camera',   icon: '👁️' },
  { label: 'Tilt your head slightly left',   icon: '↙️' },
  { label: 'Tilt your head slightly right',  icon: '↘️' },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProfilePhotoEnroll({ user, onPhotoUpdated, compact = false }) {
  const [status, setStatus]         = useState(null);   // null | loading | enrolled | not_enrolled
  const [mode, setMode]             = useState('idle');  // idle | camera | enrolling | uploading | done
  const [promptIdx, setPromptIdx]   = useState(0);
  const [capturedFrames, setCaptured] = useState([]);   // base64 strings
  const [descriptors, setDescriptors] = useState([]);   // Float32Array or number[]
  const [landmarks, setLandmarks]   = useState([]);     // averaged landmarks
  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setMLoading] = useState(false);
  const [facapiRef, setFaceapi]     = useState(null);
  const [liveResult, setLiveResult] = useState(null);   // latest detection result
  const [toast, setToast]           = useState('');
  const [consent, setConsent]       = useState(false);
  const [processing, setProcessing] = useState(false);
  const [fileMode, setFileMode]     = useState(false);  // true = file upload instead of camera

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef    = useRef(null);
  const fileRef   = useRef(null);

  // Load status on mount
  useEffect(() => {
    api.getFaceStatus()
      .then(r => setStatus(r?.data || r))
      .catch(() => setStatus({ enrolled: false }));
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    setMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width:640, height:480, facingMode:'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setToast('Camera access denied. Please allow camera permissions.');
      setMode('idle');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (canvasRef.current) canvasRef.current.getContext('2d')?.clearRect(0, 0, 9999, 9999);
  }, []);

  // Live detection loop — draws mesh, sets liveResult
  useEffect(() => {
    if (mode !== 'camera' || !modelReady || !facapiRef || !videoRef.current) return;
    let active = true;
    const loop = async () => {
      if (!active || !videoRef.current || videoRef.current.readyState < 2) {
        if (active) rafRef.current = requestAnimationFrame(loop);
        return;
      }
      try {
        const result = await getDescriptorFromVideo(facapiRef, videoRef.current);
        if (active) {
          setLiveResult(result || null);
          if (canvasRef.current && videoRef.current) {
            drawLandmarks(canvasRef.current, videoRef.current, result?.landmarks);
          }
        }
      } catch { /* ignore frame errors */ }
      if (active) rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { active = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [mode, modelReady, facapiRef]);

  // Load face-api.js models
  const loadModels = async () => {
    if (modelReady) return;
    setMLoading(true);
    setToast('Loading AI face models (one-time ~6MB download)…');
    try {
      const faceapi = await loadFaceApi();
      setFaceapi(faceapi);
      setModelReady(true);
      setToast('');
    } catch {
      setToast('Failed to load face models. Check your internet connection.');
    }
    setMLoading(false);
  };

  // Capture one frame for enrollment
  const captureFrame_ = async () => {
    if (!videoRef.current || !liveResult) {
      setToast('No face detected. Please look at the camera.');
      return;
    }
    const frame = captureFrame(videoRef.current);
    const desc  = Array.from(liveResult.descriptor); // Float32Array → plain array
    const lmPts = liveResult.landmarks.positions.flatMap(p => [p.x, p.y]);

    const newFrames = [...capturedFrames, frame];
    const newDescs  = [...descriptors, desc];
    const newLms    = [...landmarks, lmPts];

    setCaptured(newFrames);
    setDescriptors(newDescs);
    setLandmarks(newLms);

    if (newFrames.length < PROMPTS.length) {
      setPromptIdx(newFrames.length);
      setToast('✅ Frame captured! Follow the next prompt.');
    } else {
      // All frames captured — submit
      await submitEnrollment(newFrames, newDescs, newLms);
    }
  };

  // Average multiple descriptors into one
  const averageDescriptors = (descs) => {
    if (descs.length === 0) return [];
    const len = descs[0].length;
    const avg = new Array(len).fill(0);
    descs.forEach(d => d.forEach((v, i) => { avg[i] += v; }));
    return avg.map(v => v / descs.length);
  };

  const averageLandmarks = (lmArrays) => {
    if (lmArrays.length === 0) return [];
    const len = lmArrays[0].length;
    const avg = new Array(len).fill(0);
    lmArrays.forEach(la => la.forEach((v, i) => { avg[i] += v; }));
    return avg.map(v => v / lmArrays.length);
  };

  const submitEnrollment = async (frames, descs, lms) => {
    setMode('uploading');
    setToast('Uploading face data…');
    stopCamera();
    setProcessing(true);
    try {
      const descriptor = averageDescriptors(descs);
      const avgLandmarks = averageLandmarks(lms);
      const result = await api.enrollFace({
        descriptor,
        landmarks : avgLandmarks,
        photos    : frames,
        bestPhotoIndex: 0,
        consent   : true,
      });
      const newPhotoUrl = result?.photoUrl || result?.data?.photoUrl;
      setStatus(s => ({ ...s, enrolled: true, photoUrl: newPhotoUrl }));
      setMode('done');
      setToast('');
      onPhotoUpdated?.(newPhotoUrl);
    } catch (e) {
      setToast('Enrollment failed: ' + (e.message || 'Unknown error'));
      setMode('camera');
    }
    setProcessing(false);
  };

  // File upload (fallback — no face mesh)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    setToast('Uploading photo…');
    try {
      const reader = new FileReader();
      const base64 = await new Promise((res, rej) => {
        reader.onload = ev => res(ev.target.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const result = await api.uploadPhoto({ photo: base64 });
      const url = result?.photoUrl || result?.data?.photoUrl;
      setStatus(s => ({ ...s, photoUrl: url }));
      setToast('');
      onPhotoUpdated?.(url);
    } catch (e) {
      setToast('Upload failed: ' + (e.message || 'Unknown error'));
    }
    setProcessing(false);
  };

  const handleDeleteFace = async () => {
    if (!window.confirm('Remove your face data? You can re-enroll at any time.')) return;
    try {
      await api.deleteFace();
      setStatus(s => ({ ...s, enrolled: false, enrollmentPhotos: [] }));
      setToast('Face data removed.');
    } catch { setToast('Failed to remove face data.'); }
  };

  const photoUrl = status?.photoUrl || user?.photoUrl;
  const enrolled = !!status?.enrolled;
  const initials = (user?.name || 'U')[0].toUpperCase();

  if (status === null) return <div style={s.initials}><Spinner /></div>;

  // ── Camera / Enrollment UI ─────────────────────────────────────────────────
  if (mode === 'camera' || mode === 'uploading') {
    return (
      <div style={{ ...s.wrap, gap:10, maxWidth:420, margin:'0 auto' }}>
        {/* Video + canvas overlay */}
        <div style={{ position:'relative', borderRadius:14, overflow:'hidden', boxShadow:'0 8px 32px rgba(1,118,211,0.18)', width:'100%' }}>
          <video ref={videoRef} autoPlay playsInline muted
            style={{ width:'100%', borderRadius:14, display:'block', transform:'scaleX(-1)' }} />
          <canvas ref={canvasRef}
            style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', transform:'scaleX(-1)', pointerEvents:'none' }} />
          {/* Oval face guide */}
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-54%)',
            width:'52%', paddingBottom:'68%', border:'3px solid rgba(0,200,100,0.7)',
            borderRadius:'50%', pointerEvents:'none' }} />
          {/* Frame progress dots */}
          <div style={{ position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)', display:'flex', gap:8 }}>
            {PROMPTS.map((_, i) => (
              <div key={i} style={{ width:10, height:10, borderRadius:'50%',
                background: i < capturedFrames.length ? '#22c55e' : i === capturedFrames.length ? '#0176D3' : 'rgba(255,255,255,0.4)',
                border:'2px solid rgba(255,255,255,0.8)', transition:'all 0.2s' }} />
            ))}
          </div>
        </div>

        {/* Current prompt */}
        {promptIdx < PROMPTS.length && (
          <div style={{ background:'#f0fdf4', border:'1.5px solid #22c55e', borderRadius:10, padding:'8px 16px', textAlign:'center', width:'100%' }}>
            <span style={{ fontSize:18, marginRight:8 }}>{PROMPTS[promptIdx].icon}</span>
            <span style={{ fontSize:13, fontWeight:700, color:'#15803d' }}>{PROMPTS[promptIdx].label}</span>
          </div>
        )}

        {/* Face detection status */}
        <div style={{ fontSize:12, fontWeight:600, color: liveResult ? '#15803d' : '#9ca3af', textAlign:'center' }}>
          {!modelReady ? (modelLoading ? '⏳ Loading AI models…' : '') : liveResult ? '✅ Face detected — ready to capture' : '❌ No face detected — look at the camera'}
        </div>

        {/* Capture / Cancel buttons */}
        <div style={{ display:'flex', gap:8, width:'100%' }}>
          <button onClick={() => { stopCamera(); setMode('idle'); setCaptured([]); setDescriptors([]); setLandmarks([]); setPromptIdx(0); }}
            style={{ ...s.btnSm, flex:1 }}>Cancel</button>
          <button onClick={captureFrame_} disabled={!modelReady || !liveResult || processing}
            style={{ ...s.btnP, flex:2, opacity: (!modelReady || !liveResult) ? 0.5 : 1 }}>
            {mode === 'uploading' ? 'Uploading…' : `📸 Capture (${capturedFrames.length + 1}/${PROMPTS.length})`}
          </button>
        </div>

        {toast && <div style={{ fontSize:12, color: toast.startsWith('✅') ? '#15803d' : '#dc2626', textAlign:'center' }}>{toast}</div>}
      </div>
    );
  }

  // ── Done / idle UI ─────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>
      {/* Photo circle */}
      {photoUrl
        ? <img src={photoUrl} alt="Profile" style={s.avatar} />
        : <div style={s.initials}>{initials}</div>}

      {/* Enrollment badge */}
      {enrolled && (
        <div style={{ ...s.badge, background:'#dcfce7', color:'#15803d' }}>
          🔒 Face Verified
        </div>
      )}

      {mode === 'done' && (
        <div style={{ fontSize:13, color:'#15803d', fontWeight:700, textAlign:'center' }}>
          ✅ Face enrolled! Your identity is protected during assessments.
        </div>
      )}

      {toast && <div style={{ fontSize:12, color:'#dc2626', textAlign:'center' }}>{toast}</div>}

      {/* Action buttons */}
      {!compact && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', marginTop:4 }}>
          {/* Simple photo upload */}
          <input ref={fileRef} type="file" accept="image/*" capture="user" style={{ display:'none' }} onChange={handleFileUpload} />
          <button style={s.btnSm} disabled={processing} onClick={() => fileRef.current?.click()}>
            {processing ? '⏳ Uploading…' : '📷 Upload Photo'}
          </button>

          {/* FRS enrollment */}
          {!enrolled ? (
            <>
              {!consent ? (
                <div style={{ width:'100%', background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:10, padding:'10px 14px', fontSize:12 }}>
                  <label style={{ display:'flex', alignItems:'flex-start', gap:8, cursor:'pointer' }}>
                    <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop:2, accentColor:'#0176D3' }} />
                    <span style={{ color:'#0369a1', lineHeight:1.5 }}>
                      I consent to storing my facial biometric data for identity verification during assessments. I can remove this data at any time.
                    </span>
                  </label>
                </div>
              ) : (
                <button style={s.btnP} onClick={async () => { await loadModels(); setMode('camera'); setPromptIdx(0); setCaptured([]); setDescriptors([]); setLandmarks([]); await startCamera(); }}>
                  {modelLoading ? '⏳ Loading models…' : '🔐 Enroll Face (Secure)'}
                </button>
              )}
            </>
          ) : (
            <>
              <button style={s.btnSm} onClick={async () => { await loadModels(); setMode('camera'); setPromptIdx(0); setCaptured([]); setDescriptors([]); setLandmarks([]); await startCamera(); }}>
                🔄 Re-enroll Face
              </button>
              <button style={s.btnDanger} onClick={handleDeleteFace}>🗑️ Remove Face Data</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

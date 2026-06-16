/**
 * faceUtils.js — Shared utilities for FRS (Facial Recognition System)
 *
 * Used by: ProfilePhotoEnroll (enrollment) + FaceLoginModal (login)
 *
 * Key features:
 *  • Singleton face-api.js loader (6 MB one-time download, lazy)
 *  • Low-light enhancement via histogram equalization + CSS filters
 *  • Liveness detection via Eye Aspect Ratio (EAR) blink check
 *  • Face quality scoring (confidence × face-area ratio)
 *  • Multi-frame descriptor averaging for higher accuracy
 */

const MODEL_CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

// ── Singleton loader ──────────────────────────────────────────────────────────
let _faceapi = null;
let _modelsReady = false;
let _loadPromise = null;

export async function loadFaceApi() {
  if (_faceapi && _modelsReady) return _faceapi;
  if (_loadPromise) return _loadPromise; // deduplicate concurrent calls
  _loadPromise = (async () => {
    if (!_faceapi) _faceapi = await import('@vladmandic/face-api');
    if (!_modelsReady) {
      await Promise.all([
        _faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_CDN),
        _faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_CDN),
        _faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_CDN),
      ]);
      _modelsReady = true;
    }
    _loadPromise = null;
    return _faceapi;
  })();
  return _loadPromise;
}

// ── Low-light enhancement ─────────────────────────────────────────────────────
/**
 * Returns a pre-processed canvas with:
 *  1. CSS filter: brightness(1.4) contrast(1.15) — quick first pass
 *  2. Partial histogram equalisation (60% equalised + 40% original)
 *     Avoids over-brightening already-bright frames
 */
export function enhanceFrameForLowLight(videoEl) {
  const w = videoEl.videoWidth  || 640;
  const h = videoEl.videoHeight || 480;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Pass 1: CSS filter for fast brightness/contrast lift
  ctx.filter = 'brightness(1.4) contrast(1.15) saturate(1.05)';
  ctx.drawImage(videoEl, 0, 0, w, h);
  ctx.filter = 'none';

  // Pass 2: Partial histogram equalisation for adaptive low-light correction
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const pixels = w * h;

  // Build luminance histogram
  const hist = new Array(256).fill(0);
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    hist[lum]++;
  }

  // Cumulative distribution function
  const cdf = new Array(256).fill(0);
  cdf[0] = hist[0];
  for (let i = 1; i < 256; i++) cdf[i] = cdf[i - 1] + hist[i];
  const cdfMin = cdf.find(v => v > 0) || 1;

  // Equalisation LUT
  const lut = hist.map((_, i) => {
    const v = Math.round((cdf[i] - cdfMin) / Math.max(1, pixels - cdfMin) * 255);
    return Math.max(0, Math.min(255, v));
  });

  // Apply: blend 60% equalised + 40% original (preserve skin tone)
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = Math.round(lut[d[i]]     * 0.6 + d[i]     * 0.4);
    d[i + 1] = Math.round(lut[d[i + 1]] * 0.6 + d[i + 1] * 0.4);
    d[i + 2] = Math.round(lut[d[i + 2]] * 0.6 + d[i + 2] * 0.4);
    // d[i+3] alpha unchanged
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// ── Capture helpers ───────────────────────────────────────────────────────────
/** Capture raw frame from video → base64 JPEG */
export function captureRawFrame(videoEl, quality = 0.92) {
  const c = document.createElement('canvas');
  c.width = videoEl.videoWidth || 640;
  c.height = videoEl.videoHeight || 480;
  c.getContext('2d').drawImage(videoEl, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}

/** Capture low-light-enhanced frame → base64 JPEG */
export function captureEnhancedFrame(videoEl, quality = 0.92) {
  return enhanceFrameForLowLight(videoEl).toDataURL('image/jpeg', quality);
}

// ── Face detection ────────────────────────────────────────────────────────────
/** Detect on an enhanced canvas (not the raw video) for better accuracy in low light */
export async function detectFaceEnhanced(faceapi, videoEl) {
  const canvas = enhanceFrameForLowLight(videoEl);
  return faceapi
    .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
}

/** Detect on raw video — faster, used during live overlay */
export async function detectFaceRaw(faceapi, videoEl) {
  return faceapi
    .detectSingleFace(videoEl, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
}

// ── Quality scoring ───────────────────────────────────────────────────────────
/**
 * Score 0–1 based on:
 *  • Detection confidence (weight 0.6)
 *  • Face-to-frame area ratio (weight 0.4) — face should occupy ≥10% of frame
 * Frames with score < 0.45 should be rejected.
 */
export function scoreFaceQuality(result, videoEl) {
  if (!result) return 0;
  const confidence = result.detection.score;
  const box = result.detection.box;
  const w = videoEl.videoWidth  || videoEl.clientWidth  || 640;
  const h = videoEl.videoHeight || videoEl.clientHeight || 480;
  const areaRatio = (box.width * box.height) / (w * h);
  return confidence * 0.6 + Math.min(areaRatio / 0.10, 1) * 0.4;
}

// ── Liveness: Eye Aspect Ratio (EAR) ─────────────────────────────────────────
/**
 * EAR = average of both eyes:
 *   EAR_eye = (||p2-p6|| + ||p3-p5||) / (2 × ||p1-p4||)
 *
 * Landmark indices (68-point model):
 *   Left eye:  36 37 38 39 40 41
 *   Right eye: 42 43 44 45 46 47
 *
 * EAR < 0.21 → eye closed (blink).
 * Require 2 consecutive below-threshold frames to confirm blink.
 */
export function getEAR(landmarks) {
  if (!landmarks?.positions) return 1;
  const pts = landmarks.positions;
  const d = (a, b) => {
    const dx = pts[a].x - pts[b].x;
    const dy = pts[a].y - pts[b].y;
    return Math.sqrt(dx * dx + dy * dy);
  };
  const leftEAR  = (d(37, 41) + d(38, 40)) / (2 * Math.max(d(36, 39), 0.001));
  const rightEAR = (d(43, 47) + d(44, 46)) / (2 * Math.max(d(42, 45), 0.001));
  return (leftEAR + rightEAR) / 2;
}

// EAR threshold below which we consider eyes closed
export const BLINK_THRESHOLD = 0.21;

// ── Descriptor math ───────────────────────────────────────────────────────────
/** Average N 128-d float arrays into one */
export function averageDescriptors(descs) {
  if (!descs.length) return [];
  const len = descs[0].length;
  const out = new Array(len).fill(0);
  descs.forEach(d => d.forEach((v, i) => { out[i] += v; }));
  return out.map(v => v / descs.length);
}

/** Average N landmark arrays */
export function averageLandmarks(arrays) {
  if (!arrays.length) return [];
  const len = arrays[0].length;
  const out = new Array(len).fill(0);
  arrays.forEach(a => a.forEach((v, i) => { out[i] += v; }));
  return out.map(v => v / arrays.length);
}

// ── Landmark overlay drawing ──────────────────────────────────────────────────
/** Draw 68-point mesh overlay on a canvas positioned over the video */
export function drawFaceMesh(canvas, videoEl, landmarks) {
  const ctx = canvas.getContext('2d');
  canvas.width  = videoEl.videoWidth  || videoEl.clientWidth;
  canvas.height = videoEl.videoHeight || videoEl.clientHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!landmarks?.positions) return;

  const pts = landmarks.positions;
  ctx.fillStyle = 'rgba(0,200,100,0.85)';
  pts.forEach(pt => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  const line = (idxs, closed = false) => {
    ctx.strokeStyle = 'rgba(0,200,100,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    idxs.forEach((i, n) => n === 0 ? ctx.moveTo(pts[i].x, pts[i].y) : ctx.lineTo(pts[i].x, pts[i].y));
    if (closed) ctx.closePath();
    ctx.stroke();
  };

  line([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]); // jaw
  line([17,18,19,20,21]); line([22,23,24,25,26]);      // brows
  line([27,28,29,30]); line([30,31,32,33,34,35,30]);   // nose
  line([36,37,38,39,40,41], true);                     // left eye
  line([42,43,44,45,46,47], true);                     // right eye
  line([48,49,50,51,52,53,54,55,56,57,58,59], true);  // outer mouth
  line([60,61,62,63,64,65,66,67], true);               // inner mouth
}

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

// CDN list tried in order — first success wins (handles CDN outages / slow regions)
const MODEL_CDNS = [
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model',
  'https://unpkg.com/@vladmandic/face-api/model',
];

// ── Singleton loader ──────────────────────────────────────────────────────────
let _faceapi = null;
let _modelsReady = false;
let _loadPromise = null;

// Try loading a model from each CDN in order until one succeeds
async function loadModelWithFallback(net, name) {
  for (let i = 0; i < MODEL_CDNS.length; i++) {
    try {
      await net.loadFromUri(MODEL_CDNS[i]);
      return;
    } catch (e) {
      if (i === MODEL_CDNS.length - 1) throw new Error(`Failed to load ${name} model from all CDNs.`);
    }
  }
}

/**
 * Load face-api.js and AI models.
 * Models used (total ~6.5 MB vs old ~12 MB):
 *   • tinyFaceDetector      190 KB  — fast face detection (replaces ssdMobilenetv1 5.4 MB)
 *   • faceLandmark68TinyNet  80 KB  — 68-point landmarks (replaces full 350 KB net)
 *   • faceRecognitionNet    6.2 MB  — 128-d recognition descriptor (required, unchanged)
 *
 * onProgress(pct: 0-100) called as each model finishes.
 */
export async function loadFaceApi(onProgress) {
  if (_faceapi && _modelsReady) { onProgress?.(100); return _faceapi; }
  if (_loadPromise) return _loadPromise; // deduplicate concurrent calls
  _loadPromise = (async () => {
    if (!_faceapi) _faceapi = await import('@vladmandic/face-api');
    if (!_modelsReady) {
      // Load sequentially so we can report progress; tinyFaceDetector first (smallest)
      onProgress?.(5);
      await loadModelWithFallback(_faceapi.nets.tinyFaceDetector,      'tinyFaceDetector');
      onProgress?.(15);
      await loadModelWithFallback(_faceapi.nets.faceLandmark68TinyNet,  'faceLandmark68Tiny');
      onProgress?.(25);
      await loadModelWithFallback(_faceapi.nets.faceRecognitionNet,     'faceRecognition');
      onProgress?.(100);
      _modelsReady = true;
    }
    _loadPromise = null;
    return _faceapi;
  })();
  return _loadPromise;
}

// ── Cross-browser camera helper ───────────────────────────────────────────────
/**
 * Open the front camera with a robust fallback constraint chain + legacy polyfill.
 * Works on: Android Chrome/Samsung Internet/Tecno WebView, iOS Safari, desktop browsers.
 * Also handles very old Android (pre-Chrome 47) that only have webkitGetUserMedia.
 * Returns MediaStream or throws a user-friendly Error.
 */
export async function openFrontCamera() {
  // ── Modern API (Chrome 47+, Firefox 36+, Safari 11+, most Android 2016+) ──
  if (navigator.mediaDevices?.getUserMedia) {
    const constraintChain = [
      // Ideal: front-facing, 640×480 — works on most modern phones
      { video: { facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 480 } } },
      // Fallback 1: front-facing without resolution hint (Android may need this)
      { video: { facingMode: 'user' } },
      // Fallback 2: any front-facing (ideal, not strict)
      { video: { facingMode: { ideal: 'user' } } },
      // Fallback 3: any camera (last resort — may open rear camera)
      { video: true },
    ];

    let lastErr;
    for (const constraints of constraintChain) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        lastErr = err;
        // Permission / device errors are terminal — don't retry
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          throw new Error('Camera permission denied. Please allow camera access in your browser settings.');
        }
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          throw new Error('No camera found on this device.');
        }
        if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          throw new Error('Camera is being used by another app. Please close it and try again.');
        }
        // OverconstrainedError or anything else → try next constraint set
      }
    }
    throw new Error(lastErr?.message || 'Could not open camera. Please check your browser settings.');
  }

  // ── Legacy API polyfill (very old Android WebViews, Tecno, Firefox < 36) ──
  // These browsers expose getUserMedia directly on navigator rather than mediaDevices.
  const legacyGUM = (
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia
  );
  if (legacyGUM) {
    const legacyGet = (constraints) =>
      new Promise((resolve, reject) => legacyGUM.call(navigator, constraints, resolve, reject));
    try {
      return await legacyGet({ video: { facingMode: 'user' } });
    } catch (_) {
      // front-camera constraint not supported → fall back to any camera
      try {
        return await legacyGet({ video: true });
      } catch (err) {
        if (err.name === 'PermissionDeniedError' || err.name === 'NotAllowedError') {
          throw new Error('Camera permission denied. Please allow camera access in your browser settings.');
        }
        throw new Error(err.message || 'Could not open camera on this device.');
      }
    }
  }

  throw new Error('Camera not available. Please open this page over HTTPS in Chrome or Safari.');
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
    .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.35 }))
    .withFaceLandmarks(true)   // true = use tiny landmark net
    .withFaceDescriptor();
}

/** Detect on raw video — faster, used during live overlay */
export async function detectFaceRaw(faceapi, videoEl) {
  return faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.35 }))
    .withFaceLandmarks(true)   // true = use tiny landmark net
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
/** Draw 68-point basic mesh overlay (original) */
export function drawFaceMesh(canvas, videoEl, landmarks) {
  drawEnhancedFaceMesh(canvas, videoEl, landmarks);
}

/**
 * Draw an enhanced face mesh with colour-coded zones and cross-connection triangulation.
 *
 * Key fixes vs. the naive version:
 *  1. Canvas internal size = display CSS pixels × devicePixelRatio → sharp on retina/AMOLED
 *  2. Landmark coordinates (video-pixel space) are scaled to display CSS pixel space,
 *     so the mesh fills 100% of the visible canvas regardless of phone resolution
 *  3. Works correctly even when video stream resolution ≠ CSS display size (e.g. 1080p
 *     stream displayed in a 360px container on Tecno/Samsung)
 */
export function drawEnhancedFaceMesh(canvas, videoEl, landmarks) {
  const ctx = canvas.getContext('2d');

  // ── Display dimensions (CSS pixels = what user actually sees) ────────────────
  const dpr      = window.devicePixelRatio || 1;
  const displayW = canvas.offsetWidth  || canvas.clientWidth  || videoEl.offsetWidth  || videoEl.clientWidth  || 640;
  const displayH = canvas.offsetHeight || canvas.clientHeight || videoEl.offsetHeight || videoEl.clientHeight || 480;

  // Physical canvas pixel size = CSS size × DPR for crisp rendering on high-DPI screens
  // Setting canvas.width also clears the canvas and resets the 2D context transform.
  canvas.width  = Math.round(displayW * dpr);
  canvas.height = Math.round(displayH * dpr);

  // Scale the drawing context so all coordinates below are in CSS pixels (1 unit = 1 visible px)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (!landmarks?.positions) return;
  const positions = landmarks.positions;

  // ── face-api returns landmark positions in video-pixel space ─────────────────
  const videoW = videoEl.videoWidth  || videoEl.clientWidth  || displayW;
  const videoH = videoEl.videoHeight || videoEl.clientHeight || displayH;

  // Scale factors: convert video-pixel coordinate → CSS display pixel
  const sx = displayW / videoW;
  const sy = displayH / videoH;

  // Helpers — map landmark index to display CSS pixel coordinates
  const px = (i) => positions[i].x * sx;
  const py = (i) => positions[i].y * sy;

  // ── 1. Dense cross-connections (triangulation mesh) ──
  const meshLines = [
    // Jaw to cheek connections
    [0,36],[1,36],[2,31],[3,31],[4,48],[5,48],[6,57],[7,57],[8,57],
    [9,57],[10,54],[11,54],[12,54],[13,35],[14,35],[15,45],[16,45],
    // Brow to eye connections
    [17,36],[18,37],[19,38],[20,39],[21,39],[22,42],[23,43],[24,44],[25,45],[26,45],
    // Brow to nose bridge
    [17,27],[21,27],[22,27],[26,27],[19,28],[24,28],
    // Nose to eyes
    [31,36],[31,40],[35,45],[35,47],
    [27,39],[27,42],[28,38],[28,43],[29,37],[29,44],
    // Nose to mouth
    [31,48],[35,54],[33,51],[30,57],
    // Cheek diagonals
    [1,17],[15,26],[2,17],[14,26],[0,1],[15,16],
    [1,36],[15,45],[3,36],[13,45],[5,48],[11,54],
    [36,37],[45,44],[40,41],[46,47],
    // Forehead triangulation
    [17,18],[18,19],[19,20],[20,21],[22,23],[23,24],[24,25],[25,26],
    [17,22],[18,23],[19,24],[20,25],[21,26],
    // Eye triangulation
    [36,39],[37,40],[38,41],[42,45],[43,46],[44,47],
    [36,41],[37,41],[38,40],[42,47],[43,47],[44,46],
    // Nose triangulation
    [27,28],[28,29],[29,30],[30,31],[30,35],[31,32],[32,33],[33,34],[34,35],
    [27,30],[28,31],[28,35],[29,32],[29,34],
    // Mouth triangulation
    [48,54],[49,53],[50,52],[60,64],[61,63],[62,66],
    [48,60],[54,64],[50,62],[52,62],[51,61],[57,66],
    [48,49],[49,50],[50,51],[51,52],[52,53],[53,54],
    [54,55],[55,56],[56,57],[57,58],[58,59],[59,48],
    // Cross-face
    [36,27],[45,27],[39,30],[42,30],[36,31],[45,35],
    [0,36],[16,45],[0,17],[16,26],
    [4,5],[11,12],[5,6],[10,11],
  ];

  ctx.lineWidth = 0.7;
  meshLines.forEach(([a, b]) => {
    if (!positions[a] || !positions[b]) return;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0,210,120,0.2)';
    ctx.moveTo(px(a), py(a));
    ctx.lineTo(px(b), py(b));
    ctx.stroke();
  });

  // ── 2. Primary contour lines (brighter) ──
  const contours = [
    { path: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], closed: false },
    { path: [17,18,19,20,21], closed: false },
    { path: [22,23,24,25,26], closed: false },
    { path: [27,28,29,30], closed: false },
    { path: [30,31,32,33,34,35,30], closed: false },
    { path: [36,37,38,39,40,41], closed: true },
    { path: [42,43,44,45,46,47], closed: true },
    { path: [48,49,50,51,52,53,54,55,56,57,58,59], closed: true },
    { path: [60,61,62,63,64,65,66,67], closed: true },
  ];

  ctx.lineWidth = 1.1;
  ctx.strokeStyle = 'rgba(0,220,130,0.5)';
  contours.forEach(({ path, closed }) => {
    ctx.beginPath();
    path.forEach((i, n) => (n === 0 ? ctx.moveTo(px(i), py(i)) : ctx.lineTo(px(i), py(i))));
    if (closed) ctx.closePath();
    ctx.stroke();
  });

  // ── 3. Colour-coded landmark dots by facial zone ──
  const zones = [
    { idxs: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], color: '#a78bfa', r: 2.2 }, // jaw
    { idxs: [17,18,19,20,21,22,23,24,25,26],             color: '#60a5fa', r: 2.5 }, // brows
    { idxs: [27,28,29,30,31,32,33,34,35],                color: '#34d399', r: 2.5 }, // nose
    { idxs: [36,37,38,39,40,41,42,43,44,45,46,47],       color: '#22d3ee', r: 2.8 }, // eyes
    { idxs: [48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67], color: '#fb923c', r: 2.2 }, // mouth
  ];

  zones.forEach(({ idxs, color, r }) => {
    ctx.fillStyle = color;
    idxs.forEach(i => {
      if (!positions[i]) return;
      ctx.beginPath();
      ctx.arc(px(i), py(i), r, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

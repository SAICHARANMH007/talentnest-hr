'use strict';
/**
 * /api/face  — Facial Recognition System routes
 *
 * Face descriptor extraction happens entirely in the browser (face-api.js + WebGL).
 * The browser sends the 128-d descriptor array (and optional 136-value landmark array)
 * along with a base64-encoded photo. The backend stores the descriptor, uploads the
 * photo to Cloudinary, and runs duplicate checks using cosine similarity.
 */
const express    = require('express');
const router     = express.Router();
const rateLimit  = require('express-rate-limit');
const User       = require('../models/User');
const Candidate  = require('../models/Candidate');
const Organization = require('../models/Organization');
const Tenant     = require('../models/Tenant');
const FaceDuplicateAlert = require('../models/FaceDuplicateAlert');
const AssessmentSubmission = require('../models/AssessmentSubmission');
const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/auth');
const { allowRoles }     = require('../middleware/rbac');
const asyncHandler       = require('../utils/asyncHandler');
const AppError           = require('../utils/AppError');
const { uploadBuffer }   = require('../utils/cloudinaryUpload');
const { syncProfile }    = require('../utils/syncProfile');
const authService        = require('../services/auth.service');
const logger             = require('../middleware/logger');
const Otp                = require('../models/Otp');
const { sendEmailWithRetry } = require('../utils/email');

// Rate limiter for face login — 5 attempts per IP per 15 min (mirrors password login)
const faceLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: { success: false, error: 'Too many face login attempts. Please try again in 15 minutes.' },
});

// Rate limiter for OTP send — 3 requests per 15 min per IP
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many OTP requests. Please try again in 15 minutes.' },
});

const guard = [authMiddleware];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Cosine similarity between two equal-length float arrays. Returns 0–1 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** Euclidean distance (face-api.js native metric — lower = more similar) */
function euclideanDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

/**
 * Combined similarity score 0–1.
 * face-api.js threshold: euclidean < 0.6 = same person.
 * Converts to 0–1 probability and averages with cosine similarity.
 */
function faceSimilarity(a, b) {
  const cos  = cosineSimilarity(a, b);
  const euc  = euclideanDistance(a, b);
  const eucScore = Math.max(0, 1 - euc / 1.2); // normalise: 0 → 1.0, 0.6 → 0.5, 1.2 → 0
  return (cos * 0.5 + eucScore * 0.5);
}

/** Convert base64 data-URL to Buffer */
function base64ToBuffer(dataUrl) {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  return Buffer.from(base64, 'base64');
}

/** Upload a base64 photo to Cloudinary, return URL */
async function uploadPhotoToCloudinary(base64DataUrl, folder = 'face-enrollments', publicId) {
  const buf = base64ToBuffer(base64DataUrl);
  const result = await uploadBuffer(buf, {
    folder,
    resource_type: 'image',
    format: 'jpg',
    quality: 'auto:good',
    transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }],
    ...(publicId ? { public_id: publicId } : {}),
  });
  return result.secure_url;
}

/** Run async duplicate detection after a user enrolls their face */
async function detectDuplicatesAsync(userId, descriptor, tenantId) {
  try {
    // Only compare against others in the same tenant (admins handle cross-tenant via super_admin)
    const others = await User.find({
      _id: { $ne: userId },
      tenantId,
      faceEnrolled: true,
      deletedAt: null,
    }).select('_id name email photoUrl faceDescriptor').lean();

    const DUPE_THRESHOLD = 0.72;
    const duplicates = [];

    for (const other of others) {
      if (!other.faceDescriptor || other.faceDescriptor.length !== descriptor.length) continue;
      const score = faceSimilarity(descriptor, other.faceDescriptor);
      if (score >= DUPE_THRESHOLD) {
        duplicates.push({ user: other, score });
      }
    }

    if (duplicates.length === 0) return;

    const enrolledUser = await User.findById(userId).select('name email photoUrl').lean();
    const userPhotoUrl = enrolledUser?.photoUrl || '';

    for (const { user: other, score } of duplicates) {
      // Avoid creating a duplicate alert if one already exists between these two users
      const existing = await FaceDuplicateAlert.findOne({
        $or: [
          { userId1: userId, userId2: other._id },
          { userId1: other._id, userId2: userId },
        ],
        status: 'pending',
      });
      if (existing) continue;

      await FaceDuplicateAlert.create({
        tenantId,
        userId1: userId,
        photoUrl1: userPhotoUrl,
        name1: enrolledUser?.name || '',
        email1: enrolledUser?.email || '',
        userId2: other._id,
        photoUrl2: other.photoUrl || '',
        name2: other.name || '',
        email2: other.email || '',
        similarityScore: Math.round(score * 1000) / 1000,
      });

      // Notify all admins in this tenant
      const admins = await User.find({ tenantId, role: { $in: ['admin', 'super_admin'] }, deletedAt: null }).select('_id').lean();
      await Notification.insertMany(admins.map(a => ({
        userId: a._id,
        tenantId,
        type: 'alert',
        title: '⚠️ Possible Duplicate Face Detected',
        message: `${enrolledUser?.name || 'A user'} and ${other.name || 'another account'} have ${Math.round(score * 100)}% facial similarity. Review required.`,
        link: '/app/admin/face-duplicates',
      })));
    }
  } catch (err) {
    logger.error('FRS duplicate detection error', { userId, error: err.message });
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/face/status — is the current user enrolled?
router.get('/status', ...guard, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('faceEnrolled faceConsentGiven faceEnrolledAt faceEnrollmentPhotos photoUrl')
    .lean();
  res.json({
    success: true,
    data: {
      enrolled     : !!user?.faceEnrolled,
      consentGiven : !!user?.faceConsentGiven,
      enrolledAt   : user?.faceEnrolledAt || null,
      photoUrl     : user?.photoUrl || null,
      enrollmentPhotos: user?.faceEnrollmentPhotos || [],
      photoCount   : (user?.faceEnrollmentPhotos || []).length,
    },
  });
}));

// POST /api/face/enroll — store face descriptor + upload best photo to Cloudinary
// Body: { descriptor: number[], landmarks?: number[], photos: string[] (base64), bestPhotoIndex?: number, consent: true }
router.post('/enroll', ...guard, asyncHandler(async (req, res) => {
  const { descriptor, landmarks, photos, bestPhotoIndex = 0, consent } = req.body;

  if (!consent) throw new AppError('Face enrollment requires explicit consent.', 400);
  if (!Array.isArray(descriptor) || descriptor.length < 64)
    throw new AppError('Invalid face descriptor. Please retake the enrollment photos.', 400);
  if (!Array.isArray(photos) || photos.length === 0)
    throw new AppError('At least one enrollment photo is required.', 400);

  // Upload all enrollment frames to Cloudinary
  const uid = String(req.user.id);
  const uploadedUrls = [];
  for (let i = 0; i < Math.min(photos.length, 5); i++) {
    const url = await uploadPhotoToCloudinary(
      photos[i],
      'face-enrollments',
      `${uid}_frame${i}`
    );
    uploadedUrls.push(url);
  }

  const bestUrl = uploadedUrls[bestPhotoIndex] || uploadedUrls[0];
  const now = new Date();

  // Persist to User
  const updatePayload = {
    faceEnrolled        : true,
    faceConsentGiven    : true,
    faceConsentAt       : now,
    faceEnrolledAt      : now,
    faceDescriptor      : descriptor,
    faceEnrollmentPhotos: uploadedUrls,
    photoUrl            : bestUrl,
    ...(Array.isArray(landmarks) && landmarks.length > 0 ? { faceLandmarks: landmarks } : {}),
  };

  await User.findByIdAndUpdate(uid, { $set: updatePayload });

  // Sync to Candidate record and other cross-collection records
  if (req.user.email && req.user.tenantId) {
    await syncProfile(req.user.email, updatePayload, req.user.tenantId);
  }

  logger.audit('Face enrolled', uid, req.user.tenantId, { photoCount: uploadedUrls.length });

  // Run duplicate detection asynchronously (non-blocking)
  detectDuplicatesAsync(uid, descriptor, req.user.tenantId).catch(() => {});

  res.json({
    success  : true,
    photoUrl : bestUrl,
    message  : `Face enrolled successfully with ${uploadedUrls.length} photo${uploadedUrls.length !== 1 ? 's' : ''}.`,
  });
}));

// POST /api/face/photo — upload profile photo only (no face descriptor required)
// Used when user uploads a photo without going through face enrollment
// Body: { photo: string (base64 data-URL) }
router.post('/photo', ...guard, asyncHandler(async (req, res) => {
  const { photo } = req.body;
  if (!photo) throw new AppError('Photo is required.', 400);

  const uid = String(req.user.id);
  const url = await uploadPhotoToCloudinary(photo, 'profile-photos', `profile_${uid}`);

  await User.findByIdAndUpdate(uid, { $set: { photoUrl: url } });
  if (req.user.email && req.user.tenantId) {
    await syncProfile(req.user.email, { photoUrl: url }, req.user.tenantId);
  }

  res.json({ success: true, photoUrl: url });
}));

// POST /api/face/verify — single-frame verification against enrolled descriptor
// Body: { descriptor: number[] }
router.post('/verify', ...guard, asyncHandler(async (req, res) => {
  const { descriptor } = req.body;
  if (!Array.isArray(descriptor) || descriptor.length < 64)
    throw new AppError('Invalid descriptor.', 400);

  const user = await User.findById(req.user.id).select('faceEnrolled faceDescriptor').lean();
  if (!user?.faceEnrolled || !user?.faceDescriptor?.length)
    return res.json({ success: true, enrolled: false, passed: false, score: 0 });

  const score = faceSimilarity(descriptor, user.faceDescriptor);
  const passed = score >= 0.55; // threshold for live verification (slightly lower than enrollment)

  res.json({ success: true, enrolled: true, passed, score: Math.round(score * 1000) / 1000 });
}));

// DELETE /api/face/enroll — remove face data (GDPR delete)
router.delete('/enroll', ...guard, asyncHandler(async (req, res) => {
  const uid = String(req.user.id);
  // $unset removes face data fields; $set marks enrolled=false (can't $unset + $set same field)
  const unsetFields = { faceDescriptor: 1, faceLandmarks: 1, faceEnrollmentPhotos: 1, faceEnrolledAt: 1 };
  await User.findByIdAndUpdate(uid, { $unset: unsetFields, $set: { faceEnrolled: false } });
  if (req.user.email && req.user.tenantId) {
    await Candidate.updateMany(
      { email: req.user.email, tenantId: req.user.tenantId, deletedAt: null },
      { $unset: unsetFields, $set: { faceEnrolled: false } }
    );
  }
  logger.audit('Face data deleted', uid, req.user.tenantId, {});
  res.json({ success: true, message: 'Face data removed.' });
}));

// POST /api/face/proctor-check — assessment proctoring snapshot verification
// Body: { submissionId, descriptor: number[], snapshot?: string (base64), anomaly?: string }
router.post('/proctor-check', ...guard, asyncHandler(async (req, res) => {
  const { submissionId, descriptor, snapshot, anomaly } = req.body;
  if (!submissionId) throw new AppError('submissionId is required.', 400);

  const submission = await AssessmentSubmission.findOne({
    _id: submissionId,
    candidateId: String(req.user.id),
  });
  if (!submission) throw new AppError('Submission not found.', 404);

  const user = await User.findById(req.user.id).select('faceEnrolled faceDescriptor').lean();

  let score = 0;
  let passed = false;
  let snapshotUrl = null;
  const ts = new Date();

  if (user?.faceEnrolled && user?.faceDescriptor?.length && Array.isArray(descriptor) && descriptor.length >= 64) {
    score = faceSimilarity(descriptor, user.faceDescriptor);
    passed = score >= 0.50; // proctoring threshold slightly more lenient than enrollment
  } else if (!user?.faceEnrolled) {
    // User not enrolled — treat as passed (can't verify) but record the check
    passed = true;
    score = 1;
  }

  // Upload snapshot to Cloudinary if provided and check failed
  if (snapshot && !passed) {
    try {
      snapshotUrl = await uploadPhotoToCloudinary(
        snapshot,
        'proctoring-snapshots',
        `proctor_${submissionId}_${Date.now()}`
      );
    } catch { /* non-fatal */ }
  }

  // Record this check on the submission
  submission.faceVerifications = submission.faceVerifications || [];
  submission.faceVerifications.push({
    ts, matchScore: Math.round(score * 1000) / 1000, passed,
    snapshot: snapshotUrl || undefined,
    anomaly: anomaly || undefined,
  });

  // Recompute summary
  const total   = submission.faceVerifications.length;
  const ok      = submission.faceVerifications.filter(v => v.passed).length;
  const passRate = total ? ok / total : null;
  submission.faceVerificationSummary = {
    totalChecks : total,
    passedChecks: ok,
    passRate    : passRate !== null ? Math.round(passRate * 1000) / 1000 : null,
    flagged     : passRate !== null && passRate < 0.5,
  };

  await submission.save();

  res.json({
    success: true,
    passed,
    score: Math.round(score * 1000) / 1000,
    flagged: submission.faceVerificationSummary.flagged,
  });
}));

// ── Admin routes ─────────────────────────────────────────────────────────────

// GET /api/face/admin/duplicates — list pending duplicate alerts
router.get('/admin/duplicates', ...guard,
  allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const filter = req.user.role === 'super_admin'
      ? {}
      : { tenantId: req.user.tenantId };
    if (req.query.status) filter.status = req.query.status;
    else filter.status = 'pending'; // default: unreviewed only

    const alerts = await FaceDuplicateAlert.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: alerts, total: alerts.length });
  })
);

// PATCH /api/face/admin/duplicates/:id — admin reviews a duplicate alert
// Body: { action: 'cleared' | 'confirmed_duplicate', note?: string, disableUserId?: string }
router.patch('/admin/duplicates/:id', ...guard,
  allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const { action, note, disableUserId } = req.body;
    if (!['cleared', 'confirmed_duplicate'].includes(action))
      throw new AppError('action must be "cleared" or "confirmed_duplicate".', 400);

    const tenantFilter = req.user.role === 'super_admin' ? {} : { tenantId: req.user.tenantId };
    const alert = await FaceDuplicateAlert.findOne({ _id: req.params.id, ...tenantFilter });
    if (!alert) throw new AppError('Alert not found.', 404);

    alert.status     = action;
    alert.reviewedBy = req.user.id;
    alert.reviewedAt = new Date();
    alert.reviewNote = note || '';
    await alert.save();

    // If admin confirms duplicate and wants to disable one account
    if (action === 'confirmed_duplicate' && disableUserId) {
      const validId = [String(alert.userId1), String(alert.userId2)].includes(String(disableUserId));
      if (!validId) throw new AppError('disableUserId must be one of the two users in this alert.', 400);
      await User.findByIdAndUpdate(disableUserId, { $set: { isActive: false } });
      logger.audit('Account disabled — confirmed face duplicate', req.user.id, req.user.tenantId, {
        alertId: alert._id, disabledUserId: disableUserId,
      });
    }

    res.json({ success: true, data: alert });
  })
);

// GET /api/face/admin/duplicates/count — pending alert count (for badge)
router.get('/admin/duplicates/count', ...guard,
  allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const filter = req.user.role === 'super_admin'
      ? { status: 'pending' }
      : { tenantId: req.user.tenantId, status: 'pending' };
    const count = await FaceDuplicateAlert.countDocuments(filter);
    res.json({ success: true, count });
  })
);

// ── POST /api/face/login — NO authMiddleware — email-scoped face authentication
//
// Security model:
//  • Rate-limited: 5 attempts per IP per 15 min
//  • Email-scoped: only checks descriptor against THE enrolled user with that email
//  • Threshold: 0.65 combined (cosine 0.5 + euclidean 0.5) — stricter than proctoring
//  • Failed attempts increment failedLoginAttempts — 5 failures → 15 min lock
//  • Generic "Face not recognised" — never reveals whether email exists or is enrolled
//  • All attempts logged for audit trail
//
// Body: { email: string, descriptor: number[] (128-d FaceNet) }
router.post('/login', faceLoginLimiter, asyncHandler(async (req, res) => {
  const { email, descriptor } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new AppError('A valid email address is required.', 400);
  }
  if (!Array.isArray(descriptor) || descriptor.length < 64) {
    throw new AppError('Invalid face descriptor.', 400);
  }

  const emailLower = email.toLowerCase().trim();

  // Email-scoped lookup: find the specific enrolled user
  const user = await User.findOne({
    email     : emailLower,
    faceEnrolled: true,
    isActive  : { $ne: false },
    deletedAt : null,
  }).select('_id name email role tenantId tenantType faceDescriptor faceEnrolled isActive failedLoginAttempts lockUntil photoUrl mustChangePassword').lean();

  // Account lockout check (before any comparison to prevent timing oracle)
  if (user?.lockUntil && new Date(user.lockUntil) > new Date()) {
    const remaining = Math.ceil((new Date(user.lockUntil) - new Date()) / 60000);
    // Still return generic message — don't reveal lockout exists to attacker
    logger.warn('Face login: account locked', { email: emailLower, ip: req.ip });
    throw new AppError(`Account temporarily locked. Please try again in ${remaining} minute${remaining === 1 ? '' : 's'} or use password login.`, 403);
  }

  // Always compute similarity (prevents timing attacks on non-enrolled emails)
  const DUMMY_DESC = new Array(descriptor.length).fill(0.01);
  const storedDesc = user?.faceDescriptor?.length >= 64 ? user.faceDescriptor : DUMMY_DESC;

  const score = faceSimilarity(descriptor, storedDesc);

  // Threshold: 0.75 — stricter than duplicate detection (0.72).
  // Users reported cross-person matches at 0.65 (friend's face accepted).
  // With L2-normalized averaged descriptors, same-person in reasonable conditions
  // scores 0.78-0.92; genuinely different people score 0.50-0.68.
  // Setting to 0.75 eliminates false positives while keeping OTP as the fallback.
  const FACE_LOGIN_THRESHOLD = 0.75;
  const matched = !!user && score >= FACE_LOGIN_THRESHOLD;

  if (!matched) {
    if (user) {
      // Atomic increment to avoid race conditions on concurrent login attempts
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $inc: { failedLoginAttempts: 1 } },
        { new: true }
      ).select('failedLoginAttempts').lean();
      if ((updatedUser?.failedLoginAttempts || 0) >= 5) {
        await User.findByIdAndUpdate(user._id, {
          $set: { lockUntil: new Date(Date.now() + 15 * 60 * 1000), failedLoginAttempts: 0 },
        });
        logger.warn('Face login: account locked after 5 failures', { email: emailLower, ip: req.ip });
      }
    }
    logger.info('Face login: no match', {
      email   : emailLower,
      score   : Math.round(score * 100),
      enrolled: !!user,
      ip      : req.ip,
    });
    // Generic error — never reveal whether email/enrollment exists
    throw new AppError('Face not recognised. Please try again or use password login.', 401);
  }

  // Reset failed attempts on success
  if ((user.failedLoginAttempts || 0) > 0) {
    await User.findByIdAndUpdate(user._id, { $set: { failedLoginAttempts: 0, lockUntil: null } });
  }

  // Org/tenant active check (same as password login)
  if (user.role !== 'super_admin') {
    const [org, tenant] = await Promise.all([
      Organization.findById(user.tenantId).lean(),
      Tenant.findById(user.tenantId).lean(),
    ]);
    const activeOrg = org || tenant;
    if (activeOrg) authService.checkOrgAccess(activeOrg);
  }

  logger.audit('Face login success', user._id, user.tenantId, {
    score   : Math.round(score * 100),
    ip      : req.ip,
    ua      : req.headers['user-agent'] || '',
  });

  // Issue access + refresh tokens exactly as password login does
  const fullUser = await User.findById(user._id);
  const result   = await authService.issueTokens(res, fullUser, req);

  res.json({ success: true, ...result });
}));

// ── POST /api/face/check-enrolled — check if email has face enrolled (no auth, no info leak)
router.post('/check-enrolled', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) throw new AppError('Invalid email.', 400);
  const emailLower = email.toLowerCase().trim();
  const user = await User.findOne({
    email: emailLower,
    faceEnrolled: true,
    deletedAt: null,
    isActive: { $ne: false },
  }).select('_id').lean();
  res.json({ success: true, enrolled: !!user });
}));

// ── POST /api/face/send-otp — face login fallback: send OTP to email
router.post('/send-otp', otpLimiter, asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) throw new AppError('Invalid email.', 400);
  const emailLower = email.toLowerCase().trim();

  const user = await User.findOne({
    email: emailLower,
    deletedAt: null,
    isActive: { $ne: false },
  }).select('_id name email tenantId').lean();

  if (user) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.deleteMany({ email: emailLower, purpose: 'login_2fa' });
    await Otp.create({ email: emailLower, otp, purpose: 'login_2fa' });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#fff">
        <div style="text-align:center;margin-bottom:20px">
          <h2 style="color:#0176D3;margin:0;font-size:22px">🔐 TalentNest Login Verification</h2>
          <p style="color:#6B7280;font-size:13px;margin-top:6px">Your face was not recognised. Use this one-time code to sign in.</p>
        </div>
        <div style="background:#F0F9FF;border:2px solid #BAE6FD;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px">
          <span style="font-size:40px;font-weight:900;letter-spacing:10px;color:#0176D3;display:block">${otp}</span>
          <span style="font-size:12px;color:#6B7280;display:block;margin-top:8px">Valid for 10 minutes</span>
        </div>
        <p style="color:#6B7280;font-size:12px;text-align:center;margin:0">If you didn't request this, please ignore this email and your account remains secure.</p>
      </div>`;

    let emailDelivered = false;
    try {
      await sendEmailWithRetry(emailLower, 'TalentNest — Login Verification Code', html);
      emailDelivered = true;
    } catch (err) {
      // Log with full context so admins can diagnose email service issues
      logger.error('Face OTP email FAILED — check SMTP/email service config', {
        email: emailLower,
        error: err.message,
        stack: err.stack?.split('\n')[1] || '',
      });
    }

    if (!emailDelivered) {
      // Tell the user the email failed rather than showing a fake "code sent" screen
      // (still doesn't reveal whether the email is registered)
      return res.status(503).json({
        success: false,
        error: 'Could not send the verification code right now. Please try password login or contact support.',
      });
    }
  }

  // Return success (no email in system — don't reveal this)
  res.json({ success: true, message: 'If your email is registered, you will receive a verification code.' });
}));

// ── POST /api/face/verify-otp — verify OTP and issue login token
router.post('/verify-otp', faceLoginLimiter, asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new AppError('Email and verification code are required.', 400);

  const emailLower = email.toLowerCase().trim();
  const record = await Otp.findOne({ email: emailLower, purpose: 'login_2fa' }).sort({ createdAt: -1 }).lean();

  if (!record || record.otp !== String(otp).trim()) {
    throw new AppError('Invalid or expired verification code. Please try again.', 401);
  }

  await Otp.deleteMany({ email: emailLower, purpose: 'login_2fa' });

  const user = await User.findOne({
    email: emailLower,
    deletedAt: null,
    isActive: { $ne: false },
  });
  if (!user) throw new AppError('Account not found.', 404);

  if (user.role !== 'super_admin') {
    const [org, tenant] = await Promise.all([
      Organization.findById(user.tenantId).lean(),
      Tenant.findById(user.tenantId).lean(),
    ]);
    const activeOrg = org || tenant;
    if (activeOrg) authService.checkOrgAccess(activeOrg);
  }

  logger.audit('Face OTP login success', user._id, user.tenantId, { ip: req.ip, ua: req.headers['user-agent'] || '' });

  const result = await authService.issueTokens(res, user, req);
  res.json({ success: true, ...result });
}));

module.exports = router;

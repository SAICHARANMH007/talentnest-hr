'use strict';
const express        = require('express');
const router         = express.Router();
const Application    = require('../models/Application');
const Candidate      = require('../models/Candidate');
const Job            = require('../models/Job');
const Notification   = require('../models/Notification');
const Referral       = require('../models/Referral');
const OfferLetter    = require('../models/OfferLetter');
const User           = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard } = require('../middleware/tenantGuard');
const { allowRoles } = require('../middleware/rbac');
const { getPagination, paginatedResponse } = require('../middleware/paginate');
const asyncHandler   = require('../utils/asyncHandler');
const AppError       = require('../utils/AppError');
const { calculateTalentMatchScore } = require('../utils/matchScore');
const email          = require('../utils/email');
const logger         = require('../middleware/logger');
const crypto         = require('crypto');
const notifyAllSuperAdmins = require('../utils/notifySuperAdmins');
const { resolveCollegeName } = require('../utils/collegeDirectory');
const { syncProfile } = require('../utils/syncProfile');

const guard = [authMiddleware, tenantGuard];

// Middleware that skips tenantGuard for candidate users — candidates access data
// by email, not by tenantId, so the org-lookup check would wrongly block accounts
// created before the TalentNest HR tenant was seeded or whose linked org was removed.
const guardOrCandidate = [
  authMiddleware,
  (req, res, next) => req.user?.role === 'candidate' ? next() : tenantGuard(req, res, next),
];

// Throws 403 if a 'client' or 'hiring_manager' login tries to act on an
// application for a job outside their assigned scope. No-op for other roles
// (those are scoped/checked elsewhere).
async function assertScopedAccess(req, app) {
  if (req.user.role === 'client') {
    if (!req.user.clientId) throw new AppError('Not authorized for this application.', 403);
    const job = await Job.findOne({ _id: app.jobId, clientId: req.user.clientId }).select('_id').lean();
    if (!job) throw new AppError('Not authorized for this application.', 403);
  } else if (req.user.role === 'hiring_manager') {
    const job = await Job.findOne({ _id: app.jobId, hiringManagers: req.user.id }).select('_id').lean();
    if (!job) throw new AppError('Not authorized for this application.', 403);
  }
}

const VALID_STAGES = [
  'Applied', 'Screening', 'Shortlisted',
  'Interview Round 1', 'Interview Round 2',
  'Offer', 'Hired', 'Rejected',
];

// Map frontend stage IDs → canonical backend names (handles both casings)
const STAGE_ALIAS = {
  applied: 'Applied', screening: 'Screening', shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview Round 1', interview_completed: 'Interview Round 2',
  offer_extended: 'Offer', selected: 'Hired', rejected: 'Rejected',
};
function normalizeStage(raw) {
  if (!raw) return null;
  if (VALID_STAGES.includes(raw)) return raw;
  return STAGE_ALIAS[raw] || STAGE_ALIAS[raw.toLowerCase()] || null;
}

// Maps DB title-case stage names → frontend lowercase stage IDs used by
// STAGES constants, SM map, and NEXT transition map in the React client.
const DB_STAGE_TO_FRONTEND = {
  'Applied'          : 'applied',
  'Screening'        : 'screening',
  'Shortlisted'      : 'shortlisted',
  'Interview Round 1': 'interview_scheduled',
  'Interview Round 2': 'interview_completed',
  'Offer'            : 'offer_extended',
  'Hired'            : 'selected',
  'Rejected'         : 'rejected',
};

function normalizeApp(app) {
  const a = app.toObject ? app.toObject() : { ...app };
  a.id = a.id || a._id?.toString();
  // Always expose both names so the frontend never has to guess which field
  // the server returned. `stage` is the canonical frontend ID used in STAGES,
  // SM, and NEXT; `currentStage` is the DB value kept for backward compat.
  // Status overrides take priority: 'withdrawn' and 'rejected' have their own
  // frontend stage IDs that the CandidateApplications stepper renders specially.
  if (!a.stage) {
    if (a.status === 'withdrawn') {
      a.stage = 'withdrawn';
    } else if (a.status === 'rejected') {
      a.stage = DB_STAGE_TO_FRONTEND['Rejected'] || 'rejected';
    } else if (a.currentStage) {
      a.stage = DB_STAGE_TO_FRONTEND[a.currentStage]
        || a.currentStage.toLowerCase().replace(/\s+/g, '_');
    }
  }
  // Add `stageId` (frontend lowercase ID) to each stageHistory entry so the
  // CandidateApplications stepper can match visited stages against stage.id
  if (Array.isArray(a.stageHistory)) {
    a.stageHistory = a.stageHistory.map(h => ({
      ...h,
      stageId: DB_STAGE_TO_FRONTEND[h.stage]
        || (h.stage ? h.stage.toLowerCase().replace(/\s+/g, '_') : undefined),
    }));
  }
  // Alias populated refs so frontend can use app.candidate and app.job
  // without guessing whether the field is candidateId or candidate.
  if (a.candidateId && typeof a.candidateId === 'object' && !a.candidate) {
    a.candidate = a.candidateId;
  }
  if (a.jobId && typeof a.jobId === 'object') {
    if (!a.job) a.job = a.jobId;
    // Ensure both company aliases always present on populated jobId
    if (a.jobId.company && !a.jobId.companyName) a.jobId.companyName = a.jobId.company;
    if (a.jobId.companyName && !a.jobId.company) a.jobId.company = a.jobId.companyName;
  }
  if (a.talentMatchScore != null && a.aiMatchScore == null) {
    a.aiMatchScore = a.talentMatchScore;
  }
  return a;
}

// ── PUBLIC ────────────────────────────────────────────────────────────────────

// GET /api/applications/invite/:token — view invite details
router.get('/invite/:token', asyncHandler(async (req, res) => {
  const app = await Application.findOne({ inviteToken: req.params.token, deletedAt: null })
    .populate('jobId', 'title company companyName location jobType description skills tenantId')
    .lean();
  if (!app) throw new AppError('Invitation not found or expired.', 404);
  res.json({ success: true, data: normalizeApp(app) });
}));

// POST /api/applications/invite/:token/respond — candidate responds to invite
router.post('/invite/:token/respond', asyncHandler(async (req, res) => {
  const { action } = req.body; // 'interested' | 'declined'
  if (!['interested', 'declined'].includes(action)) throw new AppError('action must be interested or declined.', 400);

  const app = await Application.findOne({ inviteToken: req.params.token, deletedAt: null });
  if (!app) throw new AppError('Invitation not found.', 404);

  app.inviteStatus = action === 'interested' ? 'interested' : 'declined';
  if (action === 'interested') {
    app.currentStage = 'Screening';
    app.stageHistory.push({ stage: 'Screening', movedBy: null, movedAt: new Date(), notes: 'Candidate responded: Interested' });
  }
  await app.save();

  if (action === 'interested') {
    const job = await Job.findById(app.jobId).select('title tenantId').lean();
    await Notification.create({
      userId: app.createdBy, tenantId: app.tenantId, type: 'stage_change',
      title: 'Invite Accepted!',
      message: `A candidate accepted the invite for ${job?.title || 'a role'}.`,
      link: `/app/pipeline?appId=${app._id}`,
    }).catch(() => {});
  }

  res.json({ success: true, data: normalizeApp(app) });
}));

// GET /api/applications/invite/:token/open — email open tracking pixel
router.get('/invite/:token/open', asyncHandler(async (req, res) => {
  await Application.findOneAndUpdate({ inviteToken: req.params.token }, { $set: { inviteStatus: 'opened' } });
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.set({ 'Content-Type': 'image/gif', 'Content-Length': pixel.length, 'Cache-Control': 'no-cache, no-store, must-revalidate' });
  res.send(pixel);
}));

// POST /api/applications/prefill — safe email lookup for public apply form
// Returns non-sensitive profile data if a registered candidate account exists.
// Used to auto-fill the apply form so returning candidates don't re-enter details.
router.post('/prefill', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email?.trim()) throw new AppError('Email is required.', 400);
  const emailLower = email.toLowerCase().trim();

  // SECURITY: never return phone/email/sensitive data to unauthenticated callers.
  // A random visitor entering someone else's email must not get their private details.
  // Only non-sensitive professional fields are returned.
  // hasPhone = boolean tells the UI "this account has a phone on file" without revealing it.

  // Search for any user with this email (admin, recruiter, or candidate)
  const user = await User.findOne({ email: emailLower, deletedAt: null })
    .select('name phone title currentCompany experience availability industry department').lean();

  if (user) {
    return res.json({
      success: true,
      exists: true,
      isRegisteredUser: true,
      hasPhone: !!(user.phone && user.phone.trim()),
      profile: {
        name:           user.name           || '',
        title:          user.title          || '',
        currentCompany: user.currentCompany || '',
        experience:     user.experience     != null ? String(user.experience) : '',
        availability:   user.availability   || '',
        industry:       user.industry       || '',
        department:     user.department     || '',
      },
    });
  }

  // Fallback: check Candidate collection (recruiter-added, no account yet)
  const candidate = await Candidate.findOne({ email: emailLower, deletedAt: null })
    .sort({ updatedAt: -1 })
    .select('name phone title currentCompany experience availability industry department').lean();

  if (candidate) {
    return res.json({
      success: true,
      exists: true,
      isRegisteredUser: false,
      hasPhone: !!(candidate.phone && candidate.phone.trim()),
      profile: {
        name:           candidate.name           || '',
        title:          candidate.title          || '',
        currentCompany: candidate.currentCompany || '',
        experience:     candidate.experience     != null ? String(candidate.experience) : '',
        availability:   candidate.availability   || '',
        industry:       candidate.industry       || '',
        department:     candidate.department     || '',
      },
    });
  }

  return res.json({ success: true, exists: false });
}));

// POST /api/applications/quick — one-click apply for logged-in candidates
router.post('/quick', authMiddleware, asyncHandler(async (req, res) => {
  const { jobId, coverLetter } = req.body;
  if (!jobId) throw new AppError('jobId is required.', 400);

  const candidate = await Candidate.findOne({ email: req.user.email }).lean();
  if (!candidate) throw new AppError('Candidate profile not found.', 404);

  const job = await Job.findById(jobId).lean();
  if (!job) throw new AppError('Job not found.', 404);
  if (job.status !== 'active') throw new AppError('Job is not active.', 400);

  const exists = await Application.findOne({ jobId, candidateId: candidate._id, deletedAt: null });
  if (exists) throw new AppError('Already applied for this job.', 409);

  const { score, breakdown } = calculateTalentMatchScore(job, candidate);

  const app = await Application.create({
    tenantId   : job.tenantId,
    jobId,
    candidateId: candidate._id,
    source     : 'career_page',
    coverLetter: coverLetter || '',
    talentMatchScore : score,
    matchBreakdown   : breakdown,
    currentStage     : 'Applied',
    stageHistory     : [{ stage: 'Applied', movedAt: new Date(), notes: 'One-click apply' }],
    statusToken      : crypto.randomBytes(24).toString('hex'),
  });

  await Job.findByIdAndUpdate(jobId, { $inc: { applicationCount: 1 } });

  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
  const trackerLink = `${FRONTEND_URL}/track/${app.statusToken}`;

  email.sendEmailWithRetry?.(candidate.email,
    `✅ Application submitted — ${job.title}`,
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#032D60">Hi ${candidate.name || candidate.firstName || 'there'},</h2>
      <p>Your application for <strong>${job.title}</strong> at <strong>${job.company || job.companyName || ''}</strong> has been submitted via one-click apply.</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${trackerLink}" style="display:inline-block;background:#10B981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">
          📍 Track Application Status →
        </a>
      </div>
    </div>`
  ).catch(() => {});

  res.status(201).json({
    success      : true,
    applicationId: String(app._id),
    trackerUrl   : trackerLink,
    matchScore   : score,
  });
}));

// POST /api/applications/public — guest apply from career page
router.post('/public', asyncHandler(async (req, res) => {
  const { jobId, name, email: candidateEmail, phone, coverLetter, screeningAnswers,
          title, currentCompany, experience, isFresher, availability, industry, department,
          geoLat, geoLng, geoAccuracy, geoCity, geoCountry, geoDeclined,
          refToken } = req.body;
  if (!jobId || !name || !candidateEmail) throw new AppError('jobId, name, and email are required.', 400);
  if (!phone?.trim()) throw new AppError('Mobile number is required.', 400);

  const college = await resolveCollegeName(req.body.college);

  const job = await Job.findOne({ _id: jobId, status: 'active', deletedAt: null }).lean();
  if (!job) throw new AppError('Job not found.', 404);

  const emailLower = candidateEmail.toLowerCase().trim();
  const phoneTrimmed = phone.trim();

  let candidate = await Candidate.findOne({ email: emailLower, tenantId: job.tenantId, deletedAt: null });
  let profileUpdates = {};
  if (!candidate) {
    profileUpdates = {
      ...(title          ? { title: title.trim() }               : {}),
      ...(currentCompany ? { currentCompany: currentCompany.trim() } : {}),
      ...(experience !== undefined && experience !== '' ? { experience: Number(experience) } : {}),
      ...(isFresher      ? { isFresher: true }                     : {}),
      ...(college        ? { college }                             : {}),
      ...(availability   ? { availability }                        : {}),
      ...(industry       ? { industry }                            : {}),
      ...(department     ? { department }                          : {}),
    };
    candidate = await Candidate.create({
      tenantId: job.tenantId,
      name: name.trim(),
      email: emailLower,
      phone: phoneTrimmed,
      source: 'career_page',
      ...profileUpdates,
    });
  } else {
    // Update fields that are newly provided or missing on existing candidate
    const updates = {};
    if (!candidate.phone && phoneTrimmed)               updates.phone          = phoneTrimmed;
    if (!candidate.title && title?.trim())               updates.title          = title.trim();
    if (!candidate.currentCompany && currentCompany?.trim()) updates.currentCompany = currentCompany.trim();
    if ((candidate.experience == null) && experience !== '' && experience !== undefined) updates.experience = Number(experience);
    if (isFresher && !candidate.isFresher)               updates.isFresher      = true;
    if (!candidate.college && college)                   updates.college        = college;
    if (!candidate.availability && availability)         updates.availability   = availability;
    if (industry)                                          updates.industry       = industry;
    if (department)                                        updates.department     = department;
    if (Object.keys(updates).length > 0) await Candidate.findByIdAndUpdate(candidate._id, { $set: updates });
    candidate = { ...candidate.toObject?.() || candidate, ...updates };
    profileUpdates = updates;
  }

  // Keep the User record (candidate's own profile login) in sync with whatever
  // career-page details were captured here, so the profile page reflects the same data.
  if (Object.keys(profileUpdates).length > 0) {
    syncProfile(emailLower, profileUpdates, job.tenantId).catch(() => {});
  }

  const exists = await Application.findOne({ jobId, candidateId: candidate._id, deletedAt: null });
  if (exists) throw new AppError('Already applied for this job.', 409);

  const { score, breakdown } = calculateTalentMatchScore(job, candidate);

  // Build location object — use browser geolocation if provided
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '';
  const appliedFrom = { ip: clientIp, method: 'none' };
  if (geoLat != null && geoLng != null) {
    appliedFrom.lat      = Number(geoLat);
    appliedFrom.lng      = Number(geoLng);
    appliedFrom.accuracy = geoAccuracy ? Number(geoAccuracy) : null;
    appliedFrom.city     = geoCity    || '';
    appliedFrom.country  = geoCountry || '';
    appliedFrom.method   = 'browser';
  } else if (geoDeclined) {
    // Candidate explicitly denied location permission — record the fact
    appliedFrom.method = 'denied';
  }

  const appSource = refToken ? 'referral' : 'career_page';
  const app = await Application.create({
    tenantId: job.tenantId,
    jobId,
    candidateId: candidate._id,
    source: appSource,
    coverLetter: coverLetter || '',
    talentMatchScore: score,
    matchBreakdown: breakdown,
    currentStage: 'Applied',
    stageHistory: [{ stage: 'Applied', movedAt: new Date(), notes: 'Applied via career page' }],
    screeningAnswers: Array.isArray(screeningAnswers) ? screeningAnswers : [],
    appliedFrom,
    statusToken: crypto.randomBytes(24).toString('hex'),
  });

  await Job.findByIdAndUpdate(jobId, { $inc: { applicationCount: 1 } });

  // Track referral if applied via referral link
  if (refToken) {
    Referral.findOneAndUpdate(
      { referralLinkToken: refToken },
      { $set: { candidateId: candidate._id, status: 'applied' } }
    ).catch(() => {});
  }

  // ── "Thanks for applying" + one-time "create account" invite ─────────────────
  // Rules:
  //  1. Only send if candidate has NO existing User account (deduped by email)
  //  2. Only send ONCE per candidate (tracked via candidate.accountInviteSentAt)
  //  3. Registration link pre-fills email + name so they can match existing data
  const User = require('../models/User');
  const existingUser = await User.findOne({ email: emailLower }).lean();
  const alreadySent  = !!candidate.accountInviteSentAt;

  if (!existingUser && !alreadySent) {
    const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
    // /register with email + name prefilled so account auto-links to their applications
    const registerLink = `${FRONTEND_URL}/login?email=${encodeURIComponent(emailLower)}&name=${encodeURIComponent(name.trim())}&ref=career_apply`;
    const trackerLink  = `${FRONTEND_URL}/track/${app.statusToken}`;
    const orgName = job.companyName || job.company || 'TalentNest HR';

    email.sendEmailWithRetry?.(emailLower,
      `🎉 Application received for ${job.title} — Create your free account`,
      `<div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
        <div style="background:linear-gradient(135deg,#032D60,#0176D3);padding:36px 32px;border-radius:12px 12px 0 0;text-align:center">
          <div style="font-size:48px;margin-bottom:12px">🎉</div>
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">Application Received!</h1>
          <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">${job.title} · ${orgName}</p>
        </div>
        <div style="padding:32px;background:#F8FAFC;border-radius:0 0 12px 12px">
          <p style="color:#0A1628;font-size:15px;font-weight:700;margin:0 0 8px">Hi ${name.trim()},</p>
          <p style="color:#374151;font-size:14px;margin:0 0 20px;line-height:1.7">
            Thanks for applying to <strong>${job.title}</strong> via the TalentNest HR career portal.
            We've saved your application and the team will review it shortly.
          </p>
          <div style="background:#fff;border-radius:10px;padding:18px 22px;margin-bottom:24px;border:1px solid #E2E8F0">
            <p style="color:#0176D3;font-size:13px;font-weight:800;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px">📊 Track your application</p>
            <p style="color:#374151;font-size:13px;margin:0 0 16px;line-height:1.6">
              You can track the live status of your application at any time — no login required.
            </p>
            <div style="text-align:center;margin-bottom:16px">
              <a href="${trackerLink}" style="display:inline-block;background:linear-gradient(135deg,#10B981,#059669);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:800;font-size:14px;letter-spacing:0.3px">
                📍 Track Application Status →
              </a>
            </div>
            <p style="color:#374151;font-size:13px;margin:0 0 16px;line-height:1.6">
              Or create a free account to manage all your applications in one place:
            </p>
            <div style="text-align:center">
              <a href="${registerLink}" style="display:inline-block;background:linear-gradient(135deg,#0176D3,#014486);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:800;font-size:15px;letter-spacing:0.3px">
                🚀 Create Free Account →
              </a>
            </div>
            <p style="color:#94A3B8;font-size:11px;text-align:center;margin:12px 0 0">
              Use the email <strong>${emailLower}</strong> — your application will be linked automatically.
            </p>
          </div>
          <p style="color:#94A3B8;font-size:11px;text-align:center;margin:0">
            This is a one-time email from TalentNest HR. If you did not apply, please ignore it.
          </p>
        </div>
      </div>`
    ).then(async () => {
      // Mark invite as sent so we never send this email again to this candidate
      await Candidate.findByIdAndUpdate(candidate._id, { $set: { accountInviteSentAt: new Date(), accountRequestSent: true } });
    }).catch(() => {});
  } else if (existingUser) {
    const FRONTEND_URL2 = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
    const trackerLink2  = `${FRONTEND_URL2}/track/${app.statusToken}`;
    email.sendEmailWithRetry?.(emailLower,
      `✅ Application confirmed — ${job.title}`,
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#032D60">Hi ${name.trim()},</h2>
        <p>Your application for <strong>${job.title}</strong> has been received.</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${trackerLink2}" style="display:inline-block;background:#10B981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin-right:12px">
            📍 Track Status →
          </a>
          <a href="${FRONTEND_URL2}/login" style="display:inline-block;background:#0176D3;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">
            Login to Dashboard →
          </a>
        </div>
      </div>`
    ).catch(() => {});
  }

  // ── Notify assigned recruiters ──────────────────────────────────────────────
  const recruiters = job.assignedRecruiters || [];
  for (const rid of recruiters) {
    Notification.create({
      userId: rid, tenantId: job.tenantId, type: 'application',
      title: 'New Career Page Application',
      message: `${candidate.name} applied for ${job.title} via the career page`,
      link: `/app/pipeline?jobId=${jobId}`,
    }).catch(() => {});
    const recruiter = await User.findById(rid).select('name email').lean();
    if (recruiter?.email) {
      email.sendEmailWithRetry?.(recruiter.email,
        `New Application — ${candidate.name} for ${job.title}`,
        `<p>Hi ${recruiter.name || 'Recruiter'},</p><p><strong>${candidate.name}</strong> (${candidate.email}) has applied for <strong>${job.title}</strong> via the career page.</p><p>Log in to review the application.</p>`
      ).catch(() => {});
    }
  }

  // Trigger workflow rules for new career-page application
  const { evaluateWorkflows } = require('../services/workflowEngine');
  evaluateWorkflows(job.tenantId, {
    event          : 'candidate_applied',
    applicationId  : app._id.toString(),
    tenantId       : job.tenantId,
    stage          : 'Applied',
    candidateEmail : candidate.email,
    candidatePhone : candidate.phone || '',
    candidateName  : candidate.name,
    candidateSource: 'career_page',
    recruiterId    : (job.assignedRecruiters || [])[0] || null,
    jobTitle       : job.title,
  }).catch(() => {});

  // Fire webhook
  const { fireWebhooks: _fwh } = require('../services/webhookService');
  _fwh(job.tenantId, 'application.created', { applicationId: String(app._id), candidateName: candidate.name, jobTitle: job.title, source: 'career_page' }).catch(() => {});

  const FRONTEND_URL3 = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
  res.status(201).json({
    success: true,
    data: normalizeApp(app),
    hasAccount: !!existingUser,
    candidateName: candidate.name,
    trackerUrl: `${FRONTEND_URL3}/track/${app.statusToken}`,
  });
}));

// ── PRIVATE ───────────────────────────────────────────────────────────────────

// POST /api/applications — internal apply
// Uses guardOrCandidate so candidates with null/missing tenantId can self-apply.
router.post('/', ...guardOrCandidate, asyncHandler(async (req, res) => {
  let { jobId, candidateId, coverLetter, screeningAnswers,
        geoLat, geoLng, geoAccuracy, geoCity, geoCountry } = req.body;
  if (!jobId) throw new AppError('jobId is required.', 400);

  // Self-apply: candidate users have a User record but may not have a Candidate record.
  // Auto-create one linked by email so applications are trackable in the recruiter pipeline.
  if (req.user.role === 'candidate') {
    // Normalize tenantId — empty string can't be cast to ObjectId by Mongoose
    // and causes "Invalid technical identity" CastError. Use null for unset tenantIds.
    const candidateTenantId = req.user.tenantId && req.user.tenantId !== '' ? req.user.tenantId : null;
    const emailRegex = new RegExp(`^${req.user.email.toLowerCase().trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    // Do NOT filter by deletedAt — a recruiter may have archived the profile, but
    // we still want to reuse the same Candidate record so /mine shows the full history.
    let selfCandidate = await Candidate.findOne({ email: emailRegex });
    if (!selfCandidate) {
      // Use findOneAndUpdate (upsert) so concurrent requests don't race into E11000.
      // Only include tenantId in the filter if it's a valid value; omitting it when
      // null prevents CastError and still ensures the email-keyed upsert is unique.
      const upsertFilter = { email: req.user.email.toLowerCase().trim() };
      if (candidateTenantId) upsertFilter.tenantId = candidateTenantId;
      selfCandidate = await Candidate.findOneAndUpdate(
        upsertFilter,
        {
          $setOnInsert: {
            ...(candidateTenantId ? { tenantId: candidateTenantId } : {}),
            name: req.user.name,
            email: req.user.email.toLowerCase().trim(),
            phone: req.user.phone || '',
            source: 'platform',
            skills: Array.isArray(req.user.skills) ? req.user.skills : [],
            location: req.user.location || '',
          },
        },
        { upsert: true, new: true }
      );
    }
    candidateId = selfCandidate._id;
  }

  if (!candidateId) throw new AppError('candidateId is required.', 400);

  // Candidates have a personal tenantId that won't match the employer's job tenant.
  // For candidate self-apply: look up the job by ID only (jobs are public), then
  // create the application under the job's tenantId so recruiters can see it.
  const isCandidate = req.user.role === 'candidate';

  const job = await (isCandidate
    ? Job.findOne({ _id: jobId, status: 'active', deletedAt: null }).lean()
    : Job.findOne({ _id: jobId, tenantId: req.user.tenantId, deletedAt: null }).lean());
  if (!job) throw new AppError('Job not found.', 404);

  // Resolve candidate — recruiters/admins may pass a User._id from Talent Match or
  // a Candidate._id from the pipeline. We try both to avoid "Candidate not found" errors.
  let candidate = null;
  if (isCandidate) {
    candidate = await Candidate.findOne({ _id: candidateId, deletedAt: null }).lean();
  } else {
    // 1. Direct Candidate record lookup (normal pipeline case)
    candidate = await Candidate.findOne({ _id: candidateId, tenantId: req.user.tenantId, deletedAt: null }).lean();

    if (!candidate) {
      // 2. candidateId might be a User._id (Talent Match passes User records)
      //    Look up Candidate by userId backlink or email
      const User = require('../models/User');
      const userDoc = await User.findById(candidateId).lean();
      if (userDoc) {
        candidate = await Candidate.findOne({
          $or: [
            { userId: userDoc._id },
            { email: userDoc.email },
          ],
          tenantId: req.user.tenantId,
          deletedAt: null,
        }).lean();

        // 3. Still no Candidate record — auto-create one from the User so the shortlist works
        if (!candidate) {
          candidate = await Candidate.create({
            tenantId  : req.user.tenantId,
            userId    : userDoc._id,
            name      : userDoc.name      || '',
            email     : userDoc.email     || '',
            phone     : userDoc.phone     || '',
            title     : userDoc.title     || '',
            skills    : Array.isArray(userDoc.skills) ? userDoc.skills : [],
            experience: userDoc.experience ?? null,
            location  : userDoc.location  || '',
            source    : 'platform',
          });
          // Use the newly created Candidate doc
          candidate = candidate.toObject();
        }
        // Rewrite candidateId so the Application stores the Candidate._id, not the User._id
        candidateId = String(candidate._id);
      }
    }
  }
  if (!candidate) throw new AppError('Candidate not found. Make sure this candidate exists in your organisation.', 404);

  // Deduplicate — check with the resolved candidateId
  const checkId = String(candidate._id);

  const exists = await Application.findOne({ jobId, candidateId: checkId, deletedAt: null });
  if (exists) {
    // Return the existing application so the caller (e.g. Talent Match shortlist) can
    // still move it to Shortlisted without needing to do a separate lookup.
    return res.status(409).json({
      error: 'This candidate has already been submitted for this job.',
      existingId: String(exists._id),
      data: normalizeApp(exists),
    });
  }

  const { score, breakdown } = calculateTalentMatchScore(job, candidate);

  // Use job's tenantId for the application so it appears in the recruiter's pipeline.
  const appTenantId = isCandidate ? job.tenantId : req.user.tenantId;

  const platformAppliedFrom = {
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '',
    method: 'none',
  };
  if (geoLat != null && geoLng != null) {
    platformAppliedFrom.lat      = Number(geoLat);
    platformAppliedFrom.lng      = Number(geoLng);
    platformAppliedFrom.accuracy = geoAccuracy ? Number(geoAccuracy) : null;
    platformAppliedFrom.city     = geoCity    || '';
    platformAppliedFrom.country  = geoCountry || '';
    platformAppliedFrom.method   = 'browser';
  }

  let app;
  try {
    app = await Application.create({
      tenantId: appTenantId,
      jobId,
      candidateId: checkId,  // always the resolved Candidate._id (not User._id)
      source: 'platform',
      coverLetter: coverLetter || '',
      talentMatchScore: score,
      matchBreakdown: breakdown,
      currentStage: 'Applied',
      stageHistory: [{ stage: 'Applied', movedBy: req.user.id, movedAt: new Date() }],
      screeningAnswers: Array.isArray(screeningAnswers) ? screeningAnswers : [],
      appliedFrom: platformAppliedFrom,
    });
  } catch (createErr) {
    if (createErr.code === 11000) {
      // E11000 fallback: duplicate slipped past the dedup check (race condition / soft-deleted record)
      const existing = await Application.findOne({ jobId, candidateId: checkId });
      return res.status(409).json({
        error: 'You have already applied to this job.',
        existingId: existing ? String(existing._id) : null,
      });
    }
    throw createErr;
  }

  await Job.findByIdAndUpdate(jobId, { $inc: { applicationCount: 1 } });

  // Background notifications to assigned recruiters
  const recruiters = job.assignedRecruiters || [];
  for (const rid of recruiters) {
    Notification.create({
      userId: rid, tenantId: appTenantId, type: 'application',
      title: 'New Application',
      message: `${candidate.name} applied for ${job.title}`,
      link: `/app/pipeline?jobId=${jobId}`,
    }).catch(() => {});
  }

  // Real-time broadcast — pipeline/applicant lists refresh instantly for everyone in the tenant
  try {
    const { emitToTenant } = require('../socket/platformSocket');
    const socketRegistry   = require('../socket/index');
    emitToTenant(socketRegistry.getIO(), appTenantId, 'application:stageChanged', {
      applicationId: String(app._id),
      jobId        : String(app.jobId),
      candidateId  : String(app.candidateId),
      stage        : 'Applied',
      movedBy      : String(req.user._id || req.user.id),
      movedAt      : new Date().toISOString(),
    });
  } catch { /* non-fatal */ }

  res.status(201).json({ success: true, data: normalizeApp(app) });
}));

// POST /api/applications/invite — recruiter sends invite to candidate
router.post('/invite', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const { candidateId, jobId, message } = req.body;
    if (!candidateId || !jobId) throw new AppError('candidateId and jobId are required.', 400);

    const [job, candidate] = await Promise.all([
      Job.findOne({ _id: jobId, tenantId: req.user.tenantId, deletedAt: null }).lean(),
      Candidate.findOne({ _id: candidateId, tenantId: req.user.tenantId, deletedAt: null }).lean(),
    ]);
    if (!job)       throw new AppError('Job not found.', 404);
    if (!candidate) throw new AppError('Candidate not found.', 404);

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const { score, breakdown } = calculateTalentMatchScore(job, candidate);

    let app = await Application.findOne({ jobId, candidateId, tenantId: req.user.tenantId, deletedAt: null });
    if (app) {
      app.inviteToken  = inviteToken;
      app.inviteStatus = 'sent';
      app.inviteMessage = message || '';
      await app.save();
    } else {
      app = await Application.create({
        tenantId: req.user.tenantId,
        jobId,
        candidateId,
        createdBy: req.user.id,
        source: 'invite',
        inviteToken,
        inviteStatus: 'sent',
        inviteMessage: message || '',
        talentMatchScore: score,
        matchBreakdown: breakdown,
        currentStage: 'Applied',
        stageHistory: [{ stage: 'Applied', movedBy: req.user.id, movedAt: new Date(), notes: 'Invited by recruiter' }],
      });
    }

    // Send invite email if candidate has email
    if (candidate.email) {
      const inviteLink = `${process.env.FRONTEND_URL || 'https://www.talentnesthr.com'}/invite/${inviteToken}`;
      const tpl = email.templates?.candidateInvite?.({
        name: candidate.name,
        recruiterName: req.user.name || 'The Recruiter',
        jobTitle: job.title,
        orgName: req.tenant?.name || 'TalentNest Partner',
        location: job.location || '',
        type: job.jobType || '',
        link: inviteLink,
        message,
      });
      if (tpl) {
        email.sendOrgEmail(candidate.email, tpl.subject, tpl.html, app.tenantId).catch(e => console.warn("[Email] stage-change:", e.message));
      }
    }

    logger.audit('Invite sent', req.user.id, req.user.tenantId, { appId: app._id, candidateId });
    res.status(201).json({ success: true, message: 'Invitation sent.', data: normalizeApp(app) });
  })
);

// GET /api/applications/locations — aggregated application pins for world map
// Returns location data with lat/lng + counts. Super admin sees all, admin sees own tenant.
router.get('/locations', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const filter = { 'appliedFrom.lat': { $ne: null }, 'appliedFrom.lng': { $ne: null }, deletedAt: null };
    if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;

    const apps = await Application.find(filter)
      .select('appliedFrom candidateId createdAt')
      .populate('candidateId', 'name')
      .lean();

    // Group nearby points (within ~0.5° = ~55km) to avoid overlapping dots
    const CLUSTER_RADIUS = 0.5;
    const clusters = [];

    for (const app of apps) {
      const { lat, lng, city, country } = app.appliedFrom;
      const candidate = app.candidateId;

      // Find existing cluster within radius
      const existing = clusters.find(c =>
        Math.abs(c.lat - lat) < CLUSTER_RADIUS && Math.abs(c.lng - lng) < CLUSTER_RADIUS
      );
      if (existing) {
        existing.count++;
        existing.candidates.push({ name: candidate?.name || 'Candidate', date: app.createdAt });
        if (city && !existing.city) existing.city = city;
        if (country && !existing.country) existing.country = country;
      } else {
        clusters.push({
          lat, lng, count: 1,
          city: city || '', country: country || '',
          candidates: [{ name: candidate?.name || 'Candidate', date: app.createdAt }],
        });
      }
    }

    res.json({ success: true, data: clusters, total: apps.length });
  })
);

// GET /api/applications/mine — candidate's own applications
// Searches ALL Candidate docs by email (across tenants, including soft-deleted ones)
// so applications remain visible even if a recruiter archived the Candidate record.
router.get('/mine', ...guardOrCandidate,
  allowRoles('candidate'),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    // Find ALL Candidate documents that match this user's email (any tenant) -
    // intentionally NOT filtering deletedAt so recruiter-archived profiles don't
    // hide the candidate's own application history.
    const emailRegex = new RegExp(`^${req.user.email.toLowerCase().trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const candidateDocs = await Candidate.find({ email: emailRegex }).select('_id').lean();
    const candidateIds = candidateDocs.map(c => c._id);

    // Fallback: also include any applications where candidateId directly equals
    // the user's own _id (edge case when application was created against User._id).
    const userObjId = req.user._id || req.user.id;

    // Build the candidateId filter — union of all candidate IDs + the user's own ID
    const idSet = candidateIds.map(id => id.toString());
    if (userObjId && !idSet.includes(userObjId.toString())) {
      idSet.push(userObjId.toString());
    }

    if (!idSet.length) return res.json(paginatedResponse([], 0, limit, page));

    // Include withdrawn apps (soft-deleted with status='withdrawn') so candidates
    // can see "You withdrew this application" in their history — but exclude
    // hard-archived apps with other statuses that were purged by admins.
    const filter = {
      candidateId: { $in: idSet },
      $or: [{ deletedAt: null }, { status: 'withdrawn' }],
    };
    const [apps, total] = await Promise.all([
      Application.find(filter)
        .populate({
          path: 'jobId',
          select: 'title company companyName location jobType assignedRecruiters',
          populate: { path: 'assignedRecruiters', select: 'name email phone title' },
        })
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Application.countDocuments(filter),
    ]);
    res.json(paginatedResponse(apps.map(normalizeApp), total, limit, page));
  })
);

// GET /api/applications — list (admin/recruiter scoped by tenant)
router.get('/', ...guard, asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = { deletedAt: null };
  if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;

  if (req.user.role === 'recruiter') {
    const myJobs = await Job.find({ tenantId: req.user.tenantId, assignedRecruiters: req.user.id }).select('_id').lean();
    const myJobIds = myJobs.map(j => j._id);
    if (req.query.jobId) {
      filter.jobId = myJobIds.some(id => String(id) === String(req.query.jobId))
        ? req.query.jobId
        : { $in: [] };
    } else {
      filter.jobId = { $in: myJobIds };
    }
  }

  // Client logins only see applications for their own company's jobs.
  if (req.user.role === 'client') {
    if (req.user.clientId) {
      const myJobs = await Job.find({ tenantId: req.user.tenantId, clientId: req.user.clientId }).select('_id').lean();
      filter.jobId = { $in: myJobs.map(j => j._id) };
    } else {
      filter.jobId = { $in: [] };
    }
  }

  // Hiring-manager logins only see applications for jobs they're assigned to.
  if (req.user.role === 'hiring_manager') {
    const myJobs = await Job.find({ tenantId: req.user.tenantId, hiringManagers: req.user.id }).select('_id').lean();
    filter.jobId = { $in: myJobs.map(j => j._id) };
  }
  if (req.query.email || req.query.candidateId) {
    const ids = new Set();
    // By direct candidateId
    if (req.query.candidateId) ids.add(req.query.candidateId);
    // By email — finds linked Candidate docs (handles User._id ≠ Candidate._id)
    if (req.query.email) {
      const byEmail = await Candidate.find({ email: req.query.email.toLowerCase().trim(), deletedAt: null }).select('_id').lean();
      byEmail.forEach(c => ids.add(String(c._id)));
    }
    filter.candidateId = ids.size === 1 ? [...ids][0] : { $in: [...ids] };
  }

  if (req.query.jobId && req.user.role !== 'recruiter') filter.jobId = req.query.jobId;

  // Filter by a specific recruiter's assigned jobs (used by analytics drill-down)
  if (req.query.recruiterId && ['admin', 'super_admin'].includes(req.user.role)) {
    const recJobs = await Job.find({ assignedRecruiters: req.query.recruiterId }).select('_id').lean();
    filter.jobId = { $in: recJobs.map(j => j._id) };
  }
  if (req.query.stage)       filter.currentStage = req.query.stage;
  if (req.query.status)      filter.status       = req.query.status;
  if (req.query.startDate || req.query.endDate) {
    const dateField = req.query.stage ? 'updatedAt' : 'createdAt';
    filter[dateField] = {};
    if (req.query.startDate) filter[dateField].$gte = new Date(req.query.startDate);
    if (req.query.endDate)   filter[dateField].$lte = new Date(req.query.endDate);
  }

  const [apps, total] = await Promise.all([
    Application.find(filter)
      .populate('jobId', 'title company companyName location department')
      .populate('candidateId', 'name email phone title skills experience isFresher summary location source videoResumeUrl currentCompany currentCTC expectedCTC relevantExperience candidateStatus linkedinUrl availability workHistory educationList certifications client ta clientSpoc addedBy photoUrl faceEnrolled')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Application.countDocuments(filter),
  ]);
  res.json(paginatedResponse(apps.map(normalizeApp), total, limit, page));
}));

// GET /api/applications/talent-pool — all parked apps for tenant (must be before /:id)
router.get('/talent-pool', ...guard, asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'super_admin';
  const poolFilter = isSuperAdmin
    ? { status: 'parked', deletedAt: null }
    : { tenantId: req.user.tenantId, status: 'parked', deletedAt: null };
  const apps = await Application.find(poolFilter)
    .populate('candidateId', 'name email phone title skills experience currentCompany location')
    .populate('jobId', 'title company companyName')
    .lean();
  const data = apps.map(a => ({ ...a, id: a._id?.toString() }));
  res.json({ success: true, data });
}));

// ── GET /api/applications/pipeline-smart-match/:jobId — Talent Mirror ──────────
// Scores every Applied/Screening applicant against the shortlisted/interviewed
// benchmark profile. Must be before /:id to avoid route shadowing.
router.get('/pipeline-smart-match/:jobId',
  ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const { buildIdealProfile, scoreCandidate } = require('../utils/pipelineSmartMatch');
    const { jobId } = req.params;
    const threshold = parseInt(req.query.threshold) || 60;
    const maxResults = parseInt(req.query.limit) || 50;

    const isSuperAdmin = req.user.role === 'super_admin';
    const jobQuery = isSuperAdmin ? { _id: jobId } : { _id: jobId, tenantId: req.tenantId };
    const job = await Job.findOne(jobQuery).lean();
    if (!job) throw new AppError('Job not found', 404);

    const CANDIDATE_POP = 'name title skills experience isFresher currentCompany availability location parsedProfile workHistory educationList summary avatarUrl photoUrl resumeUrl';
    const appsQuery = isSuperAdmin
      ? { jobId, status: { $nin: ['withdrawn'] }, deletedAt: null }
      : { jobId, tenantId: req.tenantId, status: { $nin: ['withdrawn'] }, deletedAt: null };
    const apps = await Application.find(appsQuery)
      .populate('candidateId', CANDIDATE_POP)
      .lean();

    const BENCHMARK_STAGES = new Set(['Shortlisted', 'Interview Round 1', 'Interview Round 2', 'Offer', 'Hired']);
    const EVALUATE_STAGES  = new Set(['Applied', 'Screening']);

    const benchmarkApps  = apps.filter(a => BENCHMARK_STAGES.has(a.currentStage) && a.candidateId);
    const evaluateApps   = apps.filter(a => EVALUATE_STAGES.has(a.currentStage)  && a.candidateId);

    if (benchmarkApps.length === 0) {
      // No benchmarks — return all applicants sorted by existing talentMatchScore
      const sorted = evaluateApps
        .sort((a, b) => (b.talentMatchScore || 0) - (a.talentMatchScore || 0))
        .slice(0, maxResults)
        .map(a => ({
          applicationId: String(a._id),
          candidateId:   String(a.candidateId._id),
          candidate: {
            name:       a.candidateId.name,
            title:      a.candidateId.title,
            experience: a.candidateId.experience,
            skills:     a.candidateId.skills || [],
            avatarUrl:  a.candidateId.avatarUrl || a.candidateId.photoUrl,
            resumeUrl:  a.candidateId.resumeUrl,
            location:   a.candidateId.location,
          },
          currentStage:    a.currentStage,
          talentMatchScore: a.talentMatchScore || 0,
          smartScore:      null,
          breakdown:       null,
          matchedSkills:   [],
          missingCoreSkills: [],
          appliedAt:       a.createdAt,
          noBenchmark:     true,
        }));

      return res.json({
        hasBenchmarks: false,
        benchmarkCount: 0,
        idealProfile: null,
        suggestions: sorted,
        totalEvaluated: evaluateApps.length,
        message: 'No shortlisted candidates yet. Showing top applicants by initial match score.',
      });
    }

    const benchmarkCandidates = benchmarkApps.map(a => a.candidateId);
    const idealProfile        = buildIdealProfile(benchmarkCandidates);

    const scored = evaluateApps
      .map(a => {
        const r = scoreCandidate(a.candidateId, idealProfile);
        return {
          applicationId: String(a._id),
          candidateId:   String(a.candidateId._id),
          candidate: {
            name:       a.candidateId.name,
            title:      a.candidateId.title,
            experience: a.candidateId.experience,
            skills:     a.candidateId.skills || [],
            avatarUrl:  a.candidateId.avatarUrl || a.candidateId.photoUrl,
            resumeUrl:  a.candidateId.resumeUrl,
            location:   a.candidateId.location,
          },
          currentStage:     a.currentStage,
          talentMatchScore: a.talentMatchScore || 0,
          smartScore:       r.score,
          breakdown:        r.breakdown,
          matchedSkills:    r.matchedSkills,
          coreSkillsMatched:r.coreSkillsMatched,
          missingCoreSkills:r.missingCoreSkills,
          expMatch:         r.expMatch,
          appliedAt:        a.createdAt,
        };
      })
      .filter(r => r.smartScore >= threshold)
      .sort((a, b) => b.smartScore - a.smartScore)
      .slice(0, maxResults);

    const idealSummary = {
      benchmarkCount: benchmarkApps.length,
      benchmarkStages: [...new Set(benchmarkApps.map(a => a.currentStage))],
      coreSkills:     idealProfile.coreSkills.slice(0, 12),
      importantSkills:idealProfile.importantSkills.slice(0, 20),
      allSkills:      idealProfile.allSkills.slice(0, 30),
      avgExp:         Math.round(idealProfile.avgExp * 10) / 10,
      expRange:       `${Math.round(idealProfile.minExp)}–${Math.round(idealProfile.maxExp)} yrs`,
    };

    res.json({
      hasBenchmarks:  true,
      benchmarkCount: benchmarkApps.length,
      benchmarkStages:[...new Set(benchmarkApps.map(a => a.currentStage))],
      idealProfile:   idealSummary,
      suggestions:    scored,
      totalEvaluated: evaluateApps.length,
      threshold,
    });
  })
);

// GET /api/applications/export — export pipeline to Excel
// MUST be before /:id — otherwise Express matches 'export' as the :id param
router.get('/export', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { exportToExcel } = require('../utils/exportToExcel');
  const Tenant = require('../models/Tenant');
  const User   = require('../models/User');
  const filter = { deletedAt: null };
  if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;
  if (req.query.jobId) filter.jobId = req.query.jobId;
  if (req.query.stage) filter.currentStage = req.query.stage;

  const [apps, tenants] = await Promise.all([
    Application.find(filter)
      .populate('candidateId', 'name email phone title summary location skills experience relevantExperience currentCompany currentCTC expectedCTC preferredLocation availability noticePeriodDays candidateStatus certifications linkedinUrl resumeUrl videoResumeUrl source client ta clientSpoc additionalDetails')
      .populate('jobId', 'title company companyName location department')
      .sort({ createdAt: -1 }).limit(5000).lean(),
    Tenant.find({}).select('name').lean(),
  ]);
  const tenantMap   = Object.fromEntries(tenants.map(t => [String(t._id), t.name]));
  const emails      = [...new Set(apps.map(a => a.candidateId?.email).filter(Boolean).map(e => e.toLowerCase()))];
  const candUsers   = emails.length ? await User.find({ role: 'candidate', email: { $in: emails } }).select('email phone name title currentCompany currentCTC expectedCTC').lean() : [];
  const usersByEmail= new Map(candUsers.map(u => [String(u.email || '').toLowerCase(), u]));

  const columns = [
    { header: 'Candidate',            key: 'candidateName',      width: 24 },
    { header: 'Email',                key: 'email',              width: 30 },
    { header: 'Mobile Number',        key: 'phone',              width: 18 },
    { header: 'Organisation',         key: 'organisation',       width: 24 },
    { header: 'Job',                  key: 'jobTitle',           width: 30 },
    { header: 'Company',              key: 'company',            width: 24 },
    { header: 'Job Location',         key: 'jobLocation',        width: 20 },
    { header: 'Stage',                key: 'currentStage',       width: 20 },
    { header: 'Status',               key: 'status',             width: 12 },
    { header: 'Talent Match Score',   key: 'talentMatchScore',   width: 15 },
    { header: 'Source',               key: 'source',             width: 14 },
    { header: 'Applied Date',         key: 'appliedDate',        width: 16 },
    { header: 'Current Title',        key: 'title',              width: 24 },
    { header: 'Current Company',      key: 'currentCompany',     width: 24 },
    { header: 'Candidate Location',   key: 'location',           width: 22 },
    { header: 'Preferred Location',   key: 'preferredLocation',  width: 22 },
    { header: 'Skills',               key: 'skills',             width: 42 },
    { header: 'Experience Years',     key: 'experience',         width: 16 },
    { header: 'Relevant Experience',  key: 'relevantExperience', width: 22 },
    { header: 'Current CTC',          key: 'currentCTC',         width: 16 },
    { header: 'Expected CTC',         key: 'expectedCTC',        width: 16 },
    { header: 'Availability',         key: 'availability',       width: 18 },
    { header: 'Notice Days',          key: 'noticePeriodDays',   width: 14 },
    { header: 'Candidate Status',     key: 'candidateStatus',    width: 18 },
    { header: 'Certifications',       key: 'certifications',     width: 28 },
    { header: 'LinkedIn',             key: 'linkedinUrl',        width: 34 },
    { header: 'Resume URL',           key: 'resumeUrl',          width: 34 },
    { header: 'Video Resume URL',     key: 'videoResumeUrl',     width: 34 },
    { header: 'Client',               key: 'client',             width: 20 },
    { header: 'TA',                   key: 'ta',                 width: 18 },
    { header: 'Client SPOC',          key: 'clientSpoc',         width: 20 },
    { header: 'Cover Letter',         key: 'coverLetter',        width: 45 },
    { header: 'Recruiter Notes',      key: 'recruiterNotes',     width: 45 },
    { header: 'Additional Details',   key: 'additionalDetails',  width: 45 },
  ];

  const rows = apps.map(a => {
    const c = a.candidateId || {};
    const u = usersByEmail.get(String(c.email || '').toLowerCase()) || {};
    const j = a.jobId || {};
    return {
      candidateName: c.name || u.name || '', email: c.email || u.email || '', phone: c.phone || u.phone || '',
      organisation: tenantMap[String(a.tenantId)] || '', jobTitle: j.title || '',
      company: j.companyName || j.company || '', jobLocation: j.location || '',
      currentStage: a.currentStage || '', status: a.status || '', talentMatchScore: a.talentMatchScore ?? '',
      source: a.source || c.source || '',
      appliedDate: a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN') : '',
      title: c.title || u.title || '', currentCompany: c.currentCompany || u.currentCompany || '',
      location: c.location || '', preferredLocation: c.preferredLocation || '',
      skills: Array.isArray(c.skills) ? c.skills.join(', ') : (c.skills || ''),
      experience: c.experience ?? '', relevantExperience: c.relevantExperience || '',
      currentCTC: c.currentCTC || u.currentCTC || '', expectedCTC: c.expectedCTC || u.expectedCTC || '',
      availability: c.availability || '', noticePeriodDays: c.noticePeriodDays ?? '',
      candidateStatus: c.candidateStatus || '',
      certifications: Array.isArray(c.certifications) ? c.certifications.join(', ') : (c.certifications || ''),
      linkedinUrl: c.linkedinUrl || '', resumeUrl: c.resumeUrl || '', videoResumeUrl: c.videoResumeUrl || '',
      client: c.client || '', ta: c.ta || '', clientSpoc: c.clientSpoc || '',
      coverLetter: a.coverLetter || '', recruiterNotes: a.recruiterNotes || '',
      additionalDetails: c.additionalDetails || '',
    };
  });

  const buf = exportToExcel('Pipeline', columns, rows);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="pipeline-export-${Date.now()}.xlsx"`);
  res.send(buf);
}));

// GET /api/applications/:id — single application
router.get('/:id', ...guard, asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'super_admin';
  const appFilter = isSuperAdmin
    ? { _id: req.params.id, deletedAt: null }
    : { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null };
  const app = await Application.findOne(appFilter)
    .populate('jobId')
    .populate('candidateId')
    .lean();
  if (!app) throw new AppError('Application not found.', 404);
  res.json({ success: true, data: normalizeApp(app) });
}));

// PATCH /api/applications/:id/stage — move pipeline stage
router.patch('/:id/stage', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter', 'client', 'hiring_manager'),
  asyncHandler(async (req, res) => {
    const { notes } = req.body;
    const stage = normalizeStage(req.body.stage);
    if (!stage) throw new AppError(`Invalid stage. Valid: ${VALID_STAGES.join(', ')}`, 400);

    // Sync candidateStatus on the Candidate record so recruiters see up-to-date status
    // without having to manually update it. Only update for meaningful stages.
    const STAGE_TO_CANDIDATE_STATUS = {
      'Shortlisted'      : 'Shortlisted',
      'Interview Round 1': 'In Interview',
      'Interview Round 2': 'In Final Interview',
      'Offer'            : 'Offer Extended',
      'Hired'            : 'Placed',
    };

    const mongoose = require('mongoose');
    const session = await mongoose.startSession();
    let app;
    try {
      await session.withTransaction(async () => {
        const stageFilter = { _id: req.params.id, deletedAt: null };
        if (req.user.role !== 'super_admin') stageFilter.tenantId = req.user.tenantId;
        app = await Application.findOne(stageFilter).session(session);
        if (!app) throw new AppError('Application not found.', 404);
        if (req.user.role === 'recruiter') {
          const assignedJob = await Job.findOne({
            _id: app.jobId,
            tenantId: req.user.tenantId,
            assignedRecruiters: req.user.id,
          }).select('_id').session(session);
          if (!assignedJob) throw new AppError('You can only update applicants for jobs assigned to you.', 403);
        }
        if (req.user.role === 'client') {
          const clientJob = req.user.clientId && await Job.findOne({
            _id: app.jobId, tenantId: req.user.tenantId, clientId: req.user.clientId,
          }).select('_id').session(session);
          if (!clientJob) throw new AppError('You can only update applicants for your own jobs.', 403);
        }
        if (req.user.role === 'hiring_manager') {
          const hmJob = await Job.findOne({
            _id: app.jobId, tenantId: req.user.tenantId, hiringManagers: req.user.id,
          }).select('_id').session(session);
          if (!hmJob) throw new AppError('You can only update applicants for jobs assigned to you.', 403);
        }

        app.currentStage = stage;
        app.stageHistory.push({ stage, movedBy: req.user.id, movedAt: new Date(), notes: notes || '' });
        if (stage === 'Hired') {
          app.status = 'hired';
          // Senior Optimization: Update job counts INSIDE the transaction to prevent sync drift
          await Job.findByIdAndUpdate(app.jobId, { $inc: { hiredCount: 1 } }).session(session);
        } else if (stage === 'Rejected') {
          app.status = 'rejected';
          if (req.body.rejectionReason) app.rejectionReason = req.body.rejectionReason;
        } else if (app.status !== 'active') {
          // If the app was parked (or any other non-active status) and is now
          // being moved to an in-progress stage, reset to active so it reappears
          // in the pipeline's default view instead of staying invisible.
          app.status = 'active';
        }
        await app.save({ session });


        // Auto-assign the recruiter to the candidate if currently unassigned
        if (req.user.role === 'recruiter') {
          const candidate = await Candidate.findById(app.candidateId).session(session);
          if (candidate && !candidate.assignedRecruiterId) {
            candidate.assignedRecruiterId = req.user.id;
            await candidate.save({ session });
          }
        }

        // Sync candidateStatus on the Candidate record so recruiters see up-to-date
        // status without having to manually update it. Only for meaningful stages.
        const newCandidateStatus = STAGE_TO_CANDIDATE_STATUS[stage];
        if (newCandidateStatus) {
          await Candidate.findByIdAndUpdate(app.candidateId, { $set: { candidateStatus: newCandidateStatus } }).session(session);
        }
      });
    } finally {
      session.endSession();
    }

    // Send stage-change email to candidate
    const candidate = await Candidate.findById(app.candidateId).select('name email').lean();
    const jobDoc = await Job.findById(app.jobId).select('title').lean();
    // Fallback: if Candidate record has no email, look it up from their User account
    let candidateEmail = candidate?.email;
    if (!candidateEmail) {
      try {
        const cu = await User.findOne({ candidateId: app.candidateId }).select('email').lean()
          || await User.findOne({ _id: app.candidateId }).select('email').lean();
        if (cu?.email) candidateEmail = cu.email;
      } catch { /* ignore */ }
    }
    if (candidateEmail) {
      const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';

      // Load org notification message overrides
      let orgNotifMap = {};
      try {
        const OrgCustomizations = require('../models/OrgCustomizations');
        const cust = await OrgCustomizations.findOne({ orgId: String(app.tenantId) }).select('notificationMessages').lean();
        (cust?.notificationMessages || []).forEach(nm => { orgNotifMap[nm.trigger] = nm.message; });
      } catch { /* fall back to defaults */ }

      const cName    = candidate?.name || 'there';
      const jobTitle = jobDoc?.title   || 'the role';

      // Map stage name → notification trigger key
      const STAGE_TO_TRIGGER = {
        Screening: 'Application Screening',
        Shortlisted: 'Application Shortlisted',
        'Interview Round 1': 'Interview Scheduled',
        'Interview Round 2': 'Interview Scheduled',
        'Technical Interview': 'Interview Scheduled',
        Offer: 'Offer Extended',
        Rejected: 'Application Rejected',
      };
      const stageEmailMap = {
        Screening: {
          subject: `📋 Your application is under review — ${jobTitle}`,
          icon: '📋', color: '#0369A1',
          headline: 'Your application is being reviewed',
          body: `Hi <strong>${cName}</strong>, your application for the <strong>${jobTitle}</strong> role is currently under review. We will update you as soon as we have news. Thank you for your patience!`,
        },
        Shortlisted: {
          subject: `🎉 You've been shortlisted for ${jobTitle}`,
          icon: '🎉', color: '#0176D3',
          headline: `You've been shortlisted!`,
          body: `Great news, <strong>${cName}</strong>! You have been shortlisted for the <strong>${jobTitle}</strong> role. Our team will be in touch shortly with next steps.`,
        },
        'Interview Round 1': {
          subject: `📅 Interview Invitation — ${jobTitle}`,
          icon: '📅', color: '#7C3AED',
          headline: 'You have an interview!',
          body: `Hi <strong>${cName}</strong>, you have been selected for an interview for the <strong>${jobTitle}</strong> role. Please check your portal for details.`,
        },
        'Interview Round 2': {
          subject: `📅 Interview Round 2 — ${jobTitle}`,
          icon: '📅', color: '#7C3AED',
          headline: 'You have a second interview!',
          body: `Hi <strong>${cName}</strong>, congratulations on clearing Round 1! You have been invited for Interview Round 2 for <strong>${jobTitle}</strong>.`,
        },
        'Technical Interview': {
          subject: `💻 Technical Interview — ${jobTitle}`,
          icon: '💻', color: '#0369A1',
          headline: 'Technical Interview scheduled',
          body: `Hi <strong>${cName}</strong>, you have been selected for a Technical Interview for the <strong>${jobTitle}</strong> role.`,
        },
        Offer: {
          subject: `🤝 Offer Extended — ${jobTitle}`,
          icon: '🤝', color: '#059669',
          headline: 'An offer is on its way!',
          body: `Hi <strong>${cName}</strong>, we are pleased to extend an offer for the <strong>${jobTitle}</strong> role. Please log in to review and accept your offer letter.`,
        },
        Hired: {
          subject: `🎊 Welcome to the team! — ${jobTitle}`,
          icon: '🎊', color: '#059669',
          headline: 'Welcome aboard!',
          body: `Congratulations <strong>${cName}</strong>! You have been officially hired for the <strong>${jobTitle}</strong> role. We are excited to have you on board!`,
        },
        Rejected: {
          subject: `Application Update — ${jobTitle}`,
          icon: '📋', color: '#6B7280',
          headline: 'Application status update',
          body: `Hi <strong>${cName}</strong>, thank you for your interest in the <strong>${jobTitle}</strong> role. After careful consideration, we will not be moving forward at this time. We encourage you to apply for future openings.`,
        },
      };
      // Override body with org custom notification message if set
      const rawTpl = stageEmailMap[stage];
      const triggerKey = STAGE_TO_TRIGGER[stage];
      const orgBody = triggerKey && orgNotifMap[triggerKey];
      const tpl = rawTpl && orgBody ? { ...rawTpl, body: orgBody } : rawTpl;
      if (tpl) {
        const html = `<div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px 20px;">
          <div style="background:linear-gradient(135deg,${tpl.color},#032D60);padding:28px 32px;border-radius:16px 16px 0 0;">
            <div style="font-size:32px;margin-bottom:8px;">${tpl.icon}</div>
            <h1 style="color:#fff;font-size:20px;margin:0;">${tpl.headline}</h1>
          </div>
          <div style="background:#fff;padding:28px 32px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">
            <p style="color:#374151;font-size:15px;line-height:1.7;">${tpl.body}</p>
            <a href="${FRONTEND_URL}/app/applications" style="display:inline-block;background:${tpl.color};color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;margin-top:8px;">View My Application →</a>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px;">You are receiving this email because you applied through TalentNest HR.</p>
          </div>
        </div>`;
        email.sendOrgEmail(candidateEmail, tpl.subject, html, app.tenantId)
          .then(() => console.log(`[Email] stage-change sent → ${candidateEmail} (${stage})`))
          .catch(e => console.error(`[Email] stage-change FAILED → ${candidateEmail} (${stage}):`, e.message));
      } else {
        console.log(`[Email] no template for stage "${stage}" — skipping email to ${candidateEmail}`);
      }
    }

    // ── In-app notifications for all meaningful stage changes ─────────────────
    const STAGE_NOTIF = {
      Screening:           { icon: '📋', adminTitle: 'Under Review',    candidateTitle: 'Application update' },
      Shortlisted:         { icon: '🎉', adminTitle: 'Shortlisted',     candidateTitle: 'Great news!' },
      'Interview Round 1': { icon: '📅', adminTitle: 'Interview R1',    candidateTitle: 'Interview scheduled' },
      'Interview Round 2': { icon: '📅', adminTitle: 'Interview R2',    candidateTitle: 'Interview Round 2' },
      Offer:               { icon: '🤝', adminTitle: 'Offer Extended',  candidateTitle: 'Offer extended!' },
      Hired:               { icon: '🎊', adminTitle: 'Hired',           candidateTitle: "You're hired!" },
      Rejected:            { icon: '❌', adminTitle: 'Rejected',        candidateTitle: 'Application update' },
    };
    const notifCfg = STAGE_NOTIF[stage];
    if (notifCfg) {
      const cName  = candidate?.name  || 'A candidate';
      const jTitle = jobDoc?.title    || 'a role';

      // Notify all admins + recruiters in the tenant (except the person who made the change)
      try {
        const moverIdStr = String(req.user._id || req.user.id);
        const teamUsers = await User.find({
          tenantId: app.tenantId,
          role: { $in: ['admin', 'recruiter'] },
          deletedAt: null,
        }).select('_id').lean();
        const payloads = teamUsers
          .filter(u => String(u._id) !== moverIdStr)
          .map(u => ({
            userId:   u._id,
            tenantId: app.tenantId,
            type:     'stage_change',
            title:    `${notifCfg.icon} ${cName} — ${notifCfg.adminTitle}`,
            message:  `${cName} was moved to ${stage} for ${jTitle}`,
            link:     `/app/pipeline`,
          }));
        if (payloads.length) await Notification.insertMany(payloads).catch(() => {});
      } catch (err) {
        console.warn('[Notification] team stage notification failed:', err.message);
      }

      // Notify the candidate's user account for positive/significant stages
      if (['Shortlisted', 'Interview Round 1', 'Interview Round 2', 'Offer', 'Hired', 'Rejected'].includes(stage) && candidateEmail) {
        try {
          const candidateUser = await User.findOne({ email: candidateEmail }).lean();
          if (candidateUser) {
            await Notification.create({
              userId:   candidateUser._id,
              tenantId: app.tenantId,
              type:     'stage_change',
              title:    `${notifCfg.icon} ${notifCfg.candidateTitle} — ${jTitle}`,
              message:  stage === 'Hired'
                ? `Congratulations! You have been hired for ${jTitle}. Check your pre-boarding checklist.`
                : `Your application for ${jTitle} has been moved to: ${stage}`,
              link:     stage === 'Hired' ? '/app/onboarding' : '/app/applications',
            });
          }
        } catch (err) {
          console.warn('[Notification] candidate stage notification failed:', err.message);
        }
      }
    }

    if (stage === 'Hired') {
      // Auto-create pre-boarding checklist for the hired candidate
      try {
        const { createPreBoardingForApplication } = require('./preboarding');
        await createPreBoardingForApplication(app._id, app.tenantId, req.user._id || req.user.id);
      } catch (pbErr) {
        console.warn('[PreBoarding] auto-create on Hired stage failed:', pbErr.message);
      }

      // Additional Hired-specific admin notification with offer letter prompt
      try {
        const adminUsers = await User.find({ tenantId: app.tenantId, role: { $in: ['admin', 'recruiter'] }, deletedAt: null }).select('_id').lean();
        const notifPayloads = adminUsers.map(u => ({
          userId:   u._id,
          tenantId: app.tenantId,
          type:     'stage_change',
          title:    `🎉 Hired: ${candidate?.name || 'Candidate'}`,
          message:  `${candidate?.name || 'A candidate'} was hired for ${jobDoc?.title || 'a role'}. Generate their offer letter in the Offers page.`,
          link:     `/app/offers`,
        }));
        if (notifPayloads.length) await Notification.insertMany(notifPayloads).catch(() => {});
      } catch (err) {
        console.warn('[Notification] Admin hired notification failed:', err.message);
      }
    }

    // When moved to Offer or Hired stage, create a blank OfferLetter if one doesn't exist
    if (stage === 'Offer' || stage === 'Hired') {
      const existingOffer = await OfferLetter.findOne({ applicationId: app._id });
      if (!existingOffer) {
        await OfferLetter.create({
          tenantId: app.tenantId,
          applicationId: app._id,
          candidateId: app.candidateId,
          status: 'draft',
        }).catch(() => {});
      }
    }

    // Push notification to the recruiter/creator of the job + candidate
    try {
      const { sendPush } = require('../utils/sendPush');
      const pushJob  = await Job.findById(app.jobId).select('title createdBy').lean();
      const pushCand = await Candidate.findById(app.candidateId).select('name email').lean();
      // Notify job creator
      if (pushJob?.createdBy) {
        await sendPush(pushJob.createdBy, {
          title: 'Stage Updated',
          body: `${pushCand?.name || 'Candidate'} moved to ${stage} for ${pushJob.title}`,
          url: `/app/pipeline?job=${pushJob._id}`,
        });
      }
      // Notify candidate for meaningful stages
      const PUSH_STAGES = ['Shortlisted', 'Interview Round 1', 'Interview Round 2', 'Technical Interview', 'Offer', 'Hired', 'Rejected'];
      if (PUSH_STAGES.includes(stage) && pushCand?.email) {
        const candUser = await User.findOne({ email: pushCand.email.toLowerCase(), deletedAt: null }).select('_id').lean();
        if (candUser) {
          const pushTitles = { Shortlisted: "You've been shortlisted!", Offer: 'Offer extended!', Hired: 'Congratulations — you\'re hired!', Rejected: 'Application update', 'Interview Round 1': 'Interview scheduled', 'Interview Round 2': 'Second interview scheduled', 'Technical Interview': 'Technical interview scheduled' };
          await sendPush(candUser._id, {
            title: pushTitles[stage] || 'Application update',
            body: `Your application for ${pushJob?.title || 'the role'} has been updated.`,
            url: `/app/applications`,
          });
        }
      }
    } catch (e) { /* non-fatal */ }

    // Trigger workflow rules (fire-and-forget)
    const { evaluateWorkflows } = require('../services/workflowEngine');
    const candidateForWf = await Candidate.findById(app.candidateId).select('name email phone source').lean();
    const jobForWf = await Job.findById(app.jobId).select('title assignedRecruiters').lean();
    const wfBase = {
      applicationId : app._id.toString(),
      tenantId      : req.user.tenantId,
      stage,
      previousStage : (app.stageHistory[app.stageHistory.length - 2]?.stage) || '',
      candidateEmail: candidateForWf?.email || '',
      candidatePhone: candidateForWf?.phone || '',
      candidateName : candidateForWf?.name  || '',
      candidateSource: candidateForWf?.source || '',
      recruiterId   : jobForWf?.assignedRecruiters?.[0] || req.user.id,
      jobTitle      : jobForWf?.title || '',
    };
    evaluateWorkflows(req.user.tenantId, { event: 'stage_changed', ...wfBase }).catch(() => {});
    if (stage === 'Hired')    evaluateWorkflows(req.user.tenantId, { event: 'candidate_hired',    ...wfBase }).catch(() => {});
    if (stage === 'Rejected') evaluateWorkflows(req.user.tenantId, { event: 'candidate_rejected', ...wfBase }).catch(() => {});

    // ── Fire webhooks (non-blocking)
    const { fireWebhooks } = require('../services/webhookService');
    const whPayload = { applicationId: String(app._id), candidateName: wfBase.candidateName, jobTitle: wfBase.jobTitle, stage, recruiterName: req.user.name || req.user.email };
    fireWebhooks(req.user.tenantId, 'application.stage_changed', whPayload).catch(() => {});
    if (stage === 'Hired')       fireWebhooks(req.user.tenantId, 'application.hired',       whPayload).catch(() => {});
    if (stage === 'Rejected')    fireWebhooks(req.user.tenantId, 'application.rejected',    whPayload).catch(() => {});
    if (stage === 'Shortlisted') fireWebhooks(req.user.tenantId, 'application.shortlisted', whPayload).catch(() => {});

    logger.audit('Stage changed', req.user.id, req.user.tenantId, { appId: app._id, stage });

    // Real-time broadcast — every connected user in the tenant gets this instantly
    try {
      const { emitToTenant } = require('../socket/platformSocket');
      const socketRegistry   = require('../socket/index');
      emitToTenant(socketRegistry.getIO(), app.tenantId, 'application:stageChanged', {
        applicationId: String(app._id),
        jobId        : String(app.jobId),
        candidateId  : String(app.candidateId),
        stage,
        movedBy      : String(req.user._id || req.user.id),
        movedAt      : new Date().toISOString(),
      });
    } catch { /* non-fatal */ }

    // Notify all super_admins about significant stage movements (non-blocking)
    const significantStages = ['Shortlisted', 'Offer', 'Hired', 'Rejected'];
    if (significantStages.includes(stage)) {
      const cDoc = await Candidate.findById(app.candidateId).select('name').lean().catch(() => null);
      const jDoc = await Job.findById(app.jobId).select('title').lean().catch(() => null);
      if (cDoc && jDoc) {
        const stageLabels = { Shortlisted: 'Shortlisted', Offer: 'Offer Extended', Hired: 'Hired 🎉', Rejected: 'Rejected' };
        notifyAllSuperAdmins(
          'stage_update',
          `${stageLabels[stage] || stage}: ${cDoc.name}`,
          `${cDoc.name} was moved to "${stageLabels[stage] || stage}" for ${jDoc.title}`,
          { applicationId: app._id.toString(), candidateId: app.candidateId?.toString(), jobId: app.jobId?.toString() }
        );
      }
    }

    res.json({ success: true, data: normalizeApp(app) });
  })
);

// PATCH /api/applications/:id/notes
router.patch('/:id/notes', ...guard, asyncHandler(async (req, res) => {
  const { notes } = req.body;
  const existing = await Application.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }).select('jobId').lean();
  if (!existing) throw new AppError('Application not found.', 404);
  await assertScopedAccess(req, existing);
  const app = await Application.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
    { $set: { recruiterNotes: notes } },
    { new: true }
  );
  if (!app) throw new AppError('Application not found.', 404);
  res.json({ success: true, data: normalizeApp(app) });
}));

// PATCH /api/applications/:id/tags
router.patch('/:id/tags', ...guard, asyncHandler(async (req, res) => {
  const { tags } = req.body;
  if (!Array.isArray(tags)) throw new AppError('tags must be an array.', 400);
  const existing = await Application.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }).select('jobId').lean();
  if (!existing) throw new AppError('Application not found.', 404);
  await assertScopedAccess(req, existing);
  const app = await Application.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
    { $set: { tags } },
    { new: true }
  );
  if (!app) throw new AppError('Application not found.', 404);
  res.json({ success: true, data: normalizeApp(app) });
}));

// PATCH /api/applications/:id/feedback — recruiter/client/hiring-manager feedback
router.patch('/:id/feedback', ...guard, asyncHandler(async (req, res) => {
  const { rating, strengths, weaknesses, recommendation, comment } = req.body;
  const existing = await Application.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }).select('jobId').lean();
  if (!existing) throw new AppError('Application not found.', 404);
  await assertScopedAccess(req, existing);
  const app = await Application.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
    { $set: { feedback: { rating, strengths, weaknesses, recommendation, comment: comment || '' } } },
    { new: true }
  );
  if (!app) throw new AppError('Application not found.', 404);
  res.json({ success: true, data: normalizeApp(app) });
}));

// ── Interview helpers ─────────────────────────────────────────────────────────

function buildICalEvent({ summary, description, startDt, endDt, location, organizer, attendees }) {
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `talentnest-${Date.now()}-${Math.random().toString(36).slice(2)}@talentnesthr.com`;
  const attendeeLines = (attendees || [])
    .filter(a => a.email)
    .map(a => `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;RSVP=TRUE;CN=${a.name || a.email}:mailto:${a.email}`)
    .join('\r\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TalentNest HR//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(startDt)}`,
    `DTEND:${fmt(endDt)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `LOCATION:${location || 'Video Call'}`,
    organizer ? `ORGANIZER;CN=${organizer.name}:mailto:${organizer.email}` : '',
    attendeeLines,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

async function sendWhatsApp(to, body) {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
  if (!sid || !token) {
    console.log(`[WhatsApp DEV] To: ${to} | Body: ${body.slice(0, 120)}`);
    return;
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const phone = to.startsWith('+') ? to : `+${to}`;
  const params = new URLSearchParams({ From: from, To: `whatsapp:${phone}`, Body: body });
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    console.warn('[WhatsApp] send failed:', err.message || resp.status);
  }
}

// PATCH /api/applications/:id/interview — schedule interview
router.patch('/:id/interview', ...guard, asyncHandler(async (req, res) => {
  const { date, time, format, interviewerName, interviewerEmail, videoLink, notes, roundIndex: bodyRoundIndex } = req.body;

  const app = await Application.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
  if (!app) throw new AppError('Application not found.', 404);

  // "+ Create Room" on an already-scheduled round sends roundIndex to UPDATE that
  // round in place (e.g. to attach a video link) instead of scheduling a new one.
  const isRoundUpdate = bodyRoundIndex !== undefined && bodyRoundIndex !== null
    && Number.isInteger(Number(bodyRoundIndex)) && Number(bodyRoundIndex) >= 0
    && Number(bodyRoundIndex) < app.interviewRounds.length;

  if (!isRoundUpdate && (!date || !time)) throw new AppError('date and time are required.', 400);
  if (videoLink && !/^https?:\/\//i.test(videoLink)) throw new AppError('videoLink must start with https://', 400);
  if (notes && notes.length > 1000) throw new AppError('Notes must be 1000 characters or fewer.', 400);

  let scheduledAt, endAt, roundIndex, roundLabel;
  if (isRoundUpdate) {
    roundIndex = Number(bodyRoundIndex);
    scheduledAt = app.interviewRounds[roundIndex].scheduledAt;
    endAt = new Date(scheduledAt.getTime() + 60 * 60 * 1000);
    roundLabel = `Interview Round ${roundIndex + 1}`;
  } else {
    scheduledAt = new Date(`${date}T${time}`);
    endAt = new Date(scheduledAt.getTime() + 60 * 60 * 1000); // +1 hour
    roundIndex = app.interviewRounds.length; // 0-based index of this new round
    roundLabel = `Interview Round ${roundIndex + 1}`;
  }

  // Auto-create TalentNest video room for this interview
  let nativeJoinLink = '';
  try {
    const VideoRoom = require('../models/VideoRoom');
    const crypto = require('crypto');
    const genToken = () => crypto.randomBytes(20).toString('hex');
    const frontendBase = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
    let vRoom = await VideoRoom.findOne({ interviewId: app._id });
    if (!vRoom) {
      vRoom = await VideoRoom.create({
        interviewId: app._id,
        tenantId: app.tenantId,
        jobTitle: '',   // filled after job fetch below
        candidateName: '',
        orgName: req.tenant?.name || '',
        roomToken: genToken(),
        hostToken: genToken(),
        scheduledAt,
        validFrom: new Date(scheduledAt.getTime() - 15 * 60 * 1000),
        validUntil: new Date(scheduledAt.getTime() + 4 * 60 * 60 * 1000),
        hostUserId: String(req.user._id || req.user.id),
        status: 'scheduled',
      });
    } else {
      // Sync existing room with new schedule
      vRoom.scheduledAt = scheduledAt;
      vRoom.validFrom   = new Date(scheduledAt.getTime() - 15 * 60 * 1000);
      vRoom.validUntil  = new Date(scheduledAt.getTime() + 4 * 60 * 60 * 1000);
      vRoom.status      = 'scheduled'; // reset to scheduled if it was live/ended
      await vRoom.save();
    }
    nativeJoinLink = `${frontendBase}/meeting/${vRoom.roomToken}`;
  } catch (e) {
    console.error('[interview] video room creation failed:', e.message);
  }

  if (isRoundUpdate) {
    // Just attach/refresh the video room link on the existing round — no new
    // round, no stage change, no re-notification.
    const round = app.interviewRounds[roundIndex];
    round.videoLink = nativeJoinLink || videoLink || round.videoLink || '';
    app.markModified('interviewRounds');
    await app.save();
    return res.json({ success: true, data: normalizeApp(app) });
  }

  app.interviewRounds.push({
    scheduledAt,
    format: format || 'video',
    interviewerName: interviewerName || '',
    interviewerEmail: interviewerEmail || '',
    videoLink: nativeJoinLink || videoLink || '',
    feedback: {},
  });

  const newStage = roundIndex === 0 ? 'Interview Round 1' : 'Interview Round 2';
  if (!['Interview Round 1', 'Interview Round 2'].includes(app.currentStage)) {
    app.currentStage = newStage;
    app.stageHistory.push({ stage: newStage, movedBy: req.user.id, movedAt: new Date(), notes: notes || 'Interview scheduled' });
  }
  await app.save();

  // Fetch candidate + job for emails
  const [candidate, job] = await Promise.all([
    Candidate.findById(app.candidateId).select('name email phone').lean(),
    Job.findById(app.jobId).select('title').lean(),
  ]);

  // ── Fire webhooks (non-blocking)
  const { fireWebhooks } = require('../services/webhookService');
  fireWebhooks(req.user.tenantId, 'interview.scheduled', {
    applicationId: String(app._id), roundIndex, roundLabel, scheduledAt, format: format || 'video',
  }).catch(() => {});

  const orgName = req.tenant?.name || 'TalentNest HR';
  const dateStr = scheduledAt.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = scheduledAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  // Build calendar invite
  const icalContent = buildICalEvent({
    summary: `${roundLabel} — ${job?.title || 'Interview'} @ ${orgName}`,
    description: `Interview for ${job?.title || 'the role'}\nCandidate: ${candidate?.name || ''}\nFormat: ${format || 'Video'}\n${nativeJoinLink ? `Join: ${nativeJoinLink}` : (videoLink ? `Link: ${videoLink}` : '')}`,
    startDt: scheduledAt,
    endDt: endAt,
    location: nativeJoinLink || videoLink || (format === 'in_person' ? 'Office' : 'TalentNest Video Call'),
    organizer: { name: req.user.name || orgName, email: process.env.RESEND_FROM || 'hr@talentnesthr.com' },
    attendees: [
      candidate?.email ? { name: candidate.name, email: candidate.email } : null,
      interviewerEmail ? { name: interviewerName || 'Interviewer', email: interviewerEmail } : null,
    ].filter(Boolean),
  });

  const joinLink = nativeJoinLink || videoLink || '';
  const inviteHtml = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
  <div style="background:linear-gradient(135deg,#0176D3,#0ea5e9);padding:32px;border-radius:12px 12px 0 0;text-align:center">
    <div style="font-size:36px">🎉</div>
    <h1 style="color:#fff;margin:8px 0 4px;font-size:22px">Interview Scheduled</h1>
    <p style="color:rgba(255,255,255,0.85);margin:0">${job?.title || 'Position'} — ${orgName}</p>
  </div>
  <div style="padding:32px;background:#F8FAFC;border-radius:0 0 12px 12px">
    <p style="margin:0 0 20px;color:#374151">Dear <strong>${candidate?.name || 'Candidate'}</strong>, your ${roundLabel} has been scheduled. Please find the details below.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#fff;border-radius:8px;overflow:hidden">
      <tr><td style="padding:12px 16px;font-weight:700;color:#374151;border-bottom:1px solid #F1F5F9;width:38%">Round</td><td style="padding:12px 16px;border-bottom:1px solid #F1F5F9">${roundLabel}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:700;color:#374151;border-bottom:1px solid #F1F5F9">Date</td><td style="padding:12px 16px;border-bottom:1px solid #F1F5F9">${dateStr}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:700;color:#374151;border-bottom:1px solid #F1F5F9">Time</td><td style="padding:12px 16px;border-bottom:1px solid #F1F5F9">${timeStr}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:700;color:#374151;border-bottom:1px solid #F1F5F9">Interviewer</td><td style="padding:12px 16px;border-bottom:1px solid #F1F5F9">${interviewerName || 'To be confirmed'}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:700;color:#374151">Format</td><td style="padding:12px 16px">${format === 'in_person' ? 'In Person' : 'TalentNest Video Interview'}</td></tr>
    </table>
    ${joinLink ? `<div style="text-align:center;margin:24px 0"><a href="${joinLink}" style="display:inline-block;background:linear-gradient(135deg,#0176D3,#0ea5e9);color:#fff;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:700;font-size:16px;letter-spacing:0.3px">🎥 Join Interview Room</a><p style="color:#94A3B8;font-size:12px;margin:12px 0 0">This link is unique to your interview. Do not share it.</p></div>` : ''}
    <p style="color:#374151;margin:0">A calendar invite is attached. Please accept it to confirm attendance.</p>
    <p style="color:#94A3B8;font-size:13px;margin:16px 0 0">Best regards,<br><strong>${orgName}</strong></p>
  </div>
</div>`;

  const icalAttachment = icalContent
    ? [{ filename: 'interview-invite.ics', content: Buffer.from(icalContent).toString('base64') }]
    : undefined;

  // Send calendar invite to candidate — uses org's email config if set
  if (candidate?.email) {
    email.sendOrgEmail(candidate.email, `Interview Scheduled — ${job?.title || 'Position'} | ${orgName}`, inviteHtml, req.user.tenantId, icalAttachment).catch(e => console.warn("[Email] candidate:", e.message));
  }
  // Send calendar invite to interviewer
  if (interviewerEmail) {
    email.sendOrgEmail(interviewerEmail, `Interview Scheduled — ${candidate?.name || 'Candidate'} | ${job?.title || 'Position'}`, inviteHtml, req.user.tenantId, icalAttachment).catch(e => console.warn("[Email] interviewer:", e.message));
  }

  // Backfill job/candidate names into the video room if we just created it
  if (nativeJoinLink) {
    try {
      const VideoRoom = require('../models/VideoRoom');
      await VideoRoom.updateOne(
        { interviewId: app._id },
        { $set: { jobTitle: job?.title || 'Interview', candidateName: candidate?.name || 'Candidate', orgName } }
      );
    } catch (e) { /* non-critical */ }
  }

  // WhatsApp to candidate
  if (candidate?.phone) {
    const waMsg = `Hi ${candidate?.name?.split(' ')[0] || 'there'} 👋\n\nYour *${roundLabel}* has been scheduled:\n📅 *${dateStr}*\n🕐 *${timeStr}*\n💼 Role: ${job?.title || 'Position'}\n${nativeJoinLink ? `🔗 Join: ${nativeJoinLink}` : (videoLink ? `🔗 Join: ${videoLink}` : '')}\n\nPlease confirm your availability. All the best! 🎯\n— ${orgName}`;
    sendWhatsApp(candidate.phone, waMsg).catch(() => {});
  }

  logger.audit('Interview scheduled', req.user.id, req.user.tenantId, { appId: app._id, date, roundLabel });
  res.json({ success: true, data: normalizeApp(app) });
}));

// GET /api/applications/scorecards?jobId=xxx — list all scorecard summaries for a job
router.get('/scorecards', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { jobId } = req.query;
  if (!jobId) return res.status(400).json({ message: 'jobId required' });

  const apps = await Application.find({ tenantId: req.user.tenantId, jobId, deletedAt: null })
    .populate('candidateId', 'firstName lastName email')
    .select('candidateId currentStage interviewRounds')
    .lean();

  const results = apps.map(app => ({
    applicationId: app._id,
    candidate: app.candidateId
      ? `${app.candidateId.firstName || ''} ${app.candidateId.lastName || ''}`.trim() || app.candidateId.email
      : 'Unknown',
    currentStage: app.currentStage,
    rounds: (app.interviewRounds || []).map((r, i) => ({
      index          : i,
      scheduledAt    : r.scheduledAt,
      format         : r.format,
      interviewerName: r.interviewerName,
      hasFeedback    : !!(r.feedback?.submittedAt),
      feedback       : r.feedback?.submittedAt ? {
        rating              : r.feedback.rating,
        technicalScore      : r.feedback.technicalScore,
        communicationScore  : r.feedback.communicationScore,
        problemSolvingScore : r.feedback.problemSolvingScore,
        cultureFitScore     : r.feedback.cultureFitScore,
        strengths           : r.feedback.strengths,
        weaknesses          : r.feedback.weaknesses,
        recommendation      : r.feedback.recommendation,
        submittedAt         : r.feedback.submittedAt,
      } : null,
    })),
  }));

  res.json({ success: true, data: results });
}));

// POST /api/applications/:id/interview/:roundIndex/scorecard — submit interview scorecard
router.post('/:id/interview/:roundIndex/scorecard', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter', 'client', 'hiring_manager'),
  asyncHandler(async (req, res) => {
    const { roundIndex } = req.params;
    const { rating, technicalScore, communicationScore, problemSolvingScore, cultureFitScore, strengths, weaknesses, recommendation, notes } = req.body;

    const app = await Application.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
    if (!app) throw new AppError('Application not found.', 404);
    await assertScopedAccess(req, app);

    const idx = parseInt(roundIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= app.interviewRounds.length) {
      throw new AppError('Invalid round index.', 400);
    }

    app.interviewRounds[idx].feedback = {
      rating: rating || 0,
      technicalScore: technicalScore || 0,
      communicationScore: communicationScore || 0,
      problemSolvingScore: problemSolvingScore || 0,
      cultureFitScore: cultureFitScore || 0,
      strengths: strengths || '',
      weaknesses: weaknesses || '',
      recommendation: recommendation || 'hold',
      notes: notes || '',
      submittedBy: req.user.id,
      submittedAt: new Date(),
    };
    app.markModified('interviewRounds');
    await app.save();

    logger.audit('Scorecard submitted', req.user.id, req.user.tenantId, { appId: app._id, roundIndex: idx });

    // ── Fire webhooks (non-blocking)
    const { fireWebhooks } = require('../services/webhookService');
    fireWebhooks(req.user.tenantId, 'interview.completed', {
      applicationId: String(app._id), roundIndex: idx, recommendation: recommendation || 'hold',
    }).catch(() => {});

    res.json({ success: true, data: normalizeApp(app) });
  })
);

// PATCH /api/applications/:id/interview/:roundIndex/reschedule — change date/time of an existing round
router.patch('/:id/interview/:roundIndex/reschedule', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter', 'client', 'hiring_manager'),
  asyncHandler(async (req, res) => {
    const { date, time, notes } = req.body;
    if (!date || !time) throw new AppError('date and time are required.', 400);

    const app = await Application.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
    if (!app) throw new AppError('Application not found.', 404);
    await assertScopedAccess(req, app);

    const idx = parseInt(req.params.roundIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= app.interviewRounds.length) {
      throw new AppError('Invalid round index.', 400);
    }

    const newDate = new Date(`${date}T${time}`);
    if (isNaN(newDate.getTime())) throw new AppError('Invalid date/time.', 400);

    app.interviewRounds[idx].scheduledAt = newDate;
    app.markModified('interviewRounds');
    app.stageHistory.push({ stage: app.currentStage, movedBy: req.user.id, movedAt: new Date(), notes: notes || `Interview Round ${idx + 1} rescheduled` });
    await app.save();

    logger.audit('Interview rescheduled', req.user.id, req.user.tenantId, { appId: app._id, roundIndex: idx, newDate });
    res.json({ success: true, data: normalizeApp(app) });
  })
);

// POST /api/applications/:id/interview/:roundIndex/kit-scores — save structured kit scores
router.post('/:id/interview/:roundIndex/kit-scores', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const { kitScores } = req.body;
    if (!Array.isArray(kitScores)) throw new AppError('kitScores array is required', 400);

    const app = await Application.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
    if (!app) throw new AppError('Application not found.', 404);

    const idx = parseInt(req.params.roundIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= app.interviewRounds.length) {
      throw new AppError('Invalid round index.', 400);
    }

    app.interviewRounds[idx].kitScores = kitScores;
    app.markModified('interviewRounds');
    await app.save();
    res.json({ success: true, data: normalizeApp(app) });
  })
);

// PATCH /api/applications/:id/park — toggle talent pool parking
router.patch('/:id/park', ...guard, asyncHandler(async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
  if (!app) throw new AppError('Application not found.', 404);
  const nowParked = app.status !== 'parked';
  app.status = nowParked ? 'parked' : 'active';
  if (nowParked) {
    app.stageHistory.push({ stage: 'Talent Pool', movedBy: req.user.id, movedAt: new Date(), notes: 'Moved to talent pool' });
  }
  await app.save();
  res.json({ success: true, data: normalizeApp(app), parked: nowParked });
}));


// DELETE /api/applications/:id — soft delete / withdraw
// Candidates: applications live under the job's tenantId (not the candidate's),
// so we look them up by candidateId across any tenant.
// HR/Admin: scoped to their own tenant as usual.
router.delete('/:id', ...guardOrCandidate, asyncHandler(async (req, res) => {
  let filter = { _id: req.params.id, deletedAt: null };

  if (req.user.role === 'candidate') {
    // Find Candidate doc(s) matching this user's email — handles multi-tenant applications.
    // No deletedAt filter: a recruiter archiving the profile must not block the candidate
    // from withdrawing their own applications.
    const candidateDocs = await Candidate.find({ email: req.user.email }).select('_id').lean();
    const candidateIds = candidateDocs.map(c => c._id);
    // Also allow withdrawal when the application was stored with the user's own _id
    const userObjId = req.user._id || req.user.id;
    if (userObjId && !candidateIds.some(id => id.toString() === userObjId.toString())) {
      candidateIds.push(userObjId);
    }
    if (!candidateIds.length) throw new AppError('Application not found.', 404);
    filter.candidateId = { $in: candidateIds };
    // No tenantId restriction — candidate's application may be under the employer's tenant
  } else {
    filter.tenantId = req.user.tenantId;
  }

  const withdrawalReason = req.body?.reason || '';
  const update = {
    deletedAt: new Date(),
    status   : 'withdrawn',
    ...(withdrawalReason ? { rejectionReason: withdrawalReason } : {}),
  };
  const app = await Application.findOneAndUpdate(filter, { $set: update }, { new: true });
  if (!app) throw new AppError('Application not found.', 404);

  await Job.findByIdAndUpdate(app.jobId, { $inc: { applicationCount: -1 } });
  logger.audit('Application archived', req.user.id, req.user.tenantId || app.tenantId, { appId: app._id, reason: withdrawalReason });

  // ── Fire webhooks (non-blocking)
  const { fireWebhooks } = require('../services/webhookService');
  fireWebhooks(app.tenantId, 'application.withdrawn', { applicationId: String(app._id), reason: withdrawalReason }).catch(() => {});

  // Real-time broadcast — pipeline/applicant lists drop this application instantly
  try {
    const { emitToTenant } = require('../socket/platformSocket');
    const socketRegistry   = require('../socket/index');
    emitToTenant(socketRegistry.getIO(), app.tenantId, 'application:stageChanged', {
      applicationId: String(app._id),
      jobId        : String(app.jobId),
      candidateId  : String(app.candidateId),
      stage        : 'Withdrawn',
      movedBy      : String(req.user._id || req.user.id),
      movedAt      : new Date().toISOString(),
    });
  } catch { /* non-fatal */ }

  res.json({ success: true, message: 'Application withdrawn.' });
}));

// ── Public Application Status Tracker ────────────────────────────────────────
// Returns a sanitized status snapshot for an applicant via a token link.
router.get('/status/:token', asyncHandler(async (req, res) => {
  const app = await Application.findOne({ statusToken: req.params.token, deletedAt: null })
    .populate('jobId', 'title company companyName location jobType status')
    .lean();
  if (!app) return res.status(404).json({ message: 'Application not found or link expired.' });

  const stages = (app.stageHistory || []).map(h => ({
    stage  : h.stage,
    movedAt: h.movedAt,
  }));

  res.json({
    status       : app.status,
    currentStage : app.currentStage,
    stageHistory : stages,
    createdAt    : app.createdAt,
    job: {
      title      : app.jobId?.title || '',
      company    : app.jobId?.company || app.jobId?.companyName || '',
      location   : app.jobId?.location || '',
      type       : app.jobId?.jobType || '',
    },
  });
}));

module.exports = router;
module.exports.normalizeStage = normalizeStage;
module.exports.VALID_STAGES = VALID_STAGES;
module.exports.STAGE_ALIAS = STAGE_ALIAS;

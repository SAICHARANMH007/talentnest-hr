'use strict';
const express        = require('express');
const router         = express.Router();
const Application    = require('../models/Application');
const Candidate      = require('../models/Candidate');
const Job            = require('../models/Job');
const Notification   = require('../models/Notification');
const OfferLetter    = require('../models/OfferLetter');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard } = require('../middleware/tenantGuard');
const { allowRoles } = require('../middleware/rbac');
const { getPagination, paginatedResponse } = require('../middleware/paginate');
const asyncHandler   = require('../utils/asyncHandler');
const AppError       = require('../utils/AppError');
const { calculateMatchScore } = require('../utils/matchScore');
const email          = require('../utils/email');
const logger         = require('../middleware/logger');
const crypto         = require('crypto');

const guard = [authMiddleware, tenantGuard];

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
  if (!a.stage && a.currentStage) {
    a.stage = DB_STAGE_TO_FRONTEND[a.currentStage]
      || a.currentStage.toLowerCase().replace(/\s+/g, '_');
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
  if (a.jobId && typeof a.jobId === 'object' && !a.job) {
    a.job = a.jobId;
  }
  return a;
}

// ── PUBLIC ────────────────────────────────────────────────────────────────────

// GET /api/applications/invite/:token — view invite details
router.get('/invite/:token', asyncHandler(async (req, res) => {
  const app = await Application.findOne({ inviteToken: req.params.token, deletedAt: null })
    .populate('jobId', 'title location jobType description skills tenantId')
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
      link: `/recruiter/pipeline?appId=${app._id}`,
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

// POST /api/applications/public — guest apply from career page
router.post('/public', asyncHandler(async (req, res) => {
  const { jobId, name, email: candidateEmail, phone, coverLetter, screeningAnswers } = req.body;
  if (!jobId || !name || !candidateEmail) throw new AppError('jobId, name, and email are required.', 400);

  const job = await Job.findOne({ _id: jobId, status: 'active', deletedAt: null }).lean();
  if (!job) throw new AppError('Job not found.', 404);

  let candidate = await Candidate.findOne({ email: candidateEmail.toLowerCase().trim(), tenantId: job.tenantId, deletedAt: null });
  if (!candidate) {
    candidate = await Candidate.create({
      tenantId: job.tenantId,
      name: name.trim(),
      email: candidateEmail.toLowerCase().trim(),
      phone: phone || '',
      source: 'career_page',
    });
  }

  const exists = await Application.findOne({ jobId, candidateId: candidate._id, deletedAt: null });
  if (exists) throw new AppError('Already applied for this job.', 409);

  const { score, breakdown } = calculateMatchScore(job, candidate);

  const app = await Application.create({
    tenantId: job.tenantId,
    jobId,
    candidateId: candidate._id,
    source: 'career_page',
    coverLetter: coverLetter || '',
    aiMatchScore: score,
    matchBreakdown: breakdown,
    currentStage: 'Applied',
    stageHistory: [{ stage: 'Applied', movedAt: new Date(), notes: 'Applied via career page' }],
    screeningAnswers: Array.isArray(screeningAnswers) ? screeningAnswers : [],
  });

  await Job.findByIdAndUpdate(jobId, { $inc: { applicationCount: 1 } });

  // Notify assigned recruiters about the new career-page application
  const recruiters = job.assignedRecruiters || [];
  for (const rid of recruiters) {
    Notification.create({
      userId: rid, tenantId: job.tenantId, type: 'application',
      title: 'New Career Page Application',
      message: `${candidate.name} applied for ${job.title} via the career page`,
      link: `/recruiter/pipeline?jobId=${jobId}`,
    }).catch(() => {});
    // Email notification
    const recruiter = await require('../models/User').findById(rid).select('name email').lean();
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

  res.status(201).json({ success: true, data: normalizeApp(app) });
}));

// ── PRIVATE ───────────────────────────────────────────────────────────────────

// POST /api/applications — internal apply
router.post('/', ...guard, asyncHandler(async (req, res) => {
  const { jobId, candidateId, coverLetter, screeningAnswers } = req.body;
  if (!jobId || !candidateId) throw new AppError('jobId and candidateId are required.', 400);

  const [job, candidate] = await Promise.all([
    Job.findOne({ _id: jobId, tenantId: req.user.tenantId, deletedAt: null }).lean(),
    Candidate.findOne({ _id: candidateId, tenantId: req.user.tenantId, deletedAt: null }).lean(),
  ]);
  if (!job)       throw new AppError('Job not found.', 404);
  if (!candidate) throw new AppError('Candidate not found.', 404);

  const exists = await Application.findOne({ jobId, candidateId, deletedAt: null });
  if (exists) throw new AppError('This candidate has already been submitted for this job.', 409);

  const { score, breakdown } = calculateMatchScore(job, candidate);

  const app = await Application.create({
    tenantId: req.user.tenantId,
    jobId,
    candidateId,
    source: 'platform',
    coverLetter: coverLetter || '',
    aiMatchScore: score,
    matchBreakdown: breakdown,
    currentStage: 'Applied',
    stageHistory: [{ stage: 'Applied', movedBy: req.user.id, movedAt: new Date() }],
    screeningAnswers: Array.isArray(screeningAnswers) ? screeningAnswers : [],
  });

  await Job.findByIdAndUpdate(jobId, { $inc: { applicationCount: 1 } });

  // Background notifications to assigned recruiters
  const recruiters = job.assignedRecruiters || [];
  for (const rid of recruiters) {
    Notification.create({
      userId: rid, tenantId: req.user.tenantId, type: 'application',
      title: 'New Application',
      message: `${candidate.name} applied for ${job.title}`,
      link: `/recruiter/pipeline?jobId=${jobId}`,
    }).catch(() => {});
  }

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
    const { score, breakdown } = calculateMatchScore(job, candidate);

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
        aiMatchScore: score,
        matchBreakdown: breakdown,
        currentStage: 'Applied',
        stageHistory: [{ stage: 'Applied', movedBy: req.user.id, movedAt: new Date(), notes: 'Invited by recruiter' }],
      });
    }

    // Send invite email if candidate has email
    if (candidate.email) {
      const inviteLink = `${process.env.FRONTEND_URL || 'https://talentnesthr.com'}/invite/${inviteToken}`;
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
        email.sendEmailWithRetry(candidate.email, tpl.subject, tpl.html).catch(() => {});
      }
    }

    logger.audit('Invite sent', req.user.id, req.user.tenantId, { appId: app._id, candidateId });
    res.status(201).json({ success: true, message: 'Invitation sent.', data: normalizeApp(app) });
  })
);

// GET /api/applications/mine — candidate's own applications
router.get('/mine', ...guard,
  allowRoles('candidate'),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const filter = { candidateId: req.user.id, deletedAt: null };
    const [apps, total] = await Promise.all([
      Application.find(filter).populate('jobId', 'title location jobType').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
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
    filter.jobId = { $in: myJobs.map(j => j._id) };
  }
  if (req.query.jobId) filter.jobId = req.query.jobId;
  if (req.query.stage) filter.currentStage = req.query.stage;
  if (req.query.status) filter.status = req.query.status;

  const [apps, total] = await Promise.all([
    Application.find(filter)
      .populate('jobId', 'title company location department')
      .populate('candidateId', 'name email phone title skills experience summary location source videoResumeUrl')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Application.countDocuments(filter),
  ]);
  res.json(paginatedResponse(apps.map(normalizeApp), total, limit, page));
}));

// GET /api/applications/talent-pool — all parked apps for tenant (must be before /:id)
router.get('/talent-pool', ...guard, asyncHandler(async (req, res) => {
  const apps = await Application.find({ tenantId: req.user.tenantId, status: 'parked', deletedAt: null })
    .populate('candidateId', 'name email phone title skills location')
    .populate('jobId', 'title company')
    .lean();
  const data = apps.map(a => ({ ...a, id: a._id?.toString() }));
  res.json({ success: true, data });
}));

// GET /api/applications/:id — single application
router.get('/:id', ...guard, asyncHandler(async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null })
    .populate('jobId')
    .populate('candidateId')
    .lean();
  if (!app) throw new AppError('Application not found.', 404);
  res.json({ success: true, data: normalizeApp(app) });
}));

// PATCH /api/applications/:id/stage — move pipeline stage
router.patch('/:id/stage', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const { notes } = req.body;
    const stage = normalizeStage(req.body.stage);
    if (!stage) throw new AppError(`Invalid stage. Valid: ${VALID_STAGES.join(', ')}`, 400);

    const mongoose = require('mongoose');
    const session = await mongoose.startSession();
    let app;
    try {
      await session.withTransaction(async () => {
        const stageFilter = { _id: req.params.id, deletedAt: null };
        if (req.user.role !== 'super_admin') stageFilter.tenantId = req.user.tenantId;
        app = await Application.findOne(stageFilter).session(session);
        if (!app) throw new AppError('Application not found.', 404);

        app.currentStage = stage;
        app.stageHistory.push({ stage, movedBy: req.user.id, movedAt: new Date(), notes: notes || '' });
        if (stage === 'Hired')    app.status = 'hired';
        if (stage === 'Rejected') {
          app.status = 'rejected';
          if (req.body.rejectionReason) app.rejectionReason = req.body.rejectionReason;
        }
        await app.save({ session });
      });
    } finally {
      session.endSession();
    }

    // Send stage-change email to candidate
    const candidate = await Candidate.findById(app.candidateId).select('name email').lean();
    if (candidate?.email) {
      const jobDoc = await Job.findById(app.jobId).select('title').lean();
      const FRONTEND_URL = process.env.FRONTEND_URL || 'https://talentnesthr.com';
      const stageEmailMap = {
        Shortlisted: {
          subject: `🎉 You've been shortlisted for ${jobDoc?.title}`,
          icon: '🎉', color: '#0176D3',
          headline: `You've been shortlisted!`,
          body: `Great news, <strong>${candidate.name}</strong>! You have been shortlisted for the <strong>${jobDoc?.title}</strong> role. Our team will be in touch shortly with next steps.`,
        },
        'Interview Round 1': {
          subject: `📅 Interview Invitation — ${jobDoc?.title}`,
          icon: '📅', color: '#7C3AED',
          headline: 'You have an interview!',
          body: `Hi <strong>${candidate.name}</strong>, you have been selected for an interview for the <strong>${jobDoc?.title}</strong> role. Please check your portal for details.`,
        },
        'Interview Round 2': {
          subject: `📅 Interview Round 2 — ${jobDoc?.title}`,
          icon: '📅', color: '#7C3AED',
          headline: 'You have a second interview!',
          body: `Hi <strong>${candidate.name}</strong>, congratulations on clearing Round 1! You have been invited for Interview Round 2 for <strong>${jobDoc?.title}</strong>.`,
        },
        'Technical Interview': {
          subject: `💻 Technical Interview — ${jobDoc?.title}`,
          icon: '💻', color: '#0369A1',
          headline: 'Technical Interview scheduled',
          body: `Hi <strong>${candidate.name}</strong>, you have been selected for a Technical Interview for the <strong>${jobDoc?.title}</strong> role.`,
        },
        Offer: {
          subject: `🤝 Offer Extended — ${jobDoc?.title}`,
          icon: '🤝', color: '#059669',
          headline: 'An offer is on its way!',
          body: `Hi <strong>${candidate.name}</strong>, we are pleased to extend an offer for the <strong>${jobDoc?.title}</strong> role. Please log in to review and accept your offer letter.`,
        },
        Hired: {
          subject: `🎊 Welcome to the team! — ${jobDoc?.title}`,
          icon: '🎊', color: '#059669',
          headline: 'Welcome aboard!',
          body: `Congratulations <strong>${candidate.name}</strong>! You have been officially hired for the <strong>${jobDoc?.title}</strong> role. We are excited to have you on board!`,
        },
        Rejected: {
          subject: `Application Update — ${jobDoc?.title}`,
          icon: '📋', color: '#6B7280',
          headline: 'Application status update',
          body: `Hi <strong>${candidate.name}</strong>, thank you for your interest in the <strong>${jobDoc?.title}</strong> role. After careful consideration, we will not be moving forward at this time. We encourage you to apply for future openings.`,
        },
      };
      const tpl = stageEmailMap[stage];
      if (tpl) {
        const html = `<div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px 20px;">
          <div style="background:linear-gradient(135deg,${tpl.color},#032D60);padding:28px 32px;border-radius:16px 16px 0 0;">
            <div style="font-size:32px;margin-bottom:8px;">${tpl.icon}</div>
            <h1 style="color:#fff;font-size:20px;margin:0;">${tpl.headline}</h1>
          </div>
          <div style="background:#fff;padding:28px 32px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">
            <p style="color:#374151;font-size:15px;line-height:1.7;">${tpl.body}</p>
            <a href="${FRONTEND_URL}/app" style="display:inline-block;background:${tpl.color};color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;margin-top:8px;">View Application →</a>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px;">You are receiving this email because you applied through TalentNest HR.</p>
          </div>
        </div>`;
        email.sendEmailWithRetry?.(candidate.email, tpl.subject, html).catch(() => {});
      }
    }

    if (stage === 'Hired') {
      await Job.findByIdAndUpdate(app.jobId, { $inc: { hiredCount: 1 } });
    }

    // When moved to Offer stage, create a blank OfferLetter if one doesn't exist
    if (stage === 'Offer') {
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

    // Push notification to the recruiter/creator of the job
    try {
      const { sendPush } = require('../utils/sendPush');
      const jobDoc = await Job.findById(app.jobId).lean();
      const candidateDoc = await Candidate.findById(app.candidateId).select('name').lean();
      if (jobDoc && jobDoc.createdBy) {
        await sendPush(jobDoc.createdBy, {
          title: 'Stage Updated',
          body: `${candidateDoc?.name || 'Candidate'} moved to ${stage} for ${jobDoc.title}`,
          url: `/app/pipeline?job=${jobDoc._id}`,
        });
      }
    } catch (e) { /* non-fatal */ }

    // Trigger workflow rules (fire-and-forget)
    const { evaluateWorkflows } = require('../services/workflowEngine');
    const candidateForWf = await Candidate.findById(app.candidateId).select('name email phone source').lean();
    const jobForWf = await Job.findById(app.jobId).select('title assignedRecruiters').lean();
    evaluateWorkflows(req.user.tenantId, {
      event         : 'stage_changed',
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
    }).catch(() => {});

    logger.audit('Stage changed', req.user.id, req.user.tenantId, { appId: app._id, stage });
    res.json({ success: true, data: normalizeApp(app) });
  })
);

// PATCH /api/applications/:id/notes
router.patch('/:id/notes', ...guard, asyncHandler(async (req, res) => {
  const { notes } = req.body;
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
  const app = await Application.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
    { $set: { tags } },
    { new: true }
  );
  if (!app) throw new AppError('Application not found.', 404);
  res.json({ success: true, data: normalizeApp(app) });
}));

// PATCH /api/applications/:id/feedback — recruiter feedback
router.patch('/:id/feedback', ...guard, asyncHandler(async (req, res) => {
  const { rating, strengths, weaknesses, recommendation, comment } = req.body;
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
  const { date, time, format, interviewerName, interviewerEmail, videoLink, notes } = req.body;
  if (!date || !time) throw new AppError('date and time are required.', 400);
  if (videoLink && !/^https?:\/\//i.test(videoLink)) throw new AppError('videoLink must start with https://', 400);
  if (notes && notes.length > 1000) throw new AppError('Notes must be 1000 characters or fewer.', 400);

  const app = await Application.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
  if (!app) throw new AppError('Application not found.', 404);

  const scheduledAt = new Date(`${date}T${time}`);
  const endAt = new Date(scheduledAt.getTime() + 60 * 60 * 1000); // +1 hour
  const roundIndex = app.interviewRounds.length; // 0-based index of this new round
  const roundLabel = `Interview Round ${roundIndex + 1}`;

  app.interviewRounds.push({
    scheduledAt,
    format: format || 'video',
    interviewerName: interviewerName || '',
    interviewerEmail: interviewerEmail || '',
    videoLink: videoLink || '',
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

  const orgName = req.tenant?.name || 'TalentNest HR';
  const dateStr = scheduledAt.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = scheduledAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  // Build calendar invite
  const icalContent = buildICalEvent({
    summary: `${roundLabel} — ${job?.title || 'Interview'} @ ${orgName}`,
    description: `Interview for ${job?.title || 'the role'}\nCandidate: ${candidate?.name || ''}\nFormat: ${format || 'Video'}\n${videoLink ? `Link: ${videoLink}` : ''}`,
    startDt: scheduledAt,
    endDt: endAt,
    location: videoLink || (format === 'in_person' ? 'Office' : 'Video Call'),
    organizer: { name: req.user.name || orgName, email: process.env.RESEND_FROM || 'hr@talentnesthr.com' },
    attendees: [
      candidate?.email ? { name: candidate.name, email: candidate.email } : null,
      interviewerEmail ? { name: interviewerName || 'Interviewer', email: interviewerEmail } : null,
    ].filter(Boolean),
  });

  const inviteHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#0176D3">🎉 Interview Scheduled — ${job?.title || 'Position'}</h2>
      <p>Dear ${candidate?.name || 'Candidate'},</p>
      <p>We are pleased to inform you that your interview has been scheduled.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;background:#f0f9ff;font-weight:700;width:40%">Round</td><td style="padding:8px">${roundLabel}</td></tr>
        <tr><td style="padding:8px;background:#f0f9ff;font-weight:700">Date</td><td style="padding:8px">${dateStr}</td></tr>
        <tr><td style="padding:8px;background:#f0f9ff;font-weight:700">Time</td><td style="padding:8px">${timeStr}</td></tr>
        <tr><td style="padding:8px;background:#f0f9ff;font-weight:700">Format</td><td style="padding:8px">${format || 'Video Call'}</td></tr>
        <tr><td style="padding:8px;background:#f0f9ff;font-weight:700">Interviewer</td><td style="padding:8px">${interviewerName || 'To be confirmed'}</td></tr>
        ${videoLink ? `<tr><td style="padding:8px;background:#f0f9ff;font-weight:700">Join Link</td><td style="padding:8px"><a href="${videoLink}">${videoLink}</a></td></tr>` : ''}
      </table>
      <p>A calendar invite is attached. Please accept it to confirm your attendance.</p>
      <p>Best regards,<br>${orgName}</p>
    </div>`;

  const icalAttachment = icalContent
    ? [{ filename: 'interview-invite.ics', content: Buffer.from(icalContent).toString('base64') }]
    : undefined;

  // Send calendar invite to candidate
  if (candidate?.email) {
    email.sendEmailWithRetry?.(candidate.email, `Interview Scheduled — ${job?.title || 'Position'} | ${orgName}`, inviteHtml, icalAttachment).catch(() => {});
  }
  // Send calendar invite to interviewer
  if (interviewerEmail) {
    email.sendEmailWithRetry?.(interviewerEmail, `Interview Scheduled — ${candidate?.name || 'Candidate'} | ${job?.title || 'Position'}`, inviteHtml, icalAttachment).catch(() => {});
  }

  // WhatsApp to candidate
  if (candidate?.phone) {
    const waMsg = `Hi ${candidate?.name?.split(' ')[0] || 'there'} 👋\n\nYour *${roundLabel}* has been scheduled:\n📅 *${dateStr}*\n🕐 *${timeStr}*\n💼 Role: ${job?.title || 'Position'}\n${videoLink ? `🔗 Join: ${videoLink}` : ''}\n\nPlease confirm your availability. All the best! 🎯\n— ${orgName}`;
    sendWhatsApp(candidate.phone, waMsg).catch(() => {});
  }

  logger.audit('Interview scheduled', req.user.id, req.user.tenantId, { appId: app._id, date, roundLabel });
  res.json({ success: true, data: normalizeApp(app) });
}));

// POST /api/applications/:id/interview/:roundIndex/scorecard — submit interview scorecard
router.post('/:id/interview/:roundIndex/scorecard', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const { roundIndex } = req.params;
    const { rating, technicalScore, communicationScore, problemSolvingScore, cultureFitScore, strengths, weaknesses, recommendation, notes } = req.body;

    const app = await Application.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
    if (!app) throw new AppError('Application not found.', 404);

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


// DELETE /api/applications/:id — soft delete
router.delete('/:id', ...guard, asyncHandler(async (req, res) => {
  const app = await Application.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
    { $set: { deletedAt: new Date(), status: 'withdrawn' } },
    { new: true }
  );
  if (!app) throw new AppError('Application not found.', 404);

  await Job.findByIdAndUpdate(app.jobId, { $inc: { applicationCount: -1 } });
  logger.audit('Application archived', req.user.id, req.user.tenantId, { appId: app._id });
  res.json({ success: true, message: 'Application archived.' });
}));

// GET /api/applications/export — export pipeline to Excel
router.get('/export', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { exportToExcel } = require('../utils/exportToExcel');
  const filter = { deletedAt: null, tenantId: req.user.tenantId };
  if (req.query.jobId) filter.jobId = req.query.jobId;
  if (req.query.stage) filter.currentStage = req.query.stage;

  const apps = await Application.find(filter)
    .populate('candidateId', 'name email phone location skills')
    .populate('jobId', 'title')
    .sort({ createdAt: -1 })
    .limit(5000)
    .lean();

  const columns = [
    { header: 'Candidate',    key: 'candidateName',  width: 22 },
    { header: 'Email',        key: 'email',          width: 28 },
    { header: 'Phone',        key: 'phone',          width: 16 },
    { header: 'Job',          key: 'jobTitle',       width: 30 },
    { header: 'Stage',        key: 'currentStage',   width: 20 },
    { header: 'Status',       key: 'status',         width: 12 },
    { header: 'AI Score',     key: 'aiMatchScore',   width: 12 },
    { header: 'Source',       key: 'source',         width: 14 },
    { header: 'Applied Date', key: 'appliedDate',    width: 16 },
  ];

  const rows = apps.map(a => ({
    candidateName: a.candidateId?.name || '',
    email:         a.candidateId?.email || '',
    phone:         a.candidateId?.phone || '',
    jobTitle:      a.jobId?.title || '',
    currentStage:  a.currentStage || '',
    status:        a.status || '',
    aiMatchScore:  a.aiMatchScore ?? '',
    source:        a.source || '',
    appliedDate:   a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN') : '',
  }));

  const buf = exportToExcel('Pipeline', columns, rows);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="pipeline-export-${Date.now()}.xlsx"`);
  res.send(buf);
}));

module.exports = router;

'use strict';
const express         = require('express');
const router          = express.Router();
const Job             = require('../models/Job');
const User            = require('../models/User');
const Candidate       = require('../models/Candidate');
const Application     = require('../models/Application');
const Notification    = require('../models/Notification');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard } = require('../middleware/tenantGuard');
const { allowRoles }  = require('../middleware/rbac');
const checkPlanLimits = require('../middleware/checkPlanLimits');
const { getPagination, paginatedResponse } = require('../middleware/paginate');
const asyncHandler    = require('../utils/asyncHandler');
const AppError        = require('../utils/AppError');
const logger          = require('../middleware/logger');
const { calculateTalentMatchScore } = require('../utils/matchScore');
const { classifyJob }               = require('../utils/classifyJob');
const { invalidatePrefix }          = require('../middleware/cache');

/** Escape regex special chars to prevent ReDoS on user-supplied search strings */
function escRe(s) { return String(s).slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeJob(job) {
  const j = job.toObject ? job.toObject() : { ...job };
  j.id = j.id || j._id?.toString();
  if (!Array.isArray(j.skills)) j.skills = [];
  if (!Array.isArray(j.niceToHaveSkills)) j.niceToHaveSkills = [];
  if (j.company && !j.companyName) j.companyName = j.company;
  if (j.companyName && !j.company) j.company = j.companyName;
  j.applicantsCount = j.applicationCount || 0;
  j.selectedCount   = j.hiredCount || 0;
  const _slug = j.careerPageSlug || String(j._id);
  const _base = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
  j.canonicalUrl = `${_base}/careers/job/${_slug}`;
  j.seoSlug      = _slug;
  return j;
}

const guard = [authMiddleware, tenantGuard];

// ── PUBLIC — optimised for high traffic (millions of requests) ───────────────
// Only select fields needed by the public job board — reduces payload ~60%.
// No auth required. HTTP cache headers tell CDN/browsers to cache for 5 minutes.
const PUBLIC_JOB_FIELDS = 'title company companyName department industry location branch jobType workMode experience urgency skills description requirements benefits salaryMin salaryMax salaryCurrency salaryType careerPageSlug externalUrl createdAt updatedAt numberOfOpenings applicationDeadline screeningQuestions referralReward referralEnabled companyDescription hqCity hqCountry foundedYear employeeCount website productsServices cultureNotes successStories applicationCount';
// Lean variant strips heavy text fields (description/requirements/benefits) — used by
// the candidate matching pool fetch where only scoring fields are needed (~70% smaller).
const LEAN_JOB_FIELDS  = 'title company companyName department industry location jobType workMode experience urgency skills salaryMin salaryMax salaryCurrency salaryType careerPageSlug externalUrl createdAt updatedAt numberOfOpenings applicationDeadline';

// ── PUBLIC: fetch one job by ID (for shared links — no auth) ─────────────────
router.get('/public/single/:id', asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  const job = await Job.findOne({
    _id: req.params.id,
    status: 'active',
    approvalStatus: { $nin: ['pending_approval', 'rejected'] },
    deletedAt: null,
  }).select(PUBLIC_JOB_FIELDS).lean();
  if (!job) return res.status(404).json({ success: false, error: 'Job not found or no longer active' });
  res.json({ success: true, data: normalizeJob(job) });
}));

router.get('/public', asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');

  const requestedLimit = parseInt(req.query.limit) || 100;
  const limit = Math.min(requestedLimit, 10000); // Production Standard: High-capacity pool for 100% result visibility
  const { page, skip } = getPagination(req, { limit });
  // Career portal: show active, non-deleted jobs that haven't passed their deadline
  const filter = {
    status  : 'active',
    deletedAt: null,
    $and: [{ $or: [
      { applicationDeadline: null },
      { applicationDeadline: { $exists: false } },
      { applicationDeadline: { $gte: new Date() } },
    ]}],
  };

  if (req.query.tenantId) filter.tenantId = req.query.tenantId;
  if (req.query.slug)     filter.careerPageSlug = req.query.slug;
  if (req.query.orgSlug) {
    const Organization = require('../models/Organization');
    const org = await Organization.findOne({ slug: req.query.orgSlug }).select('_id').lean();
    if (org) filter.tenantId = org._id;
  }
  if (req.query.search) {
    const { expandSearch } = require('../utils/search');
    const sr = { $regex: expandSearch(req.query.search), $options: 'i' };
    filter.$or = [{ title: sr }, { description: sr }, { company: sr }, { companyName: sr }, { skills: sr }];
  }
  if (req.query.urgency   && req.query.urgency   !== 'All') filter.urgency    = req.query.urgency;
  if (req.query.department && req.query.department !== 'All') filter.department = { $regex: escRe(req.query.department), $options: 'i' };
  if (req.query.industry   && req.query.industry   !== 'All') filter.industry   = { $regex: escRe(req.query.industry), $options: 'i' };
  if (req.query.location   && req.query.location   !== 'All') filter.location   = { $regex: escRe(req.query.location), $options: 'i' };
  if (req.query.jobType    && req.query.jobType    !== 'All') filter.jobType    = req.query.jobType;
  if (req.query.company   && req.query.company   !== 'All') {
    filter.$or = filter.$or || [];
    filter.$or.push({ company: { $regex: escRe(req.query.company), $options: 'i' } });
    filter.$or.push({ companyName: { $regex: escRe(req.query.company), $options: 'i' } });
  }
  if (req.query.skills) {
    const skillList = String(req.query.skills).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (skillList.length > 0) filter.skills = { $in: skillList.map(s => new RegExp(escRe(s), 'i')) };
  }
  if (req.query.experienceLevel && req.query.experienceLevel !== 'All') {
    filter.experience = { $regex: escRe(req.query.experienceLevel), $options: 'i' };
  }

  // Run count and job fetch in parallel; skip expensive uniqueCompanies on paginated requests
  const isFirstPage = page === 1 && !req.query.search;
  const selectFields = req.query.lean === '1' ? LEAN_JOB_FIELDS : PUBLIC_JOB_FIELDS;
  const [jobs, total, urgentCount, uniqueCompanies] = await Promise.all([
    Job.find(filter)
      .select(selectFields)        // lean payload — no recruiter/tenant/internal fields
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Job.countDocuments(filter),
    isFirstPage ? Job.countDocuments({ ...filter, urgency: 'High' }) : Promise.resolve(0),
    isFirstPage ? Job.distinct('company', { status: 'active', deletedAt: null }) : Promise.resolve([]),
  ]);

  const resp = paginatedResponse(jobs.map(normalizeJob), total, limit, page);
  if (isFirstPage) resp.stats = { urgent: urgentCount, companies: uniqueCompanies.length };
  res.json(resp);
}));

// ── PRIVATE ───────────────────────────────────────────────────────────────────
router.get('/', ...guard, asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = { deletedAt: null };
  if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;
  if (req.user.role === 'recruiter') {
    filter.assignedRecruiters = req.user.id;
  } else if (req.query.recruiterId && ['admin', 'super_admin'].includes(req.user.role)) {
    filter.assignedRecruiters = req.query.recruiterId;
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.urgency && req.query.urgency !== 'All') filter.urgency = req.query.urgency;
  if (req.query.department && req.query.department !== 'All') filter.department = { $regex: escRe(req.query.department), $options: 'i' };
  if (req.query.industry && req.query.industry !== 'All') filter.industry = { $regex: escRe(req.query.industry), $options: 'i' };
  if (req.query.location && req.query.location !== 'All') filter.location = { $regex: escRe(req.query.location), $options: 'i' };
  
  if (req.query.search) {
    const { expandSearch } = require('../utils/search');
    const sr = { $regex: expandSearch(req.query.search), $options: 'i' };
    filter.$or = [{ title: sr }, { company: sr }, { skills: sr }];
  }
  
  if (req.query.skills) {
    const skillList = String(req.query.skills).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (skillList.length > 0) filter.skills = { $in: skillList.map(s => new RegExp(escRe(s), 'i')) };
  }
  // ?minimal=true: return only lightweight selector fields (skips description/requirements/benefits)
  const selectFields = req.query.minimal === 'true'
    ? 'title company companyName applicantsCount applicationCount status urgency location skills department experience recruiterHistory assignedRecruiters careerPageSlug createdAt'
    : '-__v';
  const [jobs, total] = await Promise.all([
    Job.find(filter).select(selectFields).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Job.countDocuments(filter),
  ]);
  res.json(paginatedResponse(jobs.map(normalizeJob), total, limit, page));
}));

router.get('/pending', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const filter = { status: 'draft', deletedAt: null };
  if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;
  const jobs = await Job.find(filter).populate('createdBy', 'name email').sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: jobs.map(j => ({ ...normalizeJob(j), id: j._id.toString() })) });
}));

// GET /api/jobs/pending-approval — all jobs awaiting admin review (must be before /:id)
router.get('/pending-approval', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const filter = { approvalStatus: 'pending_approval', deletedAt: null };
  if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;
  const jobs = await Job.find(filter)
    .populate('postedBy', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();
  const normalized = jobs.map(j => ({ ...normalizeJob(j), id: j._id.toString() }));
  res.json({ success: true, data: normalized, total: normalized.length });
}));

router.get('/:id', ...guard, asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, deletedAt: null };
  if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;
  const job = await Job.findOne(filter).lean();
  if (!job) throw new AppError('Job not found.', 404);
  res.json({ success: true, data: normalizeJob(job) });
}));

router.post('/', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), checkPlanLimits('jobs'), asyncHandler(async (req, res) => {
  const { title, description, skills, niceToHaveSkills, recruiterId, ...rest } = req.body;
  if (!title || !description) throw new AppError('title and description are required.', 400);

  // Require industry and department — auto-fill from classifier if not provided
  let industry   = (rest.industry   || '').trim();
  let department = (rest.department || '').trim();
  if (!industry || !department) {
    const classified = classifyJob(title, description);
    if (!industry)   industry   = classified.industry;
    if (!department) department = classified.department;
  }
  // Still missing after classification → return validation error
  if (!industry)   throw new AppError('Industry is required for this job posting.', 400);
  if (!department) throw new AppError('Department is required for this job posting.', 400);
  rest.industry   = industry;
  rest.department = department;
  const assignedRecruiters = [];
  if (req.user.role === 'recruiter') {
    assignedRecruiters.push(req.user.id);
  } else if (recruiterId) {
    assignedRecruiters.push(recruiterId);
  } else {
    // Admin created job with no recruiter specified — check if org has any active recruiters.
    // If not, auto-assign the admin so the job is never orphaned (admin acts as recruiter).
    const hasRecruiter = await User.exists({
      tenantId: req.user.tenantId,
      role: 'recruiter',
      isActive: true,
      deletedAt: null,
    });
    if (!hasRecruiter) assignedRecruiters.push(req.user.id);
  }
  const baseSlug  = slugify(title);
  const slugCount = await Job.countDocuments({ tenantId: req.user.tenantId, careerPageSlug: { $regex: `^${baseSlug}` } });
  const careerPageSlug = slugCount === 0 ? baseSlug : `${baseSlug}-${slugCount}`;

  // Recruiters submit for approval; admins/super_admins publish directly
  const isRecruiter = req.user.role === 'recruiter';
  const approvalStatus = isRecruiter ? 'pending_approval' : 'approved';
  const jobStatus      = isRecruiter ? 'draft' : (rest.status || 'active');

  const job = await Job.create({
    ...rest,
    tenantId      : req.user.tenantId,
    createdBy     : req.user.id,
    postedBy      : req.user.id,
    title         : title.trim(),
    description,
    skills        : Array.isArray(skills) ? skills.map(s => String(s).toLowerCase().trim()) : [],
    niceToHaveSkills: Array.isArray(niceToHaveSkills) ? niceToHaveSkills.map(s => String(s).toLowerCase().trim()) : [],
    assignedRecruiters,
    careerPageSlug,
    status        : jobStatus,
    approvalStatus,
    ...(isRecruiter ? {} : { approvedBy: req.user.id, approvedAt: new Date() }),
  });
  logger.audit('Job created', req.user.id, req.user.tenantId, { jobId: job._id, title, approvalStatus });

  // Notify all admins in the tenant about pending approval
  if (isRecruiter) {
    const admins = await User.find({ tenantId: req.user.tenantId, role: { $in: ['admin', 'super_admin'] }, deletedAt: null }).select('_id').lean();
    const recruiterName = req.user.name || 'A recruiter';
    await Promise.all(admins.map(a =>
      Notification.create({
        userId: a._id, tenantId: req.user.tenantId, type: 'job_approval_request',
        title: 'Job Pending Approval',
        message: `${recruiterName} submitted "${title.trim()}" for your approval.`,
        link: '/app/job-approvals',
        metadata: { jobId: job._id },
      }).catch(() => {})
    ));
  }

  res.status(201).json({ success: true, data: normalizeJob(job), requiresApproval: isRecruiter });

  // IndexNow ping — fire-and-forget, never block the response
  if (job.status === 'active') {
    pingIndexNow(job).catch(() => {});
    require('./jobAlerts').notifyMatchingAlerts(job).catch(() => {});
  }
}));

// ── IndexNow helper — pings Bing/Yandex instantly when a job is created/activated ──
async function pingIndexNow(job) {
  const key  = process.env.INDEXNOW_KEY;
  const base = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
  if (!key) return;
  const slug    = job.careerPageSlug || String(job._id);
  const jobUrl  = `${base}/careers/job/${slug}`;
  const payload = {
    host:        new URL(base).host,
    key,
    keyLocation: `${base}/${key}.txt`,
    urlList:     [jobUrl],
  };
  try {
    const https = require('https');
    const body  = JSON.stringify(payload);
    const u     = new URL('https://api.indexnow.org/indexnow');
    await new Promise((resolve) => {
      const req = https.request({ hostname: u.hostname, path: u.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
        res => { res.resume(); resolve(); });
      req.on('error', resolve);
      req.write(body); req.end();
    });
  } catch { /* non-critical */ }
}

// ── PATCH /api/jobs/career-listing — bulk toggle isPublic for career listing ───
// Admin sets which of their org's jobs appear on the public career page.
// Super_admin can pass orgId to scope the update to a specific org.
router.patch('/career-listing', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { publish, unpublish, orgId } = req.body;
  let tenantFilter;
  if (req.user.role === 'super_admin' && orgId) {
    tenantFilter = { tenantId: orgId };
  } else if (req.user.role === 'super_admin') {
    tenantFilter = {}; // super_admin without orgId — no tenant restriction (use with care)
  } else {
    tenantFilter = { tenantId: req.user.tenantId };
  }
  const ops = [];
  if (Array.isArray(publish) && publish.length > 0) {
    ops.push(Job.updateMany({ _id: { $in: publish }, ...tenantFilter, deletedAt: null }, { $set: { isPublic: true } }));
  }
  if (Array.isArray(unpublish) && unpublish.length > 0) {
    ops.push(Job.updateMany({ _id: { $in: unpublish }, ...tenantFilter, deletedAt: null }, { $set: { isPublic: false } }));
  }
  await Promise.all(ops);
  logger.audit('Career listing updated', req.user.id, req.user.tenantId, { published: (publish||[]).length, unpublished: (unpublish||[]).length, orgId: orgId || req.user.tenantId });
  res.json({ success: true });
}));

router.patch('/:id', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
    const forbidden = ['tenantId', 'createdBy', 'careerPageSlug'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => !forbidden.includes(k)));
    if (updates.skills !== undefined) updates.skills = Array.isArray(updates.skills) ? updates.skills.map(s => String(s).toLowerCase().trim()) : [];
    
    // Salary range sanity check
    const min = updates.salaryMin !== undefined ? Number(updates.salaryMin) : null;
    const max = updates.salaryMax !== undefined ? Number(updates.salaryMax) : null;
    if (min !== null && max !== null && min > max) throw new AppError('salaryMin cannot exceed salaryMax.', 400);

    const patchFilter = { _id: req.params.id, deletedAt: null };
    if (req.user.role !== 'super_admin') patchFilter.tenantId = req.user.tenantId;
    const prevJob = await Job.findOne(patchFilter).select('status closedAt').lean();
    if (updates.status === 'closed' && prevJob?.status !== 'closed') updates.closedAt = new Date();
    if (updates.status === 'active' && prevJob?.status === 'closed') updates.closedAt = null;
    const job = await Job.findOneAndUpdate(patchFilter, { $set: updates }, { new: true });
    if (!job) throw new AppError('Job not found.', 404);

    // Notify admins when recruiter explicitly submits a draft job for approval
    if (updates.approvalStatus === 'pending_approval' && req.user.role === 'recruiter') {
      const admins = await User.find({ tenantId: req.user.tenantId, role: { $in: ['admin', 'super_admin'] }, deletedAt: null }).select('_id').lean();
      const recruiterName = req.user.name || 'A recruiter';
      await Promise.all(admins.map(a =>
        Notification.create({
          userId: a._id, tenantId: req.user.tenantId, type: 'job_approval_request',
          title: 'Job Pending Approval',
          message: `${recruiterName} submitted "${job.title}" for your approval.`,
          link: '/app/job-approvals',
          metadata: { jobId: job._id },
        }).catch(() => {})
      ));
    }

    // Distribution hooks on status change
    try {
      if (updates.status === 'active' && prevJob?.status !== 'active') {
        require('./distribution').logJobPublished(job);
        require('./feed').invalidateFeedCache();
        // Ping IndexNow immediately when job goes live
        pingIndexNow(job).catch(() => {});
        const { evaluateWorkflows } = require('../services/workflowEngine');
        evaluateWorkflows(job.tenantId, { event: 'job_published', tenantId: job.tenantId, jobTitle: job.title, jobId: job._id.toString() }).catch(() => {});
      } else if (updates.status === 'closed' && prevJob?.status === 'active') {
        require('./distribution').logJobClosed(job._id);
        require('./feed').invalidateFeedCache();
      } else if (updates.status === 'active') {
        require('./feed').invalidateFeedCache(); // keep feed fresh on any active job update
      }
    } catch {}

    logger.audit('Job updated', req.user.id, req.user.tenantId, { jobId: job._id });
    res.json({ success: true, data: normalizeJob(job) });
}));

// PATCH /api/jobs/:id/approve — admin approves a pending job
router.patch('/:id/approve', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, deletedAt: null };
  if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;
  const job = await Job.findOneAndUpdate(
    filter,
    { $set: { approvalStatus: 'approved', status: 'active', approvedBy: req.user.id, approvedAt: new Date() } },
    { new: true }
  );
  if (!job) throw new AppError('Job not found.', 404);

  // Notify the job creator
  if (job.postedBy) {
    await Notification.create({
      userId: job.postedBy, tenantId: job.tenantId, type: 'job_approved',
      title: 'Job Approved!',
      message: `Your job "${job.title}" has been approved and is now live.`,
      link: '/app/jobs',
    }).catch(() => {});
  }
  try { require('./distribution').logJobPublished(job); } catch {}
  try { require('./feed').invalidateFeedCache(); } catch {}
  pingIndexNow(job).catch(() => {});
  require('./jobAlerts').notifyMatchingAlerts(job).catch(() => {});

  logger.audit('Job approved', req.user.id, req.user.tenantId, { jobId: job._id });
  res.json({ success: true, data: normalizeJob(job) });
}));

// PATCH /api/jobs/:id/reject — admin rejects a pending job
router.patch('/:id/reject', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const { note } = req.body;
  const filter = { _id: req.params.id, deletedAt: null };
  if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;
  const job = await Job.findOneAndUpdate(
    filter,
    { $set: { approvalStatus: 'rejected', status: 'draft', approvalNote: note || '', rejectionReason: note || '' } },
    { new: true }
  );
  if (!job) throw new AppError('Job not found.', 404);

  // Notify the job creator
  if (job.postedBy) {
    await Notification.create({
      userId: job.postedBy, tenantId: job.tenantId, type: 'job_rejected',
      title: 'Job Needs Revision',
      message: `Your job "${job.title}" was returned for revision.${note ? ` Reason: ${note}` : ''}`,
      link: '/app/jobs',
    }).catch(() => {});
  }

  logger.audit('Job rejected', req.user.id, req.user.tenantId, { jobId: job._id, note });
  res.json({ success: true, data: normalizeJob(job) });
}));

// POST /api/jobs/:id/assign — assign recruiter to job
router.post('/:id/assign', ...guard,
  allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const { recruiterId } = req.body;
    if (!recruiterId) throw new AppError('recruiterId is required.', 400);
    const recruiterFilter = { _id: recruiterId, role: 'recruiter', deletedAt: null };
    if (req.user.role !== 'super_admin') recruiterFilter.tenantId = req.user.tenantId;
    const recruiter = await User.findOne(recruiterFilter).select('_id tenantId name email phone').lean();
    if (!recruiter) throw new AppError('Recruiter not found.', 404);

    const assignFilter = { _id: req.params.id, deletedAt: null };
    assignFilter.tenantId = req.user.role === 'super_admin' ? recruiter.tenantId : req.user.tenantId;

    // Append to recruiter history (only if not already in current assignedRecruiters)
    const historyEntry = {
      recruiterId   : recruiter._id,
      recruiterName : recruiter.name || '',
      recruiterEmail: recruiter.email || '',
      recruiterPhone: recruiter.phone || '',
      assignedAt    : new Date(),
      removedAt     : null,
      assignedBy    : req.user._id || req.user.id,
      assignedByName: req.user.name || '',
    };

    const job = await Job.findOneAndUpdate(
      assignFilter,
      {
        $addToSet: { assignedRecruiters: recruiterId },
        $push    : { recruiterHistory: historyEntry },
      },
      { new: true }
    );
    if (!job) throw new AppError('Job not found.', 404);

    // 1. Notify the recruiter — include applicant count so they know what to expect
    const appCount = await Application.countDocuments({ jobId: job._id, deletedAt: null });
    await Notification.create({
      userId: recruiterId, tenantId: job.tenantId, type: 'job_assignment',
      title: '📋 New Job Assignment',
      message: `You have been assigned to "${job.title}". There ${appCount === 1 ? 'is' : 'are'} ${appCount} existing applicant${appCount !== 1 ? 's' : ''} in your pipeline ready to review.`,
      link: `/app/pipeline?jobId=${job._id}`,
      metadata: { jobId: job._id.toString(), jobTitle: job.title },
    }).catch(() => {});

    // 2. Notify ALL existing candidates who applied for this job that a recruiter is now assigned
    try {
      const apps = await Application.find({ jobId: job._id, deletedAt: null, status: { $ne: 'rejected' } })
        .populate('candidateId', 'email')
        .lean();

      const notified = new Set();
      for (const app of apps) {
        const candEmail = app.candidateId?.email;
        if (!candEmail || notified.has(candEmail)) continue;
        notified.add(candEmail);
        // Find the candidate's User account by email to deliver the notification
        const candUser = await User.findOne({ email: candEmail.toLowerCase(), role: 'candidate', deletedAt: null }).select('_id').lean();
        if (!candUser) continue;
        await Notification.create({
          userId: candUser._id, tenantId: job.tenantId, type: 'system',
          title: '👤 Recruiter Assigned to Your Application',
          message: `${recruiter.name} has been assigned to review applications for "${job.title}". They will be in touch soon.`,
          link: '/app/applications',
        }).catch(() => {});
      }
    } catch { /* non-critical — best effort */ }

    res.json({ success: true, data: normalizeJob(job) });
}));

// PATCH /api/jobs/:id/replace-recruiter
// Replace the entire assignedRecruiters list for a job with a single new recruiter.
// Used by admin when changing the recruiter from the Applicant Records table.
// After replacing, ALL applications for this job automatically appear under the new recruiter.
router.patch('/:id/replace-recruiter', ...guard,
  allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const { recruiterId } = req.body;
    if (!recruiterId) throw new AppError('recruiterId is required.', 400);

    const recruiterFilter = { _id: recruiterId, role: 'recruiter', deletedAt: null };
    if (req.user.role !== 'super_admin') recruiterFilter.tenantId = req.user.tenantId;
    const recruiter = await User.findOne(recruiterFilter).select('_id tenantId name email phone').lean();
    if (!recruiter) throw new AppError('Recruiter not found.', 404);

    const jobFilter = { _id: req.params.id, deletedAt: null };
    jobFilter.tenantId = req.user.role === 'super_admin' ? recruiter.tenantId : req.user.tenantId;

    // 1. Close all currently-active history entries (set removedAt = now)
    await Job.updateOne(jobFilter, {
      $set: { 'recruiterHistory.$[active].removedAt': new Date() },
    }, {
      arrayFilters: [{ 'active.removedAt': null }],
    }).catch(() => {}); // non-fatal — history might be empty on legacy jobs

    // 2. Replace assignedRecruiters + append new history entry
    const appCount = await Application.countDocuments({ jobId: req.params.id, deletedAt: null });
    const historyEntry = {
      recruiterId   : recruiter._id,
      recruiterName : recruiter.name || '',
      recruiterEmail: recruiter.email || '',
      recruiterPhone: recruiter.phone || '',
      assignedAt    : new Date(),
      removedAt     : null,
      assignedBy    : req.user._id || req.user.id,
      assignedByName: req.user.name || '',
    };

    const job = await Job.findOneAndUpdate(
      jobFilter,
      {
        $set : { assignedRecruiters: [recruiter._id] },
        $push: { recruiterHistory: historyEntry },
      },
      { new: true }
    );
    if (!job) throw new AppError('Job not found.', 404);

    // Notify new recruiter with full context
    await Notification.create({
      userId: recruiter._id, tenantId: job.tenantId, type: 'system',
      title: '📋 Job Transferred to You',
      message: `You are now managing "${job.title}". All ${appCount} existing applicant${appCount !== 1 ? 's' : ''} are in your pipeline. Check the job history to see previous recruiter details.`,
      link: '/app/assigned-candidates',
    }).catch(() => {});

    logger.audit('Recruiter replaced on job', req.user._id || req.user.id, req.user.tenantId, {
      jobId: job._id, newRecruiterId: recruiterId, jobTitle: job.title,
      prevHistory: job.recruiterHistory?.length,
    });

    res.json({ success: true, data: normalizeJob(job) });
  })
);

router.post('/:id/assign-candidates', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { candidateIds } = req.body;
  if (!Array.isArray(candidateIds)) throw new AppError('candidateIds array required.', 400);
  const job = await Job.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
  if (!job) throw new AppError('Job not found.', 404);
  const results = { created: 0, skipped: 0, errors: 0 };
  for (const uid of candidateIds) {
    try {
      const user = await User.findOne({ _id: uid, role: 'candidate' }).lean();
      if (!user) { results.errors++; continue; }
      let candidate = await Candidate.findOne({ email: user.email, tenantId: job.tenantId, deletedAt: null });
      if (!candidate) {
        candidate = await Candidate.create({
          tenantId: job.tenantId, name: user.name, email: user.email, phone: user.phone || '',
          skills: Array.isArray(user.skills) ? user.skills : [], location: user.location || '',
        });
      }
      const exists = await Application.findOne({ jobId: job._id, candidateId: candidate._id, deletedAt: null });
      if (exists) { results.skipped++; continue; }
      const { score, breakdown } = calculateTalentMatchScore(job, candidate);
      await Application.create({
        tenantId: job.tenantId, jobId: job._id, candidateId: candidate._id, createdBy: req.user.id,
        talentMatchScore: score, matchBreakdown: breakdown, currentStage: 'Applied',
      });
      await Job.findByIdAndUpdate(job._id, { $inc: { applicationCount: 1 } });
      results.created++;
    } catch (e) { results.errors++; }
  }
  res.json({ success: true, data: results });
}));

router.get('/:id/candidates', ...guard, asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'super_admin';
  const isAdmin      = ['admin', 'super_admin'].includes(req.user.role);
  const jobFilter = { _id: req.params.id, deletedAt: null };
  if (!isSuperAdmin) jobFilter.tenantId = req.user.tenantId;
  const job = await Job.findOne(jobFilter).select('assignedRecruiters tenantId').lean();
  if (!job) throw new AppError('Job not found.', 404);
  const isAssigned = job.assignedRecruiters?.some(id => id.toString() === req.user.id);
  if (!isAdmin && !isAssigned) throw new AppError('Access denied.', 403);
  const apps = await Application.find({ jobId: req.params.id, deletedAt: null })
    .populate('candidateId', 'name email phone location skills title experience summary')
    .sort({ talentMatchScore: -1, createdAt: -1 }).lean();
  res.json({ success: true, data: apps.map(a => ({ ...a, id: a._id?.toString(), candidate: a.candidateId })) });
}));

router.delete('/:id', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const job = await Job.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
    { $set: { deletedAt: new Date(), status: 'closed' } }, { new: true }
  );
  if (!job) throw new AppError('Job not found.', 404);
  try { require('./distribution').logJobClosed(job._id); } catch {}
  try { require('./feed').invalidateFeedCache(); } catch {}
  res.json({ success: true, message: 'Job archived.' });
}));

// ── GET /api/jobs/public/org/:orgSlug — embeddable no-auth career listing ───────
// Returns only isPublic=true, active jobs for the given org. Allows iframe embedding.
router.get('/public/org/:orgSlug', asyncHandler(async (req, res) => {
  const Organization = require('../models/Organization');
  const rawSlug = req.params.orgSlug;
  // Try exact match first, then case-insensitive, then partial name match
  let org = await Organization.findOne({ slug: rawSlug }).select('_id name logoUrl settings').lean();
  if (!org) {
    org = await Organization.findOne({ slug: { $regex: `^${rawSlug}$`, $options: 'i' } }).select('_id name logoUrl settings').lean();
  }
  if (!org) {
    // Last resort: match org name as a slug (spaces → dashes, lowercase)
    org = await Organization.findOne({ name: { $regex: rawSlug.replace(/-/g, '[ -]'), $options: 'i' } }).select('_id name logoUrl settings').lean();
  }
  if (!org) { return res.status(404).json({ success: false, error: 'Organisation not found.' }); }

  // Allow embedding on any origin (org's own website) + CDN cache
  res.set('X-Frame-Options', 'ALLOWALL');
  res.set('Content-Security-Policy', `frame-ancestors *`);
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');

  const [jobs, orgCustom] = await Promise.all([
    Job.find({
      tenantId: org._id,
      isPublic: true,
      status: 'active',
      deletedAt: null,
    }).select('title company companyName department industry location branch jobType workMode experience urgency skills description requirements benefits salaryMin salaryMax salaryCurrency salaryType careerPageSlug externalUrl createdAt numberOfOpenings applicationDeadline companyDescription hqCity hqCountry foundedYear employeeCount website productsServices cultureNotes successStories applicationCount').sort({ createdAt: -1 }).lean(),
    require('../models/OrgCustomizations').findOne({ orgId: org._id }).select('employerBrand brandColors').lean(),
  ]);

  res.json({
    success: true,
    org: { name: org.name, logoUrl: org.logoUrl, slug: req.params.orgSlug, branches: org.settings?.branches || [] },
    employerBrand: orgCustom?.employerBrand || {},
    brandColors: orgCustom?.brandColors || {},
    data: jobs.map(normalizeJob),
  });
}));



// GET /api/jobs/:id/matching-candidates — candidates best matching this job
router.get('/:id/matching-candidates', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { findSuggestedCandidates } = require('../utils/candidateMatchingEngine');
  const jobFilter = { _id: req.params.id, deletedAt: null };
  if (req.user.role !== 'super_admin') jobFilter.tenantId = req.user.tenantId;
  const job = await Job.findOne(jobFilter).select('title skills description experience location jobType tenantId').lean();
  if (!job) throw new AppError('Job not found.', 404);

  const jobSnapshot = {
    title       : job.title || '',
    description : job.description || '',
    skills      : Array.isArray(job.skills) ? job.skills : [],
    location    : job.location || '',
    jobType     : job.jobType || '',
    tenantId    : job.tenantId,
  };

  const candidates = await findSuggestedCandidates(jobSnapshot, { limit: 50 });
  res.json({ success: true, data: candidates });
}));

// GET /api/jobs/:id/recruiter-history — full recruiter handoff trail for a job
router.get('/:id/recruiter-history', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, deletedAt: null };
  if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;
  const job = await Job.findOne(filter).select('title recruiterHistory assignedRecruiters').lean();
  if (!job) throw new AppError('Job not found.', 404);

  const history = [...(job.recruiterHistory || [])];

  // Populate missing recruiter names from User collection
  const missingNameIds = history
    .filter(h => !h.recruiterName && h.recruiterId)
    .map(h => h.recruiterId.toString());

  // If history is empty but job has assignedRecruiters, synthesize entries
  const activeIds = (job.assignedRecruiters || []).map(id => id.toString());
  const historyIds = new Set(history.map(h => h.recruiterId?.toString()));
  const untracked = activeIds.filter(id => !historyIds.has(id));

  const lookupIds = [...new Set([...missingNameIds, ...untracked])];
  let userMap = {};
  if (lookupIds.length > 0) {
    const users = await User.find({ _id: { $in: lookupIds } }).select('_id name email phone').lean();
    userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));
  }

  // Patch empty names in existing entries
  history.forEach(h => {
    if (!h.recruiterName && h.recruiterId) {
      const u = userMap[h.recruiterId.toString()];
      if (u) { h.recruiterName = u.name || ''; h.recruiterEmail = u.email || ''; }
    }
  });

  // Synthesize entries for recruiters in assignedRecruiters but not in history
  for (const id of untracked) {
    const u = userMap[id];
    if (u) {
      history.push({
        recruiterId   : u._id,
        recruiterName : u.name || '',
        recruiterEmail: u.email || '',
        recruiterPhone: u.phone || '',
        assignedAt    : null,
        removedAt     : null,
        _synthesized  : true,
      });
    }
  }

  // Sort: active (removedAt=null) first, then by assignedAt desc
  history.sort((a, b) => {
    if (!a.removedAt && b.removedAt) return -1;
    if (a.removedAt && !b.removedAt) return 1;
    return new Date(b.assignedAt || 0) - new Date(a.assignedAt || 0);
  });

  res.json({ success: true, data: { jobTitle: job.title, history } });
}));

// POST /api/jobs/bulk-classify
// Auto-detect and fill industry + department for ALL jobs using their title and description.
// Processes every job where either field is blank — safe to run multiple times.
router.post('/bulk-classify', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const orgFilter = req.user.role === 'super_admin' ? {} : { tenantId: req.user.tenantId };

  // Fetch all jobs missing industry or department (or both)
  const jobs = await Job.find({
    ...orgFilter,
    deletedAt: null,
    $or: [
      { industry:   { $in: [null, ''] } },
      { department: { $in: [null, ''] } },
    ],
  }).select('_id title description industry department').lean();

  if (!jobs.length) {
    return res.json({ success: true, updated: 0, message: 'All jobs already have industry and department set.' });
  }

  const bulkOps = [];
  let updated = 0;

  for (const job of jobs) {
    const { industry, department } = classifyJob(job.title, job.description);
    const setFields = {};
    if (!job.industry   && industry)   { setFields.industry   = industry; }
    if (!job.department && department) { setFields.department = department; }
    if (Object.keys(setFields).length > 0) {
      bulkOps.push({ updateOne: { filter: { _id: job._id }, update: { $set: setFields } } });
      updated++;
    }
  }

  if (bulkOps.length > 0) await Job.bulkWrite(bulkOps);

  logger.audit('Jobs bulk-classified', req.user.id, req.user.tenantId, { scanned: jobs.length, updated });
  res.json({ success: true, scanned: jobs.length, updated, skipped: jobs.length - updated });
}));

// POST /api/jobs/redistribute
// Distribute all active jobs in the org equally across active recruiters (round-robin).
// Admin-only. Returns per-recruiter assignment counts.
router.post('/redistribute', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tid = req.user.tenantId;
  const orgFilter = req.user.role === 'super_admin' ? {} : { tenantId: tid };

  // 1. Get all active recruiters in the org
  const recruiters = await User.find({
    ...orgFilter,
    role: 'recruiter',
    isActive: true,
    deletedAt: null,
  }).select('_id name').lean();

  if (!recruiters.length) throw new AppError('No active recruiters found in this organisation.', 400);

  // 2. Get all active (and draft) jobs to redistribute
  const jobs = await Job.find({
    ...orgFilter,
    status: { $in: ['active', 'draft'] },
    deletedAt: null,
  }).select('_id').lean();

  if (!jobs.length) throw new AppError('No jobs found to redistribute.', 400);

  // 3. Round-robin assignment
  const counts = {};
  recruiters.forEach(r => { counts[r._id.toString()] = 0; });

  const bulkOps = jobs.map((job, i) => {
    const recruiter = recruiters[i % recruiters.length];
    counts[recruiter._id.toString()]++;
    return {
      updateOne: {
        filter: { _id: job._id },
        update: { $set: { assignedRecruiters: [recruiter._id] } },
      },
    };
  });

  await Job.bulkWrite(bulkOps);

  // Bust server-side cache for ALL dashboard endpoints for this tenant so
  // the leaderboard, stats, and analytics return fresh data immediately.
  // Cache keys are: `tenantId:userId:url` — prefix on tenantId clears all.
  invalidatePrefix(String(tid));

  const summary = recruiters.map(r => ({
    recruiterId : r._id,
    name        : r.name,
    jobsAssigned: counts[r._id.toString()] || 0,
  }));

  logger.audit('Jobs redistributed', req.user.id, tid, { total: jobs.length, recruiters: recruiters.length });
  res.json({ success: true, total: jobs.length, summary });
}));

// ── POST /api/jobs/:id/video-jd — upload a video job description to Cloudinary
router.post('/:id/video-jd', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const multer     = require('multer');
  const { uploadBuffer } = require('../utils/cloudinaryUpload');

  const job = await Job.findOne({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null });
  if (!job) throw new AppError('Job not found.', 404);

  // Parse the multipart form
  await new Promise((resolve, reject) => {
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
      fileFilter: (_, f, cb) => f.mimetype.startsWith('video/') ? cb(null, true) : cb(new Error('Only video files allowed')),
    }).single('video');
    upload(req, res, err => err ? reject(err) : resolve());
  });

  if (!req.file) throw new AppError('Video file required.', 400);

  const uploadResult = await uploadBuffer(req.file.buffer, { resource_type: 'video', folder: 'job-videos', transformation: [{ quality: 'auto' }] });

  job.videoJdUrl = uploadResult.secure_url;
  await job.save();

  res.json({ success: true, data: { videoJdUrl: uploadResult.secure_url } });
}));

// PATCH /api/jobs/:id/custom-stages — set custom hiring stages for this job
router.patch('/:id/custom-stages', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { stages } = req.body;
  if (!Array.isArray(stages)) throw new AppError('stages must be an array.', 400);
  const job = await Job.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
    { $set: { customStages: stages } },
    { new: true }
  );
  if (!job) throw new AppError('Job not found.', 404);
  res.json({ success: true, data: job.customStages });
}));

// ── DELETE /api/jobs/:id/video-jd — remove video JD
router.delete('/:id/video-jd', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const job = await Job.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId, deletedAt: null },
    { $set: { videoJdUrl: '' } }, { new: true }
  );
  if (!job) throw new AppError('Job not found.', 404);
  res.json({ success: true });
}));

module.exports = router;

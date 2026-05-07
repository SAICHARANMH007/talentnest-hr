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
const PUBLIC_JOB_FIELDS = 'title company companyName department location jobType workMode experience urgency skills description requirements benefits salaryMin salaryMax salaryCurrency salaryType careerPageSlug externalUrl createdAt updatedAt numberOfOpenings';

router.get('/public', asyncHandler(async (req, res) => {
  // HTTP cache: Vercel edge + browser cache for 5 minutes, serve stale for 1 hour while revalidating
  res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');

  const { page, limit, skip } = getPagination(req, { limit: parseInt(req.query.limit) || 20 });
  const filter = { status: 'active', deletedAt: null };

  if (req.query.tenantId) filter.tenantId = req.query.tenantId;
  if (req.query.slug)     filter.careerPageSlug = req.query.slug;
  if (req.query.orgSlug) {
    const Organization = require('../models/Organization');
    const org = await Organization.findOne({ slug: req.query.orgSlug }).select('_id').lean();
    if (org) filter.tenantId = org._id;
  }
  if (req.query.search) {
    const sr = { $regex: escRe(req.query.search), $options: 'i' };
    filter.$or = [{ title: sr }, { company: sr }, { companyName: sr }, { skills: sr }];
  }
  if (req.query.urgency && req.query.urgency !== 'All') filter.urgency = req.query.urgency;
  if (req.query.location && req.query.location !== 'All') filter.location = req.query.location;

  // Run count and job fetch in parallel; skip expensive uniqueCompanies on paginated requests
  const isFirstPage = page === 1 && !req.query.search;
  const [jobs, total, urgentCount, uniqueCompanies] = await Promise.all([
    Job.find(filter)
      .select(PUBLIC_JOB_FIELDS)   // lean payload — no recruiter/tenant/internal fields
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
  if (req.query.search) filter.title  = { $regex: escRe(req.query.search), $options: 'i' };
  const [jobs, total] = await Promise.all([
    Job.find(filter).select('-__v').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
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
  const assignedRecruiters = [];
  if (req.user.role === 'recruiter') assignedRecruiters.push(req.user.id);
  else if (recruiterId) assignedRecruiters.push(recruiterId);
  const baseSlug  = slugify(title);
  const slugCount = await Job.countDocuments({ tenantId: req.user.tenantId, careerPageSlug: { $regex: `^${baseSlug}` } });
  const careerPageSlug = slugCount === 0 ? baseSlug : `${baseSlug}-${slugCount}`;
  const job = await Job.create({
    ...rest,
    tenantId: req.user.tenantId,
    createdBy: req.user.id,
    title: title.trim(),
    description,
    skills: Array.isArray(skills) ? skills.map(s => String(s).toLowerCase().trim()) : [],
    niceToHaveSkills: Array.isArray(niceToHaveSkills) ? niceToHaveSkills.map(s => String(s).toLowerCase().trim()) : [],
    assignedRecruiters,
    careerPageSlug,
    status: rest.status || 'draft',
  });
  logger.audit('Job created', req.user.id, req.user.tenantId, { jobId: job._id, title });
  res.status(201).json({ success: true, data: normalizeJob(job) });

  // IndexNow ping — fire-and-forget, never block the response
  if (job.status === 'active' || rest.status === 'active') {
    pingIndexNow(job).catch(() => {});
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
    const prevJob = await Job.findOne(patchFilter).select('status').lean();
    const job = await Job.findOneAndUpdate(patchFilter, { $set: updates }, { new: true });
    if (!job) throw new AppError('Job not found.', 404);

    // Distribution hooks on status change
    try {
      if (updates.status === 'active' && prevJob?.status !== 'active') {
        require('./distribution').logJobPublished(job);
        require('./feed').invalidateFeedCache();
        // Ping IndexNow immediately when job goes live
        pingIndexNow(job).catch(() => {});
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

// PATCH /api/jobs/:id/approve — admin/super_admin approve or reject
router.patch('/:id/approve', ...guard,
  allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const { action, reason } = req.body; // action: 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action)) throw new AppError('action must be approve or reject.', 400);

    const status = action === 'approve' ? 'active' : 'draft';
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: { approvalStatus: action === 'approve' ? 'approved' : 'rejected', status, rejectionReason: reason || '' } },
      { new: true }
    );
    if (!job) throw new AppError('Job not found.', 404);

    // Trigger distribution when job goes live
    if (action === 'approve') {
      try { require('./distribution').logJobPublished(job); } catch {}
      try { require('./feed').invalidateFeedCache(); } catch {}
    }

    logger.audit(`Job ${action}d`, req.user.id, req.user.tenantId, { jobId: job._id, reason });
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
    const recruiter = await User.findOne(recruiterFilter).select('_id tenantId').lean();
    if (!recruiter) throw new AppError('Recruiter not found.', 404);

    const assignFilter = { _id: req.params.id, deletedAt: null };
    assignFilter.tenantId = req.user.role === 'super_admin' ? recruiter.tenantId : req.user.tenantId;
    const job = await Job.findOneAndUpdate(
      assignFilter,
      { $addToSet: { assignedRecruiters: recruiterId } },
      { new: true }
    );
    if (!job) throw new AppError('Job not found.', 404);

    await Notification.create({
      userId: recruiterId, tenantId: job.tenantId, type: 'system',
      title: 'New Job Assignment',
      message: `You have been assigned to: ${job.title}`,
      link: '/app/jobs',
    }).catch(() => {});

    res.json({ success: true, data: normalizeJob(job) });
}));

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

  const jobs = await Job.find({
    tenantId: org._id,
    isPublic: true,
    status: 'active',
    deletedAt: null,
  }).select('title company companyName location jobType experience urgency skills description requirements benefits salaryMin salaryMax salaryCurrency careerPageSlug externalUrl createdAt numberOfOpenings').sort({ createdAt: -1 }).lean();

  res.json({
    success: true,
    org: { name: org.name, logoUrl: org.logoUrl, slug: req.params.orgSlug },
    data: jobs.map(normalizeJob),
  });
}));



module.exports = router;

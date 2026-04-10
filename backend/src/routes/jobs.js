'use strict';
const express         = require('express');
const router          = express.Router();
const Job             = require('../models/Job');
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

/** Escape regex special chars to prevent ReDoS on user-supplied search strings */
function escRe(s) { return String(s).slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ── Inline slugify (no extra dependency) ─────────────────────────────────────
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
  return j;
}

// auth + tenant stack used on all private routes
const guard = [authMiddleware, tenantGuard];

// ── PUBLIC ────────────────────────────────────────────────────────────────────

// GET /api/jobs/public — public career-page feed, filtered by slug or tenantId
router.get('/public', asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req, { limit: 12 });
  const filter = { status: 'active', deletedAt: null };
  if (req.query.tenantId) filter.tenantId = req.query.tenantId;
  if (req.query.slug)     filter.careerPageSlug = req.query.slug;
  if (req.query.orgSlug) {
    const Organization = require('../models/Organization');
    const org = await Organization.findOne({ slug: req.query.orgSlug }).select('_id').lean();
    if (org) filter.tenantId = org._id;
  }

  const [jobs, total] = await Promise.all([
    Job.find(filter).select('-__v').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Job.countDocuments(filter),
  ]);
  res.json(paginatedResponse(jobs.map(normalizeJob), total, limit, page));
}));

// ── PRIVATE ───────────────────────────────────────────────────────────────────

// GET /api/jobs — management feed (tenant-scoped, recruiter only sees assigned)
router.get('/', ...guard, asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = { deletedAt: null };
  if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;

  if (req.user.role === 'recruiter') {
    filter.assignedRecruiters = req.user.id;
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) filter.title  = { $regex: escRe(req.query.search), $options: 'i' };

  const [jobs, total] = await Promise.all([
    Job.find(filter).select('-__v').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Job.countDocuments(filter),
  ]);
  res.json(paginatedResponse(jobs.map(normalizeJob), total, limit, page));
}));

// GET /api/jobs/pending — list draft jobs awaiting approval (admin/super_admin)
router.get('/pending', ...guard,
  allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const filter = { status: 'draft', deletedAt: null };
    if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;

    const jobs = await Job.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const normalized = jobs.map(j => ({ ...normalizeJob(j), id: j._id.toString() }));
    res.json({ success: true, data: normalized });
  })
);

// GET /api/jobs/:id — single job (tenant-scoped)
router.get('/:id', ...guard, asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }).lean();
  if (!job) throw new AppError('Job not found.', 404);
  res.json({ success: true, data: normalizeJob(job) });
}));

// POST /api/jobs — create job
router.post('/', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  checkPlanLimits('jobs'),
  asyncHandler(async (req, res) => {
    const { title, description, skills, niceToHaveSkills, recruiterId, ...rest } = req.body;
    if (!title || !description) throw new AppError('title and description are required.', 400);
    if (rest.salaryMin !== undefined && rest.salaryMax !== undefined && Number(rest.salaryMin) > Number(rest.salaryMax)) {
      throw new AppError('salaryMin cannot exceed salaryMax.', 400);
    }

    const assignedRecruiters = [];
    if (req.user.role === 'recruiter') assignedRecruiters.push(req.user.id);
    else if (recruiterId) assignedRecruiters.push(recruiterId);

    // Unique slug per tenant
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
  })
);

// PATCH /api/jobs/:id — generic update
router.patch('/:id', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const forbidden = ['tenantId', 'createdBy', 'careerPageSlug'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => !forbidden.includes(k)));

    // Enforce skills as array
    if (updates.skills !== undefined)            updates.skills            = Array.isArray(updates.skills) ? updates.skills.map(s => String(s).toLowerCase().trim()) : [];
    if (updates.niceToHaveSkills !== undefined)  updates.niceToHaveSkills  = Array.isArray(updates.niceToHaveSkills) ? updates.niceToHaveSkills.map(s => String(s).toLowerCase().trim()) : [];

    // Salary range sanity check
    const min = updates.salaryMin !== undefined ? Number(updates.salaryMin) : null;
    const max = updates.salaryMax !== undefined ? Number(updates.salaryMax) : null;
    if (min !== null && max !== null && min > max) throw new AppError('salaryMin cannot exceed salaryMax.', 400);

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
      { $set: updates },
      { new: true }
    );
    if (!job) throw new AppError('Job not found.', 404);

    logger.audit('Job updated', req.user.id, req.user.tenantId, { jobId: job._id });
    res.json({ success: true, data: normalizeJob(job) });
  })
);

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

    // Notify job creator about approval/rejection
    if (job.createdBy && String(job.createdBy) !== String(req.user.id)) {
      Notification.create({
        userId: job.createdBy, tenantId: req.user.tenantId,
        type: action === 'approve' ? 'job_approved' : 'job_rejected',
        title: action === 'approve' ? `Job Approved — ${job.title}` : `Job Needs Revision — ${job.title}`,
        message: action === 'approve'
          ? `Your job "${job.title}" has been approved and is now live on the career page.`
          : `Your job "${job.title}" needs revision. ${reason || 'Please contact your admin for details.'}`,
        link: '/recruiter/jobs',
      }).catch(() => {});
    }

    logger.audit(`Job ${action}d`, req.user.id, req.user.tenantId, { jobId: job._id, reason });
    res.json({ success: true, data: normalizeJob(job) });
  })
);

// POST /api/jobs/:id/assign — assign recruiter to job
router.post('/:id/assign', ...guard,
  allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const { recruiterId } = req.body;
    if (!recruiterId) throw new AppError('recruiterId is required.', 400);

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
      { $addToSet: { assignedRecruiters: recruiterId } },
      { new: true }
    );
    if (!job) throw new AppError('Job not found.', 404);

    await Notification.create({
      userId: recruiterId, tenantId: req.user.tenantId, type: 'system',
      title: 'New Job Assignment',
      message: `You have been assigned to: ${job.title}`,
      link: '/recruiter/jobs',
    }).catch(() => {});

    res.json({ success: true, data: normalizeJob(job) });
  })
);

// GET /api/jobs/:id/candidates — applications for job (admin or assigned recruiter)
router.get('/:id/candidates', ...guard, asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null })
    .select('assignedRecruiters').lean();
  if (!job) throw new AppError('Job not found.', 404);

  const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
  const isAssigned = job.assignedRecruiters?.some(id => id.toString() === req.user.id);
  if (!isAdmin && !isAssigned) throw new AppError('Access denied.', 403);

  const apps = await Application.find({ jobId: req.params.id, tenantId: req.user.tenantId, deletedAt: null })
    .populate('candidateId', 'name email phone location skills')
    .sort({ aiMatchScore: -1, createdAt: -1 })
    .lean();

  const result = apps.map(a => ({ ...a, id: a._id?.toString() }));
  res.json({ success: true, data: result });
}));

// DELETE /api/jobs/:id — soft delete
router.delete('/:id', ...guard,
  allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
      { $set: { deletedAt: new Date(), status: 'closed' } },
      { new: true }
    );
    if (!job) throw new AppError('Job not found.', 404);

    logger.audit('Job archived', req.user.id, req.user.tenantId, { jobId: job._id });
    res.json({ success: true, message: 'Job archived.' });
  })
);

module.exports = router;

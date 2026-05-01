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

// ── PUBLIC ────────────────────────────────────────────────────────────────────
router.get('/public', asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req, { limit: 200 });
  const filter = { status: 'active', deletedAt: null };
  if (req.query.tenantId) filter.tenantId = req.query.tenantId;
  if (req.query.slug)     filter.careerPageSlug = req.query.slug;
  if (req.query.orgSlug) {
    const Organization = require('../models/Organization');
    const org = await Organization.findOne({ slug: req.query.orgSlug }).select('_id').lean();
    if (org) filter.tenantId = org._id;
  }
  const [jobs, total] = await Promise.all([
    Job.find(filter).populate('assignedRecruiters', 'name id _id').select('-__v').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Job.countDocuments(filter),
  ]);
  res.json(paginatedResponse(jobs.map(normalizeJob), total, limit, page));
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
    const job = await Job.findOneAndUpdate(patchFilter, { $set: updates }, { new: true });
    if (!job) throw new AppError('Job not found.', 404);

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
      link: '/recruiter/jobs',
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
  res.json({ success: true, message: 'Job archived.' });
}));

module.exports = router;

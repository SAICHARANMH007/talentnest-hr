'use strict';
const express        = require('express');
const router         = express.Router();
const JobRequirement = require('../models/JobRequirement');
const User           = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard }    = require('../middleware/tenantGuard');
const { allowRoles }     = require('../middleware/rbac');
const { getPagination, paginatedResponse } = require('../middleware/paginate');
const asyncHandler = require('../utils/asyncHandler');
const AppError     = require('../utils/AppError');
const logger       = require('../middleware/logger');

const guard = [authMiddleware, tenantGuard];
// Roles allowed to view/triage every client requirement in the org and assign recruiters to them
const TRIAGE_ROLES = ['admin', 'super_admin', 'recruiter', 'hiring_manager'];

function normalize(r) {
  const o = r.toObject ? r.toObject() : { ...r };
  o.id = o.id || o._id?.toString();
  return o;
}

// GET /api/job-requirements/meta/recruiters — lightweight list of recruiters for the assignment dropdown
router.get('/meta/recruiters', ...guard, allowRoles(...TRIAGE_ROLES), asyncHandler(async (req, res) => {
  const recruiters = await User.find({ tenantId: req.user.tenantId, role: 'recruiter', isActive: true, deletedAt: null })
    .select('name email').sort({ name: 1 }).lean();
  res.json({ success: true, data: recruiters.map(r => ({ id: r._id.toString(), name: r.name, email: r.email })) });
}));

// GET /api/job-requirements
router.get('/', ...guard, asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = { tenantId: req.user.tenantId, deletedAt: null };

  if (req.user.role === 'client') {
    if (!req.user.clientId) return res.json(paginatedResponse([], 0, limit, page));
    filter.clientId = req.user.clientId;
  } else if (!TRIAGE_ROLES.includes(req.user.role)) {
    throw new AppError('Forbidden.', 403);
  }

  if (req.query.status) filter.status = req.query.status;
  if (req.query.assignedToMe === 'true') filter.assignedRecruiter = req.user.id;

  const [items, total] = await Promise.all([
    JobRequirement.find(filter)
      .populate('clientId', 'companyName industry billingType billingValue billingCurrency billingNotes')
      .populate('submittedBy', 'name email')
      .populate('assignedRecruiter', 'name email')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    JobRequirement.countDocuments(filter),
  ]);
  res.json(paginatedResponse(items.map(r => ({ ...r, id: r._id?.toString() })), total, limit, page));
}));

// GET /api/job-requirements/:id
router.get('/:id', ...guard, asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null };
  if (req.user.role === 'client') filter.clientId = req.user.clientId;

  const r = await JobRequirement.findOne(filter)
    .populate('clientId', 'companyName industry billingType billingValue billingCurrency billingNotes')
    .populate('submittedBy', 'name email')
    .populate('assignedRecruiter', 'name email');
  if (!r) throw new AppError('Job requirement not found.', 404);
  res.json({ success: true, data: normalize(r) });
}));

// POST /api/job-requirements — client raises a new hiring requirement
router.post('/', ...guard, allowRoles('client'), asyncHandler(async (req, res) => {
  if (!req.user.clientId) throw new AppError('Your login is not linked to a client company. Contact your account manager.', 400);

  const { title, department, location, employmentType, openings, experienceRequired, skillsRequired, budgetRange, priority, description } = req.body;
  if (!title || !title.trim()) throw new AppError('Job title is required.', 400);

  const r = await JobRequirement.create({
    tenantId: req.user.tenantId,
    clientId: req.user.clientId,
    submittedBy: req.user.id,
    title: title.trim(),
    department: department || '',
    location: location || '',
    employmentType: employmentType || 'full_time',
    openings: Number(openings) > 0 ? Number(openings) : 1,
    experienceRequired: experienceRequired || '',
    skillsRequired: Array.isArray(skillsRequired) ? skillsRequired : [],
    budgetRange: budgetRange || '',
    priority: ['low', 'medium', 'high', 'urgent'].includes(priority) ? priority : 'medium',
    description: description || '',
  });

  logger.audit('Job requirement submitted', req.user.id, req.user.tenantId, { requirementId: r._id, clientId: req.user.clientId });
  res.status(201).json({ success: true, data: normalize(r) });
}));

// PATCH /api/job-requirements/:id — client edits their own requirement (only while status='new')
router.patch('/:id', ...guard, allowRoles('client'), asyncHandler(async (req, res) => {
  if (!req.user.clientId) throw new AppError('Forbidden.', 403);

  const existing = await JobRequirement.findOne({ _id: req.params.id, tenantId: req.user.tenantId, clientId: req.user.clientId, deletedAt: null });
  if (!existing) throw new AppError('Job requirement not found.', 404);
  if (existing.status !== 'new') throw new AppError('This requirement is already being worked on and can no longer be edited.', 400);

  const allowed = ['title', 'department', 'location', 'employmentType', 'openings', 'experienceRequired', 'skillsRequired', 'budgetRange', 'priority', 'description'];
  for (const k of allowed) {
    if (k in req.body) existing[k] = req.body[k];
  }
  await existing.save();

  res.json({ success: true, data: normalize(existing) });
}));

// PATCH /api/job-requirements/:id/status — admin/recruiter manage workflow
router.patch('/:id/status', ...guard, allowRoles(...TRIAGE_ROLES), asyncHandler(async (req, res) => {
  const { status, assignedRecruiter, internalNotes, convertedJobId } = req.body;

  const existing = await JobRequirement.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
  if (!existing) throw new AppError('Job requirement not found.', 404);

  if (status) {
    if (!['new', 'in_progress', 'converted', 'closed'].includes(status)) throw new AppError('Invalid status.', 400);
    existing.status = status;
  }
  if (assignedRecruiter !== undefined) existing.assignedRecruiter = assignedRecruiter || null;
  if (internalNotes !== undefined) existing.internalNotes = internalNotes;
  if (convertedJobId !== undefined) existing.convertedJobId = convertedJobId || null;

  await existing.save();

  logger.audit('Job requirement updated', req.user.id, req.user.tenantId, { requirementId: existing._id, status: existing.status });
  res.json({ success: true, data: normalize(existing) });
}));

// DELETE /api/job-requirements/:id — client withdraws their own requirement (only while status='new')
router.delete('/:id', ...guard, allowRoles('client'), asyncHandler(async (req, res) => {
  if (!req.user.clientId) throw new AppError('Forbidden.', 403);

  const existing = await JobRequirement.findOne({ _id: req.params.id, tenantId: req.user.tenantId, clientId: req.user.clientId, deletedAt: null });
  if (!existing) throw new AppError('Job requirement not found.', 404);
  if (existing.status !== 'new') throw new AppError('This requirement is already being worked on and can no longer be withdrawn.', 400);

  existing.deletedAt = new Date();
  await existing.save();

  res.json({ success: true, message: 'Requirement withdrawn.' });
}));

module.exports = router;

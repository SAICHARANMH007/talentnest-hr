'use strict';
const express      = require('express');
const router       = express.Router();
const CandidateRequest = require('../models/CandidateRequest');
const User         = require('../models/User');
const { authMiddleware }  = require('../middleware/auth');
const { tenantGuard }     = require('../middleware/tenantGuard');
const { allowRoles }      = require('../middleware/rbac');
const { getPagination, paginatedResponse } = require('../middleware/paginate');
const asyncHandler = require('../utils/asyncHandler');
const AppError     = require('../utils/AppError');
const logger       = require('../middleware/logger');
const { sendEmailWithRetry: sendEmail } = require('../utils/email');

const guard = [authMiddleware, tenantGuard];

function normalize(r) {
  const o = r.toObject ? r.toObject() : { ...r };
  o.id = o.id || o._id?.toString();
  return o;
}

// GET /api/candidate-requests — list (superadmin=all, admin=own tenant)
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = {};
  if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    CandidateRequest.find(filter)
      .populate('tenantId', 'name')
      .populate('requestedBy', 'name email')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CandidateRequest.countDocuments(filter),
  ]);
  res.json(paginatedResponse(items.map(r => ({ ...r, id: r._id?.toString() })), total, limit, page));
}));

// GET /api/candidate-requests/:id
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const r = await CandidateRequest.findById(req.params.id)
    .populate('tenantId', 'name').populate('requestedBy', 'name email').lean();
  if (!r) throw new AppError('Request not found.', 404);
  res.json({ success: true, data: { ...r, id: r._id?.toString() } });
}));

// POST /api/candidate-requests — admin or recruiter submits request
router.post('/', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const { roleTitle, requirements, urgency, budget } = req.body;
    if (!roleTitle) throw new AppError('roleTitle is required.', 400);

    const r = await CandidateRequest.create({
      tenantId:    req.user.tenantId,
      requestedBy: req.user.id,
      roleTitle: roleTitle.trim(),
      requirements: requirements || '',
      urgency: urgency || 'medium',
      budget: budget || '',
      status: 'pending',
    });

    logger.audit('Candidate request submitted', req.user.id, req.user.tenantId, { requestId: r._id });

    // Notify centralized support/admin instead of spamming all super_admins
    const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@talentnesthr.com';
    const FRONTEND_URL = process.env.FRONTEND_URL || 'https://talentnesthr.com';

    await sendEmail(
      SUPPORT_EMAIL,
      `🚨 New Candidate Request — ${roleTitle} [${(urgency || 'medium').toUpperCase()}]`,
      `<h2>New Candidate Request</h2>
      <p><b>Tenant:</b> ${req.user.tenantId}</p>
      <p><b>Role:</b> ${roleTitle}</p>
      <p><b>Urgency:</b> ${urgency || 'medium'}</p>
      <p><b>Budget:</b> ${budget || 'Not specified'}</p>
      <p><b>Requirements:</b></p><pre style="background:#f4f4f4;padding:12px;border-radius:6px">${requirements || 'None'}</pre>
      <p><b>Submitted by:</b> ${req.user.name || req.user.email}</p>
      <hr/>
      <p><a href="${FRONTEND_URL}/app/superadmin/candidate-requests">View in TalentNest Dashboard →</a></p>`
    ).catch(err => logger.error('Failed to send candidate request email', err));

    res.status(201).json({ success: true, data: normalize(r) });
  })
);

// PATCH /api/candidate-requests/:id — superadmin manages
router.patch('/:id', authMiddleware,
  allowRoles('super_admin', 'admin'),
  asyncHandler(async (req, res) => {
    const allowed = ['status', 'adminNotes', 'chargeAmount', 'submittedCandidates'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

    if (updates.status === 'fulfilled') updates.fulfilledAt = new Date();

    const r = await CandidateRequest.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!r) throw new AppError('Request not found.', 404);

    logger.audit('Candidate request updated', req.user.id, null, { requestId: r._id, status: updates.status });
    res.json({ success: true, data: normalize(r) });
  })
);

// DELETE /api/candidate-requests/:id — cancel
router.delete('/:id', ...guard,
  allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const r = await CandidateRequest.findByIdAndUpdate(
      req.params.id, { $set: { status: 'cancelled' } }, { new: true }
    );
    if (!r) throw new AppError('Request not found.', 404);
    res.json({ success: true, message: 'Request cancelled.' });
  })
);

module.exports = router;

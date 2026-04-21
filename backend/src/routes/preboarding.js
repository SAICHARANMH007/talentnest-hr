'use strict';
const express        = require('express');
const router         = express.Router();
const PreBoarding    = require('../models/PreBoarding');
const OfferLetter    = require('../models/OfferLetter');
const Candidate      = require('../models/Candidate');
const { authenticate }   = require('../middleware/auth');
const { allowRoles }     = require('../middleware/rbac');
const asyncHandler       = require('../utils/asyncHandler');
const AppError           = require('../utils/AppError');
const { sendEmailWithRetry } = require('../utils/email');

const DEFAULT_TASKS = [
  { title: 'Submit Aadhaar Card',          category: 'document',    isRequired: true },
  { title: 'Submit PAN Card',              category: 'document',    isRequired: true },
  { title: 'Submit Salary Slips (3)',      category: 'document',    isRequired: true },
  { title: 'Submit Experience Letter',     category: 'document',    isRequired: false },
  { title: 'Submit Relieving Letter',      category: 'document',    isRequired: false },
  { title: 'Submit Educational Documents', category: 'document',    isRequired: true },
  { title: 'Bank Account Details',         category: 'document',    isRequired: true },
  { title: 'IT Asset Request Submitted',   category: 'it_setup',    isRequired: true },
  { title: 'Work Email Created',           category: 'it_setup',    isRequired: true },
  { title: 'Review Employee Handbook',     category: 'policy',      isRequired: true },
  { title: 'Complete Compliance Training', category: 'training',    isRequired: true },
  { title: 'Orientation Scheduled',        category: 'orientation', isRequired: true },
];

const tenantGuard = (req, res, next) => {
  if (!req.user?.tenantId) return res.status(403).json({ success: false, error: 'Tenant context missing.' });
  next();
};

// ── HR/Admin: list all pre-boarding records ───────────────────────────────────
router.get('/', authenticate, tenantGuard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const q = { tenantId: req.user.tenantId };
  if (status) q.status = status;
  if (search) q.candidateName = { $regex: search, $options: 'i' };

  const [records, total] = await Promise.all([
    PreBoarding.find(q).sort({ joiningDate: 1, createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
    PreBoarding.countDocuments(q),
  ]);

  res.json({ success: true, data: records.map(r => ({ ...r, id: r._id.toString() })), pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
}));

// ── HR/Admin: get single record ───────────────────────────────────────────────
router.get('/:id', authenticate, tenantGuard, asyncHandler(async (req, res) => {
  const record = await PreBoarding.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).lean();
  if (!record) throw new AppError('Pre-boarding record not found.', 404);
  res.json({ success: true, data: { ...record, id: record._id.toString() } });
}));

// ── Candidate: get own pre-boarding (by email — works regardless of Candidate vs User _id) ──
router.get('/mine', authenticate, asyncHandler(async (req, res) => {
  if (!req.user?.email) return res.json({ success: true, data: null });
  const record = await PreBoarding.findOne({ candidateEmail: req.user.email }).sort({ createdAt: -1 }).lean();
  if (!record) return res.json({ success: true, data: null });
  res.json({ success: true, data: { ...record, id: record._id.toString() } });
}));

// ── Candidate: get own pre-boarding by candidateId (legacy — keep for compat) ─
router.get('/mine/:candidateId', authenticate, asyncHandler(async (req, res) => {
  let record = await PreBoarding.findOne({ candidateId: req.params.candidateId }).sort({ createdAt: -1 }).lean();
  if (!record && req.user?.email) {
    record = await PreBoarding.findOne({ candidateEmail: req.user.email }).sort({ createdAt: -1 }).lean();
  }
  if (!record) return res.json({ success: true, data: null });
  res.json({ success: true, data: { ...record, id: record._id.toString() } });
}));

// ── Candidate: confirm joining ─────────────────────────────────────────────────
router.patch('/:id/candidate-confirm', authenticate, asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user.role === 'candidate') filter.candidateEmail = req.user.email;
  const record = await PreBoarding.findOneAndUpdate(
    filter,
    { $set: { joiningConfirmed: true, joiningConfirmedAt: new Date() } },
    { new: true }
  ).lean();
  if (!record) throw new AppError('Pre-boarding record not found.', 404);
  res.json({ success: true, data: { ...record, id: record._id.toString() } });
}));

// ── HR/Admin: update record (notes, assignedTo, status) ──────────────────────
router.patch('/:id', authenticate, tenantGuard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const allowed = ['status', 'notes', 'assignedTo', 'joiningDate', 'department', 'reportingTo', 'joiningConfirmed', 'joinedOn'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  if (req.body.joiningConfirmed) update.joiningConfirmedAt = new Date();

  const record = await PreBoarding.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId },
    { $set: update },
    { new: true }
  ).lean();
  if (!record) throw new AppError('Pre-boarding record not found.', 404);
  res.json({ success: true, data: { ...record, id: record._id.toString() } });
}));

// ── HR/Admin: add a custom task ───────────────────────────────────────────────
router.post('/:id/tasks', authenticate, tenantGuard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { title, description, category, dueDate, isRequired } = req.body;
  if (!title) throw new AppError('title is required.', 400);

  const record = await PreBoarding.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId },
    { $push: { tasks: { title, description, category: category || 'other', dueDate: dueDate || null, isRequired: isRequired !== false } } },
    { new: true }
  ).lean();
  if (!record) throw new AppError('Pre-boarding record not found.', 404);
  res.json({ success: true, data: { ...record, id: record._id.toString() } });
}));

// ── Complete a task (HR or Candidate) ────────────────────────────────────────
router.patch('/:id/tasks/:taskId', authenticate, asyncHandler(async (req, res) => {
  const { completed, notes } = req.body;
  const completedBy = ['admin', 'super_admin', 'recruiter'].includes(req.user.role) ? 'hr' : 'candidate';

  const update = completed
    ? { $set: { 'tasks.$.completedAt': new Date(), 'tasks.$.completedBy': completedBy, 'tasks.$.notes': notes || '' } }
    : { $set: { 'tasks.$.completedAt': null, 'tasks.$.completedBy': null } };

  const record = await PreBoarding.findOneAndUpdate(
    { _id: req.params.id, 'tasks._id': req.params.taskId },
    update,
    { new: true }
  ).lean();
  if (!record) throw new AppError('Task not found.', 404);

  // Auto-update status to in_progress / completed
  const allDone = record.tasks.every(t => t.completedAt || !t.isRequired);
  const anyDone = record.tasks.some(t => t.completedAt);
  const newStatus = allDone ? 'completed' : anyDone ? 'in_progress' : 'pending';
  if (record.status !== newStatus) {
    await PreBoarding.findByIdAndUpdate(record._id, { status: newStatus });
    record.status = newStatus;
  }

  res.json({ success: true, data: { ...record, id: record._id.toString() } });
}));

// ── Send/resend welcome kit email ─────────────────────────────────────────────
router.post('/:id/send-welcome-kit', authenticate, tenantGuard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const record = await PreBoarding.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!record) throw new AppError('Pre-boarding record not found.', 404);

  const joiningDateStr = record.joiningDate
    ? new Date(record.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'your joining date';

  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://talentnesthr.com';
  const html = `
    <div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:580px;margin:0 auto;background:#f8fafc;padding:32px 24px;">
      <div style="background:linear-gradient(135deg,#032D60,#0176D3);padding:28px 32px;border-radius:16px 16px 0 0;">
        <h1 style="color:#fff;font-size:22px;margin:0;">🎉 Welcome to the Team!</h1>
        <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:6px 0 0;">Your journey begins on ${joiningDateStr}</p>
      </div>
      <div style="background:#fff;padding:28px 32px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">
        <p style="color:#374151;font-size:15px;">Dear <strong>${record.candidateName || 'New Team Member'}</strong>,</p>
        <p style="color:#6b7280;font-size:14px;line-height:1.7;">
          We're thrilled to have you join us as <strong>${record.designation || 'our newest team member'}</strong>.
          To make your first day seamless, please complete the pre-boarding checklist before ${joiningDateStr}.
        </p>
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px 20px;margin:20px 0;">
          <p style="color:#0369a1;font-size:13px;font-weight:700;margin:0 0 8px;">📋 Your Pre-boarding Checklist</p>
          <p style="color:#0369a1;font-size:13px;margin:0;">Log in to complete document uploads, training, and setup tasks.</p>
        </div>
        <a href="${FRONTEND_URL}/app" style="display:inline-block;background:#0176D3;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">Open Pre-boarding Portal →</a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">If you have questions, contact your HR team directly. We look forward to seeing you on ${joiningDateStr}!</p>
      </div>
    </div>`;

  await sendEmailWithRetry(record.candidateEmail, `Welcome to the team — Pre-boarding checklist ready`, html);
  await PreBoarding.findByIdAndUpdate(record._id, { welcomeKitSentAt: new Date() });

  res.json({ success: true, message: 'Welcome kit sent.' });
}));

module.exports = router;

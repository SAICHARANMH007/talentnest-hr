'use strict';
const express        = require('express');
const router         = express.Router();
const PreBoarding    = require('../models/PreBoarding');
const OfferLetter    = require('../models/OfferLetter');
const Candidate      = require('../models/Candidate');
const Application    = require('../models/Application');
const { authenticate }   = require('../middleware/auth');
const { allowRoles }     = require('../middleware/rbac');
const asyncHandler       = require('../utils/asyncHandler');
const AppError           = require('../utils/AppError');
const { sendEmailWithRetry } = require('../utils/email');

/**
 * Create a pre-boarding record for any application (hired candidate).
 * Called manually by HR/recruiter OR automatically when stage moves to Hired.
 * Safe to call multiple times — returns existing record if already created.
 */
async function createPreBoardingForApplication(applicationId, tenantId, createdByUserId) {
  const app = await Application.findOne({ _id: applicationId, tenantId, deletedAt: null })
    .populate('candidateId', 'name email phone')
    .populate('jobId', 'title department')
    .lean();
  if (!app) return null;

  const existing = await PreBoarding.findOne({ applicationId });
  if (existing) return existing;

  const candidate = app.candidateId || {};
  const job       = app.jobId       || {};
  const mockOfferId = require('crypto').createHash('md5').update(String(applicationId)).digest('hex');

  return PreBoarding.create({
    tenantId,
    candidateId  : candidate._id || app.candidateId,
    applicationId: applicationId,
    offerId      : `manual_${mockOfferId}`, // synthetic offerId for manual triggers
    candidateName : candidate.name  || app.candidateName  || 'Candidate',
    candidateEmail: candidate.email || app.candidateEmail || '',
    designation   : job.title || 'New Hire',
    department    : job.department || '',
    status        : 'pending',
    tasks         : DEFAULT_TASKS.map(t => ({ ...t })),
  });
}

// (helper exported at bottom alongside router)

const DEFAULT_TASKS = [
  { title: 'Submit Aadhaar Card',          category: 'document',    isRequired: true },
  { title: 'Submit PAN Card',              category: 'document',    isRequired: true },
  { title: 'Submit Salary Slips (3)',      category: 'document',    isRequired: true },
  { title: 'Submit Experience Letter',          category: 'document',    isRequired: false },
  { title: 'Submit Relieving Letter',           category: 'document',    isRequired: false },
  { title: 'Submit Educational Documents',      category: 'document',    isRequired: true },
  { title: 'Bank Account Details & Cancelled Cheque', category: 'document', isRequired: true },
  // ── 3 Additional BVD Documents ────────────────────────────────────────────
  { title: 'Background Verification Consent Form', category: 'document', isRequired: true },
  { title: 'Address Proof (Utility Bill / Passport)', category: 'document', isRequired: true },
  { title: 'Previous Employer Reference Contact',  category: 'document', isRequired: false },
  // ── IT & Onboarding ────────────────────────────────────────────────────────
  { title: 'IT Asset Request Submitted',        category: 'it_setup',    isRequired: true },
  { title: 'Work Email Created',                category: 'it_setup',    isRequired: true },
  { title: 'Review Employee Handbook',          category: 'policy',      isRequired: true },
  { title: 'Complete Compliance Training',      category: 'training',    isRequired: true },
  { title: 'Orientation Scheduled',             category: 'orientation', isRequired: true },
];

const tenantGuard = (req, res, next) => {
  if (!req.user?.tenantId) return res.status(403).json({ success: false, error: 'Tenant context missing.' });
  next();
};

// ── HR/Admin: list all pre-boarding records ───────────────────────────────────
// super_admin sees ALL orgs; admin/recruiter see their org only
router.get('/', authenticate, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const q = req.user.role === 'super_admin' ? {} : { tenantId: req.user.tenantId };
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

// ── Upload document for a task (Candidate) ────────────────────────────────────
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB
const Tenant = require('../models/Tenant');
const checkPlanLimits = require('../middleware/checkPlanLimits');

router.post('/:id/tasks/:taskId/upload', authenticate, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded.', 400);
  if (req.file.size > 8 * 1024 * 1024) throw new AppError('File too large. Max 8 MB.', 400);

  const pb = await PreBoarding.findOne({ _id: req.params.id, 'tasks._id': req.params.taskId });
  if (!pb) throw new AppError('Pre-boarding record or task not found.', 404);

  // Store as base64 data URI — same approach as chat attachments.
  // No external storage needed; files are embedded in the DB document.
  const mime = req.file.mimetype || 'application/octet-stream';
  const fileUrl = `data:${mime};base64,${req.file.buffer.toString('base64')}`;

  const record = await PreBoarding.findOneAndUpdate(
    { _id: req.params.id, 'tasks._id': req.params.taskId },
    {
      $set: {
        'tasks.$.fileUrl'      : fileUrl,
        'tasks.$.fileName'     : req.file.originalname,
        'tasks.$.fileSize'     : req.file.size,
        'tasks.$.fileUploadedAt': new Date(),
        'tasks.$.verifyStatus' : 'pending_review', // HR needs to verify
        // Do NOT auto-complete — completion only after HR verifies
      }
    },
    { new: true }
  ).lean();

  // Auto-move record to in_progress if still pending
  if (record.status === 'pending') {
    await PreBoarding.findByIdAndUpdate(record._id, { status: 'in_progress' });
    record.status = 'in_progress';
  }

  try { await Tenant.findByIdAndUpdate(pb.tenantId, { $inc: { 'stats.storageUsed': req.file.size } }); } catch {}

  res.json({ success: true, data: { ...record, id: record._id.toString() } });
}));

// ── HR verifies / rejects a document ─────────────────────────────────────────
router.patch('/:id/tasks/:taskId/verify', authenticate, tenantGuard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { action, notes } = req.body; // action: 'approve' | 'reject' | 'request_resubmission'
  if (!['approve', 'reject', 'request_resubmission'].includes(action)) throw new AppError('action must be approve, reject, or request_resubmission.', 400);

  const pb = await PreBoarding.findOne({ _id: req.params.id, tenantId: req.user.tenantId, 'tasks._id': req.params.taskId });
  if (!pb) throw new AppError('Pre-boarding record or task not found.', 404);

  const verifyStatus = action === 'approve' ? 'verified' : action === 'reject' ? 'rejected' : 'resubmission_required';
  const update = {
    'tasks.$.verifyStatus' : verifyStatus,
    'tasks.$.verifyNotes'  : notes || '',
    'tasks.$.verifiedBy'   : req.user.name || req.user.id,
    'tasks.$.verifiedAt'   : new Date(),
  };

  // Only mark complete when HR approves
  if (action === 'approve') {
    update['tasks.$.completedAt'] = new Date();
    update['tasks.$.completedBy'] = 'hr';
  } else {
    // Reset completion if rejected or needs resubmission
    update['tasks.$.completedAt'] = null;
    update['tasks.$.completedBy'] = null;
  }

  const record = await PreBoarding.findOneAndUpdate(
    { _id: req.params.id, 'tasks._id': req.params.taskId },
    { $set: update },
    { new: true }
  ).lean();

  // Recalculate overall status
  const allDone = record.tasks.every(t => t.completedAt || !t.isRequired);
  const anyDone = record.tasks.some(t => t.completedAt);
  const newStatus = allDone ? 'completed' : anyDone ? 'in_progress' : 'pending';
  if (record.status !== newStatus) await PreBoarding.findByIdAndUpdate(record._id, { status: newStatus });

  res.json({ success: true, data: { ...record, id: record._id.toString() } });
}));

// ── Send/resend welcome kit email ─────────────────────────────────────────────
router.post('/:id/send-welcome-kit', authenticate, tenantGuard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const record = await PreBoarding.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!record) throw new AppError('Pre-boarding record not found.', 404);

  const joiningDateStr = record.joiningDate
    ? new Date(record.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'your joining date';

  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
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

// POST /api/preboarding/start — manually start pre-boarding for any hired candidate (HR/admin/recruiter)
router.post('/start', authenticate, tenantGuard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { applicationId } = req.body;
  if (!applicationId) throw new AppError('applicationId required', 400);
  const pb = await createPreBoardingForApplication(applicationId, req.user.tenantId, req.user._id || req.user.id);
  if (!pb) throw new AppError('Application not found or not in your organisation.', 404);
  res.json({ success: true, data: { ...pb.toObject?.() || pb, id: pb._id?.toString() } });
}));

// ── GET /api/preboarding/hired-pending — hired candidates without preboarding yet ──
// Used by admin dashboard to see who needs BVD request sent
router.get('/hired-pending', authenticate, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const tenantFilter = req.user.role === 'super_admin' ? {} : { tenantId: req.user.tenantId };

  // All applications with stage = Hired
  const hiredApps = await Application.find({ ...tenantFilter, currentStage: 'Hired', deletedAt: null })
    .populate('candidateId', 'name email phone')
    .populate('jobId', 'title company companyName department')
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();

  // Existing preboarding records
  const existingAppIds = new Set(
    (await PreBoarding.find(tenantFilter).select('applicationId').lean())
      .map(p => String(p.applicationId))
  );

  // Filter out candidates who already have preboarding
  const pending = hiredApps
    .filter(a => !existingAppIds.has(String(a._id)))
    .map(a => ({
      applicationId: a._id?.toString(),
      candidateName: a.candidateId?.name || a.candidateName || 'Candidate',
      candidateEmail: a.candidateId?.email || a.candidateEmail || '',
      candidatePhone: a.candidateId?.phone || a.candidatePhone || '',
      jobTitle: a.jobId?.title || a.jobTitle || 'Unknown Job',
      jobCompany: a.jobId?.companyName || a.jobId?.company || '',
      hiredAt: a.updatedAt,
      tenantId: a.tenantId,
    }));

  res.json({ success: true, data: pending });
}));

// ── POST /api/preboarding/start-with-hired — start preboarding + update stage to Hired ──
// Creates preboarding for any candidate+job, moves application to Hired stage
router.post('/start-with-hired', authenticate, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { applicationId } = req.body;
  if (!applicationId) throw new AppError('applicationId required', 400);

  const app = await Application.findOne({ _id: applicationId, deletedAt: null });
  if (!app) throw new AppError('Application not found', 404);

  // Move to Hired stage if not already
  if (app.currentStage !== 'Hired') {
    app.currentStage = 'Hired';
    app.status = 'hired';
    app.stageHistory.push({ stage: 'Hired', movedBy: req.user._id || req.user.id, movedAt: new Date(), notes: 'Marked Hired from Pre-boarding' });
    await app.save();
    const Job = require('../models/Job');
    await Job.findByIdAndUpdate(app.jobId, { $inc: { hiredCount: 1 } }).catch(() => {});
  }

  const tenantId = app.tenantId || req.user.tenantId;
  const pb = await createPreBoardingForApplication(applicationId, tenantId, req.user._id || req.user.id);
  if (!pb) throw new AppError('Could not create pre-boarding. Application not found.', 404);

  res.json({ success: true, data: { ...pb.toObject?.() || pb, id: pb._id?.toString() } });
}));

// ── GET /api/preboarding/doc-status — document submission overview for all candidates ──
// Shows aggregate: how many docs submitted, pending, verified per candidate
router.get('/doc-status', authenticate, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const tenantFilter = req.user.role === 'super_admin' ? {} : { tenantId: req.user.tenantId };
  const records = await PreBoarding.find(tenantFilter).lean();

  const summary = records.map(r => {
    const docTasks = (r.tasks || []).filter(t => t.category === 'document');
    const submitted  = docTasks.filter(t => t.fileUrl).length;
    const verified   = docTasks.filter(t => t.verifyStatus === 'verified').length;
    const pending    = docTasks.filter(t => !t.fileUrl).length;
    const needsReview= docTasks.filter(t => t.verifyStatus === 'pending_review').length;
    const rejected   = docTasks.filter(t => t.verifyStatus === 'rejected' || t.verifyStatus === 'resubmission_required').length;
    const allVerified = docTasks.length > 0 && verified === docTasks.length;
    const overallStatus = allVerified ? 'all_verified'
      : submitted === docTasks.length ? 'all_submitted'
      : pending > 0 ? 'pending_submission'
      : 'partial';

    return {
      preBoardingId: r._id?.toString(),
      candidateName: r.candidateName,
      candidateEmail: r.candidateEmail,
      designation: r.designation,
      tenantId: r.tenantId,
      joiningDate: r.joiningDate,
      totalDocs: docTasks.length,
      submitted, verified, pending, needsReview, rejected,
      overallStatus,
      overallPct: r.tasks?.length > 0 ? Math.round(((r.tasks || []).filter(t => t.completedAt).length / r.tasks.length) * 100) : 0,
    };
  });

  res.json({ success: true, data: summary });
}));

module.exports = router;
module.exports.createPreBoardingForApplication = createPreBoardingForApplication;

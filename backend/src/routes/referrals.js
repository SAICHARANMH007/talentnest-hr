'use strict';
const express      = require('express');
const crypto       = require('crypto');
const mongoose     = require('mongoose');
const { authenticate: auth } = require('../middleware/auth');
const { tenantGuard }  = require('../middleware/tenantGuard');
const { allowRoles }   = require('../middleware/rbac');
const asyncHandler     = require('../utils/asyncHandler');
const AppError         = require('../utils/AppError');
const Referral         = require('../models/Referral');
const Tenant           = require('../models/Tenant');
const Job              = require('../models/Job');
const Candidate        = require('../models/Candidate');
const Application      = require('../models/Application');

const router = express.Router();
const guard  = [auth, tenantGuard];

// GET /api/referrals — list referrals for org (admin/recruiter sees own org; super_admin sees all)
router.get('/', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const filter = req.user.role === 'super_admin' && req.query.all === '1'
    ? {}                              // super_admin with ?all=1 sees every referral
    : { tenantId: req.user.tenantId };
  const refs = await Referral.find(filter)
    .populate('jobId', 'title company companyName tenantId')
    .populate('candidateId', 'name email')
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  // For super_admin all-orgs view: attach org name from Tenant
  let tenantMap = {};
  if (req.user.role === 'super_admin' && req.query.all === '1') {
    const tenantIds = [...new Set(refs.map(r => r.tenantId?.toString()).filter(Boolean))];
    const tenants = await Tenant.find({ _id: { $in: tenantIds } }).select('name').lean();
    tenants.forEach(t => { tenantMap[t._id.toString()] = t.name; });
  }

  const data = refs.map(r => ({
    ...r,
    orgName: tenantMap[r.tenantId?.toString()] || null,
  }));

  res.json({ success: true, data });
}));

// GET /api/referrals/token/:token — public; return referrer info for the apply page banner
router.get('/token/:token', asyncHandler(async (req, res) => {
  const ref = await Referral.findOne({ referralLinkToken: req.params.token })
    .populate('jobId', 'title company companyName referralReward')
    .lean();
  if (!ref) return res.json({ success: false, data: null });
  res.json({
    success: true,
    data: {
      referredByName : ref.referredByName  || '',
      referredByEmail: ref.referredByEmail || '',
      jobTitle       : ref.jobId?.title || '',
      rewardAmount   : ref.jobId?.referralReward ?? ref.rewardAmount ?? null,
      status         : ref.status,
    },
  });
}));

// POST /api/referrals/generate — any logged-in user (including candidates) can generate a referral link
router.post('/generate', auth, tenantGuard, asyncHandler(async (req, res) => {
  const { jobId, referrerName, referrerEmail, rewardAmount } = req.body;
  if (!jobId) throw new AppError('jobId is required.', 400);

  // Find the job — candidates can refer any active job in any tenant they belong to
  const jobFilter = req.user.role === 'candidate'
    ? { _id: jobId, status: 'active', deletedAt: null }
    : { _id: jobId, tenantId: req.user.tenantId, deletedAt: null };
  const job = await Job.findOne(jobFilter).lean();
  if (!job) throw new AppError('Job not found.', 404);

  // Admins/recruiters can override reward; others use the job-level default
  const isStaff = ['admin', 'super_admin', 'recruiter'].includes(req.user.role);
  const effectiveReward = isStaff && rewardAmount != null
    ? Number(rewardAmount)
    : (job.referralReward ?? null);

  const token = crypto.randomBytes(16).toString('hex');
  const ref = await Referral.create({
    tenantId         : job.tenantId,
    jobId,
    referredByName   : (referrerName?.trim() || req.user.name || ''),
    referredByEmail  : (referrerEmail?.trim() || req.user.email || '').toLowerCase(),
    referralLinkToken: token,
    rewardAmount     : effectiveReward,
    status           : 'pending',
  });

  const SITE = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
  const link = `${SITE}/careers/job/${job.careerPageSlug || job._id}?ref=${token}`;

  res.status(201).json({ success: true, data: { ...ref.toJSON(), link } });
}));

// GET /api/referrals/my — any logged-in user: list referrals I created
router.get('/my', auth, asyncHandler(async (req, res) => {
  const refs = await Referral.find({ referredByEmail: req.user.email?.toLowerCase() })
    .populate('jobId', 'title company companyName referralReward')
    .populate('candidateId', 'name email')
    .sort({ createdAt: -1 })
    .lean();
  // Attach the live referral link to each record
  const SITE = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
  const enriched = refs.map(r => ({
    ...r,
    link: r.jobId ? `${SITE}/careers/job/${r.jobId?.careerPageSlug || r.jobId?._id}?ref=${r.referralLinkToken}` : null,
    rewardAmount: r.rewardAmount ?? r.jobId?.referralReward ?? null,
  }));
  res.json({ success: true, data: enriched });
}));

// POST /api/referrals/track — called server-side when candidate applies (now handled in applications.js)
router.post('/track', asyncHandler(async (req, res) => {
  const { token, candidateId } = req.body;
  if (!token) return res.json({ success: false });
  await Referral.findOneAndUpdate(
    { referralLinkToken: token },
    { $set: { candidateId, status: 'applied' } }
  );
  res.json({ success: true });
}));

// PATCH /api/referrals/:id/mark-hired — admin/super_admin marks referral as hired
router.patch('/:id/mark-hired', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'super_admin';
  const refFilter = isSuperAdmin ? { _id: req.params.id } : { _id: req.params.id, tenantId: req.user.tenantId };
  const ref = await Referral.findOneAndUpdate(
    refFilter,
    { $set: { status: 'hired' } }, { new: true }
  );
  if (!ref) throw new AppError('Referral not found.', 404);

  if (ref.referredByEmail && ref.rewardAmount) {
    const { sendEmailWithRetry } = require('../utils/email');
    sendEmailWithRetry(ref.referredByEmail,
      `🎉 Your referral was hired! Reward: ₹${ref.rewardAmount?.toLocaleString()}`,
      `<p>Hi ${ref.referredByName || 'there'},</p><p>Great news! The candidate you referred has been hired. Your reward of <strong>₹${ref.rewardAmount?.toLocaleString()}</strong> will be processed soon.</p>`
    ).catch(() => {});
  }

  res.json({ success: true, data: ref });
}));

// PATCH /api/referrals/:id/pay-reward — admin/super_admin marks reward as paid
router.patch('/:id/pay-reward', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'super_admin';
  const refFilter = isSuperAdmin ? { _id: req.params.id } : { _id: req.params.id, tenantId: req.user.tenantId };
  const ref = await Referral.findOneAndUpdate(
    refFilter,
    { $set: { rewardPaid: true, rewardPaidAt: new Date() } }, { new: true }
  );
  if (!ref) throw new AppError('Referral not found.', 404);
  res.json({ success: true, data: ref });
}));

// PATCH /api/referrals/jobs/:jobId/reward — admin sets default reward for a job
router.patch('/jobs/:jobId/reward', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const { rewardAmount, referralEnabled } = req.body;
  const update = {};
  if (rewardAmount !== undefined) update.referralReward = rewardAmount === null ? null : Number(rewardAmount);
  if (referralEnabled !== undefined) update.referralEnabled = Boolean(referralEnabled);
  const isSuperAdmin = req.user.role === 'super_admin';
  const jobFilter = isSuperAdmin
    ? { _id: req.params.jobId, deletedAt: null }
    : { _id: req.params.jobId, tenantId: req.user.tenantId, deletedAt: null };
  const job = await Job.findOneAndUpdate(
    jobFilter,
    { $set: update },
    { new: true }
  ).select('title referralReward referralEnabled').lean();
  if (!job) throw new AppError('Job not found.', 404);
  res.json({ success: true, data: job });
}));

// GET /api/referrals/stats — org summary stats
router.get('/stats', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const filter = req.user.role === 'super_admin' && req.query.all === '1'
    ? {}
    : { tenantId: new mongoose.Types.ObjectId(req.user.tenantId) };
  const tenantFilter = { ...filter };
  if (filter.tenantId) {
    // already ObjectId
  } else if (req.user.tenantId) {
    tenantFilter.tenantId = new mongoose.Types.ObjectId(req.user.tenantId);
  }
  const matchBase = filter.tenantId ? { tenantId: filter.tenantId } : {};

  const [total, applied, hired, paid] = await Promise.all([
    Referral.countDocuments(matchBase),
    Referral.countDocuments({ ...matchBase, status: 'applied' }),
    Referral.countDocuments({ ...matchBase, status: 'hired' }),
    Referral.countDocuments({ ...matchBase, rewardPaid: true }),
  ]);
  const rewardSum = await Referral.aggregate([
    { $match: { ...matchBase, status: 'hired', rewardPaid: false, rewardAmount: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: '$rewardAmount' } } },
  ]);
  res.json({ success: true, data: { total, applied, hired, rewardsPaid: paid, pendingRewards: rewardSum[0]?.total || 0 } });
}));

module.exports = router;

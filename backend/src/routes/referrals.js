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
const Job              = require('../models/Job');
const Candidate        = require('../models/Candidate');
const Application      = require('../models/Application');

const router = express.Router();
const guard  = [auth, tenantGuard];

// GET /api/referrals — list referrals for org
router.get('/', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const refs = await Referral.find({ tenantId: req.user.tenantId })
    .populate('jobId', 'title')
    .populate('candidateId', 'name email')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: refs });
}));

// POST /api/referrals/generate — generate a referral link for a job
router.post('/generate', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { jobId, referrerName, referrerEmail, rewardAmount } = req.body;
  if (!jobId) throw new AppError('jobId is required.', 400);

  const job = await Job.findOne({ _id: jobId, tenantId: req.user.tenantId, deletedAt: null }).lean();
  if (!job) throw new AppError('Job not found.', 404);

  const token = crypto.randomBytes(16).toString('hex');
  const ref = await Referral.create({
    tenantId         : req.user.tenantId,
    jobId,
    referredByName   : referrerName?.trim() || req.user.name || '',
    referredByEmail  : referrerEmail?.trim() || req.user.email || '',
    referralLinkToken: token,
    rewardAmount     : rewardAmount || null,
    status           : 'pending',
  });

  const SITE = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
  const link = `${SITE}/careers/job/${job.careerPageSlug || job._id}?ref=${token}`;

  res.status(201).json({ success: true, data: { ...ref.toJSON(), link } });
}));

// GET /api/referrals/my — candidate: list referrals I made
router.get('/my', auth, asyncHandler(async (req, res) => {
  const refs = await Referral.find({
    referredByEmail: req.user.email,
    tenantId: req.user.tenantId,
  }).populate('jobId', 'title').populate('candidateId', 'name email').sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: refs });
}));

// POST /api/referrals/track — called when candidate applies via referral link (public)
router.post('/track', asyncHandler(async (req, res) => {
  const { token, candidateId } = req.body;
  if (!token) return res.json({ success: false });

  await Referral.findOneAndUpdate(
    { referralLinkToken: token },
    { $set: { candidateId, status: 'applied' } }
  );
  res.json({ success: true });
}));

// PATCH /api/referrals/:id/mark-hired — mark referral as hired + reward
router.patch('/:id/mark-hired', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const ref = await Referral.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId },
    { $set: { status: 'hired' } }, { new: true }
  );
  if (!ref) throw new AppError('Referral not found.', 404);

  // Send reward notification email if referrer has an email
  if (ref.referredByEmail && ref.rewardAmount) {
    const { sendEmailWithRetry } = require('../utils/email');
    sendEmailWithRetry(ref.referredByEmail,
      `🎉 Your referral was hired! Reward: ₹${ref.rewardAmount}`,
      `<p>Hi ${ref.referredByName || 'Team'},</p><p>Great news! The candidate you referred has been hired. Your reward of <strong>₹${ref.rewardAmount}</strong> is being processed.</p>`
    ).catch(() => {});
  }

  res.json({ success: true, data: ref });
}));

// PATCH /api/referrals/:id/pay-reward — mark reward as paid
router.patch('/:id/pay-reward', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const ref = await Referral.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId },
    { $set: { rewardPaid: true, rewardPaidAt: new Date() } }, { new: true }
  );
  if (!ref) throw new AppError('Referral not found.', 404);
  res.json({ success: true, data: ref });
}));

// GET /api/referrals/stats — summary stats for org
router.get('/stats', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tenantObjId = new mongoose.Types.ObjectId(req.user.tenantId);
  const [total, applied, hired, paid] = await Promise.all([
    Referral.countDocuments({ tenantId: tenantObjId }),
    Referral.countDocuments({ tenantId: tenantObjId, status: 'applied' }),
    Referral.countDocuments({ tenantId: tenantObjId, status: 'hired' }),
    Referral.countDocuments({ tenantId: tenantObjId, rewardPaid: true }),
  ]);
  const rewardSum = await Referral.aggregate([
    { $match: { tenantId: tenantObjId, status: 'hired', rewardPaid: false, rewardAmount: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: '$rewardAmount' } } },
  ]);
  res.json({ success: true, data: { total, applied, hired, rewardsPaid: paid, pendingRewards: rewardSum[0]?.total || 0 } });
}));

module.exports = router;

'use strict';
const express      = require('express');
const mongoose     = require('mongoose');
const { authenticate: auth } = require('../middleware/auth');
const { allowRoles }         = require('../middleware/rbac');
const asyncHandler           = require('../utils/asyncHandler');
const PlatformReferral       = require('../models/PlatformReferral');
const User                   = require('../models/User');

const router = express.Router();

const COINS_PER_REFERRAL  = 25;
const VERIFIED_BADGE_COST = 100;

const BADGE_TIERS = [
  { name: 'Diamond', icon: '💎', threshold: 1000 },
  { name: 'Gold',    icon: '🥇', threshold: 500  },
  { name: 'Silver',  icon: '🥈', threshold: 200  },
  { name: 'Bronze',  icon: '🥉', threshold: 50   },
];

function resolveTiers(coins) {
  const earned = BADGE_TIERS.find(t => coins >= t.threshold) || null;
  const next   = [...BADGE_TIERS].reverse().find(t => coins < t.threshold) || null;
  return { earned, next };
}

// GET /api/platform-referrals/my-stats
router.get('/my-stats', auth, asyncHandler(async (req, res) => {
  const userId  = req.user.id || req.user._id;
  const userDoc = await User.findById(userId).select('platformVerified platformVerifiedAt').lean();
  const allRecs = await PlatformReferral.find({ referrerId: userId }).sort({ createdAt: -1 }).lean();

  // Coins come only from signed_up/active records (invited rows award 0)
  const coins = allRecs.reduce((s, r) => s + (r.coinsAwarded || 0), 0);
  const { earned: badgeTier, next: nextTier } = resolveTiers(coins);
  const baseUrl = process.env.FRONTEND_URL || 'https://talentnesthr.com';

  const invitesSent = allRecs.filter(r => r.status === 'invited').length;
  const joined      = allRecs.filter(r => r.status === 'signed_up' || r.status === 'active').length;

  res.json({
    referralCode    : userId.toString(),
    referralLink    : `${baseUrl}/auth?platformRef=${userId}`,
    coins,
    badgeTier,
    nextTier,
    verifiedBadgeCost: VERIFIED_BADGE_COST,
    isVerified      : userDoc?.platformVerified || false,
    verifiedAt      : userDoc?.platformVerifiedAt || null,
    invitesSent,
    joined,
    referrals       : allRecs.map(r => ({
      id           : r._id,
      referredName : r.referredName || null,
      referredEmail: r.referredEmail || null,
      status       : r.status,
      coinsAwarded : r.coinsAwarded,
      createdAt    : r.createdAt,
    })),
    totalReferrals  : allRecs.length,
  });
}));

// POST /api/platform-referrals/track-invite
// Called by the referrer's browser when they copy/share their link.
// Creates an 'invited' record to show link was shared, even before anyone signs up.
router.post('/track-invite', auth, asyncHandler(async (req, res) => {
  const referrerId = req.user.id || req.user._id;

  await PlatformReferral.create({
    referrerId,
    referrerName  : req.user.name,
    referrerEmail : req.user.email,
    status        : 'invited',
    coinsAwarded  : 0,
  });

  res.json({ success: true });
}));

// POST /api/platform-referrals/credit
// Called by the new user's browser immediately after first login with a referral code stored in localStorage.
router.post('/credit', auth, asyncHandler(async (req, res) => {
  const { referralCode } = req.body;

  if (!referralCode || !mongoose.Types.ObjectId.isValid(referralCode)) {
    return res.status(400).json({ error: 'Invalid referral code' });
  }

  const newUserId = (req.user.id || req.user._id).toString();

  if (referralCode === newUserId) {
    return res.status(400).json({ error: 'Self-referral not allowed' });
  }

  // Idempotency — one coin credit per new user ever
  const existing = await PlatformReferral.findOne({ referredUserId: newUserId });
  if (existing) return res.json({ success: false, message: 'Already credited' });

  const referrer = await User.findById(referralCode).select('name email').lean();
  if (!referrer) return res.status(404).json({ error: 'Referrer not found' });

  await PlatformReferral.create({
    referrerId    : referrer._id,
    referrerName  : referrer.name,
    referrerEmail : referrer.email,
    referredUserId: newUserId,
    referredName  : req.user.name,
    referredEmail : req.user.email,
    status        : 'signed_up',
    coinsAwarded  : COINS_PER_REFERRAL,
    convertedAt   : new Date(),
  });

  res.json({ success: true, coinsAwarded: COINS_PER_REFERRAL });
}));

// POST /api/platform-referrals/redeem-verified-badge
// Candidate spends 100 coins to get a TalentNest Verified badge on their profile.
router.post('/redeem-verified-badge', auth, asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;

  // Check if already verified
  const userDoc = await User.findById(userId).select('platformVerified').lean();
  if (userDoc?.platformVerified) {
    return res.json({ success: false, message: 'Already verified' });
  }

  // Compute current coin balance
  const allRecs = await PlatformReferral.find({ referrerId: userId }).lean();
  const coins   = allRecs.reduce((s, r) => s + (r.coinsAwarded || 0), 0);

  if (coins < VERIFIED_BADGE_COST) {
    return res.status(400).json({
      error: `Not enough coins. You need ${VERIFIED_BADGE_COST} coins — you have ${coins}.`,
    });
  }

  // Create deduction record and mark user as verified atomically
  await Promise.all([
    PlatformReferral.create({
      referrerId   : userId,
      referrerName : req.user.name,
      referrerEmail: req.user.email,
      status       : 'signed_up',
      coinsAwarded : -VERIFIED_BADGE_COST, // negative = deduction
      referredName : 'TalentNest Verified Badge',
    }),
    User.findByIdAndUpdate(userId, {
      platformVerified  : true,
      platformVerifiedAt: new Date(),
    }),
  ]);

  res.json({ success: true, message: 'Verified badge activated!' });
}));

// GET /api/platform-referrals/admin/all  (super_admin only)
router.get('/admin/all', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page)  || 1);
  const limit  = Math.min(100, parseInt(req.query.limit) || 50);
  const skip   = (page - 1) * limit;
  const search = (req.query.search || '').trim();

  const query = search ? {
    $or: [
      { referrerName  : { $regex: search, $options: 'i' } },
      { referrerEmail : { $regex: search, $options: 'i' } },
      { referredName  : { $regex: search, $options: 'i' } },
      { referredEmail : { $regex: search, $options: 'i' } },
    ],
  } : {};

  const [referrals, total] = await Promise.all([
    PlatformReferral.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PlatformReferral.countDocuments(query),
  ]);

  res.json({ referrals, total, page, pages: Math.ceil(total / limit) });
}));

// GET /api/platform-referrals/admin/stats  (super_admin only)
router.get('/admin/stats', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const [total, coinsAgg, topReferrers, verifiedCount] = await Promise.all([
    PlatformReferral.countDocuments({ status: { $in: ['signed_up', 'active'] }, coinsAwarded: { $gt: 0 } }),
    PlatformReferral.aggregate([{ $group: { _id: null, total: { $sum: '$coinsAwarded' } } }]),
    PlatformReferral.aggregate([
      { $match: { coinsAwarded: { $gt: 0 } } },
      { $group: {
          _id  : '$referrerId',
          name : { $first: '$referrerName' },
          email: { $first: '$referrerEmail' },
          count: { $sum: 1 },
          coins: { $sum: '$coinsAwarded' },
      }},
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    User.countDocuments({ platformVerified: true }),
  ]);

  res.json({
    total,
    totalCoinsAwarded: coinsAgg[0]?.total || 0,
    topReferrers,
    verifiedCandidates: verifiedCount,
    badgeTiers: BADGE_TIERS,
    verifiedBadgeCost: VERIFIED_BADGE_COST,
  });
}));

module.exports = router;

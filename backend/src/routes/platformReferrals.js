'use strict';
const express      = require('express');
const mongoose     = require('mongoose');
const { authenticate: auth } = require('../middleware/auth');
const { allowRoles }         = require('../middleware/rbac');
const asyncHandler           = require('../utils/asyncHandler');
const PlatformReferral       = require('../models/PlatformReferral');
const User                   = require('../models/User');

const router = express.Router();

const COINS_PER_REFERRAL = 25;

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
  const userId = req.user.id || req.user._id;
  const referrals = await PlatformReferral.find({ referrerId: userId }).sort({ createdAt: -1 }).lean();
  const coins = referrals.reduce((s, r) => s + (r.coinsAwarded || 0), 0);
  const { earned: badgeTier, next: nextTier } = resolveTiers(coins);
  const baseUrl = process.env.FRONTEND_URL || 'https://talentnesthr.com';

  res.json({
    referralCode : userId.toString(),
    referralLink : `${baseUrl}/auth?platformRef=${userId}`,
    coins,
    badgeTier,
    nextTier,
    referrals    : referrals.map(r => ({
      id           : r._id,
      referredName : r.referredName || 'Someone',
      referredEmail: r.referredEmail,
      status       : r.status,
      coinsAwarded : r.coinsAwarded,
      createdAt    : r.createdAt,
    })),
    totalReferrals : referrals.length,
    activeReferrals: referrals.filter(r => r.status === 'active').length,
  });
}));

// POST /api/platform-referrals/credit
// Called by the new user's browser immediately after registration (authenticated as new user)
router.post('/credit', auth, asyncHandler(async (req, res) => {
  const { referralCode } = req.body;

  if (!referralCode || !mongoose.Types.ObjectId.isValid(referralCode)) {
    return res.status(400).json({ error: 'Invalid referral code' });
  }

  const newUserId = (req.user.id || req.user._id).toString();

  // Self-referral guard
  if (referralCode === newUserId) {
    return res.status(400).json({ error: 'Self-referral not allowed' });
  }

  // Idempotency — one credit per new user
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
  const [total, coinsAgg, topReferrers] = await Promise.all([
    PlatformReferral.countDocuments(),
    PlatformReferral.aggregate([{ $group: { _id: null, total: { $sum: '$coinsAwarded' } } }]),
    PlatformReferral.aggregate([
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
  ]);

  res.json({
    total,
    totalCoinsAwarded: coinsAgg[0]?.total || 0,
    topReferrers,
    badgeTiers: BADGE_TIERS,
  });
}));

module.exports = router;

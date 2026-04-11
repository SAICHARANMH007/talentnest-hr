'use strict';
/**
 * NPS Routes — public survey response endpoints
 * GET /api/nps/respond/:token?score=N
 * GET /api/nps/respond/:token?recommend=yes|no
 * GET /api/nps/stats  — admin analytics
 */
const express    = require('express');
const router     = express.Router();
const jwt        = require('jsonwebtoken');
const CandidateNPS = require('../models/CandidateNPS');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard }    = require('../middleware/tenantGuard');
const asyncHandler       = require('../utils/asyncHandler');
const AppError           = require('../utils/AppError');

const JWT_SECRET   = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://talentnesthr.com';

// GET /api/nps/respond/:token — handle email link click (no auth needed)
router.get('/respond/:token', asyncHandler(async (req, res) => {
  const { score, recommend } = req.query;
  let payload;
  try {
    payload = jwt.verify(req.params.token, JWT_SECRET);
  } catch {
    return res.redirect(`${FRONTEND_URL}/nps-thankyou?status=invalid`);
  }

  const nps = await CandidateNPS.findOne({ surveyToken: req.params.token });
  if (!nps) return res.redirect(`${FRONTEND_URL}/nps-thankyou?status=invalid`);

  // One-time use — reject if already submitted
  if (nps.respondedAt) return res.redirect(`${FRONTEND_URL}/nps-thankyou?status=already_submitted`);

  const updates = { respondedAt: new Date() };

  if (score !== undefined) {
    const s = parseInt(score, 10);
    if (s >= 1 && s <= 10) updates.score = s;
  }
  if (recommend === 'yes') updates.wouldRecommend = true;
  if (recommend === 'no')  updates.wouldRecommend = false;

  await CandidateNPS.findByIdAndUpdate(nps._id, { $set: updates });

  res.redirect(`${FRONTEND_URL}/nps-thankyou?status=success`);
}));

// GET /api/nps/stats — admin: NPS dashboard data
router.get('/stats', authMiddleware, tenantGuard, asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [responses, recentFeedback] = await Promise.all([
    CandidateNPS.find({ tenantId, respondedAt: { $exists: true }, score: { $exists: true } })
      .select('score wouldRecommend feedbackText applicationOutcome respondedAt')
      .sort({ respondedAt: -1 })
      .lean(),
    CandidateNPS.find({ tenantId, feedbackText: { $exists: true, $ne: '' }, respondedAt: { $exists: true } })
      .select('feedbackText applicationOutcome respondedAt score')
      .sort({ respondedAt: -1 })
      .limit(20)
      .lean(),
  ]);

  const thisMonth = responses.filter(r => new Date(r.respondedAt) >= monthStart);

  const avgScore = (arr) => arr.length ? (arr.reduce((s, r) => s + r.score, 0) / arr.length).toFixed(1) : null;

  const hired    = responses.filter(r => r.applicationOutcome === 'hired');
  const rejected = responses.filter(r => r.applicationOutcome === 'rejected');

  res.json({
    success: true,
    data: {
      totalResponses : responses.length,
      avgScoreMonth  : avgScore(thisMonth),
      avgScoreHired  : avgScore(hired),
      avgScoreRejected: avgScore(rejected),
      recentFeedback,
    },
  });
}));

module.exports = router;

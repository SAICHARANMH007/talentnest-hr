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
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';

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

// GET /api/nps/survey/:token — return survey info for web form
router.get('/survey/:token', asyncHandler(async (req, res) => {
  let payload;
  try { payload = jwt.verify(req.params.token, JWT_SECRET); } catch {
    return res.status(400).json({ message: 'Invalid or expired survey link.' });
  }
  const nps = await CandidateNPS.findOne({ surveyToken: req.params.token })
    .populate('jobId', 'title company companyName').lean();
  if (!nps) return res.status(404).json({ message: 'Survey not found.' });
  if (nps.respondedAt) return res.json({ alreadySubmitted: true });
  res.json({
    alreadySubmitted: false,
    jobTitle : nps.jobId?.title || '',
    company  : nps.jobId?.company || nps.jobId?.companyName || '',
    outcome  : nps.applicationOutcome || '',
  });
}));

// POST /api/nps/survey/:token — web form submission
router.post('/survey/:token', asyncHandler(async (req, res) => {
  const { score, wouldRecommend, feedbackText } = req.body;
  let payload;
  try { payload = jwt.verify(req.params.token, JWT_SECRET); } catch {
    return res.status(400).json({ message: 'Invalid or expired survey link.' });
  }
  const nps = await CandidateNPS.findOne({ surveyToken: req.params.token });
  if (!nps) return res.status(404).json({ message: 'Survey not found.' });
  if (nps.respondedAt) return res.status(409).json({ message: 'Already submitted.' });

  const s = parseInt(score, 10);
  if (isNaN(s) || s < 1 || s > 10) return res.status(400).json({ message: 'Score must be 1–10.' });

  await CandidateNPS.findByIdAndUpdate(nps._id, {
    $set: {
      score,
      wouldRecommend: wouldRecommend !== undefined ? !!wouldRecommend : undefined,
      feedbackText  : feedbackText || '',
      respondedAt   : new Date(),
    },
  });
  res.json({ success: true });
}));

// GET /api/nps/stats — admin: NPS dashboard data
router.get('/stats', authMiddleware, tenantGuard, asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { startDate, endDate } = req.query;
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate)   dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));

  const baseQuery = { tenantId, respondedAt: { $exists: true }, score: { $exists: true } };
  if (startDate || endDate) baseQuery.respondedAt = { ...baseQuery.respondedAt, ...dateFilter };

  const [allSent, responses, recentFeedback] = await Promise.all([
    CandidateNPS.countDocuments({ tenantId }),
    CandidateNPS.find(baseQuery)
      .select('score wouldRecommend feedbackText applicationOutcome respondedAt')
      .sort({ respondedAt: -1 })
      .lean(),
    CandidateNPS.find({ tenantId, feedbackText: { $exists: true, $ne: '' }, respondedAt: { $exists: true },
      ...(startDate || endDate ? { respondedAt: { ...dateFilter } } : {}) })
      .select('feedbackText applicationOutcome respondedAt score')
      .sort({ respondedAt: -1 })
      .limit(20)
      .lean(),
  ]);

  const thisMonth = responses.filter(r => new Date(r.respondedAt) >= monthStart);
  const avgScore  = (arr) => arr.length ? (arr.reduce((s, r) => s + r.score, 0) / arr.length).toFixed(1) : null;
  const hired     = responses.filter(r => r.applicationOutcome === 'hired');
  const rejected  = responses.filter(r => r.applicationOutcome === 'rejected');

  const promoters  = responses.filter(r => r.score >= 9).length;
  const passives   = responses.filter(r => r.score >= 7 && r.score < 9).length;
  const detractors = responses.filter(r => r.score < 7).length;
  const total      = responses.length;
  const npsScore   = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : null;

  res.json({
    success: true,
    data: {
      totalResponses  : total,
      totalSent       : allSent,
      avgScoreMonth   : avgScore(thisMonth),
      avgScoreHired   : avgScore(hired),
      avgScoreRejected: avgScore(rejected),
      promoters,
      passives,
      detractors,
      npsScore,
      recentFeedback,
    },
  });
}));

module.exports = router;

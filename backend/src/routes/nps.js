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

  const updated = await CandidateNPS.findByIdAndUpdate(nps._id, {
    $set: {
      score,
      wouldRecommend: wouldRecommend !== undefined ? !!wouldRecommend : undefined,
      feedbackText  : feedbackText || '',
      respondedAt   : new Date(),
    },
  }, { new: true });

  // Broadcast to admin dashboards in real time
  try {
    const socketRegistry = require('../socket');
    const { emitToTenant } = require('../socket/platformSocket');
    emitToTenant(socketRegistry.getIO(), nps.tenantId, 'nps:submitted', {
      score: parseInt(score, 10),
      outcome: nps.applicationOutcome || '',
      feedbackText: feedbackText || '',
      respondedAt: new Date(),
    });
  } catch {}

  res.json({ success: true });
}));

// POST /api/nps/seed — admin: seed NPS responses using real candidates & jobs
router.post('/seed', authMiddleware, tenantGuard, asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  if (!tenantId) return res.json({ success: false, message: 'Not available for super_admin.' });

  const existing = await CandidateNPS.countDocuments({ tenantId });
  if (existing >= 10) return res.json({ success: true, message: 'NPS data already exists.', count: existing });

  const mongoose  = require('mongoose');
  const crypto    = require('crypto');
  const Candidate = require('../models/Candidate');
  const Job       = require('../models/Job');
  const Application = require('../models/Application');

  // Pull real candidates, jobs, and applications from the tenant
  const [candidates, jobs, applications] = await Promise.all([
    Candidate.find({ tenantId, deletedAt: null }).select('name email').limit(20).lean(),
    Job.find({ tenantId, deletedAt: null }).select('title company companyName').limit(10).lean(),
    Application.find({ tenantId }).select('candidateId jobId stage').limit(20).lean(),
  ]);

  const FEEDBACK = [
    'The entire process was smooth and professional. I felt respected throughout.',
    'Interview scheduling was seamless and the team was very responsive.',
    'Great experience! The hiring team was transparent about every step.',
    'Decent process but feedback took longer than expected after the final round.',
    'The rejection was handled professionally with constructive feedback. Appreciated.',
    'Amazing team — prompt, professional, and genuinely interested in candidates.',
    'Process was okay but communication could be improved between rounds.',
    'One of the best interview experiences I have had. Highly recommend applying here.',
    'The recruiter was extremely helpful and kept me updated throughout.',
    'Was not selected but the experience was fair. Would apply again.',
    'Loved the structured interviews and clear evaluation criteria.',
    'Very professional onboarding after selection. Felt welcome from day one.',
    'The team genuinely cares about candidate experience. Impressive.',
    'Communication was timely and the process was efficient.',
    'Rejected but received useful feedback. Rare and appreciated.',
    'Smooth process from application to offer. Highly satisfied.',
    'Outstanding recruiter support — always available for questions.',
    'Interview was well-structured with clear expectations set upfront.',
    'The timeline was longer than expected but eventually worth it.',
    'Best hiring experience in my career so far. Truly candidate-first.',
  ];
  const SCORES          = [9, 10, 8, 7, 5, 10, 6, 9, 10, 4, 8, 9, 10, 7, 5, 9, 10, 8, 3, 9];
  const OUTCOMES        = ['hired', 'rejected', 'hired', 'hired', 'rejected', 'hired', 'rejected', 'hired', 'hired', 'rejected'];
  const WOULD_RECOMMEND = [true, true, true, true, false, true, false, true, true, false, true, true, true, true, true, true, true, true, false, true];
  const COUNT = Math.min(20, Math.max(10, 20 - existing));

  const now = Date.now();
  const records = [];
  for (let i = 0; i < COUNT; i++) {
    const app       = applications[i % Math.max(1, applications.length)];
    const candidate = candidates[i % Math.max(1, candidates.length)];
    const job       = jobs[i % Math.max(1, jobs.length)];
    records.push({
      tenantId,
      applicationId: app?._id || new mongoose.Types.ObjectId(),
      candidateId  : app?.candidateId || candidate?._id || new mongoose.Types.ObjectId(),
      jobId        : app?.jobId || job?._id || new mongoose.Types.ObjectId(),
      score        : SCORES[i % SCORES.length],
      wouldRecommend    : WOULD_RECOMMEND[i % WOULD_RECOMMEND.length],
      feedbackText      : FEEDBACK[i % FEEDBACK.length],
      applicationOutcome: OUTCOMES[i % OUTCOMES.length],
      surveyToken       : crypto.randomBytes(24).toString('hex'),
      emailSentAt       : new Date(now - (COUNT - i) * 2 * 24 * 3600000),
      respondedAt       : new Date(now - (COUNT - i) * 2 * 24 * 3600000 + 3600000),
    });
  }

  await CandidateNPS.insertMany(records);
  res.json({ success: true, message: `${records.length} NPS responses seeded using real platform data.`, count: records.length });
}));

// GET /api/nps/stats — admin: NPS dashboard data
router.get('/stats', authMiddleware, tenantGuard, asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'super_admin';
  const tenantId = req.user.tenantId;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { startDate, endDate } = req.query;
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate)   dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));

  // super_admin sees platform-wide aggregate (no tenantId filter)
  const tenantFilter = isSuperAdmin ? {} : { tenantId };
  const baseQuery = { ...tenantFilter, respondedAt: { $exists: true }, score: { $exists: true } };
  if (startDate || endDate) baseQuery.respondedAt = { ...baseQuery.respondedAt, ...dateFilter };

  const [allSent, responses, recentFeedback] = await Promise.all([
    CandidateNPS.countDocuments(tenantFilter),
    CandidateNPS.find(baseQuery)
      .select('score wouldRecommend feedbackText applicationOutcome respondedAt')
      .sort({ respondedAt: -1 })
      .lean(),
    CandidateNPS.find({ ...tenantFilter, feedbackText: { $exists: true, $ne: '' }, respondedAt: { $exists: true },
      ...(startDate || endDate ? { respondedAt: { ...dateFilter } } : {}) })
      .select('feedbackText applicationOutcome respondedAt score')
      .sort({ respondedAt: -1 })
      .limit(200)
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

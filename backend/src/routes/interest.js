'use strict';
/**
 * Interest Tracking Routes
 * Candidates click email links → update interestStatus on Application.
 *
 * Token format: JWT signed with JWT_SECRET containing { candidateId, jobId, tenantId, action }
 * These are one-click, no-auth endpoints — token IS the auth.
 */
const express        = require('express');
const router         = express.Router();
const jwt            = require('jsonwebtoken');
const Application    = require('../models/Application');
const Candidate      = require('../models/Candidate');
const Job            = require('../models/Job');
const Notification   = require('../models/Notification');
const asyncHandler   = require('../utils/asyncHandler');
const AppError       = require('../utils/AppError');
const logger         = require('../middleware/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'talentnest_jwt_secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://talentnesthr.com';

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// GET /api/interest/confirm/:token — candidate clicks "I'm Interested"
router.get('/confirm/:token', asyncHandler(async (req, res) => {
  const payload = verifyToken(req.params.token);
  if (!payload || payload.action !== 'interest') {
    return res.redirect(`${FRONTEND_URL}/interest-expired`);
  }

  const { candidateId, jobId, tenantId } = payload;

  const app = await Application.findOne({ candidateId, jobId, tenantId, deletedAt: null });
  if (!app) return res.redirect(`${FRONTEND_URL}/interest-expired`);

  app.interestStatus = 'interested';
  if (app.currentStage === 'Applied') {
    app.currentStage = 'Screening';
    app.stageHistory.push({ stage: 'Screening', movedAt: new Date(), notes: 'Candidate confirmed interest via email link' });
  }
  await app.save();

  // Notify assigned recruiters
  const job = await Job.findById(jobId).select('title assignedRecruiters').lean();
  for (const rid of (job?.assignedRecruiters || [])) {
    Notification.create({
      userId: rid, tenantId, type: 'stage_change',
      title: 'Candidate Confirmed Interest',
      message: `A candidate confirmed interest in ${job?.title || 'a role'}.`,
      link: `/recruiter/pipeline?appId=${app._id}`,
    }).catch(() => {});
  }

  logger.audit('Interest confirmed', null, tenantId, { appId: app._id, candidateId, jobId });
  res.redirect(`${FRONTEND_URL}/interest-confirmed?job=${jobId}`);
}));

// GET /api/interest/decline/:token — candidate clicks "Not Interested"
router.get('/decline/:token', asyncHandler(async (req, res) => {
  const payload = verifyToken(req.params.token);
  if (!payload || payload.action !== 'interest') {
    return res.redirect(`${FRONTEND_URL}/interest-expired`);
  }

  const { candidateId, jobId, tenantId } = payload;

  const app = await Application.findOne({ candidateId, jobId, tenantId, deletedAt: null });
  if (!app) return res.redirect(`${FRONTEND_URL}/interest-expired`);

  app.interestStatus = 'not_interested';
  app.currentStage   = 'Rejected';
  app.status         = 'rejected';
  app.stageHistory.push({ stage: 'Rejected', movedAt: new Date(), notes: 'Candidate declined via email link' });
  await app.save();

  logger.audit('Interest declined', null, tenantId, { appId: app._id, candidateId, jobId });
  res.redirect(`${FRONTEND_URL}/interest-declined`);
}));

module.exports = router;

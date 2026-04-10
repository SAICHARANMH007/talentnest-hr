'use strict';
/**
 * NPS Scheduler — runs daily at 10 AM IST (4:30 AM UTC).
 * Finds applications moved to hired/rejected in the last 24 hours
 * that have not yet been sent an NPS survey.
 * Cron: '30 4 * * *'
 */
const cron        = require('node-cron');
const jwt         = require('jsonwebtoken');
const Application = require('../models/Application');
const Candidate   = require('../models/Candidate');
const Job         = require('../models/Job');
const CandidateNPS = require('../models/CandidateNPS');
const { sendEmailWithRetry } = require('../utils/email');
const logger = require('../middleware/logger');

const JWT_SECRET   = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://talentnesthr.com';

function generateSurveyToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

function buildScoreButtons(token) {
  const scores = [1,2,3,4,5,6,7,8,9,10];
  const colorFor = n => n <= 6 ? '#ef4444' : n <= 8 ? '#F59E0B' : '#10b981';
  return scores.map(n => {
    const url = `${FRONTEND_URL}/api/nps/respond/${token}?score=${n}`;
    return `<a href="${url}" style="display:inline-block;width:36px;height:36px;line-height:36px;border-radius:50%;background:${colorFor(n)};color:#fff;font-weight:700;font-size:14px;text-align:center;text-decoration:none;margin:2px">${n}</a>`;
  }).join('');
}

async function sendNpsSurvey(app, candidate, job, outcome) {
  try {
    if (!candidate?.email) return;

    const existing = await CandidateNPS.findOne({ applicationId: app._id });
    if (existing) return; // already sent

    const token = generateSurveyToken({
      candidateId  : candidate._id.toString(),
      applicationId: app._id.toString(),
      tenantId     : app.tenantId.toString(),
      outcome,
    });

    const nps = await CandidateNPS.create({
      tenantId      : app.tenantId,
      applicationId : app._id,
      candidateId   : candidate._id,
      jobId         : app.jobId,
      applicationOutcome: outcome,
      surveyToken   : token,
      emailSentAt   : new Date(),
    });

    const yesUrl = `${FRONTEND_URL}/api/nps/respond/${token}?recommend=yes`;
    const noUrl  = `${FRONTEND_URL}/api/nps/respond/${token}?recommend=no`;

    const outcomeMsg = outcome === 'hired'
      ? `Congratulations on joining <strong>${job?.title || 'your new role'}</strong>!`
      : `Thank you for interviewing for <strong>${job?.title || 'the role'}</strong>.`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0176D3;padding:24px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">How was your experience? 🌟</h2>
        </div>
        <div style="background:#f8faff;padding:24px;border-radius:0 0 8px 8px">
          <p>Hi ${candidate.name?.split(' ')[0] || 'there'},</p>
          <p>${outcomeMsg}</p>
          <p>We'd love your feedback on the hiring process. It only takes 30 seconds.</p>
          <p style="font-weight:700;margin-bottom:8px">On a scale of 1–10, how would you rate your experience? (1 = very poor, 10 = excellent)</p>
          <div style="margin-bottom:20px">${buildScoreButtons(token)}</div>
          <p style="font-weight:700;margin-bottom:8px">Would you recommend this company to others?</p>
          <div>
            <a href="${yesUrl}" style="display:inline-block;padding:10px 24px;background:#10b981;color:#fff;border-radius:6px;text-decoration:none;font-weight:700;margin-right:8px">👍 Yes</a>
            <a href="${noUrl}"  style="display:inline-block;padding:10px 24px;background:#ef4444;color:#fff;border-radius:6px;text-decoration:none;font-weight:700">👎 No</a>
          </div>
          <p style="color:#9E9D9B;font-size:11px;margin-top:20px">Your feedback is anonymous and helps improve the hiring experience.</p>
        </div>
      </div>`;

    await sendEmailWithRetry(candidate.email, 'Quick feedback on your hiring experience (30 sec)', html);
    console.log(`[npsScheduler] Survey sent to ${candidate.email} — app ${app._id}`);
  } catch (err) {
    logger.error('[npsScheduler] sendNpsSurvey error', { err: err.message, appId: app._id });
  }
}

async function runNpsScheduler() {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find hired applications in last 24h
    const hiredApps = await Application.find({
      currentStage: 'Hired',
      updatedAt   : { $gte: since },
      status      : 'hired',
      deletedAt   : null,
    }).lean();

    // Find rejected applications in last 24h
    const rejectedApps = await Application.find({
      currentStage: 'Rejected',
      updatedAt   : { $gte: since },
      status      : 'rejected',
      deletedAt   : null,
    }).lean();

    const all = [
      ...hiredApps.map(a => ({ ...a, _outcome: 'hired' })),
      ...rejectedApps.map(a => ({ ...a, _outcome: 'rejected' })),
    ];

    console.log(`[npsScheduler] Processing ${all.length} applications for NPS`);

    for (const app of all) {
      const [candidate, job] = await Promise.all([
        Candidate.findById(app.candidateId).select('name email').lean(),
        Job.findById(app.jobId).select('title').lean(),
      ]);
      await sendNpsSurvey(app, candidate, job, app._outcome);
    }
  } catch (err) {
    logger.error('[npsScheduler] run failed', { err: err.message });
  }
}

function startNpsSchedulerJob() {
  // 10 AM IST = 4:30 AM UTC
  cron.schedule('30 4 * * *', runNpsScheduler, { timezone: 'UTC' });
  console.log('[npsScheduler] scheduled — daily 10:00 AM IST');
}

module.exports = { startNpsSchedulerJob, runNpsScheduler };

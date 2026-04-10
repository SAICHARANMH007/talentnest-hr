'use strict';
/**
 * SLA Monitor — runs every hour.
 * Checks how long candidates have been in their current stage.
 * Sends warning at 80% of SLA, breach alert at 100%.
 * Cron: '0 * * * *'
 */
const cron         = require('node-cron');
const Tenant       = require('../models/Tenant');
const Application  = require('../models/Application');
const Notification = require('../models/Notification');
const User         = require('../models/User');
const Job          = require('../models/Job');
const Candidate    = require('../models/Candidate');
const { sendEmailWithRetry } = require('../utils/email');
const logger = require('../middleware/logger');

// Default SLA in hours per stage
const DEFAULT_SLA = {
  Applied          : 24,
  Screening        : 48,
  Shortlisted      : 72,
  'Interview Round 1': 168,
  'Interview Round 2': 168,
  Offer            : 72,
};

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://talentnesthr.com';

function hoursInStage(app) {
  if (!app.stageHistory || app.stageHistory.length === 0) return 0;
  const lastMove = app.stageHistory[app.stageHistory.length - 1];
  const movedAt  = new Date(lastMove.movedAt);
  return (Date.now() - movedAt.getTime()) / (1000 * 60 * 60);
}

async function processApplication(app, sla, recruiter, admin) {
  const hours    = hoursInStage(app);
  const limit    = sla[app.currentStage];
  if (!limit) return; // no SLA defined for this stage (e.g., Hired/Rejected)

  const pct      = hours / limit;
  if (pct < 0.8) return; // well within SLA

  // Dedup: don't re-alert within 24 hours
  if (app.lastSlaAlertAt) {
    const hoursSinceAlert = (Date.now() - new Date(app.lastSlaAlertAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceAlert < 24) return;
  }

  const isBreached = pct >= 1;
  const alertLabel = isBreached ? '🔴 SLA BREACHED' : '🟡 SLA Warning';
  const hoursRemaining = isBreached ? Math.round(hours - limit) : Math.round(limit - hours);
  const hourStr = isBreached
    ? `${hoursRemaining}h overdue`
    : `${hoursRemaining}h remaining`;

  const candidateName = app.candidateId?.name || 'Candidate';
  const jobTitle      = app.jobId?.title      || 'Role';
  const stage         = app.currentStage;
  const pipelineLink  = `${FRONTEND_URL}/app/pipeline`;

  const message = `${alertLabel}: ${candidateName} has been in "${stage}" for ${Math.round(hours)}h (${hourStr}).`;

  // In-app notification to recruiter
  if (recruiter) {
    await Notification.create({
      userId  : recruiter._id,
      tenantId: app.tenantId,
      type    : 'system',
      title   : `${alertLabel} — ${jobTitle}`,
      message,
      link    : pipelineLink,
    }).catch(() => {});
  }

  // Breach also notifies admin
  if (isBreached && admin) {
    await Notification.create({
      userId  : admin._id,
      tenantId: app.tenantId,
      type    : 'system',
      title   : `SLA Breach — ${jobTitle}`,
      message,
      link    : pipelineLink,
    }).catch(() => {});

    // Email to admin on breach
    if (admin.email) {
      const html = `
        <div style="font-family:sans-serif;max-width:600px">
          <div style="background:#ba0517;padding:16px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0">SLA Breach Alert</h2>
          </div>
          <div style="background:#fff8f8;padding:20px;border-radius:0 0 8px 8px;border:1px solid #fecaca">
            <p><strong>${candidateName}</strong> has been in the <strong>${stage}</strong> stage for <strong>${Math.round(hours)} hours</strong>
            against an SLA of <strong>${limit} hours</strong> (${Math.round(hours - limit)}h overdue).</p>
            <p>Job: <strong>${jobTitle}</strong></p>
            <a href="${pipelineLink}" style="display:inline-block;background:#0176D3;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:8px">View Pipeline →</a>
          </div>
        </div>`;
      sendEmailWithRetry(admin.email, `SLA Breach: ${candidateName} stuck in ${stage}`, html).catch(() => {});
    }
  }

  // Mark alert sent
  await Application.findByIdAndUpdate(app._id, { $set: { lastSlaAlertAt: new Date() } }).catch(() => {});
}

async function runSlaMonitor() {
  try {
    const tenants = await Tenant.find({ subscriptionStatus: 'active' }).lean();
    for (const tenant of tenants) {
      const tenantId = tenant._id;

      // Get custom SLA from tenant settings or fall back to defaults
      const stageSla = { ...DEFAULT_SLA, ...(tenant.settings?.stageSla || {}) };

      const [admin, apps] = await Promise.all([
        User.findOne({ tenantId, role: 'admin', isActive: true }).select('_id name email').lean(),
        Application.find({
          tenantId,
          status: 'active',
          deletedAt: null,
          currentStage: { $nin: ['Hired', 'Rejected'] },
        })
          .populate('candidateId', 'name')
          .populate('jobId', 'title assignedRecruiters')
          .lean(),
      ]);

      for (const app of apps) {
        // Resolve recruiter: first assigned recruiter on the job
        let recruiter = null;
        const recruiterIds = app.jobId?.assignedRecruiters || [];
        if (recruiterIds.length) {
          recruiter = await User.findById(recruiterIds[0]).select('_id name email').lean();
        }

        await processApplication(
          { ...app, lastSlaAlertAt: app.lastSlaAlertAt },
          stageSla,
          recruiter,
          admin
        );
      }
    }
  } catch (err) {
    logger.error('[slaMonitor] run failed', { err: err.message });
  }
}

function startSlaMonitorJob() {
  // Run every hour
  cron.schedule('0 * * * *', runSlaMonitor, { timezone: 'UTC' });
  console.log('[slaMonitor] scheduled — every hour');
}

module.exports = { startSlaMonitorJob, runSlaMonitor };

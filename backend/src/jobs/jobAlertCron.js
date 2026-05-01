'use strict';
/**
 * Job Alert Cron
 * Daily  (6:00 AM IST = 0:30 UTC): send daily alerts
 * Weekly (Mon 6:30 AM IST = 1:00 UTC Mon): send weekly alerts
 */
const cron        = require('node-cron');
const JobAlert    = require('../models/JobAlert');
const Job         = require('../models/Job');
const { sendEmailWithRetry } = require('../utils/email');

async function sendAlerts(frequency) {
  const now = new Date();
  const cutoff = frequency === 'daily'
    ? new Date(now - 24 * 60 * 60 * 1000)
    : new Date(now - 7 * 24 * 60 * 60 * 1000);

  const alerts = await JobAlert.find({
    isActive : true,
    frequency,
    $or: [{ lastSentAt: null }, { lastSentAt: { $lt: cutoff } }],
  }).lean();

  if (!alerts.length) return;
  console.log(`📧  Job Alert cron [${frequency}]: processing ${alerts.length} alert(s)`);

  for (const alert of alerts) {
    try {
      const filter = { status: 'active', deletedAt: null };
      if (alert.tenantId) filter.tenantId = alert.tenantId;
      if (alert.jobType) filter.jobType = { $regex: alert.jobType, $options: 'i' };
      if (alert.location) filter.location = { $regex: alert.location, $options: 'i' };
      if (alert.keywords?.length) {
        filter.$or = alert.keywords.map(kw => ({
          $or: [
            { title: { $regex: kw, $options: 'i' } },
            { skills: { $regex: kw, $options: 'i' } },
            { description: { $regex: kw, $options: 'i' } },
          ],
        }));
      }
      // Only jobs newer than cutoff AND not already sent
      filter.createdAt = { $gt: cutoff };
      if (alert.lastJobIds?.length) filter._id = { $nin: alert.lastJobIds };

      const jobs = await Job.find(filter).select('title location jobType company skills').sort({ createdAt: -1 }).limit(10).lean();
      if (!jobs.length) continue;

      const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
      const jobRows = jobs.map(j => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <a href="${FRONTEND_URL}/careers" style="color:#0176D3;font-weight:700;text-decoration:none;font-size:14px;">${j.title}</a>
            <div style="color:#706E6B;font-size:12px;margin-top:2px;">${[j.company, j.location, j.jobType].filter(Boolean).join(' · ')}</div>
          </td>
        </tr>`).join('');

      const html = `<div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px 20px;">
        <div style="background:linear-gradient(135deg,#032D60,#0176D3);padding:24px 28px;border-radius:16px 16px 0 0;">
          <div style="font-size:28px;margin-bottom:6px;">🔔</div>
          <h2 style="color:#fff;font-size:18px;margin:0;">${jobs.length} new job${jobs.length > 1 ? 's' : ''} matching your alert</h2>
        </div>
        <div style="background:#fff;padding:24px 28px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">
          <table style="width:100%;border-collapse:collapse;">${jobRows}</table>
          <a href="${FRONTEND_URL}/careers" style="display:inline-block;background:#0176D3;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;margin-top:16px;">View All Jobs →</a>
          <p style="color:#9ca3af;font-size:11px;margin-top:20px;">You're receiving this because you set up a job alert on TalentNest HR. <a href="${FRONTEND_URL}/app" style="color:#0176D3;">Manage alerts</a></p>
        </div>
      </div>`;

      await sendEmailWithRetry(alert.email, `🔔 ${jobs.length} new job${jobs.length > 1 ? 's' : ''} for you — TalentNest HR`, html);
      await JobAlert.findByIdAndUpdate(alert._id, {
        lastSentAt: new Date(),
        lastJobIds: [...(alert.lastJobIds || []), ...jobs.map(j => j._id)].slice(-100),
      });
    } catch (e) {
      console.error(`Job alert error for ${alert.email}:`, e.message);
    }
  }
}

function startJobAlertJobs() {
  // Daily — 0:30 UTC (6 AM IST)
  cron.schedule('30 0 * * *', () => sendAlerts('daily'), { timezone: 'UTC' });
  // Weekly — Monday 1:00 UTC (6:30 AM IST Mon)
  cron.schedule('0 1 * * 1', () => sendAlerts('weekly'), { timezone: 'UTC' });
  console.log('⏰  Job Alert cron jobs scheduled (daily 0:30 UTC, weekly Mon 1:00 UTC)');
}

module.exports = { startJobAlertJobs };

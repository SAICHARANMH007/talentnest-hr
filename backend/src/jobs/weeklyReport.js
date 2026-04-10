'use strict';
/**
 * Weekly report email — runs every Monday at 9AM IST (3:30 AM UTC)
 * Cron: '30 3 * * 1'
 */
const cron        = require('node-cron');
const Tenant      = require('../models/Tenant');
const User        = require('../models/User');
const Application = require('../models/Application');
const { sendEmailWithRetry } = require('../utils/email');

function getLastWeekRange() {
  const now = new Date();
  // Find last Monday (start of last week)
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const end = new Date(now);
  end.setDate(end.getDate() - daysToLastMonday);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  return { start, end };
}

async function sendWeeklyReportForTenant(tenant) {
  try {
    const { start, end } = getLastWeekRange();
    const tenantId = tenant._id;

    const [newCandidates, interviews, offersSent, offersSigned] = await Promise.all([
      Application.countDocuments({ tenantId, createdAt: { $gte: start, $lte: end } }),
      Application.countDocuments({
        tenantId,
        'stageHistory.stage': 'Interview Round 1',
        'stageHistory.movedAt': { $gte: start, $lte: end },
      }),
      Application.countDocuments({
        tenantId,
        'stageHistory.stage': 'Offer',
        'stageHistory.movedAt': { $gte: start, $lte: end },
      }),
      Application.countDocuments({
        tenantId,
        currentStage: 'Hired',
        updatedAt: { $gte: start, $lte: end },
      }),
    ]);

    const admin = await User.findOne({ tenantId, role: 'admin', isActive: true }).lean();
    if (!admin) return;

    const weekStr = `${start.toLocaleDateString('en-IN')} – ${end.toLocaleDateString('en-IN')}`;
    const frontendUrl = process.env.FRONTEND_URL || 'https://talentnesthr.com';

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0d2150;padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:white;margin:0;font-size:22px">TalentNest HR — Weekly Report</h1>
          <p style="color:#93c5fd;margin:4px 0 0">${weekStr}</p>
        </div>
        <div style="background:#f8faff;padding:24px;border-radius:0 0 8px 8px">
          <h2 style="color:#0d2150">Hi ${admin.name},</h2>
          <p>Here's your hiring activity summary for last week at <strong>${tenant.name}</strong>:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#e8f0fe">
              <td style="padding:12px;border:1px solid #ddd;font-weight:bold">New Applications</td>
              <td style="padding:12px;border:1px solid #ddd;text-align:center;font-size:20px;color:#0d2150"><strong>${newCandidates}</strong></td>
            </tr>
            <tr>
              <td style="padding:12px;border:1px solid #ddd;font-weight:bold">Moved to Interview</td>
              <td style="padding:12px;border:1px solid #ddd;text-align:center;font-size:20px;color:#0d2150"><strong>${interviews}</strong></td>
            </tr>
            <tr style="background:#e8f0fe">
              <td style="padding:12px;border:1px solid #ddd;font-weight:bold">Offers Sent</td>
              <td style="padding:12px;border:1px solid #ddd;text-align:center;font-size:20px;color:#0d2150"><strong>${offersSent}</strong></td>
            </tr>
            <tr>
              <td style="padding:12px;border:1px solid #ddd;font-weight:bold">Offers Accepted / Hired</td>
              <td style="padding:12px;border:1px solid #ddd;text-align:center;font-size:20px;color:#0b6b2a"><strong>${offersSigned}</strong></td>
            </tr>
          </table>
          <p style="color:#666;font-size:13px">Log in to your TalentNest HR dashboard for detailed analytics.</p>
          <a href="${frontendUrl}/app"
             style="display:inline-block;background:#0d2150;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:8px">
            View Dashboard →
          </a>
        </div>
      </div>`;

    await sendEmailWithRetry(admin.email, `Weekly Hiring Report — ${tenant.name}`, html);
    console.log(`[weeklyReport] Sent report to ${admin.email} for tenant ${tenant.name}`);
  } catch (err) {
    console.error(`[weeklyReport] tenant ${tenant._id}:`, err.message);
  }
}

async function runWeeklyReports() {
  try {
    const tenants = await Tenant.find({ subscriptionStatus: 'active' }).lean();
    console.log(`[weeklyReport] Processing ${tenants.length} active tenants`);
    for (const tenant of tenants) {
      const recruiterCount = await User.countDocuments({
        tenantId: tenant._id,
        role: { $in: ['recruiter', 'admin'] },
        isActive: true,
      });
      if (recruiterCount > 0) await sendWeeklyReportForTenant(tenant);
    }
  } catch (err) {
    console.error('[weeklyReport] run failed:', err.message);
  }
}

function startWeeklyReportJob() {
  // 3:30 AM UTC = 9:00 AM IST, every Monday
  cron.schedule('30 3 * * 1', runWeeklyReports, { timezone: 'UTC' });
  console.log('[weeklyReport] scheduled — Mon 09:00 IST');
}

module.exports = { startWeeklyReportJob, runWeeklyReports };

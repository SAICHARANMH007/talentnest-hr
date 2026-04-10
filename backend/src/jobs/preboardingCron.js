'use strict';
/**
 * Pre-boarding Cron Jobs
 *
 * 1. Joining Confirmation Tracker  — daily 9AM IST (3:30 UTC)
 *    - Candidates joining in 3 days who haven't confirmed → send reminder
 *
 * 2. Welcome Kit Automation       — daily 9AM IST (3:30 UTC)
 *    - New pre-boarding records created in last 24h → send welcome kit email
 *
 * 3. Incomplete Checklist Reminder — daily 10AM IST (4:30 UTC)
 *    - Joining in ≤ 5 days, completion < 100%, no reminder in 24h → nudge email
 */
const cron       = require('node-cron');
const PreBoarding = require('../models/PreBoarding');
const { sendEmailWithRetry } = require('../utils/email');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://talentnesthr.com';

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysUntil(date) {
  return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
}

function completionPct(tasks) {
  if (!tasks.length) return 0;
  const done = tasks.filter(t => t.completedAt).length;
  return Math.round((done / tasks.length) * 100);
}

// ── Job 1 + 2: Welcome Kit + Confirmation Tracker ────────────────────────────
async function runWelcomeKitAndConfirmation() {
  try {
    const now   = new Date();
    const d24h  = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Welcome kit for fresh pre-boardings (created in last 24h, kit not sent yet)
    const fresh = await PreBoarding.find({
      createdAt: { $gte: d24h },
      welcomeKitSentAt: null,
      status: { $ne: 'cancelled' },
    }).lean();

    for (const pb of fresh) {
      if (!pb.candidateEmail) continue;
      const joiningDateStr = pb.joiningDate
        ? new Date(pb.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        : 'your scheduled joining date';

      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#032D60,#0176D3);padding:24px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;font-size:20px;margin:0;">🎉 Welcome to the Team, ${pb.candidateName || 'there'}!</h1>
          </div>
          <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
            <p style="color:#374151;font-size:14px;line-height:1.7;">
              Your offer has been signed and we're preparing for your joining on <strong>${joiningDateStr}</strong>.
              Please complete your pre-boarding checklist so everything is ready on Day 1.
            </p>
            <a href="${FRONTEND_URL}/app" style="display:inline-block;background:#0176D3;color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-weight:700;font-size:13px;margin-top:8px;">Open Pre-boarding Portal →</a>
          </div>
        </div>`;

      await sendEmailWithRetry(pb.candidateEmail, '🎉 Welcome! Your pre-boarding checklist is ready', html).catch(() => {});
      await PreBoarding.findByIdAndUpdate(pb._id, { welcomeKitSentAt: new Date() });
    }

    // 2. Joining confirmation — joining in exactly 3 days, not yet confirmed
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const windowStart = new Date(threeDaysLater); windowStart.setHours(0, 0, 0, 0);
    const windowEnd   = new Date(threeDaysLater); windowEnd.setHours(23, 59, 59, 999);

    const unconfirmed = await PreBoarding.find({
      joiningDate: { $gte: windowStart, $lte: windowEnd },
      joiningConfirmed: { $ne: true },
      status: { $ne: 'cancelled' },
    }).lean();

    for (const pb of unconfirmed) {
      if (!pb.candidateEmail) continue;
      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#B45309,#D97706);padding:24px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;font-size:20px;margin:0;">📅 Joining in 3 Days — Please Confirm!</h1>
          </div>
          <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
            <p style="color:#374151;font-size:14px;line-height:1.7;">
              Hi <strong>${pb.candidateName || 'there'}</strong>,<br/><br/>
              This is a reminder that your joining date is <strong>${new Date(pb.joiningDate).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</strong>.
              Please log in to confirm your attendance and complete any pending checklist items.
            </p>
            <a href="${FRONTEND_URL}/app" style="display:inline-block;background:#D97706;color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-weight:700;font-size:13px;margin-top:8px;">Confirm Joining →</a>
          </div>
        </div>`;

      await sendEmailWithRetry(pb.candidateEmail, '📅 3 days to joining — Please confirm your attendance', html).catch(() => {});
    }

    console.log(`[PreBoarding Cron] Welcome kits: ${fresh.length}, Confirmation reminders: ${unconfirmed.length}`);
  } catch (err) {
    console.error('[PreBoarding Cron] welcome+confirm error:', err.message);
  }
}

// ── Job 3: Incomplete checklist reminder ──────────────────────────────────────
async function runChecklistReminder() {
  try {
    const now      = new Date();
    const in5days  = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const dedup    = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const records = await PreBoarding.find({
      joiningDate: { $lte: in5days, $gte: now },
      status: { $in: ['pending', 'in_progress'] },
      $or: [{ lastReminderSentAt: null }, { lastReminderSentAt: { $lt: dedup } }],
    }).lean();

    let sent = 0;
    for (const pb of records) {
      if (!pb.candidateEmail) continue;
      const pct     = completionPct(pb.tasks);
      if (pct >= 100) continue;

      const pending = pb.tasks.filter(t => !t.completedAt && t.isRequired);
      const days    = daysUntil(pb.joiningDate);

      const taskList = pending.slice(0, 5).map(t => `<li style="color:#374151;font-size:13px;margin-bottom:4px;">${t.title}</li>`).join('');

      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#0176D3,#014486);padding:24px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;font-size:18px;margin:0;">⚠️ ${pct}% Complete — ${days} day${days !== 1 ? 's' : ''} to joining</h1>
          </div>
          <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
            <p style="color:#374151;font-size:14px;">Hi <strong>${pb.candidateName || 'there'}</strong>, you have ${pending.length} pending task${pending.length !== 1 ? 's' : ''}:</p>
            <ul style="margin:0 0 16px;padding-left:20px;">${taskList}</ul>
            <a href="${FRONTEND_URL}/app" style="display:inline-block;background:#0176D3;color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-weight:700;font-size:13px;">Complete Checklist →</a>
          </div>
        </div>`;

      await sendEmailWithRetry(pb.candidateEmail, `⚠️ Pre-boarding ${pct}% done — ${days} day${days !== 1 ? 's' : ''} left`, html).catch(() => {});
      await PreBoarding.findByIdAndUpdate(pb._id, { lastReminderSentAt: new Date() });
      sent++;
    }

    console.log(`[PreBoarding Cron] Checklist reminders sent: ${sent}`);
  } catch (err) {
    console.error('[PreBoarding Cron] checklist reminder error:', err.message);
  }
}

// ── Schedule ──────────────────────────────────────────────────────────────────
function startPreBoardingJobs() {
  // 9AM IST = 3:30 UTC
  cron.schedule('30 3 * * *', runWelcomeKitAndConfirmation, { timezone: 'UTC' });
  // 10AM IST = 4:30 UTC
  cron.schedule('30 4 * * *', runChecklistReminder, { timezone: 'UTC' });
  console.log('✅  PreBoarding cron jobs scheduled (welcome kit + confirmation + reminders)');
}

module.exports = { startPreBoardingJobs, runWelcomeKitAndConfirmation, runChecklistReminder };

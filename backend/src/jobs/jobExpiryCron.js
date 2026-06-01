'use strict';
/**
 * Job Expiry Cron
 * Daily at 1:00 AM UTC (6:30 AM IST):
 *   - Finds all active jobs whose applicationDeadline has passed
 *   - Sets status → 'closed'
 *   - Notifies assigned recruiters + org admins
 */
const cron         = require('node-cron');
const Job          = require('../models/Job');
const User         = require('../models/User');
const Notification = require('../models/Notification');

async function closeExpiredJobs() {
  // Compare against start of today so a deadline of "today" expires at midnight
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const expiredJobs = await Job.find({
    status           : 'active',
    deletedAt        : null,
    applicationDeadline: { $lt: today, $ne: null },
  }).select('_id title tenantId assignedRecruiters').lean();

  if (!expiredJobs.length) return;

  console.log(`⏰  Job Expiry cron: closing ${expiredJobs.length} expired job(s)`);

  const jobIds = expiredJobs.map(j => j._id);
  await Job.updateMany({ _id: { $in: jobIds } }, { $set: { status: 'closed' } });

  // Notify per-job
  for (const job of expiredJobs) {
    try {
      const notifySet = new Set((job.assignedRecruiters || []).map(id => id.toString()));

      const admins = await User.find({
        tenantId: job.tenantId,
        role    : { $in: ['admin', 'super_admin'] },
        isActive: true,
        deletedAt: null,
      }).select('_id').lean();
      admins.forEach(a => notifySet.add(a._id.toString()));

      for (const uid of notifySet) {
        await Notification.create({
          userId  : uid,
          tenantId: job.tenantId,
          type    : 'job_expired',
          title   : '📅 Job Auto-Closed',
          message : `"${job.title}" passed its application deadline and has been automatically closed.`,
          link    : '/app/jobs',
          metadata: { jobId: job._id },
        }).catch(() => {});
      }
    } catch (e) {
      console.error(`Job expiry notification error (${job._id}):`, e.message);
    }
  }

  console.log(`✅  Job Expiry cron: closed ${expiredJobs.length} job(s)`);
}

function startJobExpiryCron() {
  cron.schedule('0 1 * * *', () => closeExpiredJobs(), { timezone: 'UTC' });
  console.log('⏰  Job Expiry cron scheduled (daily 1:00 UTC / 6:30 AM IST)');
}

module.exports = { startJobExpiryCron };

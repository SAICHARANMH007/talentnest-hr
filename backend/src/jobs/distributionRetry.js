'use strict';
/**
 * Phase 7 — Automatic retry for failed distributions
 * Runs every 6 hours via node-cron
 */
const cron            = require('node-cron');
const JobDistribution = require('../models/JobDistribution');
const Job             = require('../models/Job');

async function runRetry() {
  try {
    const failed = await JobDistribution.find({
      status: { $in: ['failed', 'retry'] },
      attemptCount: { $lt: 3 },
    }).lean();

    if (!failed.length) return;
    console.log(`[DistributionRetry] Retrying ${failed.length} failed distributions`);

    for (const log of failed) {
      try {
        const job = await Job.findOne({ _id: log.jobId, deletedAt: null, status: 'active' }).lean();
        if (!job) {
          // Job no longer active — mark expired
          await JobDistribution.findByIdAndUpdate(log._id, { $set: { status: 'expired', expiredAt: new Date() } });
          continue;
        }

        const newAttempt = (log.attemptCount || 1) + 1;

        if (log.platform === 'google_indexing') {
          const { logJobPublished } = require('../routes/distribution');
          // Re-ping Google
          const apiKey = process.env.GOOGLE_INDEXING_API_KEY;
          const SITE_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
          if (apiKey) {
            const jobUrl = `${SITE_URL}/careers/job/${job.careerPageSlug || job._id}`;
            const resp = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
              body: JSON.stringify({ url: jobUrl, type: 'URL_UPDATED' }),
              signal: AbortSignal.timeout(10000),
            }).catch(e => ({ ok: false, status: 0, statusText: e.message }));
            await JobDistribution.findByIdAndUpdate(log._id, {
              $set: {
                status: resp.ok ? 'success' : (newAttempt >= 3 ? 'permanently_failed' : 'failed'),
                attemptCount: newAttempt,
                lastAttemptedAt: new Date(),
                ...(resp.ok ? { distributedAt: new Date() } : {}),
              },
            });
          }
        } else {
          // For feed-based platforms (jooble, adzuna, careerjet):
          // Mark as retry and note feed is live — they pull from feed automatically
          await JobDistribution.findByIdAndUpdate(log._id, {
            $set: {
              status: newAttempt >= 3 ? 'permanently_failed' : 'retry',
              attemptCount: newAttempt,
              lastAttemptedAt: new Date(),
              responseMessage: 'Feed is live — awaiting platform pull',
            },
          });
        }
      } catch (e) {
        console.error(`[DistributionRetry] Error retrying ${log.platform} for job ${log.jobId}:`, e.message);
      }
    }
  } catch (e) {
    console.error('[DistributionRetry] Fatal error:', e.message);
  }
}

function startDistributionRetryJob() {
  // Run every 6 hours
  cron.schedule('0 */6 * * *', runRetry);
  console.log('⏰  Distribution retry cron started → every 6 hours');
}

module.exports = { startDistributionRetryJob, runRetry };

'use strict';
/**
 * Distribution retry + feed auto-confirm job.
 * Runs every 6 hours via node-cron.
 *
 * Phase A — Auto-confirm feed platforms (Jooble/Adzuna/Careerjet):
 *   These platforms passively pull from the XML feed — no callback.
 *   After 24 hours of 'pending', mark them 'success' since the feed is live.
 *
 * Phase B — Retry google_indexing failures (up to 3 attempts).
 */
const cron            = require('node-cron');
const JobDistribution = require('../models/JobDistribution');
const Job             = require('../models/Job');

const FEED_PLATFORMS = ['jooble', 'adzuna', 'careerjet'];
const FEED_AUTO_CONFIRM_HOURS = 24; // hours after publish to auto-confirm feed platforms

async function runRetry() {
  try {
    await autoConfirmFeedPlatforms();
    await retryFailedApiPlatforms();
  } catch (e) {
    console.error('[DistributionRetry] Fatal error:', e.message);
  }
}

/**
 * Auto-confirm feed platforms that have been pending for 24+ hours.
 * Feed aggregators (Jooble, Adzuna, Careerjet) pick up jobs from the XML feed
 * on their own schedule — typically within 24 hours. There is no callback,
 * so after FEED_AUTO_CONFIRM_HOURS we optimistically mark them as success.
 */
async function autoConfirmFeedPlatforms() {
  const cutoff = new Date(Date.now() - FEED_AUTO_CONFIRM_HOURS * 60 * 60 * 1000);

  const pendingFeeds = await JobDistribution.find({
    platform: { $in: FEED_PLATFORMS },
    status: 'pending',
    lastAttemptedAt: { $lte: cutoff },
  }).lean();

  if (!pendingFeeds.length) return;
  console.log(`[DistributionRetry] Auto-confirming ${pendingFeeds.length} feed platform(s) after ${FEED_AUTO_CONFIRM_HOURS}h`);

  for (const log of pendingFeeds) {
    const job = await Job.findOne({ _id: log.jobId, deletedAt: null, status: 'active' }).lean();
    if (!job) {
      await JobDistribution.findByIdAndUpdate(log._id, {
        $set: { status: 'expired', expiredAt: new Date() },
      });
      continue;
    }

    await JobDistribution.findByIdAndUpdate(log._id, {
      $set: {
        status: 'success',
        distributedAt: new Date(),
        responseMessage: `Auto-confirmed: feed platform picks up from XML feed within ${FEED_AUTO_CONFIRM_HOURS}h`,
      },
    });
  }
}

/**
 * Retry google_indexing failures up to 3 attempts.
 */
async function retryFailedApiPlatforms() {
  const failed = await JobDistribution.find({
    platform: 'google_indexing',
    status: { $in: ['failed', 'retry'] },
    attemptCount: { $lt: 3 },
  }).lean();

  if (!failed.length) return;
  console.log(`[DistributionRetry] Retrying ${failed.length} google_indexing failure(s)`);

  const SITE_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
  const apiKey   = process.env.GOOGLE_INDEXING_API_KEY;

  for (const log of failed) {
    try {
      const job = await Job.findOne({ _id: log.jobId, deletedAt: null, status: 'active' }).lean();
      if (!job) {
        await JobDistribution.findByIdAndUpdate(log._id, {
          $set: { status: 'expired', expiredAt: new Date() },
        });
        continue;
      }

      const newAttempt = (log.attemptCount || 1) + 1;

      if (!apiKey) {
        await JobDistribution.findByIdAndUpdate(log._id, {
          $set: {
            status: 'skipped',
            responseMessage: 'GOOGLE_INDEXING_API_KEY not configured',
            distributedAt: new Date(),
          },
        });
        continue;
      }

      const jobUrl = `${SITE_URL}/careers/job/${job.careerPageSlug || job._id}`;
      const resp   = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body   : JSON.stringify({ url: jobUrl, type: 'URL_UPDATED' }),
        signal : AbortSignal.timeout(10000),
      }).catch(e => ({ ok: false, status: 0, statusText: e.message }));

      await JobDistribution.findByIdAndUpdate(log._id, {
        $set: {
          status          : resp.ok ? 'success' : (newAttempt >= 3 ? 'permanently_failed' : 'failed'),
          attemptCount    : newAttempt,
          lastAttemptedAt : new Date(),
          ...(resp.ok ? { distributedAt: new Date() } : {}),
        },
      });
    } catch (e) {
      console.error(`[DistributionRetry] Error retrying google_indexing for job ${log.jobId}:`, e.message);
    }
  }
}

function startDistributionRetryJob() {
  cron.schedule('0 */6 * * *', runRetry);
  console.log('⏰  Distribution retry cron started → every 6 hours');
}

module.exports = { startDistributionRetryJob, runRetry, autoConfirmFeedPlatforms, retryFailedApiPlatforms };

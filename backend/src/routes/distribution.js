'use strict';
/**
 * Phase 4 — Distribution Tracking API
 * Phase 5/6 — Publish/Close webhooks (called internally from jobs.js)
 * Phase 7 — Retry mechanism
 */
const express          = require('express');
const router           = express.Router();
const Job              = require('../models/Job');
const JobDistribution  = require('../models/JobDistribution');
const Organization     = require('../models/Organization');
const { authenticate } = require('../middleware/auth');
const { allowRoles }   = require('../middleware/rbac');
const asyncHandler     = require('../utils/asyncHandler');

const SITE_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';

// All platforms we track
const ALL_PLATFORMS = ['google_indexing', 'indeed', 'google_for_jobs', 'jooble', 'adzuna', 'careerjet', 'naukri', 'shine', 'timesjobs'];

// Platform metadata for the UI
const PLATFORM_META = {
  google_indexing : { label: 'Google Indexing API', icon: '🔍', type: 'api' },
  google_for_jobs : { label: 'Google for Jobs',     icon: '🟢', type: 'schema' },
  indeed          : { label: 'Indeed',              icon: '💼', type: 'api' },
  jooble          : { label: 'Jooble',              icon: '🌐', type: 'feed' },
  adzuna          : { label: 'Adzuna',              icon: '📡', type: 'feed' },
  careerjet       : { label: 'Careerjet',           icon: '🚀', type: 'feed' },
  naukri          : { label: 'Naukri',              icon: '🏢', type: 'manual' },
  shine           : { label: 'Shine',               icon: '✨', type: 'manual' },
  timesjobs       : { label: 'TimesJobs',           icon: '⏰', type: 'manual' },
};

function encodeQ(s) { return encodeURIComponent(String(s || '')); }

function buildSearchUrl(platform, job) {
  const title   = job.title || '';
  const company = job.companyName || job.company || '';
  const parts   = (job.location || '').split(',').map(s => s.trim());
  const city    = parts[0] || '';
  const slug    = (title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
  const citySlug = (city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
  switch (platform) {
    case 'google_for_jobs':
      return `https://www.google.com/search?q=${encodeQ(title + ' ' + company + ' jobs')}`;
    case 'indeed':
      return `https://in.indeed.com/jobs?q=${encodeQ(title)}&l=${encodeQ(city)}`;
    case 'jooble':
      return `https://in.jooble.org/SearchResult?ukw=${encodeQ(title)}&loc=${encodeQ(city)}`;
    case 'adzuna':
      return `https://www.adzuna.in/search?q=${encodeQ(title)}&loc=${encodeQ(city)}`;
    case 'careerjet':
      return `https://www.careerjet.co.in/search/jobs?s=${encodeQ(title)}&l=${encodeQ(city)}`;
    case 'naukri':
      return `https://www.naukri.com/${slug}-jobs-in-${citySlug}`;
    case 'shine':
      return `https://www.shine.com/job-search/${slug}-jobs-in-${citySlug}`;
    case 'timesjobs':
      return `https://www.timesjobs.com/candidate/job-search.html?searchType=personalizedSearch&from=submit&txtKeywords=${encodeQ(title)}&txtLocation=${encodeQ(city)}`;
    default:
      return null;
  }
}

// ── Internal helper: log all platforms as pending when job published ──────────
async function logJobPublished(job) {
  try {
    const feedUrl = `${SITE_URL}/api/feed/xml`;
    for (const platform of ALL_PLATFORMS) {
      const searchUrl = buildSearchUrl(platform, job);
      await JobDistribution.findOneAndUpdate(
        { jobId: job._id, platform },
        {
          $setOnInsert: {
            jobId: job._id,
            tenantId: job.tenantId,
            platform,
            status: 'pending',
            platformJobUrl: searchUrl,
            attemptCount: 1,
            lastAttemptedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    // Google Indexing API (fast, do immediately)
    await pingGoogleIndexing(job);

  } catch (e) {
    console.error('[Distribution] logJobPublished error:', e.message);
  }
}

async function pingGoogleIndexing(job) {
  const apiKey = process.env.GOOGLE_INDEXING_API_KEY;
  const jobUrl = `${SITE_URL}/careers/job/${job.careerPageSlug || job._id}`;
  try {
    if (!apiKey) {
      await JobDistribution.findOneAndUpdate(
        { jobId: job._id, platform: 'google_indexing' },
        { $set: { status: 'skipped', responseMessage: 'GOOGLE_INDEXING_API_KEY not configured', distributedAt: new Date() } }
      );
      return;
    }
    const resp = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ url: jobUrl, type: 'URL_UPDATED' }),
      signal: AbortSignal.timeout(10000),
    });
    const ok = resp.ok;
    await JobDistribution.findOneAndUpdate(
      { jobId: job._id, platform: 'google_indexing' },
      { $set: { status: ok ? 'success' : 'failed', responseCode: resp.status, distributedAt: ok ? new Date() : null } }
    );
  } catch (e) {
    await JobDistribution.findOneAndUpdate(
      { jobId: job._id, platform: 'google_indexing' },
      { $set: { status: 'failed', responseMessage: e.message } }
    ).catch(() => {});
  }
}

async function logJobClosed(jobId) {
  try {
    await JobDistribution.updateMany(
      { jobId, status: { $in: ['pending', 'success', 'retry'] } },
      { $set: { status: 'expired', expiredAt: new Date() } }
    );
    // Invalidate feed cache so job disappears immediately
    try { require('./feed').invalidateFeedCache(); } catch {}
  } catch (e) {
    console.error('[Distribution] logJobClosed error:', e.message);
  }
}

module.exports.logJobPublished = logJobPublished;
module.exports.logJobClosed    = logJobClosed;

// ── GET /api/distribution/job/:jobId — per-job distribution status ────────────
router.get('/job/:jobId', authenticate, asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'super_admin';
  const job = await Job.findOne({
    _id: req.params.jobId,
    deletedAt: null,
    ...(!isSuperAdmin ? { tenantId: req.user.tenantId } : {}),
  }).lean();
  if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

  const logs = await JobDistribution.find({ jobId: req.params.jobId }).lean();
  const logsMap = Object.fromEntries(logs.map(l => [l.platform, l]));

  const platforms = ALL_PLATFORMS.map(p => {
    const log = logsMap[p];
    const meta = PLATFORM_META[p] || { label: p, icon: '🌐' };
    const searchUrl = buildSearchUrl(p, job);
    return {
      platform: p,
      label: meta.label,
      icon: meta.icon,
      type: meta.type,
      status: log?.status || 'not_submitted',
      attemptCount: log?.attemptCount || 0,
      distributedAt: log?.distributedAt || null,
      expiredAt: log?.expiredAt || null,
      responseMessage: log?.responseMessage || null,
      platformJobUrl: log?.platformJobUrl || searchUrl,
      searchUrl,
    };
  });

  const feedXml  = `${SITE_URL}/api/feed/xml`;
  const feedJson = `${SITE_URL}/api/feed/json`;
  const empXml   = `${SITE_URL}/api/feed/employer/${job.tenantId}/xml`;
  const empJson  = `${SITE_URL}/api/feed/employer/${job.tenantId}/json`;

  res.json({ success: true, data: { job: { id: job._id, title: job.title, status: job.status }, platforms, feedXml, feedJson, empXml, empJson } });
}));

// ── GET /api/distribution/summary — overall dashboard ────────────────────────
router.get('/summary', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tf = req.user.role === 'super_admin' ? {} : { tenantId: req.user.tenantId };
  const [total, pending, failed, success, recent] = await Promise.all([
    JobDistribution.countDocuments({ ...tf }),
    JobDistribution.countDocuments({ ...tf, status: 'pending' }),
    JobDistribution.countDocuments({ ...tf, status: { $in: ['failed', 'permanently_failed'] } }),
    JobDistribution.countDocuments({ ...tf, status: 'success' }),
    JobDistribution.find({ ...tf }).sort({ updatedAt: -1 }).limit(20)
      .populate('jobId', 'title company companyName').lean(),
  ]);
  res.json({ success: true, data: { total, pending, failed, success, recent } });
}));

// ── POST /api/distribution/retry/:jobId/:platform — manual retry ──────────────
router.post('/retry/:jobId/:platform', authenticate, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const log = await JobDistribution.findOne({ jobId: req.params.jobId, platform: req.params.platform });
  if (!log) return res.status(404).json({ success: false, error: 'Distribution log not found' });
  if (log.attemptCount >= 3) {
    log.status = 'permanently_failed';
    await log.save();
    return res.json({ success: false, error: 'Max attempts reached — marked permanently failed' });
  }

  if (req.params.platform === 'google_indexing') {
    const job = await Job.findById(req.params.jobId).lean();
    if (job) await pingGoogleIndexing(job);
  } else {
    log.status = 'retry';
    log.attemptCount += 1;
    log.lastAttemptedAt = new Date();
    await log.save();
  }
  res.json({ success: true, message: 'Retry triggered' });
}));

// ── GET /api/distribution/employer-settings/:tenantId — get platform settings ─
router.get('/employer-settings/:tenantId', authenticate, asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.params.tenantId).select('distributionSettings').lean();
  res.json({ success: true, data: org?.distributionSettings || { naukri: false, shine: false, timesjobs: false } });
}));

// ── PATCH /api/distribution/employer-settings/:tenantId — save checklist ──────
router.patch('/employer-settings/:tenantId', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const { naukri, shine, timesjobs } = req.body;
  await Organization.findByIdAndUpdate(req.params.tenantId, {
    $set: {
      'distributionSettings.naukri'    : !!naukri,
      'distributionSettings.shine'     : !!shine,
      'distributionSettings.timesjobs' : !!timesjobs,
      'distributionSettings.updatedAt' : new Date(),
    },
  });
  res.json({ success: true });
}));

module.exports = router;

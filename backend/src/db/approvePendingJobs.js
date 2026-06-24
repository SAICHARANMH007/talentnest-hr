'use strict';
/**
 * approvePendingJobs.js
 * One-time migration: promotes all recruiter-submitted jobs stuck in
 *   status: 'draft' + approvalStatus: 'pending_approval'
 * to status: 'active' + approvalStatus: 'approved' so they appear in the
 * sitemap and job feed immediately.
 *
 * Usage:
 *   node backend/src/db/approvePendingJobs.js          # live run
 *   node backend/src/db/approvePendingJobs.js --dry    # dry-run (report only)
 *
 * After running: restart the API server (or wait up to 1 hour) so the in-memory
 * feed/sitemap cache refreshes and new jobs appear in the XML sitemap.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const https    = require('https');
const mongoose = require('mongoose');
const Job      = require('../models/Job');

const DRY_RUN = process.argv.includes('--dry');

async function pingIndexNow(jobs) {
  const key  = process.env.INDEXNOW_KEY;
  const base = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
  if (!key || !jobs.length) return;

  const urlList = jobs.map(j => `${base}/careers/job/${j.careerPageSlug || j._id}`);
  const payload = JSON.stringify({
    host:        new URL(base).host,
    key,
    keyLocation: `${base}/${key}.txt`,
    urlList,
  });

  return new Promise((resolve) => {
    const u   = new URL('https://api.indexnow.org/indexnow');
    const req = https.request(
      { hostname: u.hostname, path: u.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
      res => { res.resume(); resolve(res.statusCode); },
    );
    req.on('error', (e) => { console.warn('[IndexNow] Error:', e.message); resolve(null); });
    req.write(payload);
    req.end();
  });
}

async function run() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) { console.error('MONGO_URI / MONGODB_URI not set in .env'); process.exit(1); }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const stuck = await Job.find({
    status        : 'draft',
    approvalStatus: 'pending_approval',
    deletedAt     : null,
  }).select('_id title careerPageSlug tenantId').lean();

  console.log(`\nFound ${stuck.length} job(s) stuck in draft/pending_approval`);

  if (stuck.length === 0) {
    console.log('Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  stuck.forEach((j, i) => {
    console.log(`  ${i + 1}. [${j._id}] ${j.title} (slug: ${j.careerPageSlug || '—'})`);
  });

  if (DRY_RUN) {
    console.log('\n--dry flag set — no changes written.');
    await mongoose.disconnect();
    return;
  }

  const ids     = stuck.map(j => j._id);
  const now     = new Date();
  const result  = await Job.updateMany(
    { _id: { $in: ids } },
    { $set: { status: 'active', approvalStatus: 'approved', approvedAt: now, approvedBy: 'migration' } },
  );

  console.log(`\n✅ Approved ${result.modifiedCount} job(s)`);

  const code = await pingIndexNow(stuck);
  if (code) {
    console.log(`✅ IndexNow pinged — HTTP ${code} (${stuck.length} URLs)`);
  } else {
    console.log('ℹ️  IndexNow skipped (no INDEXNOW_KEY or ping failed)');
  }

  console.log('\n⚠️  Feed cache note: restart the API server (or wait ≤1 h) so the');
  console.log('   in-memory sitemap/feed cache refreshes and serves the new jobs.');

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => { console.error(err); process.exit(1); });

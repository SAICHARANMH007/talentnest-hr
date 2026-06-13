'use strict';
/**
 * refreshJobDates.js
 * One-time migration: spreads `createdAt` for all active, public jobs across
 * the current week (today down to 6 days ago) with randomized times, so the
 * job board and JobPosting JSON-LD (datePosted) always look freshly posted
 * to candidates and job-board crawlers (Naukri, Indeed, Google for Jobs, etc.)
 * Run with: node backend/src/db/refreshJobDates.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Job = require('../models/Job');

const DAY_MS = 24 * 60 * 60 * 1000;

function randomDateThisWeek() {
  const daysAgo = Math.floor(Math.random() * 7); // 0–6 days ago
  const msIntoDay = Math.floor(Math.random() * DAY_MS);
  return new Date(Date.now() - daysAgo * DAY_MS - msIntoDay);
}

async function run() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const jobs = await Job.find({ status: 'active', isPublic: true })
    .select('_id')
    .lean();

  console.log(`Found ${jobs.length} active public jobs to refresh`);
  if (jobs.length === 0) { await mongoose.disconnect(); return; }

  const bulk = Job.collection.initializeUnorderedBulkOp();
  for (const job of jobs) {
    const createdAt = randomDateThisWeek();
    bulk.find({ _id: job._id }).updateOne({ $set: { createdAt, updatedAt: createdAt } });
  }

  await bulk.execute();
  console.log(`✅ Refreshed createdAt/updatedAt for ${jobs.length} jobs to dates within the last 7 days`);

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(err => { console.error(err); process.exit(1); });

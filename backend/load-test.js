'use strict';
/**
 * TalentNest HR — Backend Load Test
 *
 * Spins up an in-memory MongoDB, seeds one org with 50 jobs / 500 candidates /
 * 2 000 applications, starts a real Express server using the production route
 * handlers, then runs autocannon at 10 / 50 / 100 / 250 concurrent connections.
 *
 * Usage:
 *   node load-test.js
 *   DURATION=20 node load-test.js   (seconds per level, default 10)
 *
 * Output:  load-test-results.json  in this directory.
 */

// ── Env vars must be set before any require() that reads them ─────────────────
process.env.JWT_SECRET     = process.env.JWT_SECRET     || 'load_test_jwt_secret_must_be_32_chars!';
process.env.COOKIE_SECRET  = process.env.COOKIE_SECRET  || 'load_test_cookie_secret_32chars!!!';
process.env.NODE_ENV       = 'test';
process.env.SKIP_DEMO_SEED = 'true';
// Suppress Sentry in test
delete process.env.SENTRY_DSN;

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose    = require('mongoose');
const express     = require('express');
const cookieParser = require('cookie-parser');
const http        = require('http');
const autocannon  = require('autocannon');
const jwt         = require('jsonwebtoken');
const bcrypt      = require('bcryptjs');
const fs          = require('fs');
const path        = require('path');

// ── Models ────────────────────────────────────────────────────────────────────
const User         = require('./src/models/User');
const Organization = require('./src/models/Organization');
const Job          = require('./src/models/Job');
const Candidate    = require('./src/models/Candidate');
const Application  = require('./src/models/Application');

// ── Middleware ─────────────────────────────────────────────────────────────────
const { authMiddleware } = require('./src/middleware/auth');
const { tenantGuard }    = require('./src/middleware/tenantGuard');
const errorMiddleware    = require('./src/middleware/errorMiddleware');

// ── Config ────────────────────────────────────────────────────────────────────
const LEVELS   = [10, 50, 100, 250];
const DURATION = parseInt(process.env.DURATION || '10', 10); // seconds per level

// ─────────────────────────────────────────────────────────────────────────────
async function seedData(orgId, adminId) {
  // 50 jobs
  const jobDocs = Array.from({ length: 50 }, (_, i) => ({
    title:       `Software Engineer Level ${i + 1}`,
    department:  'Engineering',
    location:    ['Bangalore', 'Delhi NCR', 'Mumbai', 'Hyderabad', 'Pune'][i % 5],
    type:        'full_time',
    status:      'active',
    tenantId:    orgId,
    description: `Role ${i + 1}: end-to-end ownership, cross-functional collaboration, high impact.`,
    requirements: ['3+ years experience', 'Node.js', 'MongoDB'],
    salaryMin:   800000 + i * 10000,
    salaryMax:   1500000 + i * 20000,
    createdBy:   adminId,
    isPublic:    true,
    careerPageSlug: `software-engineer-level-${i + 1}`,
  }));
  const jobs = await Job.insertMany(jobDocs);

  // 500 candidates
  const candidateDocs = Array.from({ length: 500 }, (_, i) => ({
    name:        `Candidate ${i + 1}`,
    email:       `candidate${i + 1}@loadtest.example`,
    phone:       `+91 9${String(i).padStart(9, '0')}`,
    tenantId:    orgId,
    currentRole: ['Software Engineer', 'Product Manager', 'Designer', 'Data Analyst', 'DevOps'][i % 5],
    skills:      ['JavaScript', 'Python', 'React', 'Node.js', 'SQL'].slice(0, (i % 5) + 1),
    experience:  Math.floor(Math.random() * 12),
    status:      'active',
  }));
  const candidates = await Candidate.insertMany(candidateDocs);

  // 2 000 applications — spread across all jobs and candidates
  const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'];
  // Build unique (jobId, candidateId) pairs
  const seen = new Set();
  const appDocs = [];
  let idx = 0;
  while (appDocs.length < 2000) {
    const job       = jobs[idx % jobs.length];
    const candidate = candidates[(idx * 7 + 3) % candidates.length]; // spread
    const key       = `${job._id}:${candidate._id}`;
    if (!seen.has(key)) {
      seen.add(key);
      appDocs.push({
        jobId:       job._id,
        candidateId: candidate._id,
        tenantId:    orgId,
        stage:       STAGES[appDocs.length % STAGES.length],
        status:      'active',
        appliedAt:   new Date(Date.now() - Math.random() * 90 * 86400000),
        createdBy:   adminId,
      });
    }
    idx++;
  }
  await Application.insertMany(appDocs);

  console.log(`   ✓ 50 jobs, 500 candidates, 2 000 applications`);
  return { jobs, candidates };
}

// ─────────────────────────────────────────────────────────────────────────────
async function buildApp(orgId, adminId) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser(process.env.COOKIE_SECRET));

  // Health — unauthenticated baseline
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

  // Mount real production route handlers
  const authd = [authMiddleware, tenantGuard];
  try { app.use('/api/jobs',         ...authd, require('./src/routes/jobs')); }
  catch (e) { console.warn('⚠️  /api/jobs failed to load:', e.message); }
  try { app.use('/api/candidates',   ...authd, require('./src/routes/candidates')); }
  catch (e) { console.warn('⚠️  /api/candidates failed to load:', e.message); }
  try { app.use('/api/applications', ...authd, require('./src/routes/applications')); }
  catch (e) { console.warn('⚠️  /api/applications failed to load:', e.message); }
  try { app.use('/api/dashboard',    ...authd, require('./src/routes/dashboard')); }
  catch (e) { console.warn('⚠️  /api/dashboard failed to load:', e.message); }

  app.use(errorMiddleware);
  return app;
}

// ─────────────────────────────────────────────────────────────────────────────
function runLevel(url, connections, duration, headers) {
  return new Promise((resolve, reject) => {
    autocannon({ url, connections, duration, headers, pipelining: 1 }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

function fmt(result) {
  return {
    reqPerSec:    Math.round(result.requests.average),
    avgMs:        Math.round(result.latency.mean),
    p95Ms:        Math.round(result.latency.p97_5),
    p99Ms:        Math.round(result.latency.p99),
    errors:       result.errors,
    errorRate:    `${((result.errors / Math.max(result.requests.total, 1)) * 100).toFixed(1)}%`,
    totalRequests: result.requests.total,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 TalentNest HR — Backend Load Test');
  console.log(`   Levels: ${LEVELS.join(', ')} concurrent connections`);
  console.log(`   Duration: ${DURATION}s per level per endpoint\n`);

  // Start in-memory MongoDB
  process.stdout.write('🔧 Starting MongoDB Memory Server ... ');
  const mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'loadtest' });
  console.log('done');

  // Seed
  process.stdout.write('🌱 Seeding test data ... ');
  const org = await Organization.create({
    name: 'LoadTest Corp', industry: 'Technology',
    size: '201-500', status: 'active', type: 'org',
  });
  const adminPwd = await bcrypt.hash('Admin@12345', 10);
  const admin = await User.create({
    name: 'LT Admin', email: 'admin@loadtest.example',
    password: adminPwd, role: 'admin',
    tenantId: org._id, isActive: true,
  });
  await seedData(org._id, admin._id);

  // Build & start server
  const app = await buildApp(org._id, admin._id);
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`✅ Test server on port ${port}\n`);

  // JWT for authenticated requests
  const token = jwt.sign(
    { id: admin._id.toString(), role: 'admin', tenantId: org._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '2h' },
  );
  const authHeaders = { Authorization: `Bearer ${token}` };

  const BASE = `http://127.0.0.1:${port}`;
  const ENDPOINTS = [
    { label: 'GET /api/health',       url: `${BASE}/api/health`,       headers: {} },
    { label: 'GET /api/jobs',         url: `${BASE}/api/jobs`,         headers: authHeaders },
    { label: 'GET /api/candidates',   url: `${BASE}/api/candidates`,   headers: authHeaders },
    { label: 'GET /api/applications', url: `${BASE}/api/applications`, headers: authHeaders },
    { label: 'GET /api/dashboard',    url: `${BASE}/api/dashboard`,    headers: authHeaders },
  ];

  // ── Warm-up ──────────────────────────────────────────────────────────────────
  console.log('⏳ Warming up (5s, 2 connections) ...');
  for (const ep of ENDPOINTS) {
    await runLevel(ep.url, 2, 5, ep.headers).catch(() => {});
  }
  console.log('✅ Warm-up done\n');

  // ── Load test ─────────────────────────────────────────────────────────────────
  const allResults = [];
  const summary = [];

  for (const level of LEVELS) {
    console.log(`${'─'.repeat(60)}`);
    console.log(`Concurrency: ${level} connections × ${DURATION}s`);
    const levelRow = { concurrency: level, endpoints: {} };

    for (const ep of ENDPOINTS) {
      const raw    = await runLevel(ep.url, level, DURATION, ep.headers).catch(e => null);
      if (!raw) {
        console.log(`  ❌  ${ep.label}: failed to run`);
        levelRow.endpoints[ep.label] = { error: 'failed' };
        continue;
      }
      const stats  = fmt(raw);
      levelRow.endpoints[ep.label] = stats;
      const errFlag = stats.errors > 0 ? ` ⚠️  ${stats.errors} errors` : '';
      console.log(
        `  ${ep.label.padEnd(30)} ` +
        `${String(stats.reqPerSec).padStart(6)} req/s  ` +
        `avg ${String(stats.avgMs).padStart(4)}ms  ` +
        `p95 ${String(stats.p95Ms).padStart(4)}ms  ` +
        `err ${stats.errorRate}${errFlag}`
      );
    }
    allResults.push(levelRow);
  }

  // ── Persist results ───────────────────────────────────────────────────────────
  const outPath = path.join(__dirname, 'load-test-results.json');
  fs.writeFileSync(outPath, JSON.stringify({
    runAt: new Date().toISOString(),
    durationPerLevelSeconds: DURATION,
    levels: allResults,
  }, null, 2));

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📄 Full results saved → ${outPath}`);

  server.close();
  await mongoose.disconnect();
  await mongoServer.stop();
}

main().catch(err => {
  console.error('\n💥 Load test crashed:', err.message);
  process.exit(1);
});

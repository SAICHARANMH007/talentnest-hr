'use strict';
/**
 * TalentNest HR — Backend Load Test (DB-backed)
 *
 * Spins up an in-memory MongoDB, seeds one org with realistic data
 * (300 jobs / 3 000 candidates / 15 000 applications), starts a real
 * Express server using the production route handlers, then runs autocannon
 * at 10 / 50 / 100 / 250 concurrent connections.
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
delete process.env.SENTRY_DSN;

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose     = require('mongoose');
const express      = require('express');
const cookieParser = require('cookie-parser');
const http         = require('http');
const autocannon   = require('autocannon');
const jwt          = require('jsonwebtoken');
const bcrypt       = require('bcryptjs');
const fs           = require('fs');
const path         = require('path');

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
const N_JOBS   = 300;   // "hundreds of jobs"
const N_CANDS  = 3_000; // "thousands of candidates"
const N_APPS   = 15_000;// "thousands of applications"

// ─────────────────────────────────────────────────────────────────────────────
async function seedData(orgId, adminId) {
  const CITIES = ['Bangalore', 'Delhi NCR', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata'];
  const DEPTS  = ['Engineering', 'Product', 'Design', 'Data', 'DevOps', 'Sales', 'Marketing'];
  const TYPES  = ['full_time', 'part_time', 'contract', 'internship'];
  const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];
  const ROLES  = ['Software Engineer', 'Product Manager', 'Designer', 'Data Analyst', 'DevOps Engineer'];

  // Jobs
  const jobDocs = Array.from({ length: N_JOBS }, (_, i) => ({
    title:          `${DEPTS[i % DEPTS.length]} Role Level ${(i % 10) + 1}`,
    department:     DEPTS[i % DEPTS.length],
    location:       CITIES[i % CITIES.length],
    jobType:        TYPES[i % TYPES.length],
    status:         'active',
    tenantId:       orgId,
    description:    `Role ${i + 1}: end-to-end ownership, cross-functional collaboration.`,
    requirements:   ['3+ years experience', 'Node.js', 'MongoDB'],
    salaryMin:      600_000 + i * 5_000,
    salaryMax:      1_500_000 + i * 10_000,
    createdBy:      adminId,
    isPublic:       true,
    careerPageSlug: `role-${i + 1}-${DEPTS[i % DEPTS.length].toLowerCase().replace(/\s/g, '-')}`,
    deletedAt:      null,
  }));
  const jobs = await Job.insertMany(jobDocs);

  // Candidates
  const candidateDocs = Array.from({ length: N_CANDS }, (_, i) => ({
    name:        `Candidate ${i + 1}`,
    email:       `cand${i + 1}@loadtest.example`,
    phone:       `+91 9${String(i + 100000000).slice(1)}`,
    tenantId:    orgId,
    currentRole: ROLES[i % ROLES.length],
    skills:      ['JavaScript', 'Python', 'React', 'Node.js', 'SQL'].slice(0, (i % 5) + 1),
    experience:  i % 15,
    status:      'active',
    deletedAt:   null,
  }));
  const candidates = await Candidate.insertMany(candidateDocs);

  // Applications — build N_APPS unique (jobId, candidateId) pairs
  const seen    = new Set();
  const appDocs = [];
  let   idx     = 0;
  while (appDocs.length < N_APPS) {
    const job       = jobs[idx % jobs.length];
    const candidate = candidates[(idx * 13 + 7) % candidates.length];
    const key       = `${job._id}:${candidate._id}`;
    if (!seen.has(key)) {
      seen.add(key);
      appDocs.push({
        jobId:        job._id,
        candidateId:  candidate._id,
        tenantId:     orgId,
        currentStage: STAGES[appDocs.length % STAGES.length], // correct field name
        status:       'active',
        appliedAt:    new Date(Date.now() - (idx % 120) * 86_400_000),
        createdBy:    adminId,
        deletedAt:    null,
      });
    }
    idx++;
    if (idx > N_APPS * 5) break; // safety valve
  }
  // Insert in 1 000-doc batches to stay within MongoMemoryServer limits
  for (let i = 0; i < appDocs.length; i += 1_000) {
    await Application.insertMany(appDocs.slice(i, i + 1_000));
  }

  console.log(`   ✓ ${N_JOBS} jobs, ${N_CANDS} candidates, ${appDocs.length} applications`);
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
  try { app.use('/api/jobs',            ...authd, require('./src/routes/jobs')); }
  catch (e) { console.warn('⚠️  /api/jobs failed to load:', e.message); }
  try { app.use('/api/candidates',      ...authd, require('./src/routes/candidates')); }
  catch (e) { console.warn('⚠️  /api/candidates failed to load:', e.message); }
  try { app.use('/api/applications',    ...authd, require('./src/routes/applications')); }
  catch (e) { console.warn('⚠️  /api/applications failed to load:', e.message); }
  try { app.use('/api/dashboard',       ...authd, require('./src/routes/dashboard')); }
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
    reqPerSec:     Math.round(result.requests.average),
    avgMs:         Math.round(result.latency.mean),
    p95Ms:         Math.round(result.latency.p97_5),
    p99Ms:         Math.round(result.latency.p99),
    errors:        result.errors,
    non2xx:        result.non2xx || 0,
    errorRate:     `${((result.errors / Math.max(result.requests.total, 1)) * 100).toFixed(1)}%`,
    non2xxRate:    `${(((result.non2xx || 0) / Math.max(result.requests.total, 1)) * 100).toFixed(1)}%`,
    totalRequests: result.requests.total,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 TalentNest HR — DB-Backed Load Test');
  console.log(`   Seed: ${N_JOBS} jobs / ${N_CANDS} candidates / ${N_APPS} applications`);
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
  const passwordHash = await bcrypt.hash('Admin@12345', 10);
  const admin = await User.create({
    name:         'LT Admin',
    email:        'admin@loadtest.example',
    passwordHash,             // correct field — User schema uses passwordHash
    role:         'admin',
    tenantId:     org._id,
    isActive:     true,
  });
  await seedData(org._id, admin._id);

  // Build & start server
  const app = await buildApp(org._id, admin._id);
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`✅ Test server on port ${port}\n`);

  // JWT — auth middleware expects { userId } not { id }
  const token = jwt.sign(
    { userId: admin._id.toString(), role: 'admin', tenantId: org._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '2h' },
  );
  const authHeaders = { Authorization: `Bearer ${token}` };

  const BASE = `http://127.0.0.1:${port}`;
  const ENDPOINTS = [
    { label: 'GET /api/health',            url: `${BASE}/api/health`,            headers: {} },
    { label: 'GET /api/jobs',              url: `${BASE}/api/jobs`,              headers: authHeaders },
    { label: 'GET /api/candidates',        url: `${BASE}/api/candidates`,        headers: authHeaders },
    { label: 'GET /api/applications',      url: `${BASE}/api/applications`,      headers: authHeaders },
    { label: 'GET /api/dashboard/stats',   url: `${BASE}/api/dashboard/stats`,   headers: authHeaders },
  ];

  // ── Warm-up ──────────────────────────────────────────────────────────────────
  console.log('⏳ Warming up (5s, 2 connections) ...');
  for (const ep of ENDPOINTS) {
    await runLevel(ep.url, 2, 5, ep.headers).catch(() => {});
  }
  console.log('✅ Warm-up done\n');

  // ── Load test ─────────────────────────────────────────────────────────────────
  const allResults = [];

  for (const level of LEVELS) {
    console.log(`${'─'.repeat(70)}`);
    console.log(`Concurrency: ${level} connections × ${DURATION}s`);
    const levelRow = { concurrency: level, endpoints: {} };

    for (const ep of ENDPOINTS) {
      const raw   = await runLevel(ep.url, level, DURATION, ep.headers).catch(() => null);
      if (!raw) {
        console.log(`  ❌  ${ep.label}: failed to run`);
        levelRow.endpoints[ep.label] = { error: 'failed' };
        continue;
      }
      const stats = fmt(raw);
      levelRow.endpoints[ep.label] = stats;
      const flag  = stats.non2xx > 0 ? ` ⚠️  ${stats.non2xx} non-2xx` : '';
      console.log(
        `  ${ep.label.padEnd(35)} ` +
        `${String(stats.reqPerSec).padStart(6)} req/s  ` +
        `avg ${String(stats.avgMs).padStart(5)}ms  ` +
        `p95 ${String(stats.p95Ms).padStart(5)}ms  ` +
        `err ${stats.errorRate}${flag}`,
      );
    }
    allResults.push(levelRow);
  }

  // ── Summary — find first bottleneck ──────────────────────────────────────────
  console.log(`\n${'═'.repeat(70)}`);
  console.log('📊 First-bottleneck analysis:');
  // Find the endpoint with highest avg latency at 250 concurrent users
  const last = allResults[allResults.length - 1];
  if (last) {
    let worst = { label: '', avgMs: 0 };
    for (const [label, stats] of Object.entries(last.endpoints)) {
      if (stats.avgMs > worst.avgMs) worst = { label, avgMs: stats.avgMs };
    }
    console.log(`   Slowest at ${last.concurrency} concurrent: ${worst.label} (avg ${worst.avgMs}ms)`);
  }

  // ── Persist results ───────────────────────────────────────────────────────────
  const outPath = path.join(__dirname, 'load-test-results.json');
  fs.writeFileSync(outPath, JSON.stringify({
    runAt:                   new Date().toISOString(),
    durationPerLevelSeconds: DURATION,
    seed:                    { jobs: N_JOBS, candidates: N_CANDS, applications: N_APPS },
    levels:                  allResults,
  }, null, 2));
  console.log(`📄 Full results saved → ${outPath}`);

  server.close();
  await mongoose.disconnect();
  await mongoServer.stop();
}

main().catch(err => {
  console.error('\n💥 Load test crashed:', err.message, err.stack);
  process.exit(1);
});

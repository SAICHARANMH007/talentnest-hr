'use strict';
/**
 * TalentNest HR — Realistic Synthetic Load Test
 *
 * WHAT THIS MEASURES:
 *   - Express middleware stack (routing, JSON body parse, cookie parse)
 *   - JWT verification + RBAC checks (real authMiddleware, real allowRoles)
 *   - Full production route handler logic (pagination, filtering, serialization)
 *   - JSON serialization of realistic data volumes (300 jobs / 3000 candidates / 15000 apps)
 *
 * WHAT THIS DOES NOT MEASURE:
 *   - Actual MongoDB query execution (Mongoose models are stubbed)
 *   - Network round-trip to a database server
 *   - Index scan vs. collection scan differences
 *
 *   To estimate real production latency, add DB_LATENCY_MS (default 20ms) per
 *   DB call. For a cold Atlas M10 in the same region, expect 15–40ms per call.
 *   For a slow query without an index, expect 100–500ms per call.
 *
 * ENVIRONMENT CONSTRAINT:
 *   The full DB-backed load-test.js requires a MongoDB binary which this
 *   environment cannot download (fastdl.mongodb.org is not in the network
 *   allowlist). This test was designed as the honest alternative.
 *
 * Usage:
 *   node load-test-realistic.js
 *   DB_LATENCY_MS=30 DURATION=15 node load-test-realistic.js
 */

process.env.JWT_SECRET     = 'load_test_jwt_secret_must_be_32_chars!';
process.env.COOKIE_SECRET  = 'load_test_cookie_secret_32chars!!!';
process.env.NODE_ENV       = 'test';
process.env.SKIP_DEMO_SEED = 'true';
delete process.env.SENTRY_DSN;

const express      = require('express');
const cookieParser = require('cookie-parser');
const http         = require('http');
const autocannon   = require('autocannon');
const jwt          = require('jsonwebtoken');
const mongoose     = require('mongoose');
const fs           = require('fs');
const path         = require('path');

const LEVELS       = [10, 50, 100, 250];
const DURATION     = parseInt(process.env.DURATION      || '10',  10);
const DB_LAT_MS    = parseInt(process.env.DB_LATENCY_MS || '20',  10);
const N_JOBS       = 300;
const N_CANDS      = 3_000;
const N_APPS       = 15_000;

// ── Synthetic dataset ──────────────────────────────────────────────────────────
const FAKE_ORG_ID    = new mongoose.Types.ObjectId();
const FAKE_ADMIN_ID  = new mongoose.Types.ObjectId();

const CITIES  = ['Bangalore', 'Delhi NCR', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata'];
const DEPTS   = ['Engineering', 'Product', 'Design', 'Data', 'DevOps', 'Sales', 'Marketing'];
const STAGES  = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];
const ROLES   = ['Software Engineer', 'Product Manager', 'Designer', 'Data Analyst', 'DevOps Engineer'];
const JOB_TYPES = ['full_time', 'part_time', 'contract', 'internship'];

const JOBS = Array.from({ length: N_JOBS }, (_, i) => ({
  _id:      new mongoose.Types.ObjectId(),
  title:    `${DEPTS[i % DEPTS.length]} Role Level ${(i % 10) + 1}`,
  department: DEPTS[i % DEPTS.length],
  location:  CITIES[i % CITIES.length],
  jobType:   JOB_TYPES[i % JOB_TYPES.length],
  status:    'active',
  tenantId:  FAKE_ORG_ID,
  salaryMin: 600_000 + i * 5_000,
  salaryMax: 1_500_000 + i * 10_000,
  createdBy: FAKE_ADMIN_ID,
  isPublic:  true,
  deletedAt: null,
  createdAt: new Date(Date.now() - i * 3_600_000),
}));

const CANDIDATES = Array.from({ length: N_CANDS }, (_, i) => ({
  _id:         new mongoose.Types.ObjectId(),
  name:        `Candidate ${i + 1}`,
  email:       `cand${i + 1}@loadtest.example`,
  phone:       `+91 9${String(i + 100_000_000).slice(1)}`,
  tenantId:    FAKE_ORG_ID,
  currentRole: ROLES[i % ROLES.length],
  skills:      ['JavaScript', 'Python', 'React', 'Node.js', 'SQL'].slice(0, (i % 5) + 1),
  experience:  i % 15,
  status:      'active',
  deletedAt:   null,
  createdAt:   new Date(Date.now() - i * 1_800_000),
}));

const APPLICATIONS = Array.from({ length: N_APPS }, (_, i) => ({
  _id:          new mongoose.Types.ObjectId(),
  jobId:        JOBS[i % JOBS.length]._id,
  candidateId:  CANDIDATES[(i * 7 + 3) % CANDIDATES.length]._id,
  tenantId:     FAKE_ORG_ID,
  currentStage: STAGES[i % STAGES.length],
  status:       'active',
  deletedAt:    null,
  createdAt:    new Date(Date.now() - i * 600_000),
}));

const STAGE_COUNTS = {};
for (const a of APPLICATIONS) STAGE_COUNTS[a.currentStage] = (STAGE_COUNTS[a.currentStage] || 0) + 1;

// ── DB latency simulation ─────────────────────────────────────────────────────
function dbDelay() {
  if (DB_LAT_MS === 0) return Promise.resolve();
  return new Promise(r => setTimeout(r, DB_LAT_MS));
}

// ── Query chain builder ───────────────────────────────────────────────────────
// Supports every chaining pattern used in the production routes:
//   .find().select().sort().skip().limit().lean()
//   .find().sort().skip().limit().lean()
//   .findById().lean()
//   .findById().select().lean()
function makeChain(docs, latency = true) {
  let _skip = 0, _limit;

  const chain = {
    sort:     ()    => chain,
    skip:     (n)   => { _skip = n || 0; return chain; },
    limit:    (n)   => { _limit = n; return chain; },
    select:   ()    => chain,
    populate: ()    => chain,
    exec:     ()    => chain.lean(),
    lean: async () => {
      if (latency) await dbDelay();
      if (!Array.isArray(docs)) return docs;
      const end = _limit !== undefined ? _skip + _limit : docs.length;
      return docs.slice(_skip, end);
    },
  };
  // Awaitable without .lean() (for `await Model.findById(id)`)
  chain.then = (resolve, reject) => chain.lean().then(resolve, reject);
  return chain;
}

// Single-doc stub: supports .lean(), .select().lean(), .exec()
function makeDoc(doc) {
  return makeChain(doc, true);
}

// ── Mongoose model stubs ──────────────────────────────────────────────────────
function stubModels() {
  const Job         = require('./src/models/Job');
  const Candidate   = require('./src/models/Candidate');
  const Application = require('./src/models/Application');
  const User        = require('./src/models/User');
  const Org         = require('./src/models/Organization');
  const Tenant      = require('./src/models/Tenant');

  // ── Jobs ──────────────────────────────────────────────────────────────────
  const FAKE_USER_DOC = {
    _id: FAKE_ADMIN_ID, name: 'LT Admin', email: 'admin@loadtest.example',
    role: 'admin', tenantId: FAKE_ORG_ID, isActive: true,
  };
  const FAKE_ORG_DOC = {
    _id: FAKE_ORG_ID, name: 'LoadTest Corp', status: 'active', type: 'org',
  };

  // ── Jobs ──────────────────────────────────────────────────────────────────
  Job.find           = () => makeChain(JOBS);
  Job.countDocuments = async () => { await dbDelay(); return JOBS.length; };
  Job.findById       = ()    => makeDoc(JOBS[0]);
  Job.findOne        = async () => { await dbDelay(); return JOBS[0]; };

  // ── Candidates ────────────────────────────────────────────────────────────
  Candidate.find           = () => makeChain(CANDIDATES);
  Candidate.countDocuments = async () => { await dbDelay(); return CANDIDATES.length; };
  Candidate.findById       = ()    => makeDoc(CANDIDATES[0]);
  Candidate.findOne        = async () => { await dbDelay(); return CANDIDATES[0]; };

  // ── Candidates ────────────────────────────────────────────────────────────
  Candidate.aggregate = async () => { await dbDelay(); return [{ total: N_CANDS }]; };

  // ── Applications ──────────────────────────────────────────────────────────
  Application.find           = () => makeChain(APPLICATIONS);
  Application.countDocuments = async (filter) => {
    await dbDelay();
    if (filter?.currentStage) return STAGE_COUNTS[filter.currentStage] || 0;
    return APPLICATIONS.length;
  };
  Application.findById  = ()    => makeDoc(APPLICATIONS[0]);
  Application.distinct  = async () => { await dbDelay(); return []; };
  Application.aggregate = async () => {
    await dbDelay();
    return Object.entries(STAGE_COUNTS).map(([_id, count]) => ({ _id, count }));
  };

  // ── User — auth middleware calls .findById(id).select('-pwd...').lean() ───
  User.findById      = () => makeDoc(FAKE_USER_DOC);
  User.find          = () => makeChain([]);
  User.countDocuments = async () => 1;
  User.findOne       = async () => { await dbDelay(); return FAKE_USER_DOC; };

  // ── Organization — tenantGuard calls .findById(id).lean() ─────────────────
  Org.findById = () => makeDoc(FAKE_ORG_DOC);
  Org.findOne  = async () => { await dbDelay(); return FAKE_ORG_DOC; };
  Org.find     = () => makeChain([]);

  // ── Tenant — tenantGuard fallback .findById(id).lean() ───────────────────
  Tenant.findById = () => makeDoc(null);
  Tenant.findOne  = async () => null;
  Tenant.find     = () => makeChain([]);

  console.log('   ✓ Mongoose models stubbed with in-memory dataset');
}

// ── Stub other modules that would fail without a real DB/external services ────
function stubExtras() {
  const toStub = [
    './src/models/AuditLog', './src/models/Notification',
    './src/models/SavedSearch',
    './src/models/CustomFieldDefinition', './src/models/CustomFieldValue',
    './src/models/Referral', './src/models/OfferLetter',
    './src/models/ImportedCandidate', './src/models/PaymentRecord',
    './src/models/Pipeline', './src/models/WorkflowRule',
  ];
  for (const m of toStub) {
    try {
      const mod = require(m);
      mod.find           = () => makeChain([]);
      mod.findById       = () => makeDoc(null);
      mod.findOne        = async () => null;
      mod.countDocuments = async () => 0;
      mod.aggregate      = async () => [];
      mod.distinct       = async () => [];
      mod.create         = async (d) => ({ ...d, _id: new mongoose.Types.ObjectId() });
      mod.updateOne      = async () => ({ modifiedCount: 0 });
      mod.updateMany     = async () => ({ modifiedCount: 0 });
      mod.deleteMany     = async () => ({ deletedCount: 0 });
    } catch { /* model may not exist — skip */ }
  }

  // Email — suppress outbound email
  try {
    const email = require('./src/utils/email');
    if (email.sendEmail)         email.sendEmail         = async () => ({ messageId: 'stub' });
    if (email.sendEmailWithRetry) email.sendEmailWithRetry = async () => ({ messageId: 'stub' });
  } catch { /* skip */ }

  // Logger — suppress audit writes
  try {
    const logger = require('./src/middleware/logger');
    if (logger.audit)  logger.audit  = () => {};
    if (logger.info)   logger.info   = () => {};
    if (logger.error)  logger.error  = () => {};
  } catch { /* skip */ }

  console.log('   ✓ External service stubs applied');
}

// ── App bootstrap ─────────────────────────────────────────────────────────────
async function buildApp() {
  stubModels();
  stubExtras();

  const { authMiddleware } = require('./src/middleware/auth');
  const { tenantGuard }    = require('./src/middleware/tenantGuard');
  const errorMiddleware    = require('./src/middleware/errorMiddleware');

  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser(process.env.COOKIE_SECRET));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

  const authd = [authMiddleware, tenantGuard];

  const routes = [
    ['/api/jobs',         './src/routes/jobs'],
    ['/api/candidates',   './src/routes/candidates'],
    ['/api/applications', './src/routes/applications'],
    ['/api/dashboard',    './src/routes/dashboard'],
  ];

  for (const [mount, rPath] of routes) {
    try {
      app.use(mount, ...authd, require(rPath));
      console.log(`   ✓ Mounted ${mount}`);
    } catch (e) {
      console.warn(`   ⚠️  Could not mount ${mount}: ${e.message.slice(0, 80)}`);
    }
  }

  app.use(errorMiddleware);
  return app;
}

// ── Autocannon helpers ─────────────────────────────────────────────────────────
function runLevel(url, connections, duration, headers) {
  return new Promise((resolve, reject) => {
    autocannon({ url, connections, duration, headers, pipelining: 1 },
      (err, r) => err ? reject(err) : resolve(r));
  });
}

function fmt(r) {
  return {
    reqPerSec:     Math.round(r.requests.average),
    avgMs:         Math.round(r.latency.mean),
    p95Ms:         Math.round(r.latency.p97_5),
    p99Ms:         Math.round(r.latency.p99),
    errors:        r.errors,
    non2xx:        r.non2xx || 0,
    errorRate:     `${((r.errors / Math.max(r.requests.total, 1)) * 100).toFixed(1)}%`,
    non2xxRate:    `${(((r.non2xx || 0) / Math.max(r.requests.total, 1)) * 100).toFixed(1)}%`,
    totalRequests: r.requests.total,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 TalentNest HR — Realistic Synthetic Load Test');
  console.log(`   Seed: ${N_JOBS} jobs / ${N_CANDS} candidates / ${N_APPS} applications (in-memory)`);
  console.log(`   DB latency simulation: ${DB_LAT_MS}ms per call`);
  console.log(`   Levels: ${LEVELS.join(', ')} concurrent connections`);
  console.log(`   Duration: ${DURATION}s per level per endpoint\n`);

  console.log('🔧 Bootstrapping application ...');
  const app    = await buildApp();
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  console.log(`✅ Server on port ${port}\n`);

  const token = jwt.sign(
    { userId: FAKE_ADMIN_ID.toString(), role: 'admin', tenantId: FAKE_ORG_ID.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '2h' },
  );
  const authH = { Authorization: `Bearer ${token}` };
  const BASE  = `http://127.0.0.1:${port}`;

  const ENDPOINTS = [
    { label: 'GET /api/health',          url: `${BASE}/api/health`,          h: {} },
    { label: 'GET /api/jobs',            url: `${BASE}/api/jobs`,            h: authH },
    { label: 'GET /api/candidates',      url: `${BASE}/api/candidates`,      h: authH },
    { label: 'GET /api/applications',    url: `${BASE}/api/applications`,    h: authH },
    { label: 'GET /api/dashboard/stats', url: `${BASE}/api/dashboard/stats`, h: authH },
  ];

  // Warm-up
  console.log('⏳ Warming up (5s, 2 connections) ...');
  for (const ep of ENDPOINTS) await runLevel(ep.url, 2, 5, ep.h).catch(() => {});
  console.log('✅ Warm-up done\n');

  const allResults = [];

  for (const level of LEVELS) {
    console.log(`${'─'.repeat(72)}`);
    console.log(`Concurrency: ${level} connections × ${DURATION}s`);
    const row = { concurrency: level, endpoints: {} };

    for (const ep of ENDPOINTS) {
      const r     = await runLevel(ep.url, level, DURATION, ep.h).catch(() => null);
      if (!r) {
        console.log(`  ❌  ${ep.label}: failed`);
        row.endpoints[ep.label] = { error: 'failed' };
        continue;
      }
      const stats = fmt(r);
      row.endpoints[ep.label] = stats;
      const flag  = stats.non2xx > 0 ? ` ⚠️  ${stats.non2xx} non-2xx` : '';
      console.log(
        `  ${ep.label.padEnd(36)} ` +
        `${String(stats.reqPerSec).padStart(6)} req/s  ` +
        `avg ${String(stats.avgMs).padStart(5)}ms  ` +
        `p95 ${String(stats.p95Ms).padStart(5)}ms  ` +
        `err ${stats.errorRate}${flag}`,
      );
    }
    allResults.push(row);
    console.log('');
  }

  // Bottleneck analysis
  console.log(`${'═'.repeat(72)}`);
  const last = allResults[allResults.length - 1];
  let worst = { label: '', avgMs: -1, non2xx: 0 };
  for (const [label, stats] of Object.entries(last?.endpoints || {})) {
    if (stats.avgMs > worst.avgMs) worst = { label, avgMs: stats.avgMs, non2xx: stats.non2xx || 0 };
  }
  console.log(`📊 First bottleneck at ${last?.concurrency} concurrent users:`);
  console.log(`   Slowest: ${worst.label} — avg ${worst.avgMs}ms (+ ~${DB_LAT_MS}ms DB per call in production)`);

  // Real-world projection
  console.log('\n📐 Production projection (add real MongoDB overhead):');
  for (const row of allResults) {
    const ep = 'GET /api/jobs';
    const stats = row.endpoints[ep];
    if (!stats || stats.error) continue;
    const realAvg = stats.avgMs + DB_LAT_MS * 2; // typical: 2 DB calls per list endpoint
    const realP95 = stats.p95Ms + DB_LAT_MS * 4;
    console.log(`   ${row.concurrency.toString().padStart(4)} users: avg ~${realAvg}ms  p95 ~${realP95}ms  (${ep})`);
  }

  const out = {
    type:      'realistic-synthetic (production routes + in-memory data + simulated DB latency)',
    runAt:     new Date().toISOString(),
    constraint: 'MongoDB binary download blocked in this environment (fastdl.mongodb.org not in network allowlist)',
    dbLatencySimulatedMs: DB_LAT_MS,
    seed:      { jobs: N_JOBS, candidates: N_CANDS, applications: N_APPS },
    durationPerLevelSeconds: DURATION,
    levels:    allResults,
    interpretation: {
      whatIsMeasured: [
        'Express middleware stack (routing, cookie, JSON body)',
        'Real JWT verification (authMiddleware)',
        'RBAC checks (allowRoles)',
        'Full production route handler logic (pagination, filtering, serialization)',
        `Simulated DB call latency (${DB_LAT_MS}ms per call)`,
      ],
      whatIsNotMeasured: [
        'Actual MongoDB query execution time',
        'MongoDB connection pool contention',
        'Index vs. collection-scan difference',
        'Network round-trip to database host',
      ],
      howToGetRealNumbers: 'Run load-test.js with MONGODB_URI pointing to an Atlas cluster',
    },
  };

  const outPath = path.join(__dirname, 'load-test-results.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\n📄 Full results saved → ${outPath}`);

  server.close();
}

main().catch(e => { console.error('\n💥', e.message, '\n', e.stack); process.exit(1); });

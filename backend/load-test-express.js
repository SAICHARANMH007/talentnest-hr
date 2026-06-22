'use strict';
/**
 * Express-layer load test — no MongoDB required.
 *
 * Measures pure Node.js/Express throughput (routing, JWT decode, JSON
 * serialisation). Run this anywhere. The full MongoDB-backed load test
 * is in load-test.js (requires mongod or Atlas URI via MONGODB_URI env var).
 */
process.env.JWT_SECRET    = 'load_test_jwt_secret_must_be_32_chars!';
process.env.COOKIE_SECRET = 'load_test_cookie_secret_32_chars!!';
process.env.NODE_ENV      = 'test';

const express      = require('express');
const cookieParser = require('cookie-parser');
const http         = require('http');
const autocannon   = require('autocannon');
const jwt          = require('jsonwebtoken');
const fs           = require('fs');
const path         = require('path');

const LEVELS   = [10, 50, 100, 250];
const DURATION = parseInt(process.env.DURATION || '10', 10);

// ── Synthetic data (mimics production shapes) ─────────────────────────────────
const JOBS = Array.from({ length: 50 }, (_, i) => ({
  _id: `job_${i}`, title: `Software Engineer L${i + 1}`,
  department: 'Engineering', location: 'Bangalore',
  status: 'active', type: 'full_time',
  salaryMin: 800000 + i * 10000, salaryMax: 1500000 + i * 20000,
  createdAt: new Date(Date.now() - i * 86400000).toISOString(),
}));

const CANDIDATES = Array.from({ length: 500 }, (_, i) => ({
  _id: `cand_${i}`, name: `Candidate ${i + 1}`,
  email: `c${i}@test.example`, phone: `+91 900000${String(i).padStart(4,'0')}`,
  currentRole: ['SWE', 'PM', 'Designer', 'Analyst', 'DevOps'][i % 5],
  experience: (i % 12) + 1, status: 'active',
  createdAt: new Date(Date.now() - i * 3600000).toISOString(),
}));

const APPLICATIONS = Array.from({ length: 2000 }, (_, i) => ({
  _id: `app_${i}`, jobId: `job_${i % 50}`, candidateId: `cand_${i % 500}`,
  stage: ['applied','screening','interview','offer','hired'][i % 5],
  status: 'active', appliedAt: new Date(Date.now() - i * 1800000).toISOString(),
}));

// ── Middleware: decode JWT ──────────────────────────────────────────────────────
function authMw(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(h.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(process.env.COOKIE_SECRET));

  app.get('/api/health', (_req, res) =>
    res.json({ status: 'ok', ts: Date.now() }));

  // List endpoints — paginated just like production (default page 1, limit 20)
  app.get('/api/jobs', authMw, (req, res) => {
    const page  = parseInt(req.query.page  || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const start = (page - 1) * limit;
    res.json({ success: true, data: JOBS.slice(start, start + limit),
      total: JOBS.length, page, limit });
  });

  app.get('/api/candidates', authMw, (req, res) => {
    const page  = parseInt(req.query.page  || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const start = (page - 1) * limit;
    res.json({ success: true, data: CANDIDATES.slice(start, start + limit),
      total: CANDIDATES.length, page, limit });
  });

  app.get('/api/applications', authMw, (req, res) => {
    const page  = parseInt(req.query.page  || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const start = (page - 1) * limit;
    res.json({ success: true, data: APPLICATIONS.slice(start, start + limit),
      total: APPLICATIONS.length, page, limit });
  });

  // Synthetic dashboard aggregation (mimics counting by stage)
  app.get('/api/dashboard', authMw, (req, res) => {
    const counts = {};
    for (const a of APPLICATIONS) counts[a.stage] = (counts[a.stage] || 0) + 1;
    res.json({ success: true, data: {
      totalJobs: JOBS.length, totalCandidates: CANDIDATES.length,
      totalApplications: APPLICATIONS.length, byStage: counts,
    }});
  });

  return app;
}

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
    errorRate:     `${((r.errors / Math.max(r.requests.total, 1)) * 100).toFixed(1)}%`,
    totalRequests: r.requests.total,
  };
}

async function main() {
  console.log('\n🚀 TalentNest HR — Express Layer Load Test (no DB)');
  console.log('   50 jobs · 500 candidates · 2 000 applications (in-memory)');
  console.log(`   ${LEVELS.join(', ')} concurrent connections × ${DURATION}s each\n`);

  const app    = buildApp();
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const token = jwt.sign(
    { id: 'admin_01', role: 'admin', tenantId: 'org_01' },
    process.env.JWT_SECRET, { expiresIn: '2h' });
  const authH = { Authorization: `Bearer ${token}` };

  const BASE = `http://127.0.0.1:${port}`;
  const ENDPOINTS = [
    { label: 'GET /api/health',       url: `${BASE}/api/health`,       h: {} },
    { label: 'GET /api/jobs',         url: `${BASE}/api/jobs`,         h: authH },
    { label: 'GET /api/candidates',   url: `${BASE}/api/candidates`,   h: authH },
    { label: 'GET /api/applications', url: `${BASE}/api/applications`, h: authH },
    { label: 'GET /api/dashboard',    url: `${BASE}/api/dashboard`,    h: authH },
  ];

  // Warm-up
  process.stdout.write('⏳ Warming up ... ');
  for (const ep of ENDPOINTS) await runLevel(ep.url, 2, 3, ep.h).catch(() => {});
  console.log('done\n');

  const allResults = [];

  for (const level of LEVELS) {
    console.log(`${'─'.repeat(68)}`);
    console.log(`Concurrency: ${level}`);
    const row = { concurrency: level, endpoints: {} };

    for (const ep of ENDPOINTS) {
      const r     = await runLevel(ep.url, level, DURATION, ep.h);
      const stats = fmt(r);
      row.endpoints[ep.label] = stats;
      const errFlag = stats.errors > 0 ? ` ⚠️ ${stats.errors} err` : '';
      console.log(
        `  ${ep.label.padEnd(30)} ` +
        `${String(stats.reqPerSec).padStart(7)} req/s  ` +
        `avg ${String(stats.avgMs).padStart(5)}ms  ` +
        `p95 ${String(stats.p95Ms).padStart(5)}ms  ` +
        `err ${stats.errorRate}${errFlag}`
      );
    }
    allResults.push(row);
  }

  const out = {
    type:           'express-layer (no db)',
    runAt:          new Date().toISOString(),
    durationPerLevelSeconds: DURATION,
    note:           'These numbers show pure Node.js/Express + JWT throughput. Real production numbers will be lower by 20-60ms per query due to MongoDB round-trips.',
    levels:         allResults,
  };

  const outPath = path.join(__dirname, 'load-test-results.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\n${'═'.repeat(68)}`);
  console.log(`📄 Results saved → ${outPath}`);

  server.close();
}

main().catch(e => { console.error('💥', e.message); process.exit(1); });

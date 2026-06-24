/**
 * Module audit: distribution.js route
 *
 * Behaviors proven:
 *   DIST-A  GET /job/:jobId             — 401; 404 job not found; 200 platforms list.
 *   DIST-B  GET /summary               — 401; 403 recruiter; 200 summary.
 *   DIST-C  POST /retry/:jobId/:platform — 401; 404; 200 retry triggered.
 *   DIST-D  GET /employer-settings/:tenantId — 401; 200 settings.
 *   DIST-E  PATCH /employer-settings/:tenantId — 401; 200 saved.
 */

process.env.JWT_SECRET = 'test_jwt_secret_for_vitest_only';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
import express      from 'express';
import cookieParser from 'cookie-parser';
import request      from 'supertest';
import jwt          from 'jsonwebtoken';
import mongoose     from 'mongoose';

vi.mock('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next(),
}));

const _r              = createRequire(import.meta.url);
const _authModule     = _r('../src/middleware/auth.js');
const User            = _r('../src/models/User.js');
const Job             = _r('../src/models/Job.js');
const JobDistribution = _r('../src/models/JobDistribution.js');
const Organization    = _r('../src/models/Organization.js');
const logger          = _r('../src/middleware/logger.js');

import distributionRouter from '../src/routes/distribution.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID  = new mongoose.Types.ObjectId().toString();
const JOB_ID        = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin') {
  const userId = role === 'recruiter' ? RECRUITER_ID : ADMIN_ID;
  return jwt.sign({ userId, role, tenantId: TENANT_ID }, JWT_SECRET, { expiresIn: '1h' });
}

function chainOf(value) {
  const q = {
    select:   vi.fn().mockReturnThis(),
    sort:     vi.fn().mockReturnThis(),
    skip:     vi.fn().mockReturnThis(),
    limit:    vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    lean:     vi.fn().mockResolvedValue(value),
    then: (r, j) => Promise.resolve(value).then(r, j),
    catch: (j)   => Promise.resolve(value).catch(j),
  };
  return q;
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/distribution', distributionRouter);
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  _authModule.clearAllUserAuthCache();
  vi.spyOn(logger, 'info').mockImplementation(() => {});
  vi.spyOn(logger, 'error').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
  vi.spyOn(logger, 'audit').mockImplementation(() => {});

  vi.spyOn(User, 'findById').mockImplementation((id) => {
    if (String(id) === RECRUITER_ID) {
      return chainOf({ _id: RECRUITER_ID, id: RECRUITER_ID, role: 'recruiter',
        tenantId: TENANT_ID, isActive: true, name: 'Rec', email: 'r@t.example' });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example' });
  });
});

// ── DIST-A: GET /job/:jobId ───────────────────────────────────────────────────
describe('GET /api/distribution/job/:jobId — job distribution status (DIST-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/distribution/job/${JOB_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when job not found', async () => {
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get(`/api/distribution/job/${JOB_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 with platforms list', async () => {
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf({ _id: JOB_ID, title: 'Dev', status: 'active', tenantId: TENANT_ID, location: 'Hyderabad' }));
    vi.spyOn(JobDistribution, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get(`/api/distribution/job/${JOB_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.platforms)).toBe(true);
  });
});

// ── DIST-B: GET /summary ──────────────────────────────────────────────────────
describe('GET /api/distribution/summary — summary (DIST-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/distribution/summary');
    expect(res.status).toBe(401);
  });

  it('returns 403 for recruiter', async () => {
    const res = await request(buildApp())
      .get('/api/distribution/summary')
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 for admin', async () => {
    vi.spyOn(JobDistribution, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(JobDistribution, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/distribution/summary')
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── DIST-C: POST /retry/:jobId/:platform ─────────────────────────────────────
describe('POST /api/distribution/retry/:jobId/:platform — retry (DIST-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post(`/api/distribution/retry/${JOB_ID}/indeed`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when distribution log not found', async () => {
    vi.spyOn(JobDistribution, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .post(`/api/distribution/retry/${JOB_ID}/indeed`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 on retry triggered', async () => {
    const logDoc = { jobId: JOB_ID, platform: 'indeed', status: 'failed', attemptCount: 1, save: vi.fn().mockResolvedValue({}) };
    vi.spyOn(JobDistribution, 'findOne').mockResolvedValue(logDoc);

    const res = await request(buildApp())
      .post(`/api/distribution/retry/${JOB_ID}/indeed`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── DIST-D: GET /employer-settings/:tenantId ─────────────────────────────────
describe('GET /api/distribution/employer-settings/:tenantId — settings (DIST-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/distribution/employer-settings/${TENANT_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 with settings', async () => {
    vi.spyOn(Organization, 'findById').mockReturnValue(chainOf({ distributionSettings: { naukri: true } }));

    const res = await request(buildApp())
      .get(`/api/distribution/employer-settings/${TENANT_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── DIST-E: PATCH /employer-settings/:tenantId ───────────────────────────────
describe('PATCH /api/distribution/employer-settings/:tenantId — save settings (DIST-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).patch(`/api/distribution/employer-settings/${TENANT_ID}`).send({});
    expect(res.status).toBe(401);
  });

  it('returns 200 on save', async () => {
    vi.spyOn(Organization, 'findByIdAndUpdate').mockResolvedValue({});

    const res = await request(buildApp())
      .patch(`/api/distribution/employer-settings/${TENANT_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ naukri: true, shine: false, timesjobs: false });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

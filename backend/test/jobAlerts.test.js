/**
 * Test suite for /api/job-alerts (src/routes/jobAlerts.js)
 *
 * Behaviors proven:
 *   JALERT-A  GET /           — 401 no token; 200 empty list
 *   JALERT-B  POST /          — 401 no token; 400 no filters; 201 created
 *   JALERT-C  PATCH /:id      — 401 no token; 404 not found; 200 updated
 *   JALERT-D  DELETE /:id     — 401 no token; 200 deleted
 */

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

vi.mock('../src/utils/email', () => ({
  sendEmailWithRetry: vi.fn().mockResolvedValue({}),
}));

// ── CJS references ────────────────────────────────────────────────────────────
const _r = createRequire(import.meta.url);

const _authModule = _r('../src/middleware/auth.js');
const User        = _r('../src/models/User.js');
const JobAlert    = _r('../src/models/JobAlert.js');
const logger      = _r('../src/middleware/logger.js');

import jobAlertsRouter from '../src/routes/jobAlerts.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const USER_ID       = new mongoose.Types.ObjectId().toString();
const ALERT_ID      = new mongoose.Types.ObjectId().toString();

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(role = 'admin', opts = {}) {
  return jwt.sign(
    { userId: opts.id ?? USER_ID, role, tenantId: opts.tenantId ?? TENANT_ID },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

function chainOf(value) {
  const q = {
    select:   vi.fn().mockReturnThis(),
    sort:     vi.fn().mockReturnThis(),
    skip:     vi.fn().mockReturnThis(),
    limit:    vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    lean:     vi.fn().mockResolvedValue(value),
    then:  (r, j) => Promise.resolve(value).then(r, j),
    catch: (j)    => Promise.resolve(value).catch(j),
  };
  return q;
}

function makeAlertDoc(overrides = {}) {
  const base = {
    _id:          ALERT_ID,
    id:           ALERT_ID,
    userId:       USER_ID,
    email:        'user@test.example',
    keywords:     ['react'],
    location:     'Remote',
    jobType:      'Full-Time',
    industry:     '',
    department:   '',
    frequency:    'daily',
    isActive:     true,
    createdAt:    new Date().toISOString(),
    ...overrides,
  };
  return { ...base, toObject: () => ({ ...base }) };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/job-alerts', jobAlertsRouter);
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  });
  return app;
}

// ── Per-test setup ─────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  _authModule.clearAllUserAuthCache();

  vi.spyOn(logger, 'info').mockImplementation(() => {});
  vi.spyOn(logger, 'error').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
  vi.spyOn(logger, 'audit').mockImplementation(() => {});

  // authenticate only needs User.findById (no tenantGuard on these routes)
  vi.spyOn(User, 'findById').mockReturnValue(
    chainOf({
      _id:      USER_ID,
      id:       USER_ID,
      role:     'admin',
      tenantId: TENANT_ID,
      isActive: true,
      name:     'Test User',
      email:    'user@test.example',
      settings: {},
      toObject: () => ({}),
    }),
  );
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/job-alerts — list alerts (JALERT-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/job-alerts');
    expect(res.status).toBe(401);
  });

  it('returns 200 with empty array when user has no alerts', async () => {
    vi.spyOn(JobAlert, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/job-alerts')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it('returns 200 with alert list when alerts exist', async () => {
    const doc = { _id: ALERT_ID, keywords: ['react'], location: 'Remote' };
    vi.spyOn(JobAlert, 'find').mockReturnValue(chainOf([doc]));

    const res = await request(buildApp())
      .get('/api/job-alerts')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(ALERT_ID);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/job-alerts — create alert (JALERT-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post('/api/job-alerts')
      .send({ keywords: ['node'] });
    expect(res.status).toBe(401);
  });

  it('returns 400 when no filters are provided', async () => {
    const res = await request(buildApp())
      .post('/api/job-alerts')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/filter/i);
  });

  it('returns 201 with created alert', async () => {
    vi.spyOn(JobAlert, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(JobAlert, 'create').mockResolvedValue(makeAlertDoc());

    const res = await request(buildApp())
      .post('/api/job-alerts')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ keywords: ['react'], location: 'Remote', frequency: 'daily' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(ALERT_ID);
    expect(res.body.data.id).toBe(ALERT_ID);
  });

  it('returns 400 when alert limit is reached', async () => {
    vi.spyOn(JobAlert, 'countDocuments').mockResolvedValue(10);

    const res = await request(buildApp())
      .post('/api/job-alerts')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ keywords: ['react'] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/maximum/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/job-alerts/:id — update alert (JALERT-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).patch(`/api/job-alerts/${ALERT_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when alert does not belong to user', async () => {
    vi.spyOn(JobAlert, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/job-alerts/${ALERT_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ isActive: false });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 200 with updated alert', async () => {
    const updated = makeAlertDoc({ isActive: false });
    vi.spyOn(JobAlert, 'findOneAndUpdate').mockResolvedValue(updated);

    const res = await request(buildApp())
      .patch(`/api/job-alerts/${ALERT_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(ALERT_ID);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/job-alerts/:id — remove alert (JALERT-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/job-alerts/${ALERT_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 with success message after deleting', async () => {
    vi.spyOn(JobAlert, 'findOneAndDelete').mockResolvedValue(makeAlertDoc());

    const res = await request(buildApp())
      .delete(`/api/job-alerts/${ALERT_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Alert removed.');
  });
});

/**
 * Module audit: headcountPlans.js route
 *
 * Behaviors proven:
 *   HCP-A  GET /       — 401; 200 list for admin.
 *   HCP-B  POST /      — 401; 400 missing name/year; 201 created.
 *   HCP-C  GET /:id    — 401; 404; 200.
 *   HCP-D  PATCH /:id  — 401; 404; 200 updated.
 *   HCP-E  DELETE /:id — 401; 404; 200 deleted.
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

const _r = createRequire(import.meta.url);

const _authModule    = _r('../src/middleware/auth.js');
const User           = _r('../src/models/User.js');
const Organization   = _r('../src/models/Organization.js');
const Tenant         = _r('../src/models/Tenant.js');
const HeadcountPlan  = _r('../src/models/HeadcountPlan.js');
const Application    = _r('../src/models/Application.js');
const logger         = _r('../src/middleware/logger.js');

import headcountPlansRouter from '../src/routes/headcountPlans.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const PLAN_ID       = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin') {
  return jwt.sign(
    { userId: ADMIN_ID, role, tenantId: TENANT_ID },
    JWT_SECRET, { expiresIn: '1h' },
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
    then: (r, j) => Promise.resolve(value).then(r, j),
    catch: (j)   => Promise.resolve(value).catch(j),
  };
  return q;
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/headcount-plans', headcountPlansRouter);
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

  vi.spyOn(Organization, 'findById').mockReturnValue(chainOf({
    _id: TENANT_ID, name: 'Test Org', status: 'active', type: 'org',
    subscriptionStatus: 'active', isStaffingAgency: false,
  }));
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));

  vi.spyOn(User, 'findById').mockReturnValue(chainOf({
    _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
    tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example',
    toObject: () => ({}),
  }));
});

// ── HCP-A: GET / ──────────────────────────────────────────────────────────────
describe('GET /api/headcount-plans — list plans (HCP-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/headcount-plans');
    expect(res.status).toBe(401);
  });

  it('returns 200 list for admin', async () => {
    vi.spyOn(HeadcountPlan, 'find').mockReturnValue(chainOf([
      { _id: PLAN_ID, name: 'Q1 Plan', year: 2025, entries: [] },
    ]));
    vi.spyOn(Application, 'aggregate').mockResolvedValue([]);

    const res = await request(buildApp())
      .get('/api/headcount-plans')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── HCP-B: POST / ─────────────────────────────────────────────────────────────
describe('POST /api/headcount-plans — create plan (HCP-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/headcount-plans').send({ name: 'Q1', year: 2025 });
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(buildApp())
      .post('/api/headcount-plans')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ year: 2025 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('creates plan and returns 201', async () => {
    vi.spyOn(HeadcountPlan, 'create').mockResolvedValue({
      _id: PLAN_ID, name: 'Q1 Plan', year: 2025, entries: [], status: 'draft',
    });

    const res = await request(buildApp())
      .post('/api/headcount-plans')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Q1 Plan', year: 2025 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Q1 Plan');
  });
});

// ── HCP-C: GET /:id ───────────────────────────────────────────────────────────
describe('GET /api/headcount-plans/:id — single plan (HCP-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/headcount-plans/${PLAN_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when plan not found', async () => {
    vi.spyOn(HeadcountPlan, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get(`/api/headcount-plans/${PLAN_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('returns 200 with plan data', async () => {
    vi.spyOn(HeadcountPlan, 'findOne').mockReturnValue(chainOf(
      { _id: PLAN_ID, name: 'Q1 Plan', year: 2025, entries: [] },
    ));

    const res = await request(buildApp())
      .get(`/api/headcount-plans/${PLAN_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── HCP-D: PATCH /:id ─────────────────────────────────────────────────────────
describe('PATCH /api/headcount-plans/:id — update plan (HCP-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).patch(`/api/headcount-plans/${PLAN_ID}`).send({ name: 'Q2' });
    expect(res.status).toBe(401);
  });

  it('returns 404 when plan not found', async () => {
    vi.spyOn(HeadcountPlan, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/headcount-plans/${PLAN_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Q2' });

    expect(res.status).toBe(404);
  });

  it('updates plan and returns 200', async () => {
    const planDoc = {
      _id: PLAN_ID, name: 'Q1 Plan', year: 2025, entries: [],
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(HeadcountPlan, 'findOne').mockResolvedValue(planDoc);

    const res = await request(buildApp())
      .patch(`/api/headcount-plans/${PLAN_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Q2 Plan' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── HCP-E: DELETE /:id ────────────────────────────────────────────────────────
describe('DELETE /api/headcount-plans/:id — delete plan (HCP-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/headcount-plans/${PLAN_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when plan not found', async () => {
    vi.spyOn(HeadcountPlan, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/headcount-plans/${PLAN_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('deletes plan and returns 200', async () => {
    const planDoc = {
      _id: PLAN_ID, deletedAt: null,
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(HeadcountPlan, 'findOne').mockResolvedValue(planDoc);

    const res = await request(buildApp())
      .delete(`/api/headcount-plans/${PLAN_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

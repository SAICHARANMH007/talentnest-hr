/**
 * Module audit: talentPool.js route
 *
 * Behaviors proven:
 *   TP-A  GET /            — 401; 200 pools list.
 *   TP-B  POST /           — 401; 400 name missing; 201 created.
 *   TP-C  GET /:id         — 401; 404; 200 pool.
 *   TP-D  PATCH /:id       — 401; 404; 200 updated.
 *   TP-E  DELETE /:id      — 401; 404; 200 deleted.
 *   TP-F  POST /:id/members — 401; 400 no candidateId; 404 candidate; 200 added.
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

const _r           = createRequire(import.meta.url);
const _authModule  = _r('../src/middleware/auth.js');
const User         = _r('../src/models/User.js');
const Organization = _r('../src/models/Organization.js');
const Tenant       = _r('../src/models/Tenant.js');
const TalentPool   = _r('../src/models/TalentPool.js');
const Candidate    = _r('../src/models/Candidate.js');
const logger       = _r('../src/middleware/logger.js');

import talentPoolRouter from '../src/routes/talentPool.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const POOL_ID       = new mongoose.Types.ObjectId().toString();
const CAND_ID       = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin') {
  return jwt.sign({ userId: ADMIN_ID, role, tenantId: TENANT_ID }, JWT_SECRET, { expiresIn: '1h' });
}

function chainOf(value) {
  const q = {
    select:   vi.fn().mockReturnThis(),
    sort:     vi.fn().mockReturnThis(),
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
  app.use('/api/talent-pools', talentPoolRouter);
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

  vi.spyOn(User, 'findById').mockReturnValue(chainOf({
    _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
    tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example',
  }));
  vi.spyOn(Organization, 'findById').mockReturnValue(chainOf({
    _id: TENANT_ID, name: 'Org', status: 'active', type: 'org',
    subscriptionStatus: 'active', isStaffingAgency: false,
  }));
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));
  vi.spyOn(TalentPool, 'populate').mockResolvedValue(undefined);
});

// ── TP-A: GET / ───────────────────────────────────────────────────────────────
describe('GET /api/talent-pools — list pools (TP-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/talent-pools');
    expect(res.status).toBe(401);
  });

  it('returns 200 with pools list', async () => {
    vi.spyOn(TalentPool, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/talent-pools')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.pools)).toBe(true);
  });
});

// ── TP-B: POST / ──────────────────────────────────────────────────────────────
describe('POST /api/talent-pools — create pool (TP-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/talent-pools').send({ name: 'Pool A' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when name missing', async () => {
    const res = await request(buildApp())
      .post('/api/talent-pools')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ description: 'desc' });
    expect(res.status).toBe(400);
  });

  it('returns 201 when pool created', async () => {
    vi.spyOn(TalentPool, 'create').mockResolvedValue({ _id: POOL_ID, name: 'Pool A' });

    const res = await request(buildApp())
      .post('/api/talent-pools')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Pool A', description: 'dev pool', tags: ['dev'] });
    expect(res.status).toBe(201);
    expect(res.body.pool.name).toBe('Pool A');
  });
});

// ── TP-C: GET /:id ────────────────────────────────────────────────────────────
describe('GET /api/talent-pools/:id — get pool (TP-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/talent-pools/${POOL_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when pool not found', async () => {
    vi.spyOn(TalentPool, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get(`/api/talent-pools/${POOL_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 with pool data', async () => {
    vi.spyOn(TalentPool, 'findOne').mockReturnValue(chainOf({ _id: POOL_ID, name: 'Pool A', members: [] }));

    const res = await request(buildApp())
      .get(`/api/talent-pools/${POOL_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.pool.name).toBe('Pool A');
  });
});

// ── TP-D: PATCH /:id ──────────────────────────────────────────────────────────
describe('PATCH /api/talent-pools/:id — update pool (TP-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).patch(`/api/talent-pools/${POOL_ID}`).send({ name: 'New' });
    expect(res.status).toBe(401);
  });

  it('returns 404 when pool not found', async () => {
    vi.spyOn(TalentPool, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/talent-pools/${POOL_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(404);
  });

  it('returns 200 when pool updated', async () => {
    vi.spyOn(TalentPool, 'findOneAndUpdate').mockResolvedValue({ _id: POOL_ID, name: 'New Name' });

    const res = await request(buildApp())
      .patch(`/api/talent-pools/${POOL_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.pool.name).toBe('New Name');
  });
});

// ── TP-E: DELETE /:id ─────────────────────────────────────────────────────────
describe('DELETE /api/talent-pools/:id — delete pool (TP-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/talent-pools/${POOL_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when pool not found', async () => {
    vi.spyOn(TalentPool, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/talent-pools/${POOL_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 when pool deleted', async () => {
    vi.spyOn(TalentPool, 'findOneAndUpdate').mockResolvedValue({ _id: POOL_ID });

    const res = await request(buildApp())
      .delete(`/api/talent-pools/${POOL_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
  });
});

// ── TP-F: POST /:id/members ───────────────────────────────────────────────────
describe('POST /api/talent-pools/:id/members — add member (TP-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post(`/api/talent-pools/${POOL_ID}/members`).send({ candidateId: CAND_ID });
    expect(res.status).toBe(401);
  });

  it('returns 400 when candidateId missing', async () => {
    const res = await request(buildApp())
      .post(`/api/talent-pools/${POOL_ID}/members`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 when candidate not found', async () => {
    vi.spyOn(Candidate, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .post(`/api/talent-pools/${POOL_ID}/members`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ candidateId: CAND_ID });
    expect(res.status).toBe(404);
  });

  it('returns 200 when candidate added to pool', async () => {
    vi.spyOn(Candidate, 'findOne').mockResolvedValue({ _id: CAND_ID, name: 'Alice' });
    const poolDoc = {
      _id: POOL_ID, tenantId: TENANT_ID, members: [],
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(TalentPool, 'findOne').mockResolvedValue(poolDoc);

    const res = await request(buildApp())
      .post(`/api/talent-pools/${POOL_ID}/members`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ candidateId: CAND_ID });
    expect(res.status).toBe(200);
    expect(res.body.memberCount).toBe(1);
  });
});

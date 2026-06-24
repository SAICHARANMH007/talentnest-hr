/**
 * Module audit: jobRequirements.js route
 *
 * Behaviors proven:
 *   JR-A  GET /meta/recruiters   — 401; 200 list.
 *   JR-B  GET /                  — 401; 200 for admin.
 *   JR-C  GET /:id               — 401; 404; 200.
 *   JR-D  POST /                 — 401; 403 non-client; 400 no title; 201 created.
 *   JR-E  PATCH /:id             — 401; 404; 200 updated (client role).
 *   JR-F  PATCH /:id/status      — 401; 404; 200 status updated (admin role).
 *   JR-G  DELETE /:id            — 401; 404; 200 withdrawn (client role).
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

const _authModule      = _r('../src/middleware/auth.js');
const User             = _r('../src/models/User.js');
const Organization     = _r('../src/models/Organization.js');
const Tenant           = _r('../src/models/Tenant.js');
const JobRequirement   = _r('../src/models/JobRequirement.js');
const logger           = _r('../src/middleware/logger.js');

import jobRequirementsRouter from '../src/routes/jobRequirements.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const CLIENT_USER_ID = new mongoose.Types.ObjectId().toString();
const CLIENT_ID     = new mongoose.Types.ObjectId().toString();
const REQ_ID        = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin', extra = {}) {
  const id = role === 'client' ? CLIENT_USER_ID : ADMIN_ID;
  return jwt.sign(
    { userId: id, role, tenantId: TENANT_ID, ...extra },
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
  app.use('/api/job-requirements', jobRequirementsRouter);
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

  vi.spyOn(User, 'findById').mockImplementation((id) => {
    if (String(id) === CLIENT_USER_ID) {
      return chainOf({ _id: CLIENT_USER_ID, id: CLIENT_USER_ID, role: 'client',
        clientId: CLIENT_ID, tenantId: TENANT_ID, isActive: true, name: 'Client', email: 'c@t.example',
        toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example',
      toObject: () => ({}) });
  });
});

// ── JR-A: GET /meta/recruiters ────────────────────────────────────────────────
describe('GET /api/job-requirements/meta/recruiters — list recruiters (JR-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/job-requirements/meta/recruiters');
    expect(res.status).toBe(401);
  });

  it('returns 200 with recruiter list', async () => {
    vi.spyOn(User, 'find').mockReturnValue(chainOf([
      { _id: ADMIN_ID, name: 'Recruiter One', email: 'r@t.example' },
    ]));

    const res = await request(buildApp())
      .get('/api/job-requirements/meta/recruiters')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── JR-B: GET / ───────────────────────────────────────────────────────────────
describe('GET /api/job-requirements — list requirements (JR-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/job-requirements');
    expect(res.status).toBe(401);
  });

  it('returns 200 paginated list for admin', async () => {
    vi.spyOn(JobRequirement, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(JobRequirement, 'countDocuments').mockResolvedValue(0);

    const res = await request(buildApp())
      .get('/api/job-requirements')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── JR-C: GET /:id ────────────────────────────────────────────────────────────
describe('GET /api/job-requirements/:id — single requirement (JR-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/job-requirements/${REQ_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when requirement not found', async () => {
    vi.spyOn(JobRequirement, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get(`/api/job-requirements/${REQ_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('returns 200 with requirement data', async () => {
    vi.spyOn(JobRequirement, 'findOne').mockReturnValue(chainOf(
      { _id: REQ_ID, title: 'Dev', toObject: () => ({ _id: REQ_ID, title: 'Dev' }) },
    ));

    const res = await request(buildApp())
      .get(`/api/job-requirements/${REQ_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── JR-D: POST / ──────────────────────────────────────────────────────────────
describe('POST /api/job-requirements — create requirement (JR-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/job-requirements').send({ title: 'Dev' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for admin role (only client can POST)', async () => {
    const res = await request(buildApp())
      .post('/api/job-requirements')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ title: 'Dev' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when title missing', async () => {
    const res = await request(buildApp())
      .post('/api/job-requirements')
      .set('Authorization', `Bearer ${makeToken('client', { clientId: CLIENT_ID })}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('creates requirement and returns 201', async () => {
    const reqDoc = {
      _id: REQ_ID, title: 'Dev Role', status: 'new',
      toObject: () => ({ _id: REQ_ID, title: 'Dev Role' }),
    };
    vi.spyOn(JobRequirement, 'create').mockResolvedValue(reqDoc);

    const res = await request(buildApp())
      .post('/api/job-requirements')
      .set('Authorization', `Bearer ${makeToken('client', { clientId: CLIENT_ID })}`)
      .send({ title: 'Dev Role', openings: 2 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ── JR-E: PATCH /:id ──────────────────────────────────────────────────────────
describe('PATCH /api/job-requirements/:id — update requirement (JR-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).patch(`/api/job-requirements/${REQ_ID}`).send({ title: 'X' });
    expect(res.status).toBe(401);
  });

  it('returns 404 when requirement not found', async () => {
    vi.spyOn(JobRequirement, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/job-requirements/${REQ_ID}`)
      .set('Authorization', `Bearer ${makeToken('client', { clientId: CLIENT_ID })}`)
      .send({ title: 'Updated' });

    expect(res.status).toBe(404);
  });

  it('updates requirement and returns 200', async () => {
    const reqDoc = {
      _id: REQ_ID, title: 'Old', status: 'new',
      save: vi.fn().mockResolvedValue({}),
      toObject: () => ({ _id: REQ_ID, title: 'Updated' }),
    };
    vi.spyOn(JobRequirement, 'findOne').mockResolvedValue(reqDoc);

    const res = await request(buildApp())
      .patch(`/api/job-requirements/${REQ_ID}`)
      .set('Authorization', `Bearer ${makeToken('client', { clientId: CLIENT_ID })}`)
      .send({ title: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── JR-F: PATCH /:id/status ───────────────────────────────────────────────────
describe('PATCH /api/job-requirements/:id/status — update status (JR-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).patch(`/api/job-requirements/${REQ_ID}/status`).send({ status: 'in_progress' });
    expect(res.status).toBe(401);
  });

  it('returns 404 when requirement not found', async () => {
    vi.spyOn(JobRequirement, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/job-requirements/${REQ_ID}/status`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(404);
  });

  it('updates status and returns 200', async () => {
    const reqDoc = {
      _id: REQ_ID, status: 'new',
      save: vi.fn().mockResolvedValue({}),
      toObject: () => ({ _id: REQ_ID, status: 'in_progress' }),
    };
    vi.spyOn(JobRequirement, 'findOne').mockResolvedValue(reqDoc);

    const res = await request(buildApp())
      .patch(`/api/job-requirements/${REQ_ID}/status`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── JR-G: DELETE /:id ─────────────────────────────────────────────────────────
describe('DELETE /api/job-requirements/:id — withdraw requirement (JR-G)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/job-requirements/${REQ_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when requirement not found', async () => {
    vi.spyOn(JobRequirement, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/job-requirements/${REQ_ID}`)
      .set('Authorization', `Bearer ${makeToken('client', { clientId: CLIENT_ID })}`)

    expect(res.status).toBe(404);
  });

  it('withdraws requirement and returns 200', async () => {
    const reqDoc = {
      _id: REQ_ID, status: 'new', deletedAt: null,
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(JobRequirement, 'findOne').mockResolvedValue(reqDoc);

    const res = await request(buildApp())
      .delete(`/api/job-requirements/${REQ_ID}`)
      .set('Authorization', `Bearer ${makeToken('client', { clientId: CLIENT_ID })}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

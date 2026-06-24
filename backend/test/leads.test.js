/**
 * Module audit: leads.js route
 *
 * Behaviors proven:
 *   LEAD-A  POST /      — 400 missing required; 201 created (public, no auth).
 *   LEAD-B  GET /       — 401; 403 non-super_admin; 200 list.
 *   LEAD-C  PATCH /:id  — 401; 404 not found; 200 updated.
 *   LEAD-D  DELETE /:id — 401; 404 not found; 200 removed.
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

const _authModule = _r('../src/middleware/auth.js');
const User        = _r('../src/models/User.js');
const Lead        = _r('../src/models/Lead.js');
const logger      = _r('../src/middleware/logger.js');

import leadsRouter from '../src/routes/leads.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const SA_ID         = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const LEAD_ID       = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'super_admin') {
  const id = role === 'admin' ? ADMIN_ID : SA_ID;
  return jwt.sign(
    { userId: id, role, tenantId: TENANT_ID },
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
  app.use('/api/leads', leadsRouter);
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
    if (String(id) === ADMIN_ID) {
      return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
        tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example',
        toObject: () => ({}) });
    }
    return chainOf({ _id: SA_ID, id: SA_ID, role: 'super_admin',
      tenantId: null, isActive: true, name: 'SA', email: 'sa@t.example',
      toObject: () => ({}) });
  });
});

// ── LEAD-A: POST / ────────────────────────────────────────────────────────────
describe('POST /api/leads — public submission (LEAD-A)', () => {
  it('returns 400 when required fields missing', async () => {
    const res = await request(buildApp())
      .post('/api/leads')
      .send({ name: 'Test' }); // missing email and service
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('creates lead and returns 201', async () => {
    vi.spyOn(Lead, 'create').mockResolvedValue({
      _id: LEAD_ID, name: 'Alice', email: 'alice@test.example', service: 'ATS',
      toJSON: () => ({ _id: LEAD_ID, name: 'Alice', email: 'alice@test.example', service: 'ATS' }),
    });

    const res = await request(buildApp())
      .post('/api/leads')
      .send({ name: 'Alice', email: 'alice@test.example', service: 'ATS', message: 'Hello' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Alice');
  });
});

// ── LEAD-B: GET / ─────────────────────────────────────────────────────────────
describe('GET /api/leads — list leads (LEAD-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/leads');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-super_admin', async () => {
    const res = await request(buildApp())
      .get('/api/leads')
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 list for super_admin', async () => {
    vi.spyOn(Lead, 'find').mockReturnValue(chainOf([
      { _id: LEAD_ID, name: 'Alice', email: 'alice@test.example', service: 'ATS' },
    ]));

    const res = await request(buildApp())
      .get('/api/leads')
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── LEAD-C: PATCH /:id ────────────────────────────────────────────────────────
describe('PATCH /api/leads/:id — update lead (LEAD-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).patch(`/api/leads/${LEAD_ID}`).send({ status: 'contacted' });
    expect(res.status).toBe(401);
  });

  it('returns 404 when lead not found', async () => {
    vi.spyOn(Lead, 'findByIdAndUpdate').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .patch(`/api/leads/${LEAD_ID}`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`)
      .send({ status: 'contacted' });

    expect(res.status).toBe(404);
  });

  it('updates lead and returns 200', async () => {
    vi.spyOn(Lead, 'findByIdAndUpdate').mockReturnValue(chainOf(
      { _id: LEAD_ID, name: 'Alice', status: 'contacted' },
    ));

    const res = await request(buildApp())
      .patch(`/api/leads/${LEAD_ID}`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`)
      .send({ status: 'contacted' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── LEAD-D: DELETE /:id ───────────────────────────────────────────────────────
describe('DELETE /api/leads/:id — delete lead (LEAD-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/leads/${LEAD_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when lead not found', async () => {
    vi.spyOn(Lead, 'findByIdAndDelete').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/leads/${LEAD_ID}`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);

    expect(res.status).toBe(404);
  });

  it('deletes lead and returns 200', async () => {
    vi.spyOn(Lead, 'findByIdAndDelete').mockResolvedValue({ _id: LEAD_ID, email: 'alice@test.example' });

    const res = await request(buildApp())
      .delete(`/api/leads/${LEAD_ID}`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

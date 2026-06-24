/**
 * Module audit: savedSearches.js route
 *
 * Behaviors proven:
 *   SRCH-A  GET /       — 401 no token; 200 empty list.
 *   SRCH-B  POST /      — 401; 400 missing name; 201 created.
 *   SRCH-C  PATCH /:id  — 401; 404 not found; 200 updated.
 *   SRCH-D  DELETE /:id — 401; 404 not found; 200 deleted.
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

const _authModule  = _r('../src/middleware/auth.js');
const User         = _r('../src/models/User.js');
const Organization = _r('../src/models/Organization.js');
const Tenant       = _r('../src/models/Tenant.js');
const SavedSearch  = _r('../src/models/SavedSearch.js');
const logger       = _r('../src/middleware/logger.js');

import savedSearchesRouter from '../src/routes/savedSearches.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const SEARCH_ID     = new mongoose.Types.ObjectId().toString();

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
  app.use('/api/saved-searches', savedSearchesRouter);
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
    tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@test.example',
    toObject: () => ({}),
  }));
});

// ── SRCH-A: GET / ──────────────────────────────────────────────────────────────
describe('GET /api/saved-searches — list (SRCH-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/saved-searches');
    expect(res.status).toBe(401);
  });

  it('returns 200 with empty list', async () => {
    vi.spyOn(SavedSearch, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/saved-searches')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.searches)).toBe(true);
    expect(res.body.searches).toHaveLength(0);
  });
});

// ── SRCH-B: POST / ─────────────────────────────────────────────────────────────
describe('POST /api/saved-searches — create (SRCH-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post('/api/saved-searches')
      .send({ name: 'My Search' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(buildApp())
      .post('/api/saved-searches')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ filters: { status: 'active' } });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/name required/i);
  });

  it('creates saved search and returns 201', async () => {
    vi.spyOn(SavedSearch, 'create').mockResolvedValue({
      _id: SEARCH_ID, name: 'Active Candidates', context: 'candidates', filters: {},
    });

    const res = await request(buildApp())
      .post('/api/saved-searches')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Active Candidates', context: 'candidates', filters: {} });

    expect(res.status).toBe(201);
    expect(res.body.search.name).toBe('Active Candidates');
  });
});

// ── SRCH-C: PATCH /:id ─────────────────────────────────────────────────────────
describe('PATCH /api/saved-searches/:id — update (SRCH-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .patch(`/api/saved-searches/${SEARCH_ID}`)
      .send({ name: 'Updated' });
    expect(res.status).toBe(401);
  });

  it('returns 404 when saved search not found', async () => {
    vi.spyOn(SavedSearch, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/saved-searches/${SEARCH_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('updates saved search and returns 200', async () => {
    vi.spyOn(SavedSearch, 'findOneAndUpdate').mockResolvedValue({
      _id: SEARCH_ID, name: 'Updated Search', context: 'candidates', filters: {},
    });

    const res = await request(buildApp())
      .patch(`/api/saved-searches/${SEARCH_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Updated Search' });

    expect(res.status).toBe(200);
    expect(res.body.search.name).toBe('Updated Search');
  });
});

// ── SRCH-D: DELETE /:id ────────────────────────────────────────────────────────
describe('DELETE /api/saved-searches/:id — delete (SRCH-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/saved-searches/${SEARCH_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when saved search not found', async () => {
    vi.spyOn(SavedSearch, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/saved-searches/${SEARCH_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('deletes saved search and returns 200', async () => {
    vi.spyOn(SavedSearch, 'findOneAndUpdate').mockResolvedValue({
      _id: SEARCH_ID, name: 'Active Candidates',
    });

    const res = await request(buildApp())
      .delete(`/api/saved-searches/${SEARCH_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});

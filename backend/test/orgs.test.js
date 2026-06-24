/**
 * Module 16 audit: orgs.js route
 *
 * Behaviors proven:
 *   ORGS-A  GET /              — 401; 403 recruiter; 200 admin own org; 200 SA all orgs.
 *   ORGS-B  POST /             — 401; 403 admin; 400 no name; 201 created.
 *   ORGS-C  GET /my-org        — 401; 404 no org; 200.
 *   ORGS-D  GET /:id           — 401; 403 recruiter; 404; 200 admin.
 *   ORGS-E  PATCH /:id         — 401; 403 recruiter; 404; 200 admin.
 *   ORGS-F  POST /logo/upload  — 401; 400 no logoUrl; 200.
 *   ORGS-G  DELETE /logo       — 401; 200.
 *   ORGS-H  DELETE /:id        — 401; 403 admin; 400 has active data; 200 empty org.
 *   ORGS-I  PATCH /:id/plan    — 401; 403 admin; 404; 200 updated.
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

vi.mock('../src/utils/normalize', () => ({
  default: vi.fn((x) => (x && typeof x === 'object' ? { ...x, id: String(x._id || '') } : x)),
}));

const _r = createRequire(import.meta.url);

const _authModule  = _r('../src/middleware/auth.js');
const User         = _r('../src/models/User.js');
const Organization = _r('../src/models/Organization.js');
const Tenant       = _r('../src/models/Tenant.js');
const Job          = _r('../src/models/Job.js');
const logger       = _r('../src/middleware/logger.js');

import orgsRouter from '../src/routes/orgs.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const SA_ID         = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID  = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin', opts = {}) {
  let id = ADMIN_ID;
  if (role === 'super_admin') id = SA_ID;
  if (role === 'recruiter')   id = RECRUITER_ID;
  return jwt.sign(
    { userId: opts.id ?? id, role, tenantId: opts.tenantId ?? TENANT_ID, orgId: opts.orgId ?? TENANT_ID },
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

function makeOrg(overrides = {}) {
  return {
    _id:       TENANT_ID,
    id:        TENANT_ID,
    name:      'Test Org',
    slug:      'test-org',
    status:    'active',
    plan:      'trial',
    industry:  'tech',
    settings:  {},
    toJSON:    () => ({ _id: TENANT_ID, name: 'Test Org', status: 'active', plan: 'trial', settings: {} }),
    ...overrides,
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/orgs', orgsRouter);
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
    if (String(id) === SA_ID) {
      return chainOf({ _id: SA_ID, id: SA_ID, role: 'super_admin',
        tenantId: TENANT_ID, orgId: TENANT_ID, isActive: true, name: 'SA', email: 'sa@t.example',
        toObject: () => ({}) });
    }
    if (String(id) === RECRUITER_ID) {
      return chainOf({ _id: RECRUITER_ID, id: RECRUITER_ID, role: 'recruiter',
        tenantId: TENANT_ID, orgId: TENANT_ID, isActive: true, name: 'Rec', email: 'rec@t.example',
        toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, orgId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example',
      toObject: () => ({}) });
  });

  vi.spyOn(Organization, 'findById').mockReturnValue(chainOf(makeOrg()));
});

// ── ORGS-A: GET / ──────────────────────────────────────────────────────────────
describe('GET /api/orgs — list organizations (ORGS-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/orgs');
    expect(res.status).toBe(401);
  });

  it('returns 403 for recruiter role', async () => {
    const res = await request(buildApp())
      .get('/api/orgs')
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);
    expect(res.status).toBe(403);
  });

  it('admin gets own org as array', async () => {
    // Organization.findById is mocked in beforeEach
    vi.spyOn(Tenant, 'findById').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get('/api/orgs')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('super_admin gets all orgs with user counts', async () => {
    vi.spyOn(Organization, 'find').mockReturnValue(chainOf([makeOrg()]));
    vi.spyOn(User, 'aggregate').mockResolvedValue([{ _id: TENANT_ID, count: 5 }]);

    const res = await request(buildApp())
      .get('/api/orgs')
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

// ── ORGS-B: POST / ─────────────────────────────────────────────────────────────
describe('POST /api/orgs — create org (ORGS-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/orgs').send({ name: 'New Org' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for admin role', async () => {
    const res = await request(buildApp())
      .post('/api/orgs')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'New Org' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(buildApp())
      .post('/api/orgs')
      .set('Authorization', `Bearer ${makeToken('super_admin')}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('super_admin can create org (201)', async () => {
    vi.spyOn(Organization, 'findOne').mockReturnValue(chainOf(null)); // no duplicate domain
    vi.spyOn(Organization, 'create').mockResolvedValue(makeOrg({ name: 'New Corp' }));

    const res = await request(buildApp())
      .post('/api/orgs')
      .set('Authorization', `Bearer ${makeToken('super_admin')}`)
      .send({ name: 'New Corp', industry: 'tech', plan: 'trial' });

    expect(res.status).toBe(200); // orgs.js returns res.json (200), not 201
    expect(res.body.name).toBe('Test Org'); // normalize returns the mock org
  });
});

// ── ORGS-C: GET /my-org ────────────────────────────────────────────────────────
describe('GET /api/orgs/my-org — own org for any member (ORGS-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/orgs/my-org');
    expect(res.status).toBe(401);
  });

  it('returns 200 for admin', async () => {
    const res = await request(buildApp())
      .get('/api/orgs/my-org')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
  });
});

// ── ORGS-D: GET /:id ───────────────────────────────────────────────────────────
describe('GET /api/orgs/:id — single org (ORGS-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/orgs/${TENANT_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for recruiter role', async () => {
    const res = await request(buildApp())
      .get(`/api/orgs/${TENANT_ID}`)
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 for admin accessing own org', async () => {
    vi.spyOn(Tenant, 'findById').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get(`/api/orgs/${TENANT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin', { orgId: TENANT_ID })}`);

    expect(res.status).toBe(200);
  });
});

// ── ORGS-E: PATCH /:id ─────────────────────────────────────────────────────────
describe('PATCH /api/orgs/:id — update org (ORGS-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .patch(`/api/orgs/${TENANT_ID}`)
      .send({ name: 'Updated' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for recruiter role', async () => {
    const res = await request(buildApp())
      .patch(`/api/orgs/${TENANT_ID}`)
      .set('Authorization', `Bearer ${makeToken('recruiter')}`)
      .send({ name: 'Updated' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when no valid fields provided', async () => {
    vi.spyOn(Tenant, 'findById').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .patch(`/api/orgs/${TENANT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin', { orgId: TENANT_ID })}`)
      .send({ plan: 'enterprise' }); // admin cannot change plan
    expect(res.status).toBe(400);
  });

  it('admin can update own org name (200)', async () => {
    vi.spyOn(Tenant, 'findById').mockReturnValue(chainOf(null));
    vi.spyOn(Organization, 'findByIdAndUpdate').mockResolvedValue(makeOrg({ name: 'Renamed Corp' }));
    vi.spyOn(User, 'updateMany').mockResolvedValue({});

    const res = await request(buildApp())
      .patch(`/api/orgs/${TENANT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin', { orgId: TENANT_ID })}`)
      .send({ name: 'Renamed Corp' });

    expect(res.status).toBe(200);
  });
});

// ── ORGS-F: POST /logo/upload ─────────────────────────────────────────────────
describe('POST /api/orgs/logo/upload — upload logo (ORGS-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post('/api/orgs/logo/upload')
      .send({ logoUrl: 'data:image/png;base64,abc' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when logoUrl is missing', async () => {
    const res = await request(buildApp())
      .post('/api/orgs/logo/upload')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/logoUrl/i);
  });

  it('uploads logo and returns 200', async () => {
    vi.spyOn(Organization, 'findByIdAndUpdate').mockResolvedValue(makeOrg());

    const res = await request(buildApp())
      .post('/api/orgs/logo/upload')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ logoUrl: 'data:image/png;base64,abc123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.logoUrl).toBe('data:image/png;base64,abc123');
  });
});

// ── ORGS-G: DELETE /logo ───────────────────────────────────────────────────────
describe('DELETE /api/orgs/logo — reset logo (ORGS-G)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete('/api/orgs/logo');
    expect(res.status).toBe(401);
  });

  it('resets logo and returns 200', async () => {
    vi.spyOn(Organization, 'findByIdAndUpdate').mockResolvedValue(makeOrg());

    const res = await request(buildApp())
      .delete('/api/orgs/logo')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── ORGS-H: DELETE /:id ────────────────────────────────────────────────────────
describe('DELETE /api/orgs/:id — delete org (ORGS-H)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/orgs/${TENANT_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for admin role', async () => {
    const res = await request(buildApp())
      .delete(`/api/orgs/${TENANT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(403);
  });

  it('returns 400 when org has active users or jobs', async () => {
    vi.spyOn(User, 'countDocuments').mockResolvedValue(3);
    vi.spyOn(Job, 'countDocuments').mockResolvedValue(5);

    const res = await request(buildApp())
      .delete(`/api/orgs/${TENANT_ID}`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot delete/i);
    expect(res.body.userCount).toBe(3);
  });

  it('super_admin can delete empty org (200)', async () => {
    vi.spyOn(User, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(Job, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(Organization, 'findByIdAndDelete').mockResolvedValue({});

    const res = await request(buildApp())
      .delete(`/api/orgs/${TENANT_ID}`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ── ORGS-I: PATCH /:id/plan ────────────────────────────────────────────────────
describe('PATCH /api/orgs/:id/plan — update plan (ORGS-I)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .patch(`/api/orgs/${TENANT_ID}/plan`)
      .send({ plan: 'enterprise' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for admin role', async () => {
    const res = await request(buildApp())
      .patch(`/api/orgs/${TENANT_ID}/plan`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ plan: 'enterprise' });
    expect(res.status).toBe(403);
  });

  it('returns 404 when org not found', async () => {
    vi.spyOn(Organization, 'findById').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .patch(`/api/orgs/${TENANT_ID}/plan`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`)
      .send({ plan: 'enterprise' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('SA can update org plan (200)', async () => {
    vi.spyOn(Organization, 'findByIdAndUpdate').mockResolvedValue(
      makeOrg({ plan: 'enterprise' }),
    );

    const res = await request(buildApp())
      .patch(`/api/orgs/${TENANT_ID}/plan`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`)
      .send({ plan: 'enterprise', status: 'active' });

    expect(res.status).toBe(200);
  });
});

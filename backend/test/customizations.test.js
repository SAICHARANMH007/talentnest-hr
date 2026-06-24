/**
 * Module 14 audit: customizations.js route
 *
 * Behaviors proven:
 *   CUST-A  GET /                    — 401 no token; 403 recruiter; 200 full doc.
 *   CUST-B  PATCH /                  — 401; 400 no valid fields; 200 singleton updated.
 *   CUST-C  POST /:section           — 401; 400 unknown section; 201 item added.
 *   CUST-D  PATCH /:section/:id      — 401; 404 not found; 200 item updated.
 *   CUST-E  DELETE /:section/:id     — 401; 200 item removed.
 *   CUST-F  PUT /:section            — 401; 400 no items array; 200 collection replaced.
 *   CUST-G  PUT /employer-brand/full — 401; 200 brand updated.
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

const _authModule       = _r('../src/middleware/auth.js');
const User              = _r('../src/models/User.js');
const OrgCustomizations = _r('../src/models/OrgCustomizations.js');
const Organization      = _r('../src/models/Organization.js');
const logger            = _r('../src/middleware/logger.js');

import customizationsRouter from '../src/routes/customizations.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID  = new mongoose.Types.ObjectId().toString();
const ITEM_ID       = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin') {
  const id = role === 'recruiter' ? RECRUITER_ID : ADMIN_ID;
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

function makeCustomDoc(overrides = {}) {
  const base = {
    orgId: TENANT_ID,
    pipelineStatuses: [],
    tags: [],
    emailSignature: { body: 'Regards' },
    fieldVisibility: new Map(),
    employerBrand: { tagline: '', about: '' },
    toObject: (opts = {}) => ({
      orgId: TENANT_ID,
      pipelineStatuses: [],
      tags: [],
      emailSignature: { body: 'Regards' },
      fieldVisibility: {},
      employerBrand: { tagline: '', about: '' },
      ...overrides,
    }),
    ...overrides,
  };
  return base;
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/customizations', customizationsRouter);
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
        tenantId: TENANT_ID, isActive: true, name: 'Rec', email: 'rec@test.example',
        toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'admin@test.example',
      toObject: () => ({}) });
  });
});

// ── CUST-A: GET / ──────────────────────────────────────────────────────────────
describe('GET /api/customizations — full doc (CUST-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/customizations');
    expect(res.status).toBe(401);
  });

  it('returns 403 for recruiter role', async () => {
    const res = await request(buildApp())
      .get('/api/customizations')
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 full customizations doc for admin', async () => {
    vi.spyOn(OrgCustomizations, 'getOrCreate').mockResolvedValue(makeCustomDoc());
    vi.spyOn(Organization, 'findById').mockReturnValue(chainOf({ settings: { branches: [] } }));

    const res = await request(buildApp())
      .get('/api/customizations')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ── CUST-B: PATCH / ────────────────────────────────────────────────────────────
describe('PATCH /api/customizations — update singleton (CUST-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).patch('/api/customizations').send({ emailSignature: { body: 'Cheers' } });
    expect(res.status).toBe(401);
  });

  it('returns 400 when no valid fields provided', async () => {
    const res = await request(buildApp())
      .patch('/api/customizations')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ unknownField: 'value' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no valid fields/i);
  });

  it('updates singleton and returns 200', async () => {
    vi.spyOn(OrgCustomizations, 'findOneAndUpdate').mockResolvedValue(makeCustomDoc());

    const res = await request(buildApp())
      .patch('/api/customizations')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ emailSignature: { body: 'Kind regards' } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── CUST-C: POST /:section ─────────────────────────────────────────────────────
describe('POST /api/customizations/:section — add item (CUST-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/customizations/tags').send({ name: 'Remote' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for unknown section', async () => {
    const res = await request(buildApp())
      .post('/api/customizations/invalidSection')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unknown section/i);
  });

  it('adds item to collection and returns 201', async () => {
    const newItem = { _id: ITEM_ID, name: 'Remote' };
    const mockDoc = { tags: [newItem] };
    vi.spyOn(OrgCustomizations, 'findOneAndUpdate').mockResolvedValue(mockDoc);

    const res = await request(buildApp())
      .post('/api/customizations/tags')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Remote' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ── CUST-D: PATCH /:section/:id ────────────────────────────────────────────────
describe('PATCH /api/customizations/:section/:id — update item (CUST-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .patch(`/api/customizations/tags/${ITEM_ID}`)
      .send({ name: 'Updated' });
    expect(res.status).toBe(401);
  });

  it('returns 404 when item not found', async () => {
    vi.spyOn(OrgCustomizations, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/customizations/tags/${ITEM_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(404);
  });

  it('updates item and returns 200', async () => {
    const updatedItem = { _id: ITEM_ID, name: 'Updated Tag' };
    const mockDoc = { tags: { id: vi.fn().mockReturnValue(updatedItem) } };
    vi.spyOn(OrgCustomizations, 'findOneAndUpdate').mockResolvedValue(mockDoc);

    const res = await request(buildApp())
      .patch(`/api/customizations/tags/${ITEM_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Updated Tag' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── CUST-E: DELETE /:section/:id ───────────────────────────────────────────────
describe('DELETE /api/customizations/:section/:id — remove item (CUST-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/customizations/tags/${ITEM_ID}`);
    expect(res.status).toBe(401);
  });

  it('removes item and returns 200', async () => {
    vi.spyOn(OrgCustomizations, 'findOneAndUpdate').mockResolvedValue({});

    const res = await request(buildApp())
      .delete(`/api/customizations/tags/${ITEM_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/removed/i);
  });
});

// ── CUST-F: PUT /:section ──────────────────────────────────────────────────────
describe('PUT /api/customizations/:section — replace collection (CUST-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).put('/api/customizations/tags').send({ items: [] });
    expect(res.status).toBe(401);
  });

  it('returns 400 when items array is missing', async () => {
    const res = await request(buildApp())
      .put('/api/customizations/tags')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/items array/i);
  });

  it('replaces collection and returns 200', async () => {
    const items = [{ name: 'Tag A' }, { name: 'Tag B' }];
    vi.spyOn(OrgCustomizations, 'findOneAndUpdate').mockResolvedValue({ tags: items });

    const res = await request(buildApp())
      .put('/api/customizations/tags')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ items });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── CUST-G: PUT /employer-brand/full ──────────────────────────────────────────
describe('PUT /api/customizations/employer-brand/full — brand update (CUST-G)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).put('/api/customizations/employer-brand/full').send({});
    expect(res.status).toBe(401);
  });

  it('updates employer brand and returns 200', async () => {
    const mockDoc = { employerBrand: { tagline: 'Build the future', about: 'We do things' } };
    vi.spyOn(OrgCustomizations, 'findOneAndUpdate').mockResolvedValue(mockDoc);

    const res = await request(buildApp())
      .put('/api/customizations/employer-brand/full')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ tagline: 'Build the future', about: 'We do things' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tagline).toBe('Build the future');
  });
});

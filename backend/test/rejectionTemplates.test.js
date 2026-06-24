/**
 * Module audit: rejectionTemplates.js route
 *
 * Behaviors proven:
 *   RJTPL-A  GET /       — 401 no token; 200 list for admin.
 *   RJTPL-B  POST /      — 401; 400 missing fields; 201 created.
 *   RJTPL-C  PATCH /:id  — 401; 404 not found; 200 updated.
 *   RJTPL-D  DELETE /:id — 401; 404 not found; 200 deleted.
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
const Organization      = _r('../src/models/Organization.js');
const Tenant            = _r('../src/models/Tenant.js');
const RejectionTemplate = _r('../src/models/RejectionTemplate.js');
const logger            = _r('../src/middleware/logger.js');

import rejectionTemplatesRouter from '../src/routes/rejectionTemplates.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const TPL_ID        = new mongoose.Types.ObjectId().toString();

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
  app.use('/api/rejection-templates', rejectionTemplatesRouter);
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

// ── RJTPL-A: GET / ─────────────────────────────────────────────────────────────
describe('GET /api/rejection-templates — list (RJTPL-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/rejection-templates');
    expect(res.status).toBe(401);
  });

  it('returns 200 list for admin', async () => {
    vi.spyOn(RejectionTemplate, 'find').mockReturnValue(chainOf([
      { _id: TPL_ID, name: 'Template', subject: 'Sorry', body: 'Text', isDefault: false },
    ]));

    const res = await request(buildApp())
      .get('/api/rejection-templates')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });
});

// ── RJTPL-B: POST / ────────────────────────────────────────────────────────────
describe('POST /api/rejection-templates — create (RJTPL-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post('/api/rejection-templates')
      .send({ name: 'T', subject: 'S', body: 'B' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(buildApp())
      .post('/api/rejection-templates')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Only Name' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name, subject and body are required/i);
  });

  it('creates template and returns 201', async () => {
    vi.spyOn(RejectionTemplate, 'updateMany').mockResolvedValue({});
    vi.spyOn(RejectionTemplate, 'create').mockResolvedValue({
      _id: TPL_ID, name: 'Template', subject: 'Sorry', body: 'Text', isDefault: true,
    });

    const res = await request(buildApp())
      .post('/api/rejection-templates')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Template', subject: 'Sorry', body: 'Text', isDefault: true });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Template');
  });
});

// ── RJTPL-C: PATCH /:id ────────────────────────────────────────────────────────
describe('PATCH /api/rejection-templates/:id — update (RJTPL-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .patch(`/api/rejection-templates/${TPL_ID}`)
      .send({ name: 'Updated' });
    expect(res.status).toBe(401);
  });

  it('returns 404 when template not found', async () => {
    vi.spyOn(RejectionTemplate, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/rejection-templates/${TPL_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('updates template and returns 200', async () => {
    const docMock = {
      _id: TPL_ID, name: 'Template', subject: 'Sorry', body: 'Text',
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(RejectionTemplate, 'findOne').mockResolvedValue(docMock);
    vi.spyOn(RejectionTemplate, 'updateMany').mockResolvedValue({});

    const res = await request(buildApp())
      .patch(`/api/rejection-templates/${TPL_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Updated Name', isDefault: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(docMock.save).toHaveBeenCalled();
  });
});

// ── RJTPL-D: DELETE /:id ───────────────────────────────────────────────────────
describe('DELETE /api/rejection-templates/:id — soft delete (RJTPL-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/rejection-templates/${TPL_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when template not found', async () => {
    vi.spyOn(RejectionTemplate, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/rejection-templates/${TPL_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('soft-deletes template and returns 200', async () => {
    const docMock = {
      _id: TPL_ID, name: 'Template', subject: 'Sorry', body: 'Text',
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(RejectionTemplate, 'findOne').mockResolvedValue(docMock);

    const res = await request(buildApp())
      .delete(`/api/rejection-templates/${TPL_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(docMock.save).toHaveBeenCalled();
  });
});

/**
 * Module 15 audit: onboardingTemplates.js route
 *
 * Behaviors proven:
 *   ONTPL-A  GET /                      — 401 no token; 403 candidate; 200 list.
 *   ONTPL-B  POST /                     — 401; 400 no name; 201 created.
 *   ONTPL-C  PATCH /:id                 — 401; 404 not found; 200 updated.
 *   ONTPL-D  DELETE /:id                — 401; 404; 200 deleted.
 *   ONTPL-E  POST /:id/apply/:pbId      — 401; 404 template; 404 pb; 200 applied.
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

const _authModule        = _r('../src/middleware/auth.js');
const User               = _r('../src/models/User.js');
const Organization       = _r('../src/models/Organization.js');
const Tenant             = _r('../src/models/Tenant.js');
const OnboardingTemplate = _r('../src/models/OnboardingTemplate.js');
const PreBoarding        = _r('../src/models/PreBoarding.js');
const logger             = _r('../src/middleware/logger.js');

import onboardingTemplatesRouter from '../src/routes/onboardingTemplates.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const CANDIDATE_ID  = new mongoose.Types.ObjectId().toString();
const TPL_ID        = new mongoose.Types.ObjectId().toString();
const PB_ID         = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin') {
  const id = role === 'candidate' ? CANDIDATE_ID : ADMIN_ID;
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
  app.use('/api/onboarding-templates', onboardingTemplatesRouter);
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
    if (String(id) === CANDIDATE_ID) {
      return chainOf({ _id: CANDIDATE_ID, id: CANDIDATE_ID, role: 'candidate',
        tenantId: TENANT_ID, isActive: true, name: 'Cand', email: 'c@test.example',
        toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@test.example',
      toObject: () => ({}) });
  });
});

// ── ONTPL-A: GET / ─────────────────────────────────────────────────────────────
describe('GET /api/onboarding-templates — list (ONTPL-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/onboarding-templates');
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate role', async () => {
    const res = await request(buildApp())
      .get('/api/onboarding-templates')
      .set('Authorization', `Bearer ${makeToken('candidate')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 list for admin', async () => {
    vi.spyOn(OnboardingTemplate, 'find').mockReturnValue(chainOf([
      { _id: TPL_ID, name: 'Standard', tasks: [], isDefault: false },
    ]));

    const res = await request(buildApp())
      .get('/api/onboarding-templates')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.templates)).toBe(true);
    expect(res.body.templates).toHaveLength(1);
  });
});

// ── ONTPL-B: POST / ────────────────────────────────────────────────────────────
describe('POST /api/onboarding-templates — create template (ONTPL-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/onboarding-templates').send({ name: 'T' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(buildApp())
      .post('/api/onboarding-templates')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/name required/i);
  });

  it('creates template and returns 201', async () => {
    vi.spyOn(OnboardingTemplate, 'updateMany').mockResolvedValue({});
    vi.spyOn(OnboardingTemplate, 'create').mockResolvedValue({
      _id: TPL_ID, name: 'Standard Onboarding', isDefault: false, tasks: [],
    });

    const res = await request(buildApp())
      .post('/api/onboarding-templates')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Standard Onboarding', isDefault: false, tasks: [] });

    expect(res.status).toBe(201);
    expect(res.body.template.name).toBe('Standard Onboarding');
  });
});

// ── ONTPL-C: PATCH /:id ────────────────────────────────────────────────────────
describe('PATCH /api/onboarding-templates/:id — update template (ONTPL-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .patch(`/api/onboarding-templates/${TPL_ID}`)
      .send({ name: 'Updated' });
    expect(res.status).toBe(401);
  });

  it('returns 404 when template not found', async () => {
    vi.spyOn(OnboardingTemplate, 'updateMany').mockResolvedValue({});
    vi.spyOn(OnboardingTemplate, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/onboarding-templates/${TPL_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(404);
  });

  it('updates template and returns 200', async () => {
    vi.spyOn(OnboardingTemplate, 'updateMany').mockResolvedValue({});
    vi.spyOn(OnboardingTemplate, 'findOneAndUpdate').mockResolvedValue({
      _id: TPL_ID, name: 'Updated', tasks: [],
    });

    const res = await request(buildApp())
      .patch(`/api/onboarding-templates/${TPL_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.template.name).toBe('Updated');
  });
});

// ── ONTPL-D: DELETE /:id ───────────────────────────────────────────────────────
describe('DELETE /api/onboarding-templates/:id — soft delete (ONTPL-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/onboarding-templates/${TPL_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when template not found', async () => {
    vi.spyOn(OnboardingTemplate, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/onboarding-templates/${TPL_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('soft-deletes template and returns 200', async () => {
    vi.spyOn(OnboardingTemplate, 'findOneAndUpdate').mockResolvedValue({ _id: TPL_ID });

    const res = await request(buildApp())
      .delete(`/api/onboarding-templates/${TPL_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});

// ── ONTPL-E: POST /:id/apply/:preBoardingId ────────────────────────────────────
describe('POST /api/onboarding-templates/:id/apply/:pbId — apply template (ONTPL-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post(`/api/onboarding-templates/${TPL_ID}/apply/${PB_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when template not found', async () => {
    vi.spyOn(OnboardingTemplate, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .post(`/api/onboarding-templates/${TPL_ID}/apply/${PB_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/template not found/i);
  });

  it('returns 404 when preboarding record not found', async () => {
    vi.spyOn(OnboardingTemplate, 'findOne').mockReturnValue(
      chainOf({ _id: TPL_ID, tasks: [{ title: 'T1', dueDays: 1 }] }),
    );
    vi.spyOn(PreBoarding, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .post(`/api/onboarding-templates/${TPL_ID}/apply/${PB_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/preboarding record not found/i);
  });

  it('applies tasks to preboarding and returns 200', async () => {
    vi.spyOn(OnboardingTemplate, 'findOne').mockReturnValue(
      chainOf({ _id: TPL_ID, tasks: [{ title: 'Submit docs', dueDays: 3, category: 'document', isRequired: true }] }),
    );
    const pbDoc = {
      _id: PB_ID, tasks: [],
      joiningDate: new Date(),
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(PreBoarding, 'findOne').mockResolvedValue(pbDoc);

    const res = await request(buildApp())
      .post(`/api/onboarding-templates/${TPL_ID}/apply/${PB_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/applied/i);
    expect(res.body.taskCount).toBe(1);
  });
});

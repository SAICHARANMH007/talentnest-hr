/**
 * Module 18 audit: interviewKits.js route
 *
 * Behaviors proven:
 *   IKIT-A  GET /       — 401; 200 list for recruiter; 200 list for admin.
 *   IKIT-B  GET /:id    — 401; 404 not found; 200 single kit.
 *   IKIT-C  POST /      — 401; 403 recruiter; 400 no name; 400 no questions; 201 created.
 *   IKIT-D  PUT /:id    — 401; 403 recruiter; 404 not found; 200 updated.
 *   IKIT-E  DELETE /:id — 401; 403 recruiter; 404 not found; 200 deleted.
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
const InterviewKit   = _r('../src/models/InterviewKit.js');
const Job            = _r('../src/models/Job.js');
const logger         = _r('../src/middleware/logger.js');

import interviewKitsRouter from '../src/routes/interviewKits.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID  = new mongoose.Types.ObjectId().toString();
const KIT_ID        = new mongoose.Types.ObjectId().toString();

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

function makeKit(overrides = {}) {
  return {
    _id:               KIT_ID,
    tenantId:          TENANT_ID,
    name:              'Eng Interview',
    questions:         [{ competency: 'Problem Solving', question: 'Tell me about a challenge' }],
    screeningQuestions: [],
    linkedJobIds:      [],
    isDefault:         false,
    deletedAt:         null,
    save:              vi.fn().mockResolvedValue({}),
    populate:          vi.fn().mockResolvedValue({ _id: KIT_ID, name: 'Eng Interview', questions: [], linkedJobIds: [] }),
    ...overrides,
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/interview-kits', interviewKitsRouter);
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
    if (String(id) === RECRUITER_ID) {
      return chainOf({ _id: RECRUITER_ID, id: RECRUITER_ID, role: 'recruiter',
        tenantId: TENANT_ID, isActive: true, name: 'Rec', email: 'rec@t.example',
        toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example',
      toObject: () => ({}) });
  });
});

// ── IKIT-A: GET / ─────────────────────────────────────────────────────────────
describe('GET /api/interview-kits — list kits (IKIT-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/interview-kits');
    expect(res.status).toBe(401);
  });

  it('returns 200 kit list for recruiter', async () => {
    vi.spyOn(InterviewKit, 'find').mockReturnValue(chainOf([
      { _id: KIT_ID, name: 'Eng Interview', questions: [], linkedJobIds: [] },
    ]));

    const res = await request(buildApp())
      .get('/api/interview-kits')
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it('returns 200 kit list for admin', async () => {
    vi.spyOn(InterviewKit, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/interview-kits')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── IKIT-B: GET /:id ──────────────────────────────────────────────────────────
describe('GET /api/interview-kits/:id — single kit (IKIT-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/interview-kits/${KIT_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when kit not found', async () => {
    vi.spyOn(InterviewKit, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get(`/api/interview-kits/${KIT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 200 with kit data', async () => {
    vi.spyOn(InterviewKit, 'findOne').mockReturnValue(chainOf(
      { _id: KIT_ID, name: 'Eng Interview', questions: [], linkedJobIds: [] },
    ));

    const res = await request(buildApp())
      .get(`/api/interview-kits/${KIT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(KIT_ID);
  });
});

// ── IKIT-C: POST / ────────────────────────────────────────────────────────────
describe('POST /api/interview-kits — create kit (IKIT-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/interview-kits').send({ name: 'X' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for recruiter role', async () => {
    const res = await request(buildApp())
      .post('/api/interview-kits')
      .set('Authorization', `Bearer ${makeToken('recruiter')}`)
      .send({ name: 'X', questions: [{ competency: 'C', question: 'Q' }] });
    expect(res.status).toBe(403);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(buildApp())
      .post('/api/interview-kits')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ questions: [{ competency: 'C', question: 'Q' }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('returns 400 when questions array is empty', async () => {
    const res = await request(buildApp())
      .post('/api/interview-kits')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'My Kit', questions: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/question/i);
  });

  it('creates kit and returns 201', async () => {
    vi.spyOn(Job, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(InterviewKit, 'updateMany').mockResolvedValue({});
    vi.spyOn(InterviewKit, 'create').mockResolvedValue(makeKit());

    const res = await request(buildApp())
      .post('/api/interview-kits')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({
        name:      'Eng Interview',
        questions: [{ competency: 'Problem Solving', question: 'Tell me about a challenge' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ── IKIT-D: PUT /:id ──────────────────────────────────────────────────────────
describe('PUT /api/interview-kits/:id — update kit (IKIT-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).put(`/api/interview-kits/${KIT_ID}`).send({ name: 'Updated' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for recruiter role', async () => {
    const res = await request(buildApp())
      .put(`/api/interview-kits/${KIT_ID}`)
      .set('Authorization', `Bearer ${makeToken('recruiter')}`)
      .send({ name: 'Updated' });
    expect(res.status).toBe(403);
  });

  it('returns 404 when kit not found', async () => {
    vi.spyOn(InterviewKit, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .put(`/api/interview-kits/${KIT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('updates kit and returns 200', async () => {
    vi.spyOn(InterviewKit, 'findOne').mockResolvedValue(makeKit());
    vi.spyOn(Job, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(InterviewKit, 'updateMany').mockResolvedValue({});

    const res = await request(buildApp())
      .put(`/api/interview-kits/${KIT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Updated Kit' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── IKIT-E: DELETE /:id ───────────────────────────────────────────────────────
describe('DELETE /api/interview-kits/:id — soft delete (IKIT-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/interview-kits/${KIT_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for recruiter role', async () => {
    const res = await request(buildApp())
      .delete(`/api/interview-kits/${KIT_ID}`)
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 when kit not found', async () => {
    vi.spyOn(InterviewKit, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/interview-kits/${KIT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('soft-deletes kit and returns 200', async () => {
    vi.spyOn(InterviewKit, 'findOne').mockResolvedValue(makeKit());
    vi.spyOn(Job, 'updateMany').mockResolvedValue({});

    const res = await request(buildApp())
      .delete(`/api/interview-kits/${KIT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/deleted/i);
  });
});

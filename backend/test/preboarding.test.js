/**
 * Module 10 audit: preboarding.js route
 *
 * Behaviors proven:
 *   PREBOARD-A  GET /                   — 401 no token; 403 candidate; 200 admin list.
 *   PREBOARD-B  GET /mine               — 401 no token; 200 own records.
 *   PREBOARD-C  GET /:id                — 401 no token; 404 not found; 200 admin.
 *   PREBOARD-D  PATCH /:id              — 401 no token; 403 candidate; 404 not found;
 *                                         200 admin update.
 *   PREBOARD-E  PATCH /:id/candidate-confirm — 401 no token; 404 not found; 200 confirmed.
 *   PREBOARD-F  POST /start             — 401 no token; 403 candidate; 400 no appId;
 *                                         404 app not found; 200 created.
 *   PREBOARD-G  POST /:id/tasks         — 401 no token; 400 no title; 404 not found;
 *                                         200 task added.
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

vi.mock('../src/services/webhookService', () => ({
  fireWebhooks: vi.fn().mockResolvedValue({}),
}));

vi.mock('../src/utils/email', () => ({
  sendEmailWithRetry: vi.fn().mockResolvedValue({}),
}));

// ── CJS references ────────────────────────────────────────────────────────────
const _r = createRequire(import.meta.url);

const _authModule  = _r('../src/middleware/auth.js');
const User         = _r('../src/models/User.js');
const Organization = _r('../src/models/Organization.js');
const Tenant       = _r('../src/models/Tenant.js');
const PreBoarding  = _r('../src/models/PreBoarding.js');
const Application  = _r('../src/models/Application.js');
const Candidate    = _r('../src/models/Candidate.js');
const logger       = _r('../src/middleware/logger.js');

import preboardingRouter from '../src/routes/preboarding.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const CANDIDATE_ID  = new mongoose.Types.ObjectId().toString();
const PB_ID         = new mongoose.Types.ObjectId().toString();
const APP_ID        = new mongoose.Types.ObjectId().toString();

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(role = 'admin', opts = {}) {
  let defaultId = ADMIN_ID;
  if (role === 'candidate') defaultId = CANDIDATE_ID;
  return jwt.sign(
    { userId: opts.id ?? defaultId, role, tenantId: opts.tenantId ?? TENANT_ID },
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

function makePB(overrides = {}) {
  return {
    _id: PB_ID,
    id: PB_ID,
    tenantId: TENANT_ID,
    candidateId: CANDIDATE_ID,
    applicationId: APP_ID,
    candidateName: 'John Doe',
    candidateEmail: 'john@test.example',
    designation: 'Engineer',
    department: 'Engineering',
    status: 'pending',
    tasks: [],
    ...overrides,
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/preboarding', preboardingRouter);
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  });
  return app;
}

// ── Per-test setup ─────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  _authModule.clearAllUserAuthCache();

  vi.spyOn(logger, 'info').mockImplementation(() => {});
  vi.spyOn(logger, 'error').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
  vi.spyOn(logger, 'audit').mockImplementation(() => {});

  // tenantGuard
  vi.spyOn(Organization, 'findById').mockReturnValue(chainOf({
    _id: TENANT_ID, name: 'Test Org', status: 'active', type: 'org',
    subscriptionStatus: 'active', isStaffingAgency: false,
  }));
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));

  // Auth
  vi.spyOn(User, 'findById').mockImplementation((id) => {
    const s = String(id);
    if (s === CANDIDATE_ID) {
      return chainOf({ _id: CANDIDATE_ID, id: CANDIDATE_ID, role: 'candidate',
        tenantId: TENANT_ID, isActive: true, name: 'Cand', email: 'john@test.example',
        toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'admin@test.example',
      toObject: () => ({}) });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/preboarding — admin list (PREBOARD-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/preboarding');
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate role', async () => {
    const res = await request(buildApp())
      .get('/api/preboarding')
      .set('Authorization', `Bearer ${makeToken('candidate')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with paginated list for admin', async () => {
    vi.spyOn(PreBoarding, 'find').mockReturnValue(chainOf([makePB()]));
    vi.spyOn(PreBoarding, 'countDocuments').mockResolvedValue(1);

    const res = await request(buildApp())
      .get('/api/preboarding')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/preboarding/mine — candidate own records (PREBOARD-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/preboarding/mine');
    expect(res.status).toBe(401);
  });

  it('returns 200 with own pre-boarding records', async () => {
    vi.spyOn(PreBoarding, 'find').mockReturnValue(chainOf([makePB()]));

    const res = await request(buildApp())
      .get('/api/preboarding/mine')
      .set('Authorization', `Bearer ${makeToken('candidate')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/preboarding/:id — single record (PREBOARD-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/preboarding/${PB_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when record not found', async () => {
    vi.spyOn(PreBoarding, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get(`/api/preboarding/${PB_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('admin can fetch own-tenant preboarding record', async () => {
    vi.spyOn(PreBoarding, 'findOne').mockReturnValue(chainOf(makePB()));

    const res = await request(buildApp())
      .get(`/api/preboarding/${PB_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.candidateName).toBe('John Doe');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/preboarding/:id — admin update (PREBOARD-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .patch(`/api/preboarding/${PB_ID}`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate role', async () => {
    const res = await request(buildApp())
      .patch(`/api/preboarding/${PB_ID}`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(403);
  });

  it('returns 404 when record not found', async () => {
    vi.spyOn(PreBoarding, 'findOneAndUpdate').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .patch(`/api/preboarding/${PB_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(404);
  });

  it('admin can update status and notes', async () => {
    vi.spyOn(PreBoarding, 'findOneAndUpdate').mockReturnValue(chainOf(makePB({ status: 'in_progress', notes: 'All good' })));

    const res = await request(buildApp())
      .patch(`/api/preboarding/${PB_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ status: 'in_progress', notes: 'All good' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('in_progress');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/preboarding/:id/candidate-confirm — confirm joining (PREBOARD-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .patch(`/api/preboarding/${PB_ID}/candidate-confirm`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when record not found', async () => {
    vi.spyOn(PreBoarding, 'findOneAndUpdate').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .patch(`/api/preboarding/${PB_ID}/candidate-confirm`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`);

    expect(res.status).toBe(404);
  });

  it('candidate can confirm joining', async () => {
    vi.spyOn(PreBoarding, 'findOneAndUpdate').mockReturnValue(chainOf(makePB({ joiningConfirmed: true })));

    const res = await request(buildApp())
      .patch(`/api/preboarding/${PB_ID}/candidate-confirm`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.joiningConfirmed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/preboarding/start — manually start preboarding (PREBOARD-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post('/api/preboarding/start')
      .send({ applicationId: APP_ID });
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate role', async () => {
    const res = await request(buildApp())
      .post('/api/preboarding/start')
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ applicationId: APP_ID });
    expect(res.status).toBe(403);
  });

  it('returns 400 when applicationId is missing', async () => {
    const res = await request(buildApp())
      .post('/api/preboarding/start')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/applicationId/i);
  });

  it('returns 404 when application not found', async () => {
    vi.spyOn(Application, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .post('/api/preboarding/start')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ applicationId: APP_ID });

    expect(res.status).toBe(404);
  });

  it('admin can start pre-boarding for a hired candidate', async () => {
    const appDoc = {
      _id: APP_ID, candidateId: { _id: CANDIDATE_ID, name: 'John', email: 'john@test.example' },
      jobId: { _id: 'job1', title: 'Engineer', department: 'Eng' },
      candidateName: 'John', tenantId: TENANT_ID,
    };
    vi.spyOn(Application, 'findOne').mockReturnValue(chainOf(appDoc));
    vi.spyOn(PreBoarding, 'findOne').mockResolvedValue(null); // no existing record
    const pbDoc = {
      ...makePB(),
      toObject: () => makePB(),
    };
    vi.spyOn(PreBoarding, 'create').mockResolvedValue(pbDoc);

    const res = await request(buildApp())
      .post('/api/preboarding/start')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ applicationId: APP_ID });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/preboarding/:id/tasks — add custom task (PREBOARD-G)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post(`/api/preboarding/${PB_ID}/tasks`)
      .send({ title: 'Task 1' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(buildApp())
      .post(`/api/preboarding/${PB_ID}/tasks`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('returns 404 when preboarding record not found', async () => {
    vi.spyOn(PreBoarding, 'findOneAndUpdate').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .post(`/api/preboarding/${PB_ID}/tasks`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ title: 'Submit passport' });

    expect(res.status).toBe(404);
  });

  it('admin can add a custom task', async () => {
    const withTask = makePB({ tasks: [{ _id: 't1', title: 'Submit passport', category: 'document', isRequired: true }] });
    vi.spyOn(PreBoarding, 'findOneAndUpdate').mockReturnValue(chainOf(withTask));

    const res = await request(buildApp())
      .post(`/api/preboarding/${PB_ID}/tasks`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ title: 'Submit passport', category: 'document' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tasks).toHaveLength(1);
  });
});

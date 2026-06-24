/**
 * Module audit: candidateRequests.js route
 *
 * Behaviors proven:
 *   CREQ-A  GET /   — 401; 403 candidate; 200 list.
 *   CREQ-B  GET /:id — 401; 404; 200 single.
 *   CREQ-C  POST /  — 401; 400 missing roleTitle; 201 created.
 *   CREQ-D  PATCH /:id — 401; 403 candidate; 404; 200 updated.
 *   CREQ-E  DELETE /:id — 401; 403 recruiter; 404; 200 deleted.
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

vi.mock('../src/utils/email', () => ({
  sendEmailWithRetry: vi.fn().mockResolvedValue({}),
}));

const _r               = createRequire(import.meta.url);
const _authModule      = _r('../src/middleware/auth.js');
const User             = _r('../src/models/User.js');
const Organization     = _r('../src/models/Organization.js');
const Tenant           = _r('../src/models/Tenant.js');
const CandidateRequest = _r('../src/models/CandidateRequest.js');
const logger           = _r('../src/middleware/logger.js');

import candidateRequestsRouter from '../src/routes/candidateRequests.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const CAND_ID       = new mongoose.Types.ObjectId().toString();
const REC_ID        = new mongoose.Types.ObjectId().toString();
const REQUEST_ID    = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin') {
  const userIds = { admin: ADMIN_ID, candidate: CAND_ID, recruiter: REC_ID };
  const userId = userIds[role] || ADMIN_ID;
  return jwt.sign({ userId, role, tenantId: TENANT_ID }, JWT_SECRET, { expiresIn: '1h' });
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
  app.use('/api/candidate-requests', candidateRequestsRouter);
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
    if (String(id) === CAND_ID) {
      return chainOf({ _id: CAND_ID, id: CAND_ID, role: 'candidate',
        tenantId: TENANT_ID, isActive: true, name: 'Cand', email: 'c@t.example' });
    }
    if (String(id) === REC_ID) {
      return chainOf({ _id: REC_ID, id: REC_ID, role: 'recruiter',
        tenantId: TENANT_ID, isActive: true, name: 'Rec', email: 'r@t.example' });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example' });
  });
  vi.spyOn(Organization, 'findById').mockReturnValue(chainOf({
    _id: TENANT_ID, name: 'Org', status: 'active', type: 'org',
    subscriptionStatus: 'active', isStaffingAgency: false,
  }));
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));
});

// ── CREQ-A: GET / ─────────────────────────────────────────────────────────────
describe('GET /api/candidate-requests — list requests (CREQ-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/candidate-requests');
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate', async () => {
    const res = await request(buildApp())
      .get('/api/candidate-requests')
      .set('Authorization', `Bearer ${makeToken('candidate')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with list for admin', async () => {
    vi.spyOn(CandidateRequest, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(CandidateRequest, 'countDocuments').mockResolvedValue(0);

    const res = await request(buildApp())
      .get('/api/candidate-requests')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── CREQ-B: GET /:id ──────────────────────────────────────────────────────────
describe('GET /api/candidate-requests/:id — single request (CREQ-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/candidate-requests/${REQUEST_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when not found', async () => {
    vi.spyOn(CandidateRequest, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get(`/api/candidate-requests/${REQUEST_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 when found', async () => {
    vi.spyOn(CandidateRequest, 'findOne').mockReturnValue(chainOf({
      _id: REQUEST_ID, roleTitle: 'Developer', status: 'pending', tenantId: TENANT_ID,
    }));

    const res = await request(buildApp())
      .get(`/api/candidate-requests/${REQUEST_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── CREQ-C: POST / ────────────────────────────────────────────────────────────
describe('POST /api/candidate-requests — create request (CREQ-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/candidate-requests').send({ roleTitle: 'Dev' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when roleTitle missing', async () => {
    const res = await request(buildApp())
      .post('/api/candidate-requests')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ urgency: 'high' });
    expect(res.status).toBe(400);
  });

  it('returns 201 when request created', async () => {
    const reqDoc = {
      _id: REQUEST_ID, roleTitle: 'Developer', status: 'pending',
      toObject: () => ({ _id: REQUEST_ID, roleTitle: 'Developer' }),
    };
    vi.spyOn(CandidateRequest, 'create').mockResolvedValue(reqDoc);

    const res = await request(buildApp())
      .post('/api/candidate-requests')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ roleTitle: 'Developer', requirements: 'Node.js', urgency: 'high' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ── CREQ-D: PATCH /:id ────────────────────────────────────────────────────────
describe('PATCH /api/candidate-requests/:id — update request (CREQ-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).patch(`/api/candidate-requests/${REQUEST_ID}`).send({ status: 'fulfilled' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate', async () => {
    const res = await request(buildApp())
      .patch(`/api/candidate-requests/${REQUEST_ID}`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ status: 'fulfilled' });
    expect(res.status).toBe(403);
  });

  it('returns 404 when request not found', async () => {
    vi.spyOn(CandidateRequest, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .patch(`/api/candidate-requests/${REQUEST_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ status: 'fulfilled' });
    expect(res.status).toBe(404);
  });
});

// ── CREQ-E: DELETE /:id ───────────────────────────────────────────────────────
describe('DELETE /api/candidate-requests/:id — delete request (CREQ-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/candidate-requests/${REQUEST_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for recruiter', async () => {
    const res = await request(buildApp())
      .delete(`/api/candidate-requests/${REQUEST_ID}`)
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);
    expect(res.status).toBe(403);
  });
});

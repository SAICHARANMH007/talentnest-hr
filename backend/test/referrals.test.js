/**
 * Module audit: referrals.js route
 *
 * Behaviors proven:
 *   REF-A  GET /              — 401; 403 candidate; 200 list.
 *   REF-B  GET /token/:token  — 200 (public, no auth).
 *   REF-C  POST /generate     — 401; 404 job not found; 201 link created.
 *   REF-D  GET /my            — 401; 200 my referrals.
 *   REF-E  POST /track        — 401; 200 tracked.
 *   REF-F  PATCH /:id/mark-hired — 401; 404; 200 hired.
 *   REF-G  GET /stats         — 401; 200 stats.
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

const _r           = createRequire(import.meta.url);
const _authModule  = _r('../src/middleware/auth.js');
const User         = _r('../src/models/User.js');
const Organization = _r('../src/models/Organization.js');
const Tenant       = _r('../src/models/Tenant.js');
const Referral     = _r('../src/models/Referral.js');
const Job          = _r('../src/models/Job.js');
const logger       = _r('../src/middleware/logger.js');

import referralsRouter from '../src/routes/referrals.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const CAND_ID       = new mongoose.Types.ObjectId().toString();
const JOB_ID        = new mongoose.Types.ObjectId().toString();
const REF_ID        = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin') {
  const userId = role === 'candidate' ? CAND_ID : ADMIN_ID;
  return jwt.sign({ userId, role, tenantId: TENANT_ID }, JWT_SECRET, { expiresIn: '1h' });
}

function chainOf(value) {
  const q = {
    select:   vi.fn().mockReturnThis(),
    sort:     vi.fn().mockReturnThis(),
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
  app.use('/api/referrals', referralsRouter);
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
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example' });
  });

  vi.spyOn(Organization, 'findById').mockReturnValue(chainOf({
    _id: TENANT_ID, name: 'Org', status: 'active', type: 'org',
    subscriptionStatus: 'active', isStaffingAgency: false,
  }));
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));
});

// ── REF-A: GET / ──────────────────────────────────────────────────────────────
describe('GET /api/referrals — list referrals (REF-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/referrals');
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate role', async () => {
    const res = await request(buildApp())
      .get('/api/referrals')
      .set('Authorization', `Bearer ${makeToken('candidate')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 list for admin', async () => {
    vi.spyOn(Referral, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/referrals')
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── REF-B: GET /token/:token ──────────────────────────────────────────────────
describe('GET /api/referrals/token/:token — public referral info (REF-B)', () => {
  it('returns 200 with null when token not found', async () => {
    vi.spyOn(Referral, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp()).get('/api/referrals/token/unknown-token');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeNull();
  });

  it('returns 200 with referral info when found', async () => {
    vi.spyOn(Referral, 'findOne').mockReturnValue(chainOf({
      referredByName: 'Bob', referredByEmail: 'bob@test.example',
      jobId: { title: 'Dev', referralReward: 5000 },
      rewardAmount: 5000, status: 'pending',
    }));

    const res = await request(buildApp()).get('/api/referrals/token/valid-token');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.referredByName).toBe('Bob');
  });
});

// ── REF-C: POST /generate ─────────────────────────────────────────────────────
describe('POST /api/referrals/generate — generate referral link (REF-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/referrals/generate').send({ jobId: JOB_ID });
    expect(res.status).toBe(401);
  });

  it('returns 400 when jobId missing', async () => {
    const res = await request(buildApp())
      .post('/api/referrals/generate')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 when job not found', async () => {
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .post('/api/referrals/generate')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ jobId: JOB_ID });
    expect(res.status).toBe(404);
  });

  it('returns 201 with referral link', async () => {
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf({ _id: JOB_ID, tenantId: TENANT_ID, title: 'Dev', referralReward: 5000, careerPageSlug: 'dev' }));
    const refDoc = { _id: REF_ID, referralLinkToken: 'tok123', toJSON: () => ({ _id: REF_ID, referralLinkToken: 'tok123' }) };
    vi.spyOn(Referral, 'create').mockResolvedValue(refDoc);

    const res = await request(buildApp())
      .post('/api/referrals/generate')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ jobId: JOB_ID });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('link');
  });
});

// ── REF-D: GET /my ────────────────────────────────────────────────────────────
describe('GET /api/referrals/my — my referrals (REF-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/referrals/my');
    expect(res.status).toBe(401);
  });

  it('returns 200 my referrals', async () => {
    vi.spyOn(Referral, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/referrals/my')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── REF-E: POST /track ────────────────────────────────────────────────────────
describe('POST /api/referrals/track — track referral (REF-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/referrals/track').send({ token: 'tok' });
    expect(res.status).toBe(401);
  });

  it('returns 200 on track', async () => {
    vi.spyOn(Referral, 'findOneAndUpdate').mockResolvedValue({});

    const res = await request(buildApp())
      .post('/api/referrals/track')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ token: 'tok123', candidateId: CAND_ID });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── REF-F: PATCH /:id/mark-hired ─────────────────────────────────────────────
describe('PATCH /api/referrals/:id/mark-hired — mark hired (REF-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).patch(`/api/referrals/${REF_ID}/mark-hired`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when referral not found', async () => {
    vi.spyOn(Referral, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/referrals/${REF_ID}/mark-hired`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 when marked hired', async () => {
    vi.spyOn(Referral, 'findOneAndUpdate').mockResolvedValue({ _id: REF_ID, status: 'hired', referredByEmail: null });

    const res = await request(buildApp())
      .patch(`/api/referrals/${REF_ID}/mark-hired`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── REF-G: GET /stats ─────────────────────────────────────────────────────────
describe('GET /api/referrals/stats — stats (REF-G)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/referrals/stats');
    expect(res.status).toBe(401);
  });

  it('returns 200 with stats for admin', async () => {
    vi.spyOn(Referral, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(Referral, 'aggregate').mockResolvedValue([]);

    const res = await request(buildApp())
      .get('/api/referrals/stats')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total');
  });
});

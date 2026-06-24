/**
 * Test suite for /api/nps (src/routes/nps.js)
 *
 * Behaviors proven:
 *   NPS-A  GET  /respond/:token   — 302 to ?status=invalid; 302 to ?status=success
 *   NPS-B  GET  /survey/:token    — 400 invalid token; 200 with survey data
 *   NPS-C  POST /survey/:token    — 400 bad token; 200 on success
 *   NPS-D  POST /seed             — 401 no token; 200 seeded
 *   NPS-E  GET  /stats            — 401 no token; 200 with stats data
 */

// Set JWT_SECRET before any module that reads it at load time
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

vi.mock('../src/socket', () => ({
  getIO: vi.fn().mockReturnValue({}),
}));

vi.mock('../src/socket/platformSocket', () => ({
  emitToTenant: vi.fn(),
}));

// ── CJS references ────────────────────────────────────────────────────────────
const _r = createRequire(import.meta.url);

const _authModule  = _r('../src/middleware/auth.js');
const User         = _r('../src/models/User.js');
const Organization = _r('../src/models/Organization.js');
const Tenant       = _r('../src/models/Tenant.js');
const CandidateNPS = _r('../src/models/CandidateNPS.js');
const Candidate    = _r('../src/models/Candidate.js');
const Job          = _r('../src/models/Job.js');
const Application  = _r('../src/models/Application.js');
const logger       = _r('../src/middleware/logger.js');

import npsRouter from '../src/routes/nps.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const NPS_ID        = new mongoose.Types.ObjectId().toString();
const JOB_ID        = new mongoose.Types.ObjectId().toString();
const APP_ID        = new mongoose.Types.ObjectId().toString();
const CAND_ID       = new mongoose.Types.ObjectId().toString();

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(role = 'admin', opts = {}) {
  return jwt.sign(
    { userId: opts.id ?? ADMIN_ID, role, tenantId: opts.tenantId ?? TENANT_ID },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

function makeSurveyToken(payload = {}) {
  return jwt.sign(
    { npsId: NPS_ID, tenantId: TENANT_ID, ...payload },
    JWT_SECRET,
    { expiresIn: '7d' },
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
    then:  (r, j) => Promise.resolve(value).then(r, j),
    catch: (j)    => Promise.resolve(value).catch(j),
  };
  return q;
}

function makeNpsDoc(overrides = {}) {
  return {
    _id:               NPS_ID,
    id:                NPS_ID,
    tenantId:          TENANT_ID,
    applicationId:     APP_ID,
    candidateId:       CAND_ID,
    jobId:             { _id: JOB_ID, title: 'Engineer', company: 'TestCo' },
    score:             null,
    wouldRecommend:    null,
    feedbackText:      '',
    applicationOutcome: 'hired',
    surveyToken:       'some-token',
    respondedAt:       null,
    ...overrides,
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/nps', npsRouter);
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

  // tenantGuard mocks (used by /seed and /stats)
  vi.spyOn(Organization, 'findById').mockReturnValue(
    chainOf({
      _id:                TENANT_ID,
      name:               'Test Org',
      status:             'active',
      type:               'org',
      subscriptionStatus: 'active',
      isStaffingAgency:   false,
    }),
  );
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));

  // Auth
  vi.spyOn(User, 'findById').mockReturnValue(
    chainOf({
      _id:      ADMIN_ID,
      id:       ADMIN_ID,
      role:     'admin',
      tenantId: TENANT_ID,
      isActive: true,
      name:     'Test Admin',
      email:    'admin@test.example',
      settings: {},
      toObject: () => ({}),
    }),
  );
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/nps/respond/:token — NPS email link (NPS-A)', () => {
  it('redirects to ?status=invalid when token is invalid', async () => {
    const res = await request(buildApp())
      .get('/api/nps/respond/not-a-valid-jwt')
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/status=invalid/);
  });

  it('redirects to ?status=invalid when NPS record not found', async () => {
    const token = makeSurveyToken();
    vi.spyOn(CandidateNPS, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .get(`/api/nps/respond/${token}`)
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/status=invalid/);
  });

  it('redirects to ?status=already_submitted when already responded', async () => {
    const token = makeSurveyToken();
    vi.spyOn(CandidateNPS, 'findOne').mockResolvedValue(
      makeNpsDoc({ surveyToken: token, respondedAt: new Date() }),
    );

    const res = await request(buildApp())
      .get(`/api/nps/respond/${token}?score=9`)
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/status=already_submitted/);
  });

  it('redirects to ?status=success on valid token and unresponded NPS', async () => {
    const token = makeSurveyToken();
    vi.spyOn(CandidateNPS, 'findOne').mockResolvedValue(
      makeNpsDoc({ surveyToken: token, respondedAt: null }),
    );
    vi.spyOn(CandidateNPS, 'findByIdAndUpdate').mockResolvedValue({});

    const res = await request(buildApp())
      .get(`/api/nps/respond/${token}?score=9`)
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/status=success/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/nps/survey/:token — web survey form data (NPS-B)', () => {
  it('returns 400 for invalid or expired token', async () => {
    const res = await request(buildApp()).get('/api/nps/survey/bad-token');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('returns 200 with survey data for valid token', async () => {
    const token = makeSurveyToken();
    vi.spyOn(CandidateNPS, 'findOne').mockReturnValue(
      chainOf(makeNpsDoc({ surveyToken: token, respondedAt: null })),
    );

    const res = await request(buildApp()).get(`/api/nps/survey/${token}`);

    expect(res.status).toBe(200);
    expect(res.body.alreadySubmitted).toBe(false);
    expect(res.body).toHaveProperty('jobTitle');
    expect(res.body).toHaveProperty('company');
    expect(res.body).toHaveProperty('outcome');
  });

  it('returns 200 with alreadySubmitted:true if respondedAt is set', async () => {
    const token = makeSurveyToken();
    vi.spyOn(CandidateNPS, 'findOne').mockReturnValue(
      chainOf(makeNpsDoc({ surveyToken: token, respondedAt: new Date() })),
    );

    const res = await request(buildApp()).get(`/api/nps/survey/${token}`);

    expect(res.status).toBe(200);
    expect(res.body.alreadySubmitted).toBe(true);
  });

  it('returns 404 when NPS record not found', async () => {
    const token = makeSurveyToken();
    vi.spyOn(CandidateNPS, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp()).get(`/api/nps/survey/${token}`);

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/nps/survey/:token — submit survey (NPS-C)', () => {
  it('returns 400 for bad/expired token', async () => {
    const res = await request(buildApp())
      .post('/api/nps/survey/not-a-jwt')
      .send({ score: 9, wouldRecommend: true });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('returns 404 when NPS record is not found', async () => {
    const token = makeSurveyToken();
    vi.spyOn(CandidateNPS, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .post(`/api/nps/survey/${token}`)
      .send({ score: 8, wouldRecommend: true });

    expect(res.status).toBe(404);
  });

  it('returns 409 when survey already submitted', async () => {
    const token = makeSurveyToken();
    vi.spyOn(CandidateNPS, 'findOne').mockResolvedValue(
      makeNpsDoc({ surveyToken: token, respondedAt: new Date() }),
    );

    const res = await request(buildApp())
      .post(`/api/nps/survey/${token}`)
      .send({ score: 8, wouldRecommend: true });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already submitted/i);
  });

  it('returns 200 on successful survey submission', async () => {
    const token = makeSurveyToken();
    vi.spyOn(CandidateNPS, 'findOne').mockResolvedValue(
      makeNpsDoc({ surveyToken: token, respondedAt: null }),
    );
    vi.spyOn(CandidateNPS, 'findByIdAndUpdate').mockResolvedValue(
      makeNpsDoc({ score: 9, respondedAt: new Date() }),
    );

    const res = await request(buildApp())
      .post(`/api/nps/survey/${token}`)
      .send({ score: 9, wouldRecommend: true, feedbackText: 'Great experience!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/nps/seed — seed NPS data (NPS-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/nps/seed');
    expect(res.status).toBe(401);
  });

  it('returns 200 and seeds NPS records for tenant admin', async () => {
    vi.spyOn(CandidateNPS, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(CandidateNPS, 'insertMany').mockResolvedValue([]);
    vi.spyOn(Candidate, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(Job, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(Application, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .post('/api/nps/seed')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 200 with existing message when data already exists', async () => {
    vi.spyOn(CandidateNPS, 'countDocuments').mockResolvedValue(15);

    const res = await request(buildApp())
      .post('/api/nps/seed')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/already exists/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/nps/stats — NPS analytics dashboard (NPS-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/nps/stats');
    expect(res.status).toBe(401);
  });

  it('returns 200 with stats data structure', async () => {
    const mockResponses = [
      { score: 9, wouldRecommend: true,  feedbackText: 'Great',  applicationOutcome: 'hired',    respondedAt: new Date() },
      { score: 5, wouldRecommend: false, feedbackText: 'Okay',   applicationOutcome: 'rejected', respondedAt: new Date() },
      { score: 10, wouldRecommend: true, feedbackText: 'Loved it', applicationOutcome: 'hired',  respondedAt: new Date() },
    ];

    vi.spyOn(CandidateNPS, 'countDocuments').mockResolvedValue(5);
    vi.spyOn(CandidateNPS, 'find').mockReturnValue(chainOf(mockResponses));

    const res = await request(buildApp())
      .get('/api/nps/stats')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalResponses');
    expect(res.body.data).toHaveProperty('totalSent');
    expect(res.body.data).toHaveProperty('npsScore');
    expect(res.body.data).toHaveProperty('promoters');
    expect(res.body.data).toHaveProperty('passives');
    expect(res.body.data).toHaveProperty('detractors');
    expect(res.body.data).toHaveProperty('recentFeedback');
  });

  it('returns 200 with empty stats when no responses', async () => {
    vi.spyOn(CandidateNPS, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(CandidateNPS, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/nps/stats')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalResponses).toBe(0);
    expect(res.body.data.npsScore).toBeNull();
  });
});

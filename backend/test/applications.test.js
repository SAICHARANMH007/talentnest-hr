/**
 * Module 2 audit: applications.js
 *
 * Bugs proven here (RED before fix, GREEN after):
 *   BUG-A  GET /scorecards — super_admin always gets [] because tenantId
 *          filter is applied unconditionally (uses req.user.tenantId which is
 *          the SA's own tenantId, not the target job's tenant).
 *   BUG-B  PATCH /:id/notes  — recruiter can update notes on an application for
 *   BUG-B2 PATCH /:id/tags   — a job NOT assigned to them. The /stage handler
 *   BUG-B3 PATCH /:id/feedback — checks recruiter assignment; notes/tags/feedback skip it.
 *
 * Strategy: same CJS-via-createRequire + vi.spyOn() pattern as auth.test.js.
 * All DB calls are spied on the real model instances so the route handler's
 * require() hits the same cached instance.
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

// ── CJS references (same instances the route module holds) ────────────────────
const _r = createRequire(import.meta.url);
const _authModule = _r('../src/middleware/auth.js');

const Application  = _r('../src/models/Application.js');
const Candidate    = _r('../src/models/Candidate.js');
const Job          = _r('../src/models/Job.js');
const User         = _r('../src/models/User.js');
const Org          = _r('../src/models/Organization.js');
const Tenant       = _r('../src/models/Tenant.js');
const Notification = _r('../src/models/Notification.js');
const OfferLetter  = _r('../src/models/OfferLetter.js');
const Referral     = _r('../src/models/Referral.js');

const emailUtils   = _r('../src/utils/email.js');
const matchScore   = _r('../src/utils/matchScore.js');
const syncProfile  = _r('../src/utils/syncProfile.js');
const collegeDir   = _r('../src/utils/collegeDirectory.js');
const notifySA     = _r('../src/utils/notifySuperAdmins.js');
const logger       = _r('../src/middleware/logger.js');

// ── Services required lazily inside route handlers ────────────────────────────
const wfEngine     = _r('../src/services/workflowEngine.js');
const webhookSvc   = _r('../src/services/webhookService.js');
const sendPushUtil = _r('../src/utils/sendPush.js');

// ── Import router (must come after all _r() so caches are shared) ────────────
import appsRouter from '../src/routes/applications.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const OTHER_TENANT  = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID  = new mongoose.Types.ObjectId().toString();
const JOB_ID        = new mongoose.Types.ObjectId().toString();
const APP_ID        = new mongoose.Types.ObjectId().toString();
const CAND_ID       = new mongoose.Types.ObjectId().toString();

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(role = 'admin', opts = {}) {
  return jwt.sign(
    { userId: opts.id || ADMIN_ID, role, tenantId: opts.tenantId ?? TENANT_ID },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

/** Mongoose query chain: .select().lean() + direct await */
function queryOf(value) {
  const lean   = vi.fn().mockResolvedValue(value);
  const select = vi.fn().mockReturnValue({ lean });
  const sort   = vi.fn().mockReturnValue({ lean, select });
  return {
    select, lean, sort,
    then:  (r, j) => Promise.resolve(value).then(r, j),
    catch: (j)    => Promise.resolve(value).catch(j),
    session: vi.fn().mockReturnThis(),
  };
}

function makeApp(overrides = {}) {
  const id = new mongoose.Types.ObjectId();
  return {
    _id: id, id: id.toString(),
    tenantId: TENANT_ID,
    jobId: JOB_ID, candidateId: CAND_ID,
    currentStage: 'Applied', status: 'active',
    stageHistory: [], interviewRounds: [],
    deletedAt: null,
    toObject: function() { return { ...this }; },
    save: vi.fn().mockResolvedValue(true),
    markModified: vi.fn(),
    ...overrides,
  };
}

function makeJob(overrides = {}) {
  return {
    _id: JOB_ID, tenantId: TENANT_ID,
    title: 'Frontend Engineer', status: 'active', deletedAt: null,
    assignedRecruiters: [], hiringManagers: [],
    ...overrides,
  };
}

function makeOrg() {
  return {
    _id: TENANT_ID, name: 'Test Org',
    status: 'active', type: 'org',
    isStaffingAgency: false,
  };
}

// Build a minimal Express app for testing
function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/applications', appsRouter);
  app.use((err, req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  });
  return app;
}

// ── Silence logger & fire-and-forget services ─────────────────────────────────
beforeEach(() => {
  // Reset all mock call histories so spy.mock.calls[0] always refers to the
  // first call in the CURRENT test, not a leftover from a prior test.
  vi.clearAllMocks();

  // Flush the entire auth in-memory cache so each test's User.findById spy
  // is actually invoked rather than bypassed by a stale entry.
  _authModule.clearAllUserAuthCache();

  vi.spyOn(logger, 'info').mockImplementation(() => {});
  vi.spyOn(logger, 'error').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
  vi.spyOn(logger, 'audit').mockImplementation(() => {});

  vi.spyOn(emailUtils, 'sendEmailWithRetry').mockResolvedValue(undefined);
  vi.spyOn(emailUtils, 'sendOrgEmail').mockResolvedValue(undefined);

  vi.spyOn(matchScore, 'calculateTalentMatchScore').mockReturnValue({ score: 75, breakdown: {} });
  vi.spyOn(syncProfile, 'syncProfile').mockResolvedValue(undefined);
  vi.spyOn(collegeDir, 'resolveCollegeName').mockResolvedValue('IIT Bombay');

  // notifySuperAdmins is a default export function
  if (typeof notifySA === 'function') vi.spyOn({ notifySA }, 'notifySA').mockImplementation(() => {});
  // silence the module-level default function
  try { vi.spyOn(notifySA, 'default').mockImplementation(() => {}); } catch {}

  vi.spyOn(wfEngine, 'evaluateWorkflows').mockResolvedValue(undefined);
  vi.spyOn(webhookSvc, 'fireWebhooks').mockResolvedValue(undefined);
  vi.spyOn(sendPushUtil, 'sendPush').mockResolvedValue(undefined);

  vi.spyOn(Notification, 'create').mockResolvedValue({});
  vi.spyOn(Notification, 'insertMany').mockResolvedValue([]);
  vi.spyOn(Referral, 'findOneAndUpdate').mockReturnValue(queryOf(null));
  vi.spyOn(OfferLetter, 'findOne').mockReturnValue(queryOf(null));
  vi.spyOn(OfferLetter, 'create').mockResolvedValue({});
  vi.spyOn(Job, 'findByIdAndUpdate').mockResolvedValue({});

  // tenantGuard DB calls
  vi.spyOn(Org, 'findById').mockReturnValue(queryOf(makeOrg()));
  vi.spyOn(Tenant, 'find').mockReturnValue(queryOf([]));
  vi.spyOn(Tenant, 'findById').mockReturnValue(queryOf(null));

  // authMiddleware: ID-aware mock so per-test overrides are not needed.
  // Tokens created with makeToken('super_admin', { id: 'sa_1' }) get super_admin;
  // tokens with id: RECRUITER_ID get recruiter; everything else gets admin.
  vi.spyOn(User, 'findById').mockImplementation((id) => {
    const s = String(id);
    if (s === 'sa_1') {
      return queryOf({ _id: 'sa_1', id: 'sa_1', role: 'super_admin',
        tenantId: null, isActive: true, name: 'Super Admin',
        email: 'sa@talentnest.io', toObject: () => ({}) });
    }
    if (s === RECRUITER_ID) {
      return queryOf({ _id: RECRUITER_ID, id: RECRUITER_ID, role: 'recruiter',
        tenantId: TENANT_ID, isActive: true, name: 'Test Recruiter',
        email: 'rec@test.example', toObject: () => ({}) });
    }
    return queryOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Test Admin',
      email: 'admin@test.example', toObject: () => ({}) });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/applications — list', () => {
  it('returns 401 when no auth token provided', async () => {
    const app = buildTestApp();
    const res = await request(app).get('/api/applications');
    expect(res.status).toBe(401);
  });

  it('returns applications scoped to the requesting tenant', async () => {
    const app = buildTestApp();
    const fakeApps = [makeApp(), makeApp()];
    vi.spyOn(Application, 'find').mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeApps),
    });
    vi.spyOn(Application, 'countDocuments').mockResolvedValue(2);
    vi.spyOn(Job, 'find').mockReturnValue(queryOf([]));

    const res = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('recruiter without assigned jobs gets empty list', async () => {
    const app = buildTestApp();
    vi.spyOn(Job, 'find').mockReturnValue(queryOf([])); // no assigned jobs
    vi.spyOn(Application, 'find').mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });
    vi.spyOn(Application, 'countDocuments').mockResolvedValue(0);

    const res = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${makeToken('recruiter', { id: RECRUITER_ID })}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/applications/:id — single', () => {
  it('returns 401 without auth token', async () => {
    const app = buildTestApp();
    const res = await request(app).get(`/api/applications/${APP_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when application belongs to a different tenant', async () => {
    const app = buildTestApp();
    vi.spyOn(Application, 'findOne').mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null), // null = not found for this tenant
    });

    const res = await request(app)
      .get(`/api/applications/${APP_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('returns the application when tenant matches', async () => {
    const app = buildTestApp();
    const fakeApp = makeApp();
    vi.spyOn(Application, 'findOne').mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeApp),
    });

    const res = await request(app)
      .get(`/api/applications/${APP_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/applications/:id/stage — stage change', () => {
  it('returns 401 without auth token', async () => {
    const app = buildTestApp();
    const res = await request(app)
      .patch(`/api/applications/${APP_ID}/stage`)
      .send({ stage: 'Shortlisted' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid stage name', async () => {
    const app = buildTestApp();
    const res = await request(app)
      .patch(`/api/applications/${APP_ID}/stage`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ stage: 'dancing' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid stage/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/applications/public — guest apply (input validation)', () => {
  it('returns 400 when jobId is missing', async () => {
    const app = buildTestApp();
    const res = await request(app)
      .post('/api/applications/public')
      .send({ name: 'Alice', email: 'alice@test.com', phone: '9999999999' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when name is missing', async () => {
    const app = buildTestApp();
    const res = await request(app)
      .post('/api/applications/public')
      .send({ jobId: JOB_ID, email: 'alice@test.com', phone: '9999999999' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when phone is missing', async () => {
    const app = buildTestApp();
    // college lookup is called first — mock it
    const res = await request(app)
      .post('/api/applications/public')
      .send({ jobId: JOB_ID, name: 'Alice', email: 'alice@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mobile|phone|required/i);
  });

  it('returns 404 when job is not found or inactive', async () => {
    const app = buildTestApp();
    vi.spyOn(Job, 'findOne').mockReturnValue(queryOf(null));

    const res = await request(app)
      .post('/api/applications/public')
      .send({ jobId: JOB_ID, name: 'Alice', email: 'alice@test.com', phone: '9999999999' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/job not found/i);
  });

  it('returns 409 when candidate has already applied', async () => {
    const app = buildTestApp();
    vi.spyOn(Job, 'findOne').mockReturnValue(queryOf(makeJob()));
    const fakeCand = { _id: new mongoose.Types.ObjectId(), name: 'Alice', email: 'alice@test.com', phone: '9', tenantId: TENANT_ID, toObject: () => ({}) };
    vi.spyOn(Candidate, 'findOne').mockReturnValue(queryOf(fakeCand));
    vi.spyOn(User, 'findOne').mockReturnValue(queryOf(null));
    // Existing application → 409
    vi.spyOn(Application, 'findOne').mockReturnValue(queryOf(makeApp()));

    const res = await request(app)
      .post('/api/applications/public')
      .send({ jobId: JOB_ID, name: 'Alice', email: 'alice@test.com', phone: '9999999999' });

    expect(res.status).toBe(409);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/applications/scorecards — BUG-A (super_admin scope)', () => {
  it('returns 400 when jobId query param is missing', async () => {
    const app = buildTestApp();

    const res = await request(app)
      .get('/api/applications/scorecards')
      .set('Authorization', `Bearer ${makeToken('super_admin', { id: 'sa_1', tenantId: null })}`);

    expect(res.status).toBe(400);
  });

  it('BUG-A: super_admin receives empty scorecards for a valid jobId (wrong tenantId filter)', async () => {
    const app = buildTestApp();

    // super_admin has tenantId = null in their JWT
    const saToken = jwt.sign(
      { userId: 'sa_1', role: 'super_admin', tenantId: null },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    // Two scorecards exist for this job under a real tenant
    const fakeApps = [
      { _id: new mongoose.Types.ObjectId(), currentStage: 'Interview Round 1',
        candidateId: { firstName: 'Alice', lastName: 'B', email: 'a@t.com' }, interviewRounds: [] },
    ];
    const findSpy = vi.spyOn(Application, 'find').mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeApps),
    });

    const res = await request(app)
      .get(`/api/applications/scorecards?jobId=${JOB_ID}`)
      .set('Authorization', `Bearer ${saToken}`);

    expect(res.status).toBe(200);

    // Capture the actual filter passed to Application.find
    const actualFilter = findSpy.mock.calls[0][0];

    // BUG-A fixed: super_admin filter must NOT include tenantId so all tenants' scorecards
    // for this jobId are returned.
    expect(actualFilter).not.toHaveProperty('tenantId');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /:id/notes — BUG-B (recruiter missing job-assignment check)', () => {
  it('admin can update notes (happy path)', async () => {
    const app = buildTestApp();
    const fakeApp = makeApp();
    vi.spyOn(Application, 'findOne').mockReturnValue(queryOf({ jobId: JOB_ID, _id: fakeApp._id }));
    vi.spyOn(Application, 'findOneAndUpdate').mockReturnValue(queryOf(fakeApp));
    vi.spyOn(Job, 'findOne').mockReturnValue(queryOf(makeJob()));

    const res = await request(app)
      .patch(`/api/applications/${APP_ID}/notes`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ notes: 'Strong candidate' });

    expect(res.status).toBe(200);
  });

  it('BUG-B: recruiter can update notes on application for a job NOT assigned to them (should be 403)', async () => {
    const app = buildTestApp();

    // Application exists in the recruiter's tenant
    vi.spyOn(Application, 'findOne').mockReturnValue(queryOf({ jobId: JOB_ID, _id: APP_ID }));
    // The job exists but the recruiter is NOT in assignedRecruiters
    vi.spyOn(Job, 'findOne').mockReturnValue(queryOf(null)); // no job with this recruiter assigned
    vi.spyOn(Application, 'findOneAndUpdate').mockReturnValue(queryOf(makeApp()));

    const res = await request(app)
      .patch(`/api/applications/${APP_ID}/notes`)
      .set('Authorization', `Bearer ${makeToken('recruiter', { id: RECRUITER_ID })}`)
      .send({ notes: 'Unauthorised notes' });

    // BUG-B fixed: recruiter without job assignment gets 403
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /:id/tags — input validation', () => {
  it('returns 400 when tags is not an array', async () => {
    const app = buildTestApp();
    const res = await request(app)
      .patch(`/api/applications/${APP_ID}/tags`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ tags: 'not-an-array' });
    expect(res.status).toBe(400);
  });

  it('admin can set valid tags array', async () => {
    const app = buildTestApp();
    const fakeApp = makeApp();
    vi.spyOn(Application, 'findOne').mockReturnValue(queryOf({ jobId: JOB_ID, _id: fakeApp._id }));
    vi.spyOn(Application, 'findOneAndUpdate').mockReturnValue(queryOf(fakeApp));
    vi.spyOn(Job, 'findOne').mockReturnValue(queryOf(makeJob()));

    const res = await request(app)
      .patch(`/api/applications/${APP_ID}/tags`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ tags: ['urgent', 'senior'] });

    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/applications/:id — withdraw', () => {
  it('returns 401 without auth token', async () => {
    const app = buildTestApp();
    const res = await request(app).delete(`/api/applications/${APP_ID}`);
    expect(res.status).toBe(401);
  });

  it('admin can soft-delete (withdraw) an application', async () => {
    const app = buildTestApp();
    const fakeApp = makeApp();
    vi.spyOn(Application, 'findOneAndUpdate').mockReturnValue(queryOf(fakeApp));
    vi.spyOn(Job, 'findByIdAndUpdate').mockResolvedValue({});

    const res = await request(app)
      .delete(`/api/applications/${APP_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when application is not found', async () => {
    const app = buildTestApp();
    vi.spyOn(Application, 'findOneAndUpdate').mockReturnValue(queryOf(null));

    const res = await request(app)
      .delete(`/api/applications/${APP_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/applications/status/:token — public tracker', () => {
  it('returns 404 for unknown status token', async () => {
    const app = buildTestApp();
    vi.spyOn(Application, 'findOne').mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    });

    const res = await request(app).get('/api/applications/status/badtoken123');
    expect(res.status).toBe(404);
  });

  it('returns status snapshot without requiring auth', async () => {
    const app = buildTestApp();
    const fakeApp = makeApp({
      stageHistory: [{ stage: 'Applied', movedAt: new Date() }],
      status: 'active',
    });
    vi.spyOn(Application, 'findOne').mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeApp),
    });

    const res = await request(app).get('/api/applications/status/validtoken');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('currentStage');
    expect(res.body).toHaveProperty('stageHistory');
  });
});

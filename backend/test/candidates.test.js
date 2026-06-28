/**
 * Module 4 audit: candidates.js route
 *
 * Behaviors proven:
 *   CAND-A  GET /        — candidate role blocked (403); admin scoped to
 *                          own tenant; super_admin sees all tenants.
 *   CAND-B  GET /:id     — 404 when not found; same-tenant hit; cross-tenant
 *                          access granted only when an application exists.
 *   CAND-C  POST /       — name+email required (400); duplicate email → 409;
 *                          candidate role blocked (403); 201 on success.
 *   CAND-D  DELETE /:id  — recruiter → 403; admin soft-deletes; 404 when gone.
 *   CAND-E  PATCH /:id   — tenantId/_id stripped from updates; invalid
 *                          LinkedIn URL → 400; admin can update.
 *   CAND-F  GET /:id/full-timeline — 404 when no candidate + no cross-tenant app;
 *                          same-tenant returns event list; cross-tenant access
 *                          granted when Application exists in requester tenant;
 *                          application events always filtered by requester tenantId
 *                          (security boundary); super_admin bypasses tenant filter.
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

// ── CJS references — same instances the route module holds ───────────────────
const _r = createRequire(import.meta.url);

const _authModule  = _r('../src/middleware/auth.js');
const Candidate    = _r('../src/models/Candidate.js');
const User         = _r('../src/models/User.js');
const Application  = _r('../src/models/Application.js');
const AuditLog     = _r('../src/models/AuditLog.js');
const Org          = _r('../src/models/Organization.js');
const Tenant       = _r('../src/models/Tenant.js');
const logger       = _r('../src/middleware/logger.js');
const syncProfile  = _r('../src/utils/syncProfile.js');

import candidatesRouter from '../src/routes/candidates.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID  = new mongoose.Types.ObjectId().toString();
const CANDIDATE_ID  = new mongoose.Types.ObjectId().toString();
const CAND_DOC_ID   = new mongoose.Types.ObjectId().toString();

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(role = 'admin', opts = {}) {
  const id = opts.id ?? (role === 'recruiter' ? RECRUITER_ID : role === 'candidate' ? CANDIDATE_ID : ADMIN_ID);
  return jwt.sign(
    { userId: id, role, tenantId: opts.tenantId ?? TENANT_ID },
    JWT_SECRET,
    { expiresIn: '1h' },
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

function makeCandidate(overrides = {}) {
  const id = new mongoose.Types.ObjectId();
  return {
    _id: id, id: id.toString(),
    tenantId: TENANT_ID,
    name: 'Jane Doe', email: 'jane@example.com',
    phone: '+919876543210', location: 'Bangalore',
    status: 'active', deletedAt: null,
    parsedProfile: { skills: ['javascript'], totalExperienceYears: 3 },
    toObject: function() { return { ...this }; },
    save: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeOrg() {
  return {
    _id: TENANT_ID, name: 'Test Org',
    status: 'active', type: 'org',
    subscriptionStatus: 'active',
    isStaffingAgency: false,
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/candidates', candidatesRouter);
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

  vi.spyOn(syncProfile, 'syncProfile').mockResolvedValue(undefined);
  vi.spyOn(AuditLog, 'create').mockResolvedValue({});

  // syncProfile calls User.updateMany + Candidate.updateMany internally
  // (syncProfile is destructured in the route so vi.spyOn on the module object
  // doesn't intercept calls — mock the underlying DB methods instead)
  vi.spyOn(User, 'updateMany').mockResolvedValue({});
  vi.spyOn(Candidate, 'updateMany').mockResolvedValue({});

  // tenantGuard
  vi.spyOn(Org, 'findById').mockReturnValue(chainOf(makeOrg()));
  vi.spyOn(Tenant, 'findById').mockReturnValue(chainOf(null));
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));

  // Application (cross-tenant check)
  vi.spyOn(Application, 'exists').mockResolvedValue(false);

  // authMiddleware: ID-aware
  vi.spyOn(User, 'findById').mockImplementation((id) => {
    const s = String(id);
    if (s === 'sa_1') {
      return chainOf({ _id: 'sa_1', id: 'sa_1', role: 'super_admin',
        tenantId: null, isActive: true, name: 'Super Admin',
        email: 'sa@talentnest.io', toObject: () => ({}) });
    }
    if (s === RECRUITER_ID) {
      return chainOf({ _id: RECRUITER_ID, id: RECRUITER_ID, role: 'recruiter',
        tenantId: TENANT_ID, isActive: true, name: 'Test Recruiter',
        email: 'rec@test.example', toObject: () => ({}) });
    }
    if (s === CANDIDATE_ID) {
      return chainOf({ _id: CANDIDATE_ID, id: CANDIDATE_ID, role: 'candidate',
        tenantId: TENANT_ID, isActive: true, name: 'Test Candidate',
        email: 'cand@test.example', toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Test Admin',
      email: 'admin@test.example', toObject: () => ({}) });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/candidates — list (CAND-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/candidates');
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate role', async () => {
    const res = await request(buildApp())
      .get('/api/candidates')
      .set('Authorization', `Bearer ${makeToken('candidate')}`);
    expect(res.status).toBe(403);
  });

  it('admin: response contains data array and pagination', async () => {
    const cands = [makeCandidate(), makeCandidate()];
    vi.spyOn(Candidate, 'find').mockReturnValue(chainOf(cands));
    vi.spyOn(Candidate, 'countDocuments').mockResolvedValue(2);

    const res = await request(buildApp())
      .get('/api/candidates')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  it('admin: query filter includes own tenantId', async () => {
    const findSpy = vi.spyOn(Candidate, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(Candidate, 'countDocuments').mockResolvedValue(0);

    await request(buildApp())
      .get('/api/candidates')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    const filter = findSpy.mock.calls[0][0];
    expect(filter.tenantId.toString()).toBe(TENANT_ID);
    expect(filter.deletedAt).toBeNull();
  });

  it('super_admin: query filter has no tenantId', async () => {
    const findSpy = vi.spyOn(Candidate, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(Candidate, 'countDocuments').mockResolvedValue(0);

    await request(buildApp())
      .get('/api/candidates')
      .set('Authorization', `Bearer ${makeToken('super_admin', { id: 'sa_1', tenantId: null })}`);

    const filter = findSpy.mock.calls[0][0];
    expect(filter.tenantId).toBeUndefined();
  });

  it('recruiter: allowed to list candidates', async () => {
    vi.spyOn(Candidate, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(Candidate, 'countDocuments').mockResolvedValue(0);

    const res = await request(buildApp())
      .get('/api/candidates')
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);

    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/candidates/:id — single (CAND-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/candidates/${CAND_DOC_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 when candidate belongs to admin tenant', async () => {
    const cand = makeCandidate();
    vi.spyOn(Candidate, 'findOne').mockReturnValue(chainOf(cand));

    const res = await request(buildApp())
      .get(`/api/candidates/${cand._id}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Jane Doe');
  });

  it('returns 404 when candidate not found in tenant (and no cross-tenant app)', async () => {
    vi.spyOn(Candidate, 'findOne').mockReturnValue(chainOf(null));
    vi.spyOn(Application, 'exists').mockResolvedValue(false);

    const res = await request(buildApp())
      .get(`/api/candidates/${CAND_DOC_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('cross-tenant: returns 200 when an application links candidate to the admin tenant', async () => {
    const cand = makeCandidate({ tenantId: new mongoose.Types.ObjectId().toString() });
    // Same-tenant lookup returns null, cross-tenant app exists, global lookup returns candidate
    vi.spyOn(Candidate, 'findOne')
      .mockReturnValueOnce(chainOf(null))   // same-tenant miss
      .mockReturnValue(chainOf(cand));       // global fetch
    vi.spyOn(Application, 'exists').mockResolvedValue(true);

    const res = await request(buildApp())
      .get(`/api/candidates/${cand._id}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/candidates — create (CAND-C)', () => {
  it('returns 400 when name is missing', async () => {
    const res = await request(buildApp())
      .post('/api/candidates')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ email: 'new@example.com' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(buildApp())
      .post('/api/candidates')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'New Candidate' });
    expect(res.status).toBe(400);
  });

  it('returns 409 when email already exists in tenant', async () => {
    vi.spyOn(Candidate, 'findOne').mockReturnValue(chainOf(makeCandidate()));

    const res = await request(buildApp())
      .post('/api/candidates')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Duplicate', email: 'jane@example.com' });

    expect(res.status).toBe(409);
  });

  it('returns 201 with candidate data on success', async () => {
    vi.spyOn(Candidate, 'findOne').mockReturnValue(chainOf(null));
    const created = makeCandidate();
    vi.spyOn(Candidate, 'create').mockResolvedValue(created);

    const res = await request(buildApp())
      .post('/api/candidates')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'New Person', email: 'new@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Jane Doe');
  });

  it('stores candidate under the requesting admin tenantId', async () => {
    vi.spyOn(Candidate, 'findOne').mockReturnValue(chainOf(null));
    const createSpy = vi.spyOn(Candidate, 'create').mockResolvedValue(makeCandidate());

    await request(buildApp())
      .post('/api/candidates')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'New Person', email: 'new@example.com' });

    expect(createSpy.mock.calls[0][0].tenantId.toString()).toBe(TENANT_ID);
  });

  it('returns 403 for candidate role', async () => {
    const res = await request(buildApp())
      .post('/api/candidates')
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ name: 'X', email: 'x@x.com' });
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/candidates/:id — soft delete (CAND-D)', () => {
  it('returns 403 for recruiter role', async () => {
    const res = await request(buildApp())
      .delete(`/api/candidates/${CAND_DOC_ID}`)
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);
    expect(res.status).toBe(403);
  });

  it('admin soft-deletes candidate successfully', async () => {
    vi.spyOn(Candidate, 'findOneAndUpdate').mockResolvedValue(makeCandidate({ deletedAt: new Date() }));

    const res = await request(buildApp())
      .delete(`/api/candidates/${CAND_DOC_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when candidate not found', async () => {
    vi.spyOn(Candidate, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/candidates/${CAND_DOC_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/candidates/:id — update (CAND-E)', () => {
  it('admin can update allowed fields', async () => {
    const updated = makeCandidate({ location: 'Mumbai' });
    vi.spyOn(Candidate, 'findOneAndUpdate').mockResolvedValue(updated);

    const res = await request(buildApp())
      .patch(`/api/candidates/${CAND_DOC_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ location: 'Mumbai' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('strips tenantId and _id from the update payload', async () => {
    const updateSpy = vi.spyOn(Candidate, 'findOneAndUpdate').mockResolvedValue(makeCandidate());

    await request(buildApp())
      .patch(`/api/candidates/${CAND_DOC_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ location: 'Chennai', tenantId: 'evil', _id: 'evil' });

    const setPayload = updateSpy.mock.calls[0][1].$set;
    expect(setPayload.tenantId).toBeUndefined();
    expect(setPayload._id).toBeUndefined();
    expect(setPayload.location).toBe('Chennai');
  });

  it('returns 400 for an invalid LinkedIn URL', async () => {
    const res = await request(buildApp())
      .patch(`/api/candidates/${CAND_DOC_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ linkedinUrl: 'https://twitter.com/someone' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when candidate does not exist', async () => {
    // findOneAndUpdate returns null; route then calls User.findById(CAND_DOC_ID)
    // which hits the default branch of the auth mock and returns an admin object
    // (role !== 'candidate'), so no fallback candidate lookup runs → 404 thrown.
    vi.spyOn(Candidate, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/candidates/${CAND_DOC_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ location: 'Delhi' });

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/candidates/:id/full-timeline — CAND-F', () => {
  function makeApp(appFields = {}) {
    return {
      _id: new mongoose.Types.ObjectId(),
      tenantId: TENANT_ID,
      candidateId: CAND_DOC_ID,
      jobId: { title: 'Engineer', department: 'Eng', location: 'Remote' },
      createdAt: new Date(),
      stageHistory: [],
      interviewRounds: [],
      offers: [],
      scorecards: [],
      ...appFields,
    };
  }

  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/candidates/${CAND_DOC_ID}/full-timeline`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when candidate not in own tenant and no cross-tenant application exists', async () => {
    vi.spyOn(Candidate, 'findOne').mockReturnValue(chainOf(null));
    vi.spyOn(Application, 'exists').mockResolvedValue(false);

    const res = await request(buildApp())
      .get(`/api/candidates/${CAND_DOC_ID}/full-timeline`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Candidate not found/i);
  });

  it('same-tenant: returns 200 with event list and correct shape', async () => {
    const cand = makeCandidate();
    vi.spyOn(Candidate, 'findOne').mockReturnValue(chainOf(cand));
    vi.spyOn(Application, 'find').mockReturnValue(chainOf([makeApp()]));

    const res = await request(buildApp())
      .get(`/api/candidates/${cand._id}/full-timeline`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.events)).toBe(true);
    // profile_created event must always be present
    expect(res.body.data.events.some(e => e.type === 'profile_created')).toBe(true);
    // application event is included for the mocked app
    expect(res.body.data.events.some(e => e.type === 'application')).toBe(true);
  });

  it('cross-tenant: 200 when an Application links candidate to the requester tenant', async () => {
    const crossCand = makeCandidate({ tenantId: new mongoose.Types.ObjectId().toString() });

    vi.spyOn(Candidate, 'findOne')
      .mockReturnValueOnce(chainOf(null))     // same-tenant miss
      .mockReturnValue(chainOf(crossCand));   // global fetch succeeds
    vi.spyOn(Application, 'exists').mockResolvedValue(true);
    vi.spyOn(Application, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get(`/api/candidates/${crossCand._id}/full-timeline`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('cross-tenant: application-events query is scoped to the requester tenantId (security boundary)', async () => {
    const crossCand = makeCandidate({ tenantId: new mongoose.Types.ObjectId().toString() });

    vi.spyOn(Candidate, 'findOne')
      .mockReturnValueOnce(chainOf(null))
      .mockReturnValue(chainOf(crossCand));
    vi.spyOn(Application, 'exists').mockResolvedValue(true);
    const findSpy = vi.spyOn(Application, 'find').mockReturnValue(chainOf([]));

    await request(buildApp())
      .get(`/api/candidates/${crossCand._id}/full-timeline`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    const appFilter = findSpy.mock.calls[0][0];
    // Events must only come from the requester's own tenant — never from the candidate's tenant
    expect(appFilter.tenantId?.toString() ?? appFilter.tenantId).toBe(TENANT_ID);
    expect(appFilter.deletedAt).toBeNull();
  });

  it('super_admin: can view any candidate timeline — no tenantId filter applied', async () => {
    const cand = makeCandidate({ tenantId: new mongoose.Types.ObjectId().toString() });
    const findOneSpy = vi.spyOn(Candidate, 'findOne').mockReturnValue(chainOf(cand));
    vi.spyOn(Application, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get(`/api/candidates/${cand._id}/full-timeline`)
      .set('Authorization', `Bearer ${makeToken('super_admin', { id: 'sa_1', tenantId: null })}`);

    expect(res.status).toBe(200);
    // super_admin path: Candidate.findOne must NOT include tenantId in filter
    const candFilter = findOneSpy.mock.calls[0][0];
    expect(candFilter.tenantId).toBeUndefined();
  });
});

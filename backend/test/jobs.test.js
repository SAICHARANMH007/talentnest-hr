/**
 * Module 3 audit: jobs.js route
 *
 * Behaviors proven:
 *   JOB-A  GET /        — admin scoped to own tenant; recruiter scoped to
 *                         assignedRecruiters; super_admin sees all tenants.
 *   JOB-B  GET /public/single/:id — 404 for deleted/inactive, 200 for active.
 *   JOB-C  GET /:id     — 404 when job not found (or belongs to another tenant).
 *   JOB-D  POST /       — title+description required (400); recruiter job
 *                         lands as pending_approval/draft; admin job is approved.
 *   JOB-E  DELETE /:id  — soft-delete: recruiter gets 403, admin succeeds.
 *   JOB-F  PATCH /approve — recruiter gets 403, admin succeeds.
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
const Job          = _r('../src/models/Job.js');
const User         = _r('../src/models/User.js');
const Tenant       = _r('../src/models/Tenant.js');
const Org          = _r('../src/models/Organization.js');
const Application  = _r('../src/models/Application.js');
const Notification = _r('../src/models/Notification.js');
const logger       = _r('../src/middleware/logger.js');
const classifyMod  = _r('../src/utils/classifyJob.js');
const cacheMod     = _r('../src/middleware/cache.js');

import jobsRouter from '../src/routes/jobs.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const OTHER_TENANT  = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID  = new mongoose.Types.ObjectId().toString();
const CANDIDATE_ID  = new mongoose.Types.ObjectId().toString();
const JOB_ID        = new mongoose.Types.ObjectId().toString();

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(role = 'admin', opts = {}) {
  return jwt.sign(
    { userId: opts.id || ADMIN_ID, role, tenantId: opts.tenantId ?? TENANT_ID },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

/** Flexible Mongoose query chain: .select/sort/skip/limit/populate/lean */
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

function makeJob(overrides = {}) {
  const id = new mongoose.Types.ObjectId();
  return {
    _id: id, id: id.toString(),
    tenantId: TENANT_ID,
    title: 'Software Engineer', company: 'Acme',
    department: 'Engineering', industry: 'Technology',
    location: 'Bangalore', jobType: 'full_time', status: 'active',
    approvalStatus: 'approved',
    assignedRecruiters: [], hiringManagers: [],
    skills: [], niceToHaveSkills: [],
    applicationCount: 0, hiredCount: 0,
    deletedAt: null,
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
  app.use('/api/jobs', jobsRouter);
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

  vi.spyOn(classifyMod, 'classifyJob').mockReturnValue({ industry: 'Technology', department: 'Engineering' });
  vi.spyOn(cacheMod, 'invalidatePrefix').mockResolvedValue(undefined);

  // tenantGuard: org lookup
  vi.spyOn(Org, 'findById').mockReturnValue(chainOf(makeOrg()));
  vi.spyOn(Tenant, 'findById').mockReturnValue(chainOf(null));
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));

  // Notification (fire-and-forget in some handlers)
  vi.spyOn(Notification, 'create').mockResolvedValue({});
  vi.spyOn(Notification, 'insertMany').mockResolvedValue([]);

  // User.find used in recruiter POST to notify admins
  vi.spyOn(User, 'find').mockReturnValue(chainOf([]));

  // Application (my-team and candidates endpoints)
  vi.spyOn(Application, 'aggregate').mockResolvedValue([]);

  // authMiddleware: ID-aware user lookup
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
describe('GET /api/jobs/public/single/:id — public single job (JOB-B)', () => {
  it('returns 200 with job data for an active job', async () => {
    const job = makeJob();
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf(job));
    const res = await request(buildApp()).get(`/api/jobs/public/single/${job._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Software Engineer');
  });

  it('returns 404 when job does not exist', async () => {
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf(null));
    const res = await request(buildApp()).get(`/api/jobs/public/single/${JOB_ID}`);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/jobs — list (JOB-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/jobs');
    expect(res.status).toBe(401);
  });

  it('admin: scopes query to own tenantId', async () => {
    const jobs = [makeJob(), makeJob()];
    const findSpy = vi.spyOn(Job, 'find').mockReturnValue(chainOf(jobs));
    vi.spyOn(Job, 'countDocuments').mockResolvedValue(2);

    const res = await request(buildApp())
      .get('/api/jobs')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Verify tenantId filter was passed to find()
    const filter = findSpy.mock.calls[0][0];
    expect(filter.tenantId.toString()).toBe(TENANT_ID);
  });

  it('recruiter: scopes query to assignedRecruiters', async () => {
    const findSpy = vi.spyOn(Job, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(Job, 'countDocuments').mockResolvedValue(0);

    await request(buildApp())
      .get('/api/jobs')
      .set('Authorization', `Bearer ${makeToken('recruiter', { id: RECRUITER_ID })}`);

    const filter = findSpy.mock.calls[0][0];
    expect(filter.assignedRecruiters.toString()).toBe(RECRUITER_ID);
  });

  it('super_admin: does not scope to a tenantId', async () => {
    const findSpy = vi.spyOn(Job, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(Job, 'countDocuments').mockResolvedValue(0);

    const res = await request(buildApp())
      .get('/api/jobs')
      .set('Authorization', `Bearer ${makeToken('super_admin', { id: 'sa_1', tenantId: null })}`);

    expect(res.status).toBe(200);
    const filter = findSpy.mock.calls[0][0];
    expect(filter.tenantId).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/jobs/:id — single authenticated job (JOB-C)', () => {
  it('returns 404 when job not found', async () => {
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf(null));
    const res = await request(buildApp())
      .get(`/api/jobs/${JOB_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 with job data when found', async () => {
    const job = makeJob();
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf(job));
    const res = await request(buildApp())
      .get(`/api/jobs/${job._id}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Software Engineer');
  });

  it('admin query filter includes tenantId', async () => {
    const findSpy = vi.spyOn(Job, 'findOne').mockReturnValue(chainOf(null));
    await request(buildApp())
      .get(`/api/jobs/${JOB_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    const filter = findSpy.mock.calls[0][0];
    expect(filter.tenantId.toString()).toBe(TENANT_ID);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/jobs — create job (JOB-D)', () => {
  beforeEach(() => {
    vi.spyOn(Job, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(User, 'exists').mockResolvedValue(false);
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(buildApp())
      .post('/api/jobs')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ description: 'Some description', industry: 'Technology', department: 'Engineering' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when description is missing', async () => {
    const res = await request(buildApp())
      .post('/api/jobs')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ title: 'Engineer', industry: 'Technology', department: 'Engineering' });
    expect(res.status).toBe(400);
  });

  it('admin-created job gets approvalStatus=approved', async () => {
    const created = makeJob({ approvalStatus: 'approved', status: 'active' });
    const createSpy = vi.spyOn(Job, 'create').mockResolvedValue(created);

    const res = await request(buildApp())
      .post('/api/jobs')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ title: 'Engineer', description: 'Build things', industry: 'Technology', department: 'Engineering' });

    expect(res.status).toBe(201);
    const payload = createSpy.mock.calls[0][0];
    expect(payload.approvalStatus).toBe('approved');
  });

  it('recruiter-created job gets approvalStatus=pending_approval and status=draft', async () => {
    const created = makeJob({ approvalStatus: 'pending_approval', status: 'draft' });
    const createSpy = vi.spyOn(Job, 'create').mockResolvedValue(created);

    await request(buildApp())
      .post('/api/jobs')
      .set('Authorization', `Bearer ${makeToken('recruiter', { id: RECRUITER_ID })}`)
      .send({ title: 'Engineer', description: 'Build things', industry: 'Technology', department: 'Engineering' });

    const payload = createSpy.mock.calls[0][0];
    expect(payload.approvalStatus).toBe('pending_approval');
    expect(payload.status).toBe('draft');
  });

  it('recruiter is auto-assigned to job they create', async () => {
    const created = makeJob();
    const createSpy = vi.spyOn(Job, 'create').mockResolvedValue(created);

    await request(buildApp())
      .post('/api/jobs')
      .set('Authorization', `Bearer ${makeToken('recruiter', { id: RECRUITER_ID })}`)
      .send({ title: 'Engineer', description: 'Build things', industry: 'Technology', department: 'Engineering' });

    const payload = createSpy.mock.calls[0][0];
    expect(payload.assignedRecruiters).toContain(RECRUITER_ID);
  });

  it('returns 403 when candidate role tries to create', async () => {
    const res = await request(buildApp())
      .post('/api/jobs')
      .set('Authorization', `Bearer ${makeToken('candidate', { id: CANDIDATE_ID })}`)
      .send({ title: 'Engineer', description: 'desc', industry: 'Technology', department: 'Engineering' });
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/jobs/:id — soft delete (JOB-E)', () => {
  it('returns 403 when recruiter tries to delete', async () => {
    const res = await request(buildApp())
      .delete(`/api/jobs/${JOB_ID}`)
      .set('Authorization', `Bearer ${makeToken('recruiter', { id: RECRUITER_ID })}`);
    expect(res.status).toBe(403);
  });

  it('admin can soft-delete a job', async () => {
    const archived = makeJob({ deletedAt: new Date(), status: 'closed' });
    vi.spyOn(Job, 'findOneAndUpdate').mockResolvedValue(archived);

    const res = await request(buildApp())
      .delete(`/api/jobs/${JOB_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when job not found for delete', async () => {
    vi.spyOn(Job, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/jobs/${JOB_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/jobs/:id/approve — job approval (JOB-F)', () => {
  it('returns 403 when recruiter tries to approve', async () => {
    const res = await request(buildApp())
      .patch(`/api/jobs/${JOB_ID}/approve`)
      .set('Authorization', `Bearer ${makeToken('recruiter', { id: RECRUITER_ID })}`);
    expect(res.status).toBe(403);
  });

  it('admin can approve a pending job', async () => {
    const approved = makeJob({ approvalStatus: 'approved', status: 'active' });
    vi.spyOn(Job, 'findOneAndUpdate').mockResolvedValue(approved);

    const res = await request(buildApp())
      .patch(`/api/jobs/${JOB_ID}/approve`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

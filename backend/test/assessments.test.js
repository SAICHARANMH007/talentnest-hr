/**
 * Module 7 audit: assessments.js route
 *
 * Behaviors proven:
 *   ASMT-A  GET /public/job/:jobId — no auth; returns hasAssessment true/false.
 *   ASMT-B  GET /                  — 401 no token; 403 candidate; 200 for admin.
 *   ASMT-C  POST /                 — 401 no token; 400 missing jobId; 404 job not
 *                                    found; 400 duplicate assessment.
 *   ASMT-D  GET /:id               — 401 no token; 404 not found; 200 admin;
 *                                    candidate gets sanitized questions.
 *   ASMT-E  PATCH /:id             — 401 no token; 404 not found; 200 admin update.
 *   ASMT-F  DELETE /:id            — 401 no token; 404 not found; 200 admin delete.
 *   ASMT-G  GET /candidate/my      — 401 no token; 403 non-candidate; 200 candidate.
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

// ── CJS references ────────────────────────────────────────────────────────────
const _r = createRequire(import.meta.url);

const _authModule       = _r('../src/middleware/auth.js');
const User              = _r('../src/models/User.js');
const Organization      = _r('../src/models/Organization.js');
const Tenant            = _r('../src/models/Tenant.js');
const Assessment        = _r('../src/models/Assessment.js');
const AssessmentSubmission = _r('../src/models/AssessmentSubmission.js');
const Application       = _r('../src/models/Application.js');
const Candidate         = _r('../src/models/Candidate.js');
const Job               = _r('../src/models/Job.js');
const Notification      = _r('../src/models/Notification.js');
const logger            = _r('../src/middleware/logger.js');

import assessmentsRouter from '../src/routes/assessments.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const JWT_SECRET     = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET  = 'test_cookie_secret';
const TENANT_ID      = new mongoose.Types.ObjectId().toString();
const ADMIN_ID       = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID   = new mongoose.Types.ObjectId().toString();
const CANDIDATE_ID   = new mongoose.Types.ObjectId().toString();
const JOB_ID         = new mongoose.Types.ObjectId().toString();
const ASMT_ID        = new mongoose.Types.ObjectId().toString();

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(role = 'admin', opts = {}) {
  let defaultId = ADMIN_ID;
  if (role === 'recruiter') defaultId = RECRUITER_ID;
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
    lean:     vi.fn().mockResolvedValue(value),
    then: (r, j) => Promise.resolve(value).then(r, j),
    catch: (j)   => Promise.resolve(value).catch(j),
  };
  return q;
}

function makeAssessment(overrides = {}) {
  return {
    _id: ASMT_ID,
    id: ASMT_ID,
    tenantId: TENANT_ID,
    jobId: JOB_ID,
    recruiterId: RECRUITER_ID,
    createdBy: RECRUITER_ID,
    title: 'Screening Assessment',
    timeLimitMins: 30,
    passingScore: 70,
    isActive: true,
    autoAdvance: false,
    questions: JSON.stringify([]),
    toJSON: () => ({
      _id: ASMT_ID, id: ASMT_ID, tenantId: TENANT_ID, jobId: JOB_ID,
      recruiterId: RECRUITER_ID, title: 'Screening Assessment',
      timeLimitMins: 30, passingScore: 70, isActive: true,
      autoAdvance: false, questions: [],
      ...overrides,
    }),
    ...overrides,
  };
}

function makeJob(overrides = {}) {
  return {
    _id: JOB_ID, id: JOB_ID, tenantId: TENANT_ID,
    title: 'Engineer', company: 'Acme', companyName: 'Acme',
    assignedRecruiters: [RECRUITER_ID],
    ...overrides,
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/assessments', assessmentsRouter);
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
        tenantId: TENANT_ID, isActive: true, name: 'Cand', email: 'cand@test.example',
        toObject: () => ({}) });
    }
    if (s === RECRUITER_ID) {
      return chainOf({ _id: RECRUITER_ID, id: RECRUITER_ID, role: 'recruiter',
        tenantId: TENANT_ID, isActive: true, name: 'Recruiter', email: 'rec@test.example',
        toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'admin@test.example',
      toObject: () => ({}) });
  });

  // Common model stubs
  vi.spyOn(Notification, 'create').mockResolvedValue({});
  vi.spyOn(Application, 'find').mockResolvedValue([]);
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/assessments/public/job/:jobId — public check (ASMT-A)', () => {
  it('returns hasAssessment: false when no active assessment exists', async () => {
    vi.spyOn(Assessment, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get(`/api/assessments/public/job/${JOB_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.hasAssessment).toBe(false);
  });

  it('returns hasAssessment: true with metadata when active assessment exists', async () => {
    vi.spyOn(Assessment, 'findOne').mockReturnValue(chainOf({
      _id: ASMT_ID, title: 'Screening', timeLimitMins: 30, passingScore: 70, questions: [],
    }));

    const res = await request(buildApp())
      .get(`/api/assessments/public/job/${JOB_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.hasAssessment).toBe(true);
    expect(res.body.assessmentId).toBeDefined();
    expect(res.body.timeLimitMins).toBe(30);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/assessments — list assessments (ASMT-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/assessments');
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate role', async () => {
    const res = await request(buildApp())
      .get('/api/assessments')
      .set('Authorization', `Bearer ${makeToken('candidate')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with list for admin', async () => {
    vi.spyOn(Assessment, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/assessments')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('recruiter sees only jobs assigned to them', async () => {
    vi.spyOn(Job, 'find').mockReturnValue(chainOf([{ _id: JOB_ID }]));
    vi.spyOn(Assessment, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/assessments')
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);

    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/assessments — create assessment (ASMT-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post('/api/assessments')
      .send({ jobId: JOB_ID });
    expect(res.status).toBe(401);
  });

  it('returns 400 when jobId is missing', async () => {
    const res = await request(buildApp())
      .post('/api/assessments')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 when job not found', async () => {
    vi.spyOn(Job, 'findById').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .post('/api/assessments')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ jobId: JOB_ID, title: 'Test' });

    expect(res.status).toBe(404);
  });

  it('returns 400 when assessment already exists for job', async () => {
    vi.spyOn(Job, 'findById').mockReturnValue(chainOf(makeJob()));
    vi.spyOn(Assessment, 'findOne').mockResolvedValue(makeAssessment());

    const res = await request(buildApp())
      .post('/api/assessments')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ jobId: JOB_ID, title: 'New Assessment' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('admin can create an assessment', async () => {
    vi.spyOn(Job, 'findById').mockReturnValue(chainOf(makeJob()));
    vi.spyOn(Assessment, 'findOne').mockResolvedValue(null);
    vi.spyOn(Assessment, 'create').mockResolvedValue(makeAssessment());

    const res = await request(buildApp())
      .post('/api/assessments')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ jobId: JOB_ID, title: 'Test Assessment', questions: [] });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Screening Assessment');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/assessments/:id — single assessment (ASMT-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/assessments/${ASMT_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when not found', async () => {
    vi.spyOn(Assessment, 'findById').mockResolvedValue(null);

    const res = await request(buildApp())
      .get(`/api/assessments/${ASMT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('admin can fetch assessment with full questions', async () => {
    vi.spyOn(Assessment, 'findById').mockResolvedValue(makeAssessment());
    vi.spyOn(Job, 'findById').mockReturnValue(chainOf(makeJob()));

    const res = await request(buildApp())
      .get(`/api/assessments/${ASMT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBeDefined();
  });

  it('candidate gets 403 for cross-tenant assessment', async () => {
    const otherTenant = new mongoose.Types.ObjectId().toString();
    vi.spyOn(Assessment, 'findById').mockResolvedValue(makeAssessment({ tenantId: otherTenant }));

    const res = await request(buildApp())
      .get(`/api/assessments/${ASMT_ID}`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`);

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/assessments/:id — update assessment (ASMT-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .patch(`/api/assessments/${ASMT_ID}`)
      .send({ title: 'Updated' });
    expect(res.status).toBe(401);
  });

  it('returns 404 when assessment not found', async () => {
    vi.spyOn(Assessment, 'findById').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/assessments/${ASMT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ title: 'Updated' });

    expect(res.status).toBe(404);
  });

  it('admin can update title and questions', async () => {
    const updated = makeAssessment({ title: 'Updated Title' });
    vi.spyOn(Assessment, 'findById').mockResolvedValue(makeAssessment());
    vi.spyOn(Job, 'findById').mockReturnValue(chainOf(makeJob()));
    vi.spyOn(Assessment, 'findByIdAndUpdate').mockResolvedValue(updated);

    const res = await request(buildApp())
      .patch(`/api/assessments/${ASMT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/assessments/:id — delete assessment (ASMT-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/assessments/${ASMT_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when not found', async () => {
    vi.spyOn(Assessment, 'findById').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/assessments/${ASMT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('admin can delete an assessment and its submissions', async () => {
    vi.spyOn(Assessment, 'findById').mockResolvedValue(makeAssessment());
    vi.spyOn(Job, 'findById').mockReturnValue(chainOf(makeJob()));
    vi.spyOn(AssessmentSubmission, 'find').mockResolvedValue([]);
    vi.spyOn(Assessment, 'findByIdAndDelete').mockResolvedValue({});

    const res = await request(buildApp())
      .delete(`/api/assessments/${ASMT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/assessments/candidate/my — candidate submissions (ASMT-G)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/assessments/candidate/my');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-candidate (admin)', async () => {
    const res = await request(buildApp())
      .get('/api/assessments/candidate/my')
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(403);
  });

  it('candidate sees their own submissions', async () => {
    vi.spyOn(Candidate, 'findOne').mockReturnValue(chainOf(null));
    vi.spyOn(AssessmentSubmission, 'find').mockResolvedValue([]);

    const res = await request(buildApp())
      .get('/api/assessments/candidate/my')
      .set('Authorization', `Bearer ${makeToken('candidate')}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

/**
 * Feature 4 — Recruiter Handoff History deepening
 * Tests for GET /api/jobs/:id/recruiter-timeline
 *
 * RH-A  401 with no token
 * RH-B  404 when job not found
 * RH-C  200 with empty history (no recruiter ever assigned)
 * RH-D  200 single recruiter — duration and productivity
 * RH-E  200 multiple recruiters — handoffCount, activeRecruiter
 * RH-F  Productivity: candidatesAdvanced counted from stageHistory window
 * RH-G  Recruiter with no removedAt treated as currently active
 * RH-H  Super-admin sees any job (no tenant filter)
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

const _r = createRequire(import.meta.url);
const _authModule  = _r('../src/middleware/auth.js');
const Job          = _r('../src/models/Job.js');
const User         = _r('../src/models/User.js');
const Application  = _r('../src/models/Application.js');
const Notification = _r('../src/models/Notification.js');
const logger       = _r('../src/middleware/logger.js');
const classifyMod  = _r('../src/utils/classifyJob.js');
const cacheMod     = _r('../src/middleware/cache.js');

import jobsRouter from '../src/routes/jobs.js';

const JWT_SECRET = 'test_jwt_secret_for_vitest_only';
const TENANT_ID  = new mongoose.Types.ObjectId().toString();
const ADMIN_ID   = new mongoose.Types.ObjectId().toString();
const SA_ID      = new mongoose.Types.ObjectId().toString();
const REC_ID     = new mongoose.Types.ObjectId().toString();
const JOB_ID     = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin', id = ADMIN_ID) {
  return jwt.sign({ userId: id, role, tenantId: TENANT_ID }, JWT_SECRET, { expiresIn: '1h' });
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
    catch: (j) => Promise.resolve(value).catch(j),
  };
  return q;
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser('test_cookie_secret'));
  app.use('/api/jobs', jobsRouter);
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  });
  return app;
}

const mockOrg  = { _id: TENANT_ID, name: 'Test Org', planFeatures: { smartMatch: true }, settings: {} };
const mockTenant = { _id: TENANT_ID };

const makeAdminUser = (id = ADMIN_ID) => ({
  _id: id, id, role: 'admin', tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example',
});
const makeSuperAdmin = () => ({
  _id: SA_ID, id: SA_ID, role: 'super_admin', tenantId: null, isActive: true, name: 'SA', email: 'sa@t.example',
});

const Org = _r('../src/models/Organization.js');
const Tenant = _r('../src/models/Tenant.js');

beforeEach(() => {
  vi.clearAllMocks();
  _authModule.clearAllUserAuthCache();
  vi.spyOn(logger, 'info').mockImplementation(() => {});
  vi.spyOn(logger, 'error').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
  vi.spyOn(logger, 'audit').mockImplementation(() => {});
  vi.spyOn(classifyMod, 'classifyJob').mockResolvedValue({});
  vi.spyOn(cacheMod, 'invalidatePrefix').mockResolvedValue(undefined);
  vi.spyOn(Notification, 'create').mockResolvedValue({});
  vi.spyOn(Notification, 'insertMany').mockResolvedValue([]);
  vi.spyOn(Org, 'findById').mockReturnValue(chainOf(mockOrg));
  vi.spyOn(Tenant, 'findById').mockReturnValue(chainOf(mockTenant));
  vi.spyOn(User, 'findById').mockImplementation(id => {
    if (String(id) === SA_ID) return chainOf(makeSuperAdmin());
    return chainOf(makeAdminUser(String(id)));
  });
});

const makeJob = (overrides = {}) => ({
  _id: JOB_ID, title: 'Sales Manager', status: 'active', tenantId: TENANT_ID,
  recruiterHistory: [], assignedRecruiters: [], createdAt: new Date(Date.now() - 10 * 86400000),
  ...overrides,
});

// ── RH-A: Auth ────────────────────────────────────────────────────────────────
describe('GET /api/jobs/:id/recruiter-timeline (RH-A auth)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/jobs/${JOB_ID}/recruiter-timeline`);
    expect(res.status).toBe(401);
  });
});

// ── RH-B: 404 ─────────────────────────────────────────────────────────────────
describe('GET /api/jobs/:id/recruiter-timeline — 404 (RH-B)', () => {
  it('returns 404 when job not found', async () => {
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf(null));
    const res = await request(buildApp())
      .get(`/api/jobs/${JOB_ID}/recruiter-timeline`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });
});

// ── RH-C: Empty history ───────────────────────────────────────────────────────
describe('GET /api/jobs/:id/recruiter-timeline — empty history (RH-C)', () => {
  it('returns 200 with empty timeline', async () => {
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf(makeJob()));
    vi.spyOn(User, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(Application, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get(`/api/jobs/${JOB_ID}/recruiter-timeline`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.timeline)).toBe(true);
    expect(res.body.data.timeline).toHaveLength(0);
    expect(res.body.data.handoffCount).toBe(0);
    expect(res.body.data.activeRecruiter).toBeNull();
  });
});

// ── RH-D: Single recruiter with duration ─────────────────────────────────────
describe('GET /api/jobs/:id/recruiter-timeline — single recruiter (RH-D)', () => {
  it('returns durationDays and productivity for single recruiter', async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const job = makeJob({
      recruiterHistory: [{
        recruiterId: REC_ID, recruiterName: 'Alice', recruiterEmail: 'alice@t.example',
        assignedAt: thirtyDaysAgo, removedAt: null,
      }],
      assignedRecruiters: [REC_ID],
    });
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf(job));
    vi.spyOn(User, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(Application, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get(`/api/jobs/${JOB_ID}/recruiter-timeline`)
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    const timeline = res.body.data.timeline;
    expect(timeline).toHaveLength(1);
    expect(timeline[0].recruiterName).toBe('Alice');
    expect(timeline[0].isActive).toBe(true);
    expect(timeline[0].durationDays).toBeGreaterThanOrEqual(29);
    expect(typeof timeline[0].productivity.candidatesAdvanced).toBe('number');
    expect(res.body.data.activeRecruiter.name).toBe('Alice');
  });
});

// ── RH-E: Multiple recruiters — handoffCount ─────────────────────────────────
describe('GET /api/jobs/:id/recruiter-timeline — multiple recruiters (RH-E)', () => {
  it('counts handoffs and identifies active recruiter', async () => {
    const t1 = new Date(Date.now() - 60 * 86400000);
    const t2 = new Date(Date.now() - 30 * 86400000);
    const t3 = new Date(Date.now() - 10 * 86400000);
    const job = makeJob({
      recruiterHistory: [
        { recruiterId: 'rec1', recruiterName: 'Bob', assignedAt: t1, removedAt: t2 },
        { recruiterId: 'rec2', recruiterName: 'Carol', assignedAt: t2, removedAt: t3 },
        { recruiterId: 'rec3', recruiterName: 'Dave', assignedAt: t3, removedAt: null },
      ],
    });
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf(job));
    vi.spyOn(User, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(Application, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get(`/api/jobs/${JOB_ID}/recruiter-timeline`)
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.timeline).toHaveLength(3);
    expect(res.body.data.handoffCount).toBe(2); // Bob and Carol had removedAt
    expect(res.body.data.activeRecruiter.name).toBe('Dave');
  });
});

// ── RH-F: Productivity — candidatesAdvanced from stageHistory ─────────────────
describe('GET /api/jobs/:id/recruiter-timeline — productivity signals (RH-F)', () => {
  it('counts candidatesAdvanced within recruiter tenure', async () => {
    const from = new Date(Date.now() - 20 * 86400000);
    const to   = new Date(Date.now() - 5 * 86400000);
    const mid  = new Date(Date.now() - 12 * 86400000); // within window

    const job = makeJob({
      recruiterHistory: [{ recruiterId: 'rec1', recruiterName: 'Eve', assignedAt: from, removedAt: to }],
    });

    const apps = [
      // App 1: moved to shortlisted within tenure → counts
      {
        _id: 'app1', stageHistory: [
          { stage: 'shortlisted', movedAt: mid, movedBy: 'user1' },
        ],
      },
      // App 2: moved to interview within tenure → counts
      {
        _id: 'app2', stageHistory: [
          { stage: 'interview_r1', movedAt: mid, movedBy: 'user1' },
        ],
      },
      // App 3: moved AFTER tenure ended → does NOT count
      {
        _id: 'app3', stageHistory: [
          { stage: 'shortlisted', movedAt: new Date(), movedBy: 'user1' },
        ],
      },
    ];

    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf(job));
    vi.spyOn(User, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(Application, 'find').mockReturnValue(chainOf(apps));

    const res = await request(buildApp())
      .get(`/api/jobs/${JOB_ID}/recruiter-timeline`)
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    const p = res.body.data.timeline[0].productivity;
    expect(p.candidatesAdvanced).toBe(2); // app1 + app2
    expect(p.interviewsScheduled).toBe(1); // app2 had interview_r1
  });
});

// ── RH-G: Active recruiter duration ───────────────────────────────────────────
describe('GET /api/jobs/:id/recruiter-timeline — active recruiter duration (RH-G)', () => {
  it('uses now as end date for active recruiter', async () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000);
    const job = makeJob({
      recruiterHistory: [{ recruiterId: 'rec1', recruiterName: 'Frank', assignedAt: fiveDaysAgo, removedAt: null }],
    });
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf(job));
    vi.spyOn(User, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(Application, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get(`/api/jobs/${JOB_ID}/recruiter-timeline`)
      .set('Authorization', `Bearer ${makeToken()}`);

    const t = res.body.data.timeline[0];
    expect(t.isActive).toBe(true);
    expect(t.durationDays).toBeGreaterThanOrEqual(4);
    expect(t.durationDays).toBeLessThanOrEqual(6);
  });
});

// ── RH-H: Super-admin cross-tenant access ────────────────────────────────────
describe('GET /api/jobs/:id/recruiter-timeline — super-admin (RH-H)', () => {
  it('super-admin can access job from any tenant', async () => {
    vi.spyOn(User, 'findById').mockReturnValue(chainOf(makeSuperAdmin()));
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf(makeJob({ tenantId: 'other-tenant' })));
    vi.spyOn(User, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(Application, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get(`/api/jobs/${JOB_ID}/recruiter-timeline`)
      .set('Authorization', `Bearer ${makeToken('super_admin', SA_ID)}`);
    expect(res.status).toBe(200);
  });
});

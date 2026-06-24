/**
 * Module audit: schedule.js route
 *
 * Behaviors proven:
 *   SCHED-A  POST /           — 401; 400 missing fields; 404 app not found; 201 link created.
 *   SCHED-B  GET /:token      — 404 not found; 200 link details.
 *   SCHED-C  POST /:token/confirm — 404 not found; 400 invalid slot; 200 confirmed.
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

vi.mock('../src/services/webhookService', () => ({
  fireWebhooks: vi.fn().mockResolvedValue({}),
}));

const _r              = createRequire(import.meta.url);
const _authModule     = _r('../src/middleware/auth.js');
const User            = _r('../src/models/User.js');
const Organization    = _r('../src/models/Organization.js');
const Tenant          = _r('../src/models/Tenant.js');
const Application     = _r('../src/models/Application.js');
const Candidate       = _r('../src/models/Candidate.js');
const Job             = _r('../src/models/Job.js');
const SchedulingLink  = _r('../src/models/SchedulingLink.js');
const Notification    = _r('../src/models/Notification.js');
const logger          = _r('../src/middleware/logger.js');

import scheduleRouter from '../src/routes/schedule.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const APP_ID        = new mongoose.Types.ObjectId().toString();
const CAND_ID       = new mongoose.Types.ObjectId().toString();
const JOB_ID        = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin') {
  return jwt.sign({ userId: ADMIN_ID, role, tenantId: TENANT_ID }, JWT_SECRET, { expiresIn: '1h' });
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
  app.use('/api/schedule', scheduleRouter);
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

  vi.spyOn(User, 'findById').mockReturnValue(chainOf({
    _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
    tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example',
  }));

  vi.spyOn(Organization, 'findById').mockReturnValue(chainOf({
    _id: TENANT_ID, name: 'Org', status: 'active', type: 'org',
    subscriptionStatus: 'active', isStaffingAgency: false,
  }));
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));
  vi.spyOn(Notification, 'create').mockResolvedValue({});
});

// ── SCHED-A: POST / ───────────────────────────────────────────────────────────
describe('POST /api/schedule — create scheduling link (SCHED-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/schedule').send({ applicationId: APP_ID, slots: [] });
    expect(res.status).toBe(401);
  });

  it('returns 400 when applicationId missing', async () => {
    const res = await request(buildApp())
      .post('/api/schedule')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ slots: ['2025-01-01T10:00:00Z'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/applicationId/i);
  });

  it('returns 400 when slots empty', async () => {
    const res = await request(buildApp())
      .post('/api/schedule')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ applicationId: APP_ID, slots: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/slot/i);
  });

  it('returns 404 when application not found', async () => {
    vi.spyOn(Application, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .post('/api/schedule')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ applicationId: APP_ID, slots: ['2025-01-01T10:00:00Z'] });
    expect(res.status).toBe(404);
  });

  it('returns 201 when link created', async () => {
    vi.spyOn(Application, 'findOne').mockReturnValue(chainOf({ _id: APP_ID, candidateId: CAND_ID, jobId: JOB_ID, tenantId: TENANT_ID }));
    vi.spyOn(Candidate, 'findById').mockReturnValue(chainOf({ name: 'Alice', email: 'alice@test.example' }));
    vi.spyOn(Job, 'findById').mockReturnValue(chainOf({ title: 'Dev' }));
    vi.spyOn(SchedulingLink, 'create').mockResolvedValue({ token: 'tok123', expiresAt: new Date() });
    vi.spyOn(User, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .post('/api/schedule')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ applicationId: APP_ID, slots: ['2025-01-01T10:00:00Z', '2025-01-02T10:00:00Z'] });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
  });
});

// ── SCHED-B: GET /:token ──────────────────────────────────────────────────────
describe('GET /api/schedule/:token — get scheduling link (SCHED-B)', () => {
  it('returns 404 when token not found', async () => {
    vi.spyOn(SchedulingLink, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp()).get('/api/schedule/no-such-token');
    expect(res.status).toBe(404);
  });

  it('returns 200 with link details', async () => {
    vi.spyOn(SchedulingLink, 'findOne').mockReturnValue(chainOf({
      jobTitle: 'Dev', recruiterName: 'Admin', candidateName: 'Alice',
      availableSlots: [], status: 'pending', format: 'video', notes: '',
      expiresAt: new Date(Date.now() + 86400000),
    }));

    const res = await request(buildApp()).get('/api/schedule/valid-token');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('jobTitle');
  });
});

// ── SCHED-C: POST /:token/confirm ────────────────────────────────────────────
describe('POST /api/schedule/:token/confirm — confirm slot (SCHED-C)', () => {
  it('returns 400 when selectedSlot missing', async () => {
    const res = await request(buildApp()).post('/api/schedule/tok/confirm').send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 when link not found', async () => {
    vi.spyOn(SchedulingLink, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .post('/api/schedule/no-token/confirm')
      .send({ selectedSlot: '2025-01-01T10:00:00Z' });
    expect(res.status).toBe(404);
  });

  it('returns 200 when slot confirmed', async () => {
    const slot = new Date('2025-01-01T10:00:00Z');
    const linkDoc = {
      _id: new mongoose.Types.ObjectId(), status: 'pending', applicationId: APP_ID,
      tenantId: TENANT_ID, jobTitle: 'Dev', candidateName: 'Alice',
      recruiterName: 'Admin', format: 'video', videoLink: '', location: '',
      availableSlots: [slot], expiresAt: new Date(Date.now() + 86400000),
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(SchedulingLink, 'findOne').mockResolvedValue(linkDoc);

    const appDoc = {
      _id: APP_ID, interviewRounds: [], currentStage: 'Screening',
      stageHistory: [],
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(Application, 'findById').mockResolvedValue(appDoc);
    vi.spyOn(User, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .post('/api/schedule/valid-token/confirm')
      .send({ selectedSlot: '2025-01-01T10:00:00Z' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

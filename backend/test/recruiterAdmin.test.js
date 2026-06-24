/**
 * Module audit: recruiterAdmin.js route
 *
 * Behaviors proven:
 *   RECADM-A  POST /invite-candidate — 401; 400 missing fields; 404 job not found; 201 invited.
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

vi.mock('bcryptjs', () => ({
  default: { hashSync: vi.fn().mockReturnValue('$2a$hash') },
  hashSync: vi.fn().mockReturnValue('$2a$hash'),
}));

vi.mock('../src/utils/email', () => ({
  sendEmailWithRetry: vi.fn().mockResolvedValue({}),
}));

vi.mock('../src/utils/inviteToken', () => ({
  generateInviteToken: vi.fn().mockReturnValue('raw_token_abc'),
  hashToken: vi.fn().mockReturnValue('hashed_token_abc'),
  getInviteExpiry: vi.fn().mockReturnValue(new Date(Date.now() + 7 * 86400000)),
}));

vi.mock('../src/utils/emailTemplates', () => ({
  default: {
    invite: vi.fn().mockReturnValue({ subject: 'Invite', html: '<p>Hi</p>' }),
    candidateInvite: null,
  },
}));

const _r = createRequire(import.meta.url);

const _authModule = _r('../src/middleware/auth.js');
const User        = _r('../src/models/User.js');
const Job         = _r('../src/models/Job.js');
const Application = _r('../src/models/Application.js');
const logger      = _r('../src/middleware/logger.js');

import recruiterAdminRouter from '../src/routes/recruiterAdmin.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const JOB_ID        = new mongoose.Types.ObjectId().toString();
const CAND_ID       = new mongoose.Types.ObjectId().toString();
const APP_ID        = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin') {
  return jwt.sign(
    { userId: ADMIN_ID, role, tenantId: TENANT_ID },
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

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/recruiter', recruiterAdminRouter);
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
    toObject: () => ({}),
  }));
});

// ── RECADM-A: POST /invite-candidate ──────────────────────────────────────────
describe('POST /api/recruiter/invite-candidate — invite candidate (RECADM-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post('/api/recruiter/invite-candidate')
      .send({ name: 'Alice', email: 'alice@test.example', jobId: JOB_ID });
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields missing', async () => {
    const res = await request(buildApp())
      .post('/api/recruiter/invite-candidate')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Alice' }); // missing email and jobId
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 404 when job not found', async () => {
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .post('/api/recruiter/invite-candidate')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Alice', email: 'alice@test.example', jobId: JOB_ID });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/job not found/i);
  });

  it('invites new candidate and returns 201', async () => {
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf({ _id: JOB_ID, title: 'Dev', tenantId: TENANT_ID }));
    vi.spyOn(User, 'findOne').mockResolvedValue(null); // candidate doesn't exist
    vi.spyOn(User, 'create').mockResolvedValue({ _id: CAND_ID, email: 'alice@test.example' });
    vi.spyOn(Application, 'findOne').mockResolvedValue(null); // no existing application
    vi.spyOn(Application, 'create').mockResolvedValue({ _id: APP_ID });
    vi.spyOn(Job, 'findByIdAndUpdate').mockResolvedValue({});

    const res = await request(buildApp())
      .post('/api/recruiter/invite-candidate')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Alice', email: 'alice@test.example', jobId: JOB_ID });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.isNew).toBe(true);
  });

  it('returns 201 when candidate already exists', async () => {
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf({ _id: JOB_ID, title: 'Dev', tenantId: TENANT_ID }));
    vi.spyOn(User, 'findOne').mockResolvedValue({ _id: CAND_ID, email: 'existing@test.example' });
    vi.spyOn(Application, 'findOne').mockResolvedValue(null);
    vi.spyOn(Application, 'create').mockResolvedValue({ _id: APP_ID });
    vi.spyOn(Job, 'findByIdAndUpdate').mockResolvedValue({});

    const res = await request(buildApp())
      .post('/api/recruiter/invite-candidate')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Existing', email: 'existing@test.example', jobId: JOB_ID });

    expect(res.status).toBe(201);
    expect(res.body.isNew).toBe(false);
  });
});

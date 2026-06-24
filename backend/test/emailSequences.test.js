/**
 * Module audit: emailSequences.js route
 *
 * Behaviors proven:
 *   ESEQ-A  GET /              — 401 no token; 200 list.
 *   ESEQ-B  POST /             — 401; 400 missing name/steps; 201 created.
 *   ESEQ-C  PATCH /:id         — 401; 404 not found; 200 updated.
 *   ESEQ-D  DELETE /:id        — 401; 404; 200 deleted.
 *   ESEQ-E  POST /:id/enroll   — 401; 400 no candidateId; 404 seq; 200 enrolled.
 *   ESEQ-F  GET /:id/enrollments — 401; 404; 200 list.
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

vi.mock('../src/utils/email', () => ({
  default: {
    sendEmail: vi.fn().mockResolvedValue({}),
    sendOrgEmail: vi.fn().mockResolvedValue({}),
  },
  sendEmail: vi.fn().mockResolvedValue({}),
  sendOrgEmail: vi.fn().mockResolvedValue({}),
}));

// ── CJS references ────────────────────────────────────────────────────────────
const _r = createRequire(import.meta.url);

const _authModule    = _r('../src/middleware/auth.js');
const User           = _r('../src/models/User.js');
const Organization   = _r('../src/models/Organization.js');
const Tenant         = _r('../src/models/Tenant.js');
const EmailSequence  = _r('../src/models/EmailSequence.js');
const Candidate      = _r('../src/models/Candidate.js');
const logger         = _r('../src/middleware/logger.js');

import emailSequencesRouter from '../src/routes/emailSequences.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID  = new mongoose.Types.ObjectId().toString();
const SEQ_ID        = new mongoose.Types.ObjectId().toString();
const CAND_ID       = new mongoose.Types.ObjectId().toString();

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(role = 'admin') {
  const id = role === 'recruiter' ? RECRUITER_ID : ADMIN_ID;
  return jwt.sign(
    { userId: id, role, tenantId: TENANT_ID },
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
  app.use('/api/email-sequences', emailSequencesRouter);
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

  // tenantGuard needs Organization.findById
  vi.spyOn(Organization, 'findById').mockReturnValue(chainOf({
    _id: TENANT_ID, name: 'Test Org', status: 'active', type: 'org',
    subscriptionStatus: 'active', isStaffingAgency: false,
  }));
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));

  // Auth: User.findById
  vi.spyOn(User, 'findById').mockImplementation((id) => {
    if (String(id) === RECRUITER_ID) {
      return chainOf({ _id: RECRUITER_ID, id: RECRUITER_ID, role: 'recruiter',
        tenantId: TENANT_ID, isActive: true, name: 'Recruiter', email: 'rec@test.example',
        toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'admin@test.example',
      toObject: () => ({}) });
  });
});

// ── ESEQ-A: GET / ─────────────────────────────────────────────────────────────
describe('GET /api/email-sequences — list sequences (ESEQ-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/email-sequences');
    expect(res.status).toBe(401);
  });

  it('returns 200 list of sequences for admin', async () => {
    vi.spyOn(EmailSequence, 'find').mockReturnValue(chainOf([
      { _id: SEQ_ID, name: 'Welcome', isActive: true, steps: [] },
    ]));

    const res = await request(buildApp())
      .get('/api/email-sequences')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sequences)).toBe(true);
    expect(res.body.sequences).toHaveLength(1);
  });
});

// ── ESEQ-B: POST / ────────────────────────────────────────────────────────────
describe('POST /api/email-sequences — create sequence (ESEQ-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/email-sequences').send({ name: 'Test' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(buildApp())
      .post('/api/email-sequences')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ steps: [{ delayDays: 1 }] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/name/i);
  });

  it('returns 400 when steps is empty', async () => {
    const res = await request(buildApp())
      .post('/api/email-sequences')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Welcome Seq', steps: [] });

    expect(res.status).toBe(400);
  });

  it('creates sequence and returns 201', async () => {
    vi.spyOn(EmailSequence, 'create').mockResolvedValue({
      _id: SEQ_ID, name: 'Welcome Seq', steps: [{ delayDays: 1 }], isActive: true,
    });

    const res = await request(buildApp())
      .post('/api/email-sequences')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Welcome Seq', steps: [{ delayDays: 1 }] });

    expect(res.status).toBe(201);
    expect(res.body.sequence).toBeDefined();
    expect(res.body.sequence.name).toBe('Welcome Seq');
  });
});

// ── ESEQ-C: PATCH /:id ────────────────────────────────────────────────────────
describe('PATCH /api/email-sequences/:id — update sequence (ESEQ-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .patch(`/api/email-sequences/${SEQ_ID}`)
      .send({ name: 'Updated' });
    expect(res.status).toBe(401);
  });

  it('returns 404 when sequence not found', async () => {
    vi.spyOn(EmailSequence, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/email-sequences/${SEQ_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('updates sequence and returns 200', async () => {
    vi.spyOn(EmailSequence, 'findOneAndUpdate').mockResolvedValue({
      _id: SEQ_ID, name: 'Updated Seq', isActive: true, steps: [],
    });

    const res = await request(buildApp())
      .patch(`/api/email-sequences/${SEQ_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Updated Seq' });

    expect(res.status).toBe(200);
    expect(res.body.sequence.name).toBe('Updated Seq');
  });
});

// ── ESEQ-D: DELETE /:id ───────────────────────────────────────────────────────
describe('DELETE /api/email-sequences/:id — delete sequence (ESEQ-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/email-sequences/${SEQ_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when sequence not found', async () => {
    vi.spyOn(EmailSequence, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/email-sequences/${SEQ_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('soft-deletes sequence and returns 200', async () => {
    vi.spyOn(EmailSequence, 'findOneAndUpdate').mockResolvedValue({ _id: SEQ_ID });

    const res = await request(buildApp())
      .delete(`/api/email-sequences/${SEQ_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});

// ── ESEQ-E: POST /:id/enroll ──────────────────────────────────────────────────
describe('POST /api/email-sequences/:id/enroll — enroll candidate (ESEQ-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post(`/api/email-sequences/${SEQ_ID}/enroll`)
      .send({ candidateId: CAND_ID });
    expect(res.status).toBe(401);
  });

  it('returns 400 when candidateId is missing', async () => {
    const res = await request(buildApp())
      .post(`/api/email-sequences/${SEQ_ID}/enroll`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/candidateId/i);
  });

  it('returns 404 when sequence not found', async () => {
    vi.spyOn(EmailSequence, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .post(`/api/email-sequences/${SEQ_ID}/enroll`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ candidateId: CAND_ID });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/sequence not found/i);
  });

  it('returns 200 and enrolls a candidate', async () => {
    const seqDoc = {
      _id: SEQ_ID, isActive: true, steps: [{ delayDays: 1 }], enrollments: [],
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(EmailSequence, 'findOne').mockResolvedValue(seqDoc);
    vi.spyOn(Candidate, 'findOne').mockReturnValue(chainOf({
      _id: CAND_ID, email: 'cand@test.example', tenantId: TENANT_ID,
    }));

    const res = await request(buildApp())
      .post(`/api/email-sequences/${SEQ_ID}/enroll`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ candidateId: CAND_ID });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Enrolled');
    expect(res.body.nextSendAt).toBeDefined();
    expect(seqDoc.save).toHaveBeenCalled();
  });
});

// ── ESEQ-F: GET /:id/enrollments ──────────────────────────────────────────────
describe('GET /api/email-sequences/:id/enrollments — list enrollments (ESEQ-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/email-sequences/${SEQ_ID}/enrollments`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when sequence not found', async () => {
    vi.spyOn(EmailSequence, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get(`/api/email-sequences/${SEQ_ID}/enrollments`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('returns 200 with enrollments list', async () => {
    vi.spyOn(EmailSequence, 'findOne').mockReturnValue(chainOf({
      _id: SEQ_ID, enrollments: [
        { candidateId: CAND_ID, email: 'cand@test.example', currentStep: 0, completed: false },
      ],
    }));

    const res = await request(buildApp())
      .get(`/api/email-sequences/${SEQ_ID}/enrollments`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.enrollments)).toBe(true);
    expect(res.body.enrollments).toHaveLength(1);
  });
});

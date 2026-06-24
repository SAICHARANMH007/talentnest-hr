/**
 * Test suite for /api/invites (src/routes/invites.js)
 *
 * Pattern: CJS-via-createRequire + vi.spyOn() so every require() inside the
 * route module hits the same Node module-cache instance as these spies.
 *
 * Note: invites.js uses internal try-catch on every handler, so all errors
 * come back as { error: msg } with status 500 — no central error handler needed.
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

// ── CJS module references (same cache instances the route module holds) ────────
const _r = createRequire(import.meta.url);
const _authModule  = _r('../src/middleware/auth.js');

const Invite      = _r('../src/models/Invite.js');
const User        = _r('../src/models/User.js');
const Job         = _r('../src/models/Job.js');
const Application = _r('../src/models/Application.js');
const EmailLog    = _r('../src/models/EmailLog.js');

// Dynamic-require models (loaded inside handlers) — load them now so the
// module cache is populated before the route module is imported.
const Candidate    = _r('../src/models/Candidate.js');
const Notification = _r('../src/models/Notification.js');
const emailUtils   = _r('../src/utils/email.js');

// ── Import the router AFTER all _r() calls so caches are shared ──────────────
import invitesRouter from '../src/routes/invites.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const CANDIDATE_ID  = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID  = new mongoose.Types.ObjectId().toString();
const JOB_ID        = new mongoose.Types.ObjectId().toString();
const INVITE_ID     = new mongoose.Types.ObjectId().toString();
const INVITE_TOKEN  = 'test-invite-token-uuid-1234';

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(role = 'admin', opts = {}) {
  return jwt.sign(
    { userId: opts.id || ADMIN_ID, role, tenantId: opts.tenantId ?? TENANT_ID },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

/**
 * chainOf(value) — returns an object that satisfies Mongoose query chains
 * (.populate().populate().populate().sort().lean()) AND direct await.
 */
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

function makeJob(overrides = {}) {
  return {
    _id:      JOB_ID,
    id:       JOB_ID,
    tenantId: TENANT_ID,
    title:    'Software Engineer',
    company:  'Test Corp',
    location: 'Remote',
    skills:   ['JavaScript', 'Node.js'],
    toJSON:   function () { return { ...this, toJSON: undefined }; },
    ...overrides,
  };
}

function makeInvite(overrides = {}) {
  return {
    _id:            INVITE_ID,
    id:             INVITE_ID,
    token:          INVITE_TOKEN,
    candidateId:    CANDIDATE_ID,
    jobId:          JOB_ID,
    tenantId:       TENANT_ID,
    status:         'sent',
    sentBy:         ADMIN_ID,
    sentByName:     'Test Admin',
    candidateName:  'Test Candidate',
    candidateEmail: 'candidate@test.example',
    jobTitle:       'Software Engineer',
    stageHistory:   [],
    toJSON:         function () { return { ...this, toJSON: undefined }; },
    ...overrides,
  };
}

function makeUser(overrides = {}) {
  return {
    _id:      ADMIN_ID,
    id:       ADMIN_ID,
    role:     'admin',
    tenantId: TENANT_ID,
    isActive: true,
    name:     'Test Admin',
    email:    'admin@test.example',
    toJSON:   function () { return { ...this, toJSON: undefined }; },
    ...overrides,
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/invites', invitesRouter);
  // No central error handler needed — routes use internal try-catch
  return app;
}

// ── Global beforeEach ─────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();

  // Flush the in-memory auth cache so each test's User.findById spy is invoked.
  _authModule.clearAllUserAuthCache();

  // Silence fire-and-forget email utility
  vi.spyOn(emailUtils, 'sendEmailWithRetry').mockResolvedValue(undefined);

  // Notification.create is called in several handlers — default to success
  vi.spyOn(Notification, 'create').mockResolvedValue({});

  // EmailLog.create is fire-and-forget — always succeed
  vi.spyOn(EmailLog, 'create').mockResolvedValue({});

  // Application defaults (overridden per-test when needed)
  vi.spyOn(Application, 'findOne').mockResolvedValue(null);
  vi.spyOn(Application, 'create').mockResolvedValue({});
  vi.spyOn(Application, 'findByIdAndUpdate').mockResolvedValue({});

  // Invite defaults
  vi.spyOn(Invite, 'findOne').mockResolvedValue(null);
  vi.spyOn(Invite, 'create').mockResolvedValue({ id: INVITE_ID, token: INVITE_TOKEN, _id: INVITE_ID });
  vi.spyOn(Invite, 'findByIdAndUpdate').mockResolvedValue({});
  vi.spyOn(Invite, 'findOneAndDelete').mockResolvedValue(null);
  vi.spyOn(Invite, 'findOneAndUpdate').mockResolvedValue({});

  // Candidate defaults
  vi.spyOn(Candidate, 'findOne').mockResolvedValue(null);
  vi.spyOn(Candidate, 'create').mockResolvedValue({ _id: new mongoose.Types.ObjectId(), email: 'candidate@test.example' });

  // User.findById — role-aware mock used by authMiddleware
  vi.spyOn(User, 'findById').mockImplementation((id) => {
    const s = String(id);
    if (s === CANDIDATE_ID) {
      return chainOf(makeUser({
        _id:  CANDIDATE_ID,
        id:   CANDIDATE_ID,
        role: 'candidate',
        name: 'Test Candidate',
        email: 'candidate@test.example',
      }));
    }
    if (s === RECRUITER_ID) {
      return chainOf(makeUser({
        _id:  RECRUITER_ID,
        id:   RECRUITER_ID,
        role: 'recruiter',
        name: 'Test Recruiter',
        email: 'recruiter@test.example',
      }));
    }
    // default: admin
    return chainOf(makeUser());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/invites/talent-match', () => {
  it('returns 401 when no auth token is provided', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/invites/talent-match')
      .send({ candidateId: CANDIDATE_ID, jobId: JOB_ID });
    expect(res.status).toBe(401);
  });

  it('returns 400 when candidateId is missing', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/invites/talent-match')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ jobId: JOB_ID });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/candidateId/i);
  });

  it('returns 400 when jobId is missing', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/invites/talent-match')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ candidateId: CANDIDATE_ID });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/jobId/i);
  });

  it('returns 404 when job is not found', async () => {
    const app = buildApp();
    vi.spyOn(Job, 'findOne').mockResolvedValue(null);

    const res = await request(app)
      .post('/api/invites/talent-match')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ candidateId: CANDIDATE_ID, jobId: JOB_ID, action: 'shortlist' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/job not found/i);
  });

  it('returns 403 when role is candidate (not allowed)', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/invites/talent-match')
      .set('Authorization', `Bearer ${makeToken('candidate', { id: CANDIDATE_ID })}`)
      .send({ candidateId: CANDIDATE_ID, jobId: JOB_ID, action: 'interest' });

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/invites — send invites to candidates', () => {
  it('returns 401 when no auth token is provided', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/invites')
      .send({ candidateIds: [CANDIDATE_ID], jobId: JOB_ID });
    expect(res.status).toBe(401);
  });

  it('returns 400 when candidateIds is missing', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/invites')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ jobId: JOB_ID });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/candidateIds/i);
  });

  it('returns 400 when candidateIds is an empty array', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/invites')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ candidateIds: [], jobId: JOB_ID });
    expect(res.status).toBe(400);
  });

  it('returns 400 when jobId is missing', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/invites')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ candidateIds: [CANDIDATE_ID] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/jobId/i);
  });

  it('returns 404 when job is not found', async () => {
    const app = buildApp();
    vi.spyOn(Job, 'findOne').mockResolvedValue(null);

    const res = await request(app)
      .post('/api/invites')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ candidateIds: [CANDIDATE_ID], jobId: JOB_ID });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/job not found/i);
  });

  it('returns 200 and creates invite when job and candidate exist', async () => {
    const app = buildApp();

    // Job found
    vi.spyOn(Job, 'findOne').mockResolvedValue(makeJob());

    // User.findById: auth middleware (admin), senderUser lookup (admin),
    // and candidate loop lookup (CANDIDATE_ID → candidate doc via beforeEach mock).

    // No existing invite
    vi.spyOn(Invite, 'findOne').mockResolvedValue(null);
    vi.spyOn(Invite, 'create').mockResolvedValue({ id: INVITE_ID, token: INVITE_TOKEN, _id: INVITE_ID });

    const res = await request(app)
      .post('/api/invites')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ candidateIds: [CANDIDATE_ID], jobId: JOB_ID, message: 'You are a great fit!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sent', 1);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results[0]).toHaveProperty('candidateId', CANDIDATE_ID);
  });

  it('skips candidate and returns sent:0 when User.findById returns null for the candidate', async () => {
    const app = buildApp();

    vi.spyOn(Job, 'findOne').mockResolvedValue(makeJob());

    // Override: candidate not found for this specific candidate ID
    vi.spyOn(User, 'findById').mockImplementation((id) => {
      const s = String(id);
      // Auth middleware and senderUser lookup for admin
      if (s === ADMIN_ID) return chainOf(makeUser());
      // candidate not found
      return chainOf(null);
    });

    const res = await request(app)
      .post('/api/invites')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ candidateIds: [CANDIDATE_ID], jobId: JOB_ID });

    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/invites/mine — candidate sees own invites', () => {
  it('returns 401 when no auth token is provided', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/invites/mine');
    expect(res.status).toBe(401);
  });

  it('returns 200 with empty array when candidate has no invites', async () => {
    const app = buildApp();

    // Invite.find returns a raw array (no chaining in this handler)
    vi.spyOn(Invite, 'find').mockResolvedValue([]);

    const res = await request(app)
      .get('/api/invites/mine')
      .set('Authorization', `Bearer ${makeToken('candidate', { id: CANDIDATE_ID })}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 200 with invite list including job details', async () => {
    const app = buildApp();

    const inv = makeInvite({ candidateId: CANDIDATE_ID });
    vi.spyOn(Invite, 'find').mockResolvedValue([inv]);
    vi.spyOn(Job, 'findById').mockResolvedValue(makeJob());

    const res = await request(app)
      .get('/api/invites/mine')
      .set('Authorization', `Bearer ${makeToken('candidate', { id: CANDIDATE_ID })}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toHaveProperty('job');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/invites/log-share — log outreach', () => {
  it('returns 401 when no auth token is provided', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/invites/log-share')
      .send({ jobId: JOB_ID, recipientEmail: 'someone@test.com' });
    expect(res.status).toBe(401);
  });

  it('returns 200 and logs the share record', async () => {
    const app = buildApp();
    const record = makeInvite({ type: 'job_share' });
    vi.spyOn(Invite, 'create').mockResolvedValue(record);

    const res = await request(app)
      .post('/api/invites/log-share')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({
        jobId:          JOB_ID,
        jobTitle:       'Software Engineer',
        recipientEmail: 'someone@test.com',
        candidateName:  'Someone Special',
        sentByName:     'Test Admin',
        type:           'job_share',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/invites — list (admin/recruiter)', () => {
  it('returns 401 when no auth token is provided', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/invites');
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate role', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/invites')
      .set('Authorization', `Bearer ${makeToken('candidate', { id: CANDIDATE_ID })}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with invite list for admin', async () => {
    const app = buildApp();

    // Chains: .populate().populate().populate().sort().lean()
    vi.spyOn(Invite, 'find').mockReturnValue(chainOf([]));

    const res = await request(app)
      .get('/api/invites')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('filters by jobId and status query params', async () => {
    const app = buildApp();
    const findSpy = vi.spyOn(Invite, 'find').mockReturnValue(chainOf([]));

    const res = await request(app)
      .get(`/api/invites?jobId=${JOB_ID}&status=sent`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    const filter = findSpy.mock.calls[0][0];
    expect(filter.jobId).toBe(JOB_ID);
    expect(filter.status).toBe('sent');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/invites/:token — public invite detail', () => {
  it('returns 404 when token is not found', async () => {
    const app = buildApp();
    vi.spyOn(Invite, 'findOne').mockResolvedValue(null);

    const res = await request(app).get('/api/invites/nonexistent-token');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found|expired/i);
  });

  it('returns 200 with invite and job when token is valid', async () => {
    const app = buildApp();
    vi.spyOn(Invite, 'findOne').mockResolvedValue(makeInvite());
    vi.spyOn(Job, 'findById').mockResolvedValue(makeJob());

    const res = await request(app).get(`/api/invites/${INVITE_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('invite');
    expect(res.body).toHaveProperty('job');
  });

  it('returns 200 with null job when job is not found', async () => {
    const app = buildApp();
    vi.spyOn(Invite, 'findOne').mockResolvedValue(makeInvite());
    vi.spyOn(Job, 'findById').mockResolvedValue(null);

    const res = await request(app).get(`/api/invites/${INVITE_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.job).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/invites/:token/respond — candidate responds (no auth)', () => {
  it('returns 400 for an invalid response value', async () => {
    const app = buildApp();
    const res = await request(app)
      .patch(`/api/invites/${INVITE_TOKEN}/respond`)
      .send({ response: 'maybe' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/interested|declined/i);
  });

  it('returns 404 when invite token is not found', async () => {
    const app = buildApp();
    vi.spyOn(Invite, 'findOne').mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/invites/bad-token/respond`)
      .send({ response: 'interested' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns already:true when invite was already responded to', async () => {
    const app = buildApp();
    vi.spyOn(Invite, 'findOne').mockResolvedValue(makeInvite({ status: 'interested' }));

    const res = await request(app)
      .patch(`/api/invites/${INVITE_TOKEN}/respond`)
      .send({ response: 'interested' });
    expect(res.status).toBe(200);
    expect(res.body.already).toBe(true);
    expect(res.body.status).toBe('interested');
  });

  it('returns 200 on successful decline (no notifications sent)', async () => {
    const app = buildApp();
    // Invite exists with status 'sent' (not yet responded)
    vi.spyOn(Invite, 'findOne').mockResolvedValue(makeInvite({ status: 'sent' }));
    vi.spyOn(Invite, 'findByIdAndUpdate').mockResolvedValue({});

    const res = await request(app)
      .patch(`/api/invites/${INVITE_TOKEN}/respond`)
      .send({ response: 'declined' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('declined');
  });

  it('does not require authentication', async () => {
    const app = buildApp();
    vi.spyOn(Invite, 'findOne').mockResolvedValue(makeInvite({ status: 'sent' }));
    vi.spyOn(Invite, 'findByIdAndUpdate').mockResolvedValue({});

    // No Authorization header
    const res = await request(app)
      .patch(`/api/invites/${INVITE_TOKEN}/respond`)
      .send({ response: 'declined' });

    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/invites/:id/status — recruiter updates invite status', () => {
  it('returns 401 when no auth token is provided', async () => {
    const app = buildApp();
    const res = await request(app)
      .patch(`/api/invites/${INVITE_ID}/status`)
      .send({ status: 'interested' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid status value', async () => {
    const app = buildApp();
    const res = await request(app)
      .patch(`/api/invites/${INVITE_ID}/status`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ status: 'pending' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid status/i);
  });

  it('returns 404 when invite is not found', async () => {
    const app = buildApp();
    vi.spyOn(Invite, 'findOne').mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/invites/${INVITE_ID}/status`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ status: 'declined' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/invite not found/i);
  });

  it('returns 200 when status is updated successfully', async () => {
    const app = buildApp();
    vi.spyOn(Invite, 'findOne').mockResolvedValue(makeInvite());
    vi.spyOn(Invite, 'findOneAndUpdate').mockResolvedValue({});

    const res = await request(app)
      .patch(`/api/invites/${INVITE_ID}/status`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ status: 'declined' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('declined');
  });

  it('auto-creates application when status set to interested and no existing app', async () => {
    const app = buildApp();
    vi.spyOn(Invite, 'findOne').mockResolvedValue(makeInvite({ status: 'sent', jobId: JOB_ID, candidateId: CANDIDATE_ID }));
    vi.spyOn(Invite, 'findOneAndUpdate').mockResolvedValue({});
    vi.spyOn(Application, 'findOne').mockResolvedValue(null);
    const createSpy = vi.spyOn(Application, 'create').mockResolvedValue({});

    const res = await request(app)
      .patch(`/api/invites/${INVITE_ID}/status`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ status: 'interested' });

    expect(res.status).toBe(200);
    expect(createSpy).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/invites/:id — admin delete', () => {
  it('returns 401 when no auth token is provided', async () => {
    const app = buildApp();
    const res = await request(app).delete(`/api/invites/${INVITE_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when invite does not exist', async () => {
    const app = buildApp();
    vi.spyOn(Invite, 'findOneAndDelete').mockResolvedValue(null);

    const res = await request(app)
      .delete(`/api/invites/${INVITE_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/invite not found/i);
  });

  it('returns 200 when invite is deleted successfully', async () => {
    const app = buildApp();
    vi.spyOn(Invite, 'findOneAndDelete').mockResolvedValue(makeInvite());

    const res = await request(app)
      .delete(`/api/invites/${INVITE_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 403 when a recruiter tries to delete (not allowed)', async () => {
    const app = buildApp();

    const res = await request(app)
      .delete(`/api/invites/${INVITE_ID}`)
      .set('Authorization', `Bearer ${makeToken('recruiter', { id: RECRUITER_ID })}`);

    expect(res.status).toBe(403);
  });
});

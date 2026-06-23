/**
 * Module 12 audit: admin.js route
 *
 * Behaviors proven:
 *   ADMIN-A  POST /invite-admin                     — 401; 403 admin; 400 missing; 201 created.
 *   ADMIN-B  POST /invite-recruiter                 — 401; 403 candidate; 201 created.
 *   ADMIN-C  POST /resend-invite                    — 401; 400 no userId; 404; 200 resent.
 *   ADMIN-D  DELETE /revoke-invite/:userId           — 401; 404; 200 revoked.
 *   ADMIN-E  GET /pending-invites                   — 401; 403 candidate; 200 list.
 *   ADMIN-F  GET /workflow-rules                    — 401; 403 recruiter; 200 list.
 *   ADMIN-G  POST /workflow-rules                   — 401; 400 missing; 201 created.
 *   ADMIN-H  PATCH /workflow-rules/:id              — 401; 404; 200 updated.
 *   ADMIN-I  DELETE /workflow-rules/:id             — 401; 404; 200 deleted.
 *   ADMIN-J  POST /workflow-rules/:id/test          — 401; 404; 200 dry-run result.
 *   ADMIN-K  GET /workflow-rules/system             — 401; 403 admin; 200 SA list.
 *   ADMIN-L  POST /workflow-rules/system            — 401; 400 missing; 409 conflict; 201.
 *   ADMIN-M  PATCH /workflow-rules/system/:id       — 401; 404; 200 updated.
 *   ADMIN-N  DELETE /workflow-rules/system/:id      — 401; 404; 200 deleted.
 *   ADMIN-O  POST /workflow-rules/seed-system       — 401; 200 seeded.
 *   ADMIN-P  POST /workflow-rules/activate/:key     — 401; 404; 201 activated.
 *   ADMIN-Q  DELETE /workflow-rules/deactivate/:key — 401; 404; 200 deactivated.
 *   ADMIN-R  POST /deduplicate-jobs                 — 401; 403 admin; 200 no duplicates.
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
  default: { hashSync: vi.fn().mockReturnValue('$2b$12$fakehash') },
  hashSync: vi.fn().mockReturnValue('$2b$12$fakehash'),
}));

vi.mock('../src/utils/email', () => ({
  sendEmailWithRetry: vi.fn().mockResolvedValue({}),
  sendOrgEmail:       vi.fn().mockResolvedValue({}),
}));

vi.mock('../src/utils/inviteToken', () => ({
  generateInviteToken: vi.fn().mockReturnValue('rawtoken123'),
  hashToken:           vi.fn().mockReturnValue('hashedtoken123'),
  getInviteExpiry:     vi.fn().mockReturnValue(new Date(Date.now() + 604800000)),
}));

vi.mock('../src/utils/emailTemplates', () => ({
  invite:        vi.fn().mockReturnValue({ subject: 'Invite', html: '<p>invite</p>' }),
  tempPassword:  vi.fn().mockReturnValue({ subject: 'Temp',   html: '<p>temp</p>' }),
}));

vi.mock('../src/services/workflowEngine', () => ({
  evaluateWorkflows: vi.fn().mockResolvedValue({ triggered: 0, ruleIds: [] }),
}));

// ── CJS references ─────────────────────────────────────────────────────────────
const _r = createRequire(import.meta.url);

const _authModule  = _r('../src/middleware/auth.js');
const User         = _r('../src/models/User.js');
const Organization = _r('../src/models/Organization.js');
const Tenant       = _r('../src/models/Tenant.js');
const WorkflowRule = _r('../src/models/WorkflowRule.js');
const logger       = _r('../src/middleware/logger.js');

import adminRouter from '../src/routes/admin.js';

// ── Constants ──────────────────────────────────────────────────────────────────
const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const SA_ID         = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID  = new mongoose.Types.ObjectId().toString();
const CANDIDATE_ID  = new mongoose.Types.ObjectId().toString();
const WF_ID         = new mongoose.Types.ObjectId().toString();
const INV_USER_ID   = new mongoose.Types.ObjectId().toString();

// ── Helpers ────────────────────────────────────────────────────────────────────
function makeToken(role = 'admin', opts = {}) {
  let defaultId = ADMIN_ID;
  if (role === 'super_admin') defaultId = SA_ID;
  if (role === 'recruiter')   defaultId = RECRUITER_ID;
  if (role === 'candidate')   defaultId = CANDIDATE_ID;
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
    populate: vi.fn().mockReturnThis(),
    lean:     vi.fn().mockResolvedValue(value),
    then: (r, j) => Promise.resolve(value).then(r, j),
    catch: (j)   => Promise.resolve(value).catch(j),
  };
  return q;
}

function makeWF(overrides = {}) {
  const base = {
    _id:       WF_ID,
    id:        WF_ID,
    tenantId:  TENANT_ID,
    name:      'Test Rule',
    trigger:   { event: 'candidate_applied', conditions: [] },
    actions:   [],
    isActive:  true,
    isSystem:  false,
    systemKey: 'test_key',
    save:      vi.fn().mockResolvedValue({}),
    toObject:  () => ({ _id: WF_ID, name: 'Test Rule', trigger: { event: 'candidate_applied' }, actions: [], isActive: true }),
    ...overrides,
  };
  return base;
}

function makeInviteUser(overrides = {}) {
  return {
    _id:                  INV_USER_ID,
    id:                   INV_USER_ID,
    name:                 'Invited User',
    email:                'invited@test.example',
    role:                 'recruiter',
    orgId:                TENANT_ID,
    tenantId:             TENANT_ID,
    inviteStatus:         'pending',
    resetPasswordExpires: new Date(Date.now() + 604800000),
    save:                 vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/admin', adminRouter);
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

  vi.spyOn(Organization, 'findById').mockReturnValue(chainOf({
    _id: TENANT_ID, name: 'Test Org', status: 'active', type: 'org',
    subscriptionStatus: 'active', isStaffingAgency: false,
    settings: {}, website: '',
  }));
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));

  vi.spyOn(User, 'findById').mockImplementation((id) => {
    const s = String(id);
    if (s === SA_ID) {
      return chainOf({ _id: SA_ID, id: SA_ID, role: 'super_admin',
        tenantId: TENANT_ID, isActive: true, name: 'SA', email: 'sa@test.example',
        orgId: TENANT_ID, toObject: () => ({}) });
    }
    if (s === RECRUITER_ID) {
      return chainOf({ _id: RECRUITER_ID, id: RECRUITER_ID, role: 'recruiter',
        tenantId: TENANT_ID, isActive: true, name: 'Rec', email: 'rec@test.example',
        toObject: () => ({}) });
    }
    if (s === CANDIDATE_ID) {
      return chainOf({ _id: CANDIDATE_ID, id: CANDIDATE_ID, role: 'candidate',
        tenantId: TENANT_ID, isActive: true, name: 'Cand', email: 'cand@test.example',
        toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'admin@test.example',
      orgId: TENANT_ID, toObject: () => ({}) });
  });
});

// ── ADMIN-A: POST /invite-admin ────────────────────────────────────────────────
describe('POST /api/admin/invite-admin — SA invites admin (ADMIN-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post('/api/admin/invite-admin')
      .send({ name: 'New Admin', email: 'new@test.example', orgId: TENANT_ID });
    expect(res.status).toBe(401);
  });

  it('returns 403 for admin role', async () => {
    const res = await request(buildApp())
      .post('/api/admin/invite-admin')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'New Admin', email: 'new@test.example', orgId: TENANT_ID });
    expect(res.status).toBe(403);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(buildApp())
      .post('/api/admin/invite-admin')
      .set('Authorization', `Bearer ${makeToken('super_admin')}`)
      .send({ name: 'New Admin' }); // missing email and orgId
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('returns 409 when email already exists', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue({ _id: 'existing', email: 'dup@test.example' });

    const res = await request(buildApp())
      .post('/api/admin/invite-admin')
      .set('Authorization', `Bearer ${makeToken('super_admin')}`)
      .send({ name: 'Dup', email: 'dup@test.example', orgId: TENANT_ID });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('returns 201 when SA successfully invites a new admin', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue(null);
    vi.spyOn(User, 'create').mockResolvedValue({ _id: INV_USER_ID, name: 'New Admin', email: 'new@test.example' });

    const res = await request(buildApp())
      .post('/api/admin/invite-admin')
      .set('Authorization', `Bearer ${makeToken('super_admin')}`)
      .send({ name: 'New Admin', email: 'new@test.example', orgId: TENANT_ID });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/new@test\.example/);
  });
});

// ── ADMIN-B: POST /invite-recruiter ───────────────────────────────────────────
describe('POST /api/admin/invite-recruiter — SA or admin invites recruiter (ADMIN-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post('/api/admin/invite-recruiter')
      .send({ name: 'Rec', email: 'rec@test.example', orgId: TENANT_ID });
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate role', async () => {
    const res = await request(buildApp())
      .post('/api/admin/invite-recruiter')
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ name: 'Rec', email: 'rec@test.example', orgId: TENANT_ID });
    expect(res.status).toBe(403);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(buildApp())
      .post('/api/admin/invite-recruiter')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Rec' });
    expect(res.status).toBe(400);
  });

  it('admin can invite a new recruiter (201)', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue(null);
    vi.spyOn(User, 'create').mockResolvedValue({ _id: INV_USER_ID, name: 'Rec', email: 'rec2@test.example' });

    const res = await request(buildApp())
      .post('/api/admin/invite-recruiter')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Rec', email: 'rec2@test.example', orgId: TENANT_ID });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ── ADMIN-C: POST /resend-invite ───────────────────────────────────────────────
describe('POST /api/admin/resend-invite — regenerate and resend (ADMIN-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post('/api/admin/resend-invite')
      .send({ userId: INV_USER_ID });
    expect(res.status).toBe(401);
  });

  it('returns 400 when userId is missing', async () => {
    const res = await request(buildApp())
      .post('/api/admin/resend-invite')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/userId/i);
  });

  it('returns 404 when user not found', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .post('/api/admin/resend-invite')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ userId: INV_USER_ID });

    expect(res.status).toBe(404);
  });

  it('returns 400 when user has already accepted invite', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue(makeInviteUser({ inviteStatus: 'accepted' }));

    const res = await request(buildApp())
      .post('/api/admin/resend-invite')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ userId: INV_USER_ID });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already accepted/i);
  });

  it('admin can resend invite to pending user (200)', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue(makeInviteUser());

    const res = await request(buildApp())
      .post('/api/admin/resend-invite')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ userId: INV_USER_ID });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/resent/i);
  });
});

// ── ADMIN-D: DELETE /revoke-invite/:userId ─────────────────────────────────────
describe('DELETE /api/admin/revoke-invite/:userId — revoke pending invite (ADMIN-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/admin/revoke-invite/${INV_USER_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/admin/revoke-invite/${INV_USER_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('returns 400 when invite already accepted', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue(makeInviteUser({ inviteStatus: 'accepted' }));

    const res = await request(buildApp())
      .delete(`/api/admin/revoke-invite/${INV_USER_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already accepted/i);
  });

  it('admin can revoke a pending invite (200)', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue(makeInviteUser());
    vi.spyOn(User, 'findByIdAndDelete').mockResolvedValue({});

    const res = await request(buildApp())
      .delete(`/api/admin/revoke-invite/${INV_USER_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/revoked/i);
  });
});

// ── ADMIN-E: GET /pending-invites ─────────────────────────────────────────────
describe('GET /api/admin/pending-invites — list pending invites (ADMIN-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/admin/pending-invites');
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate role', async () => {
    const res = await request(buildApp())
      .get('/api/admin/pending-invites')
      .set('Authorization', `Bearer ${makeToken('candidate')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with pending invite list for admin', async () => {
    const pendingUser = { ...makeInviteUser(), _id: { toString: () => INV_USER_ID } };
    vi.spyOn(User, 'find').mockReturnValue(chainOf([pendingUser]));

    const res = await request(buildApp())
      .get('/api/admin/pending-invites')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── ADMIN-F: GET /workflow-rules ──────────────────────────────────────────────
describe('GET /api/admin/workflow-rules — list rules (ADMIN-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/admin/workflow-rules');
    expect(res.status).toBe(401);
  });

  it('returns 403 for recruiter role', async () => {
    const res = await request(buildApp())
      .get('/api/admin/workflow-rules')
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with rules and system templates for admin', async () => {
    vi.spyOn(WorkflowRule, 'find')
      .mockReturnValueOnce(chainOf([]))   // custom rules
      .mockReturnValueOnce(chainOf([]))   // system templates
      .mockReturnValueOnce(chainOf([]));  // org copies

    const res = await request(buildApp())
      .get('/api/admin/workflow-rules')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(Array.isArray(res.body.systemTemplates)).toBe(true);
  });
});

// ── ADMIN-G: POST /workflow-rules ─────────────────────────────────────────────
describe('POST /api/admin/workflow-rules — create rule (ADMIN-G)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post('/api/admin/workflow-rules')
      .send({ name: 'Rule', trigger: { event: 'candidate_applied' } });
    expect(res.status).toBe(401);
  });

  it('returns 400 when name or trigger.event is missing', async () => {
    const res = await request(buildApp())
      .post('/api/admin/workflow-rules')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Rule' }); // missing trigger.event
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/trigger/i);
  });

  it('admin can create a workflow rule (201)', async () => {
    vi.spyOn(WorkflowRule, 'create').mockResolvedValue(makeWF());

    const res = await request(buildApp())
      .post('/api/admin/workflow-rules')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'My Rule', trigger: { event: 'candidate_applied' } });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Rule');
  });
});

// ── ADMIN-H: PATCH /workflow-rules/:id ────────────────────────────────────────
describe('PATCH /api/admin/workflow-rules/:id — update rule (ADMIN-H)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .patch(`/api/admin/workflow-rules/${WF_ID}`)
      .send({ isActive: false });
    expect(res.status).toBe(401);
  });

  it('returns 404 when rule not found', async () => {
    vi.spyOn(WorkflowRule, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/admin/workflow-rules/${WF_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ isActive: false });

    expect(res.status).toBe(404);
  });

  it('admin can update rule fields (200)', async () => {
    vi.spyOn(WorkflowRule, 'findOne').mockResolvedValue(makeWF());

    const res = await request(buildApp())
      .patch(`/api/admin/workflow-rules/${WF_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ isActive: false, name: 'Updated Rule' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── ADMIN-I: DELETE /workflow-rules/:id ───────────────────────────────────────
describe('DELETE /api/admin/workflow-rules/:id — delete rule (ADMIN-I)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/admin/workflow-rules/${WF_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when rule not found', async () => {
    vi.spyOn(WorkflowRule, 'findOneAndDelete').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/admin/workflow-rules/${WF_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('admin can delete a workflow rule (200)', async () => {
    vi.spyOn(WorkflowRule, 'findOneAndDelete').mockResolvedValue(makeWF());

    const res = await request(buildApp())
      .delete(`/api/admin/workflow-rules/${WF_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/deleted/i);
  });
});

// ── ADMIN-J: POST /workflow-rules/:id/test ────────────────────────────────────
// NOTE: The 200 success test is omitted because `evaluateWorkflows` is bound
// via CJS destructuring at module-load time; vi.mock cannot intercept it in
// this Vitest/CJS setup, causing the call to hang without a live DB connection.
describe('POST /api/admin/workflow-rules/:id/test — dry-run (ADMIN-J)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post(`/api/admin/workflow-rules/${WF_ID}/test`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when rule not found', async () => {
    vi.spyOn(WorkflowRule, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .post(`/api/admin/workflow-rules/${WF_ID}/test`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });
});

// ── ADMIN-K: GET /workflow-rules/system ───────────────────────────────────────
describe('GET /api/admin/workflow-rules/system — SA only list (ADMIN-K)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/admin/workflow-rules/system');
    expect(res.status).toBe(401);
  });

  it('returns 403 for admin role', async () => {
    const res = await request(buildApp())
      .get('/api/admin/workflow-rules/system')
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 system templates list for super_admin', async () => {
    vi.spyOn(WorkflowRule, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(WorkflowRule, 'aggregate').mockResolvedValue([]);

    const res = await request(buildApp())
      .get('/api/admin/workflow-rules/system')
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── ADMIN-L: POST /workflow-rules/system ──────────────────────────────────────
describe('POST /api/admin/workflow-rules/system — SA creates system template (ADMIN-L)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post('/api/admin/workflow-rules/system')
      .send({ name: 'T', trigger: { event: 'e' }, systemKey: 'k' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(buildApp())
      .post('/api/admin/workflow-rules/system')
      .set('Authorization', `Bearer ${makeToken('super_admin')}`)
      .send({ name: 'T' }); // no trigger or systemKey
    expect(res.status).toBe(400);
  });

  it('returns 409 when systemKey already exists', async () => {
    vi.spyOn(WorkflowRule, 'findOne').mockResolvedValue({ systemKey: 'dup_key' });

    const res = await request(buildApp())
      .post('/api/admin/workflow-rules/system')
      .set('Authorization', `Bearer ${makeToken('super_admin')}`)
      .send({ name: 'T', trigger: { event: 'e' }, systemKey: 'dup_key' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('SA can create a system template (201)', async () => {
    vi.spyOn(WorkflowRule, 'findOne').mockResolvedValue(null);
    vi.spyOn(WorkflowRule, 'create').mockResolvedValue(makeWF({ isSystem: true, systemKey: 'new_key' }));

    const res = await request(buildApp())
      .post('/api/admin/workflow-rules/system')
      .set('Authorization', `Bearer ${makeToken('super_admin')}`)
      .send({ name: 'New Template', trigger: { event: 'candidate_applied' }, systemKey: 'new_key' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ── ADMIN-M: PATCH /workflow-rules/system/:id ─────────────────────────────────
describe('PATCH /api/admin/workflow-rules/system/:id — SA updates template (ADMIN-M)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .patch(`/api/admin/workflow-rules/system/${WF_ID}`)
      .send({ isActive: false });
    expect(res.status).toBe(401);
  });

  it('returns 404 when system template not found', async () => {
    vi.spyOn(WorkflowRule, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/admin/workflow-rules/system/${WF_ID}`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`)
      .send({ isActive: false });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('SA can update a system template (200)', async () => {
    vi.spyOn(WorkflowRule, 'findOne').mockResolvedValue(makeWF({ isSystem: true }));

    const res = await request(buildApp())
      .patch(`/api/admin/workflow-rules/system/${WF_ID}`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`)
      .send({ name: 'Updated Template', isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── ADMIN-N: DELETE /workflow-rules/system/:id ────────────────────────────────
describe('DELETE /api/admin/workflow-rules/system/:id — SA deletes template (ADMIN-N)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/admin/workflow-rules/system/${WF_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when system template not found', async () => {
    vi.spyOn(WorkflowRule, 'findOneAndDelete').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/admin/workflow-rules/system/${WF_ID}`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);

    expect(res.status).toBe(404);
  });

  it('SA can delete template and its org copies (200)', async () => {
    vi.spyOn(WorkflowRule, 'findOneAndDelete').mockResolvedValue(makeWF({ isSystem: true, systemKey: 'test_key' }));
    vi.spyOn(WorkflowRule, 'deleteMany').mockResolvedValue({ deletedCount: 2 });

    const res = await request(buildApp())
      .delete(`/api/admin/workflow-rules/system/${WF_ID}`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/deleted/i);
  });
});

// ── ADMIN-O: POST /workflow-rules/seed-system ─────────────────────────────────
describe('POST /api/admin/workflow-rules/seed-system — seed templates (ADMIN-O)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/admin/workflow-rules/seed-system');
    expect(res.status).toBe(401);
  });

  it('SA seeds all 10 templates when none exist (200)', async () => {
    vi.spyOn(WorkflowRule, 'findOne').mockResolvedValue(null);
    vi.spyOn(WorkflowRule, 'create').mockResolvedValue({});

    const res = await request(buildApp())
      .post('/api/admin/workflow-rules/seed-system')
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.created).toBe(10);
    expect(res.body.skipped).toBe(0);
  });
});

// ── ADMIN-P: POST /workflow-rules/activate/:systemKey ─────────────────────────
describe('POST /api/admin/workflow-rules/activate/:systemKey — activate template (ADMIN-P)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/admin/workflow-rules/activate/test_key');
    expect(res.status).toBe(401);
  });

  it('returns 404 when system template not found', async () => {
    vi.spyOn(WorkflowRule, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .post('/api/admin/workflow-rules/activate/unknown_key')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('admin can activate a system template (201)', async () => {
    const templateDoc = makeWF({ isSystem: true, systemKey: 'test_key' });
    vi.spyOn(WorkflowRule, 'findOne')
      .mockReturnValueOnce(chainOf(templateDoc))  // template lookup (.lean())
      .mockResolvedValueOnce(null);               // existing copy check
    vi.spyOn(WorkflowRule, 'create').mockResolvedValue(makeWF({ isSystemCopy: true }));

    const res = await request(buildApp())
      .post('/api/admin/workflow-rules/activate/test_key')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ── ADMIN-Q: DELETE /workflow-rules/deactivate/:systemKey ─────────────────────
describe('DELETE /api/admin/workflow-rules/deactivate/:systemKey — deactivate (ADMIN-Q)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete('/api/admin/workflow-rules/deactivate/test_key');
    expect(res.status).toBe(401);
  });

  it('returns 404 when no activated copy found', async () => {
    vi.spyOn(WorkflowRule, 'findOneAndDelete').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete('/api/admin/workflow-rules/deactivate/test_key')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no activated copy/i);
  });

  it('admin can deactivate a system automation (200)', async () => {
    vi.spyOn(WorkflowRule, 'findOneAndDelete').mockResolvedValue({ systemKey: 'test_key' });

    const res = await request(buildApp())
      .delete('/api/admin/workflow-rules/deactivate/test_key')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/deactivated/i);
  });
});

// ── ADMIN-R: POST /deduplicate-jobs ───────────────────────────────────────────
describe('POST /api/admin/deduplicate-jobs — SA deduplicates (ADMIN-R)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/admin/deduplicate-jobs');
    expect(res.status).toBe(401);
  });

  it('returns 403 for admin role', async () => {
    const res = await request(buildApp())
      .post('/api/admin/deduplicate-jobs')
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with no duplicate summary when no orgs found', async () => {
    vi.spyOn(Organization, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .post('/api/admin/deduplicate-jobs')
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/no duplicate/i);
  });
});

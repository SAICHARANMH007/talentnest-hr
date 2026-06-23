/**
 * Module 5 audit: users.js route
 *
 * Behaviors proven:
 *   USER-A  POST /      — validation (400); recruiter blocked from non-candidate
 *                         invite (403); admin blocked from inviting admin (403);
 *                         201 on success.
 *   USER-B  GET /       — 401 no token; recruiter blocked (403); admin scoped
 *                         to own tenant; super_admin no tenantId filter.
 *   USER-C  GET /me     — 401 no token; 200 returns own user data.
 *   USER-D  GET /:id    — 404 when not found; cross-tenant request gets public
 *                         fields only; own profile returns full data.
 *   USER-E  DELETE /:id — recruiter → 403; admin deleting cross-tenant → 403;
 *                         admin deleting same-tenant → 200.
 *   USER-F  PATCH /:id  — recruiter blocked from updating non-candidate (403).
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
const User         = _r('../src/models/User.js');
const Candidate    = _r('../src/models/Candidate.js');
const Notification = _r('../src/models/Notification.js');
const Organization = _r('../src/models/Organization.js');
const Tenant       = _r('../src/models/Tenant.js');
const logger       = _r('../src/middleware/logger.js');
const userService  = _r('../src/services/user.service.js');
const emailUtils   = _r('../src/utils/email.js');

import usersRouter from '../src/routes/users.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const OTHER_TENANT  = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID  = new mongoose.Types.ObjectId().toString();
const CANDIDATE_ID  = new mongoose.Types.ObjectId().toString();
const TARGET_ID     = new mongoose.Types.ObjectId().toString();

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(role = 'admin', opts = {}) {
  const defaultId = role === 'recruiter' ? RECRUITER_ID
                  : role === 'candidate' ? CANDIDATE_ID
                  : ADMIN_ID;
  return jwt.sign(
    { userId: opts.id ?? defaultId, role, tenantId: opts.tenantId ?? TENANT_ID },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

function chainOf(value) {
  const q = {
    select:     vi.fn().mockReturnThis(),
    sort:       vi.fn().mockReturnThis(),
    skip:       vi.fn().mockReturnThis(),
    limit:      vi.fn().mockReturnThis(),
    populate:   vi.fn().mockReturnThis(),
    lean:       vi.fn().mockResolvedValue(value),
    setOptions: vi.fn().mockReturnThis(),
    then: (r, j) => Promise.resolve(value).then(r, j),
    catch: (j)   => Promise.resolve(value).catch(j),
  };
  return q;
}

function makeUser(overrides = {}) {
  const id = new mongoose.Types.ObjectId();
  return {
    _id: id, id: id.toString(),
    tenantId: TENANT_ID,
    name: 'Test User', email: 'user@test.example',
    role: 'recruiter', isActive: true,
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
  app.use('/api/users', usersRouter);
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

  vi.spyOn(emailUtils, 'sendEmailWithRetry').mockResolvedValue(undefined);

  // Notification (fire-and-forget in /me)
  vi.spyOn(Notification, 'findOne').mockReturnValue(chainOf(null));
  vi.spyOn(Notification, 'create').mockResolvedValue({});

  // Candidate (fire-and-forget in /me for college nudge)
  vi.spyOn(Candidate, 'findOne').mockReturnValue(chainOf(null));

  // tenantGuard calls Org.findById — users.js uses authenticate (not tenantGuard),
  // so only the auth middleware needs User.findById mocked.
  vi.spyOn(Organization, 'findById').mockReturnValue(chainOf(makeOrg()));
  vi.spyOn(Tenant, 'findById').mockReturnValue(chainOf(null));
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));

  // userService methods
  vi.spyOn(userService, 'inviteUser').mockResolvedValue(makeUser({ role: 'recruiter' }));
  vi.spyOn(userService, 'normalize').mockImplementation(u => ({ ...u, id: u._id?.toString() }));
  vi.spyOn(userService, 'softDelete').mockResolvedValue({});

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
    if (s === TARGET_ID) {
      return chainOf({ _id: TARGET_ID, id: TARGET_ID, role: 'recruiter',
        tenantId: TENANT_ID, isActive: true, name: 'Target User',
        email: 'target@test.example', toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Test Admin',
      email: 'admin@test.example', toObject: () => ({}) });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/users — invite user (USER-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/users').send({ name: 'X', email: 'x@corp.com' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(buildApp())
      .post('/api/users')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Alice', email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('returns 403 when recruiter tries to invite a recruiter', async () => {
    const res = await request(buildApp())
      .post('/api/users')
      .set('Authorization', `Bearer ${makeToken('recruiter')}`)
      .send({ name: 'Bob', email: 'bob@corp.com', role: 'recruiter' });
    expect(res.status).toBe(403);
  });

  it('recruiter can invite a candidate', async () => {
    const res = await request(buildApp())
      .post('/api/users')
      .set('Authorization', `Bearer ${makeToken('recruiter')}`)
      .send({ name: 'Candidate X', email: 'cx@corp.com', role: 'candidate' });
    expect(res.status).toBe(201);
  });

  it('returns 403 when admin tries to invite an admin', async () => {
    const res = await request(buildApp())
      .post('/api/users')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Other Admin', email: 'oa@corp.com', role: 'admin' });
    expect(res.status).toBe(403);
  });

  it('admin can invite a recruiter and gets 201', async () => {
    const res = await request(buildApp())
      .post('/api/users')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'New Recruiter', email: 'nr@corp.com', role: 'recruiter' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/users — list (USER-B)', () => {
  beforeEach(() => {
    vi.spyOn(User, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(User, 'countDocuments').mockResolvedValue(0);
  });

  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('returns 403 for recruiter role', async () => {
    const res = await request(buildApp())
      .get('/api/users')
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);
    expect(res.status).toBe(403);
  });

  it('admin: query filter includes own tenantId', async () => {
    const findSpy = vi.spyOn(User, 'find').mockReturnValue(chainOf([]));

    await request(buildApp())
      .get('/api/users')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    const filter = findSpy.mock.calls[0][0];
    expect(filter.tenantId.toString()).toBe(TENANT_ID);
  });

  it('super_admin: query filter has no tenantId restriction', async () => {
    const findSpy = vi.spyOn(User, 'find').mockReturnValue(chainOf([]));

    await request(buildApp())
      .get('/api/users')
      .set('Authorization', `Bearer ${makeToken('super_admin', { id: 'sa_1', tenantId: null })}`);

    const filter = findSpy.mock.calls[0][0];
    // super_admin without tenantId query param gets an empty filter object (or
    // just deletedAt) — no tenantId restriction
    expect(filter.tenantId).toBeUndefined();
  });

  it('returns paginated response with data array', async () => {
    vi.spyOn(User, 'find').mockReturnValue(chainOf([makeUser()]));
    vi.spyOn(User, 'countDocuments').mockResolvedValue(1);

    const res = await request(buildApp())
      .get('/api/users')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/users/me — self profile (USER-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('returns 200 with own user data', async () => {
    const res = await request(buildApp())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/users/:id — single user (USER-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/users/${TARGET_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 for own profile', async () => {
    const res = await request(buildApp())
      .get(`/api/users/${ADMIN_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(200);
    expect(res.body.isPublic).toBeUndefined();
  });

  it('returns 404 when user does not exist', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    // Override default mock to return null for this specific ID
    vi.spyOn(User, 'findById').mockImplementation((id) => {
      if (String(id) === nonExistentId) return chainOf(null);
      // Keep admin lookup working for auth
      return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
        tenantId: TENANT_ID, isActive: true, name: 'Test Admin',
        email: 'admin@test.example', toObject: () => ({}) });
    });

    const res = await request(buildApp())
      .get(`/api/users/${nonExistentId}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('cross-tenant: returns only public fields with isPublic=true', async () => {
    const crossTenantUser = makeUser({ tenantId: OTHER_TENANT, role: 'recruiter' });
    const crossId = crossTenantUser._id.toString();

    vi.spyOn(User, 'findById').mockImplementation((id) => {
      if (String(id) === crossId) return chainOf(crossTenantUser);
      return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
        tenantId: TENANT_ID, isActive: true, name: 'Test Admin',
        email: 'admin@test.example', toObject: () => ({}) });
    });

    const res = await request(buildApp())
      .get(`/api/users/${crossId}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.isPublic).toBe(true);
    // Private fields must be absent
    expect(res.body.data.email).toBeUndefined();
    expect(res.body.data.tenantId).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/users/:id — soft delete (USER-E)', () => {
  it('returns 403 for recruiter role', async () => {
    const res = await request(buildApp())
      .delete(`/api/users/${TARGET_ID}`)
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);
    expect(res.status).toBe(403);
  });

  it('admin soft-deletes same-tenant user successfully', async () => {
    const res = await request(buildApp())
      .delete(`/api/users/${TARGET_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('admin blocked from deleting cross-tenant user', async () => {
    const otherTenantUser = makeUser({ tenantId: OTHER_TENANT });
    const otherId = otherTenantUser._id.toString();

    vi.spyOn(User, 'findById').mockImplementation((id) => {
      if (String(id) === otherId) return chainOf(otherTenantUser);
      return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
        tenantId: TENANT_ID, isActive: true, name: 'Test Admin',
        email: 'admin@test.example', toObject: () => ({}) });
    });

    const res = await request(buildApp())
      .delete(`/api/users/${otherId}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/users/:id — update (USER-F)', () => {
  it('recruiter blocked from updating a non-candidate user', async () => {
    // TARGET_ID resolves to a recruiter role in the default mock
    const res = await request(buildApp())
      .patch(`/api/users/${TARGET_ID}`)
      .set('Authorization', `Bearer ${makeToken('recruiter')}`)
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(403);
  });

  it('admin can update a user in same tenant', async () => {
    vi.spyOn(User, 'findByIdAndUpdate').mockReturnValue(chainOf(makeUser({ name: 'Updated Name' })));

    const res = await request(buildApp())
      .patch(`/api/users/${TARGET_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

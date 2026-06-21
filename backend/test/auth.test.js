/**
 * Module 1 audit: auth.js
 *
 * Strategy: auth.js is CommonJS and uses require(), which vitest's vi.mock()
 * factory does NOT intercept (only ESM imports are intercepted). Instead we
 * load the real CJS modules via createRequire (same Node cache that auth.js
 * uses) and vi.spyOn() their methods so the spy is in effect when the route
 * handler calls them.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

// ─────────────────────────────────────────────────────────────────────────────
// Rate-limit: mock so tests never get throttled.
// This DOES work because express-rate-limit is an ESM-compatible package.
// ─────────────────────────────────────────────────────────────────────────────
vi.mock('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next(),
}));

// ─────────────────────────────────────────────────────────────────────────────
// CJS model references — same instances auth.js / auth.service.js hold
// ─────────────────────────────────────────────────────────────────────────────
const _r = createRequire(import.meta.url);
const User         = _r('../src/models/User.js');
const Tenant       = _r('../src/models/Tenant.js');
const Organization = _r('../src/models/Organization.js');
const RefreshToken = _r('../src/models/RefreshToken.js');
const UserSession  = _r('../src/models/UserSession.js');
const Candidate    = _r('../src/models/Candidate.js');
const Community    = _r('../src/models/Community.js');
const Otp          = _r('../src/models/Otp.js');
const emailUtils   = _r('../src/utils/email.js');
const notifySA     = _r('../src/utils/notifySuperAdmins.js');
const collegeDir   = _r('../src/utils/collegeDirectory.js');
const loggerMod    = _r('../src/middleware/logger.js');

// ─────────────────────────────────────────────────────────────────────────────
// Imports
// ─────────────────────────────────────────────────────────────────────────────
import express      from 'express';
import cookieParser from 'cookie-parser';
import request      from 'supertest';
import bcrypt       from 'bcryptjs';
import crypto       from 'crypto';
import jwt          from 'jsonwebtoken';
import mongoose     from 'mongoose';
import authRouter   from '../src/routes/auth.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret_for_vitest_only';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Mongoose Query chain mock: supports .select().lean() and direct await. */
function queryOf(value) {
  const lean   = vi.fn().mockResolvedValue(value);
  const select = vi.fn().mockReturnValue({ lean });
  return { select, lean,
    then:  (r, j) => Promise.resolve(value).then(r, j),
    catch: (j)    => Promise.resolve(value).catch(j),
  };
}

function makeTenant(ov = {}) {
  return {
    _id: new mongoose.Types.ObjectId(), name: 'Acme Corp',
    slug: 'acme-t1', type: 'tenant',
    subscriptionStatus: 'active', status: 'active',
    toObject: () => ({}), toJSON: () => ({}),
    ...ov,
  };
}

function makeUser(ov = {}) {
  const u = {
    _id: new mongoose.Types.ObjectId(),
    tenantId: new mongoose.Types.ObjectId(),
    name: 'Alice Admin', email: 'alice@acmecorp.com',
    passwordHash: bcrypt.hashSync('SecurePass1', 10),
    role: 'admin', isActive: true,
    failedLoginAttempts: 0, lockUntil: null,
    twoFactorEnabled: false, mustChangePassword: false,
    ...ov,
  };
  u.save = vi.fn().mockResolvedValue(u);
  return u;
}

function makeToken(role, userId, tenantId) {
  return jwt.sign(
    { userId: String(userId), tenantId: String(tenantId), role },
    JWT_SECRET, { expiresIn: '1h' },
  );
}

const app = (() => {
  const a = express();
  a.use(express.json());
  a.use(cookieParser(COOKIE_SECRET));
  a.use('/api/auth', authRouter);
  a.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  });
  return a;
})();

// ─────────────────────────────────────────────────────────────────────────────
// Setup / teardown
// ─────────────────────────────────────────────────────────────────────────────
afterEach(() => vi.restoreAllMocks());

beforeEach(() => {
  // Mongoose transaction stub
  const fakeSession = {
    withTransaction: vi.fn(fn => fn()),
    endSession: vi.fn().mockResolvedValue(undefined),
  };
  vi.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession);

  const tenant = makeTenant();
  const user   = makeUser({ tenantId: tenant._id });

  // User model
  vi.spyOn(User, 'findOne').mockResolvedValue(null);
  vi.spyOn(User, 'findById').mockReturnValue(queryOf(null));
  vi.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({});
  vi.spyOn(User, 'findOneAndUpdate').mockResolvedValue({});
  vi.spyOn(User, 'create').mockImplementation(arg =>
    Promise.resolve(Array.isArray(arg) ? [user] : user));
  vi.spyOn(User, 'deleteMany').mockResolvedValue({});
  // Used by notifyAllSuperAdmins (fire-and-forget after register)
  vi.spyOn(User, 'find').mockReturnValue(queryOf([]));

  // Tenant model
  vi.spyOn(Tenant, 'findOne').mockReturnValue(queryOf(null));
  vi.spyOn(Tenant, 'findById').mockReturnValue(queryOf(null));
  vi.spyOn(Tenant, 'create').mockImplementation(arg =>
    Promise.resolve(Array.isArray(arg) ? [tenant] : tenant));

  // Organization
  vi.spyOn(Organization, 'findOne').mockReturnValue(queryOf(null));
  vi.spyOn(Organization, 'findById').mockReturnValue(queryOf(null));

  // RefreshToken
  vi.spyOn(RefreshToken, 'create').mockResolvedValue({ _id: 'rt1' });
  vi.spyOn(RefreshToken, 'deleteOne').mockResolvedValue({});
  vi.spyOn(RefreshToken, 'deleteMany').mockResolvedValue({});
  vi.spyOn(RefreshToken, 'findOne').mockResolvedValue(null);

  // UserSession
  vi.spyOn(UserSession, 'create').mockResolvedValue({});
  vi.spyOn(UserSession, 'findOneAndUpdate').mockResolvedValue({});
  vi.spyOn(UserSession, 'find').mockResolvedValue([]);

  // Candidate
  vi.spyOn(Candidate, 'findOne').mockReturnValue({ session: () => Promise.resolve(null) });
  vi.spyOn(Candidate, 'updateMany').mockResolvedValue({});
  vi.spyOn(Candidate, 'create').mockResolvedValue({});

  // Community
  vi.spyOn(Community, 'exists').mockReturnValue({ session: () => Promise.resolve(false) });
  vi.spyOn(Community, 'create').mockResolvedValue({});

  // Otp
  vi.spyOn(Otp, 'findOneAndUpdate').mockResolvedValue({});
  vi.spyOn(Otp, 'findOne').mockResolvedValue(null);
  vi.spyOn(Otp, 'deleteOne').mockResolvedValue({});

  // External services
  vi.spyOn(emailUtils, 'sendEmailWithRetry').mockResolvedValue(true);
  // notifySA is a plain function (module.exports = fn) — cannot spy .default.
  // User.find is mocked to return [] so notifyAllSuperAdmins returns early.

  // Logger (suppress output)
  vi.spyOn(loggerMod, 'info').mockReturnValue(undefined);
  vi.spyOn(loggerMod, 'warn').mockReturnValue(undefined);
  vi.spyOn(loggerMod, 'error').mockReturnValue(undefined);
  vi.spyOn(loggerMod, 'audit').mockReturnValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────────────────────────
describe('register', () => {
  const BASE = {
    name: 'Alice Admin', email: 'alice@acmecorp.com',
    password: 'SecurePass1', companyName: 'Acme Corp', role: 'admin',
  };

  it('happy path: 201 + access token returned', async () => {
    const res = await request(app).post('/api/auth/register').send(BASE);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeTruthy();
  });

  it('rejects password shorter than 8 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...BASE, password: 'Ab1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/i);
  });

  it('rejects password with no uppercase letter', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...BASE, password: 'securepass1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/uppercase/i);
  });

  it('rejects password with no number', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...BASE, password: 'SecurePass' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/number/i);
  });

  it('blocks gmail.com for admin role', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...BASE, email: 'alice@gmail.com' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/public email/i);
  });

  it('rejects duplicate email', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue(makeUser());
    const res = await request(app).post('/api/auth/register').send(BASE);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already registered/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────
describe('login', () => {
  let existingUser;

  beforeEach(() => {
    existingUser = makeUser();
    vi.spyOn(User, 'findOne').mockResolvedValue(existingUser);
    const orgDoc = {
      subscriptionStatus: 'active', status: 'active',
      toObject: () => ({ subscriptionStatus: 'active' }),
      toJSON:   () => ({ subscriptionStatus: 'active' }),
    };
    vi.spyOn(Organization, 'findById').mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    vi.spyOn(Tenant, 'findById').mockReturnValue({ lean: vi.fn().mockResolvedValue(orgDoc) });
  });

  it('valid credentials return token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@acmecorp.com', password: 'SecurePass1' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('wrong password returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@acmecorp.com', password: 'WrongPass99' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid email or password/i);
  });

  it('locked account returns 403', async () => {
    existingUser.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@acmecorp.com', password: 'SecurePass1' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/locked/i);
  });

  it('5th failed attempt writes lockUntil to DB', async () => {
    existingUser.failedLoginAttempts = 4;
    let captured = null;
    vi.spyOn(User, 'findByIdAndUpdate').mockImplementation((_id, upd) => {
      captured = upd;
      return Promise.resolve({});
    });
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@acmecorp.com', password: 'BadPass9' });
    expect(captured?.$set?.lockUntil).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT-PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
describe('forgot-password', () => {
  it('returns 200 even for unknown email (enumeration safety)', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue(null);
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@nowhere.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RESET-PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
describe('reset-password (URL token)', () => {
  it('rejects invalid token', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue(null);
    const res = await request(app)
      .post('/api/auth/reset-password/badtoken')
      .send({ email: 'alice@acmecorp.com', newPassword: 'NewPass99' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or has expired/i);
  });

  it('BUG R1 — reset-password accepts "password1" (no uppercase check)', async () => {
    const raw  = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    vi.spyOn(User, 'findOne').mockResolvedValue(makeUser({
      resetPasswordToken: hash,
      resetPasswordExpires: new Date(Date.now() + 3_600_000),
    }));

    const res = await request(app)
      .post(`/api/auth/reset-password/${raw}`)
      .send({ email: 'alice@acmecorp.com', newPassword: 'password1' });

    // BUG: currently 200. After Fix R1 → 400.
    expect(res.status, 'BUG R1: reset-password/:token should enforce uppercase').toBe(400);
    expect(res.body.error).toMatch(/uppercase/i);
  });

  it('BUG R1 (legacy body) — body reset-password also skips policy', async () => {
    const raw  = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    vi.spyOn(User, 'findOne').mockResolvedValue(makeUser({
      resetPasswordToken: hash,
      resetPasswordExpires: new Date(Date.now() + 3_600_000),
    }));

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: raw, email: 'alice@acmecorp.com', newPassword: 'password1' });

    // BUG: currently 200. After Fix R1 → 400.
    expect(res.status, 'BUG R1 legacy: should enforce uppercase').toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SET-PASSWORD / INVITE — BUG R2
// ─────────────────────────────────────────────────────────────────────────────
describe('set-password/:inviteToken', () => {
  it('BUG R2 — invite with null expiry is rejected after fix', async () => {
    const raw  = crypto.randomBytes(32).toString('hex');

    // After Fix R2, the query includes inviteTokenExpiry: { $gt: new Date() }.
    // MongoDB returns null for a user whose inviteTokenExpiry is null.
    // We simulate that here; the spy also lets us assert the query shape.
    const findOneSpy = vi.spyOn(User, 'findOne').mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/auth/set-password/${raw}`)
      .send({ email: 'alice@acmecorp.com', newPassword: 'NewPass99' });

    expect(res.status, 'BUG R2: null-expiry invite should be rejected').toBe(400);
    expect(res.body.error).toMatch(/expired/i);

    // Verify Fix R2 is in place: inviteToken branch must include expiry condition.
    expect(findOneSpy).toHaveBeenCalledWith(expect.objectContaining({
      $or: expect.arrayContaining([
        expect.objectContaining({
          inviteTokenExpiry: expect.objectContaining({ $gt: expect.any(Date) }),
        }),
      ]),
    }));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IMPERSONATION
// ─────────────────────────────────────────────────────────────────────────────
describe('impersonate', () => {
  it('non-super_admin gets 403', async () => {
    const userId   = new mongoose.Types.ObjectId();
    const tenantId = new mongoose.Types.ObjectId();
    const admin    = makeUser({ _id: userId, tenantId, role: 'admin' });

    vi.spyOn(User, 'findById').mockReturnValue(queryOf(admin));

    const res = await request(app)
      .post('/api/auth/impersonate')
      .set('Authorization', `Bearer ${makeToken('admin', userId, tenantId)}`)
      .send({ targetUserId: new mongoose.Types.ObjectId().toString() });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/super admin/i);
  });

  it('super_admin cannot target another super_admin', async () => {
    const saId     = new mongoose.Types.ObjectId();
    const targetId = new mongoose.Types.ObjectId();
    const tenantId = new mongoose.Types.ObjectId();
    const saUser   = makeUser({ _id: saId, tenantId, role: 'super_admin' });
    const target   = makeUser({ _id: targetId, role: 'super_admin' });

    vi.spyOn(User, 'findById')
      .mockReturnValueOnce(queryOf(saUser))   // middleware
      .mockReturnValueOnce(queryOf(target));  // route target lookup

    const res = await request(app)
      .post('/api/auth/impersonate')
      .set('Authorization', `Bearer ${makeToken('super_admin', saId, tenantId)}`)
      .send({ targetUserId: targetId.toString() });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot impersonate/i);
  });

  it('BUG R3 — impersonating a deactivated user permanently sets isActive=true', async () => {
    const saId        = new mongoose.Types.ObjectId();
    const targetId    = new mongoose.Types.ObjectId();
    const tenantId    = new mongoose.Types.ObjectId();
    const saUser      = makeUser({ _id: saId, tenantId, role: 'super_admin' });
    const deactivated = makeUser({ _id: targetId, tenantId, role: 'recruiter', isActive: false });

    vi.spyOn(User, 'findById')
      .mockReturnValueOnce(queryOf(saUser))
      .mockReturnValueOnce(queryOf(deactivated));

    await request(app)
      .post('/api/auth/impersonate')
      .set('Authorization', `Bearer ${makeToken('super_admin', saId, tenantId)}`)
      .send({ targetUserId: targetId.toString() });

    // BUG: route does `target.isActive = true; await target.save()`
    if (deactivated.save.mock.calls.length > 0) {
      // save was called — check if isActive was mutated to true
      expect(deactivated.isActive, 'BUG R3: isActive must remain false').toBe(false);
    }
    // If save was not called → fix is in place, passes
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /me
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /me', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user data with a valid token', async () => {
    const userId   = new mongoose.Types.ObjectId();
    const tenantId = new mongoose.Types.ObjectId();
    const user     = makeUser({ _id: userId, tenantId });
    // Simulate .select('-passwordHash ...'): our queryOf mock doesn't strip fields,
    // so pass a user object without the sensitive fields.
    const { passwordHash: _ph, resetPasswordToken: _rt, resetPasswordExpires: _re, ...safeUser } = user;

    vi.spyOn(User, 'findById').mockReturnValue(queryOf(safeUser));

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${makeToken('admin', userId, tenantId)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('alice@acmecorp.com');
    expect(res.body.data.passwordHash).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SET-PASSWORD (legacy body token) — password policy per-path tests
// ─────────────────────────────────────────────────────────────────────────────
describe('set-password (legacy body token) — password policy', () => {
  function mockValidUser() {
    const raw  = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    vi.spyOn(User, 'findOne').mockResolvedValue(makeUser({
      resetPasswordToken: hash,
      resetPasswordExpires: new Date(Date.now() + 3_600_000),
    }));
    return raw;
  }

  it('rejects password shorter than 8 chars', async () => {
    const token = mockValidUser();
    const res = await request(app)
      .post('/api/auth/set-password')
      .send({ token, email: 'alice@acmecorp.com', newPassword: 'Ab1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/i);
  });

  it('rejects password with no uppercase letter', async () => {
    const token = mockValidUser();
    const res = await request(app)
      .post('/api/auth/set-password')
      .send({ token, email: 'alice@acmecorp.com', newPassword: 'newpass1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/uppercase/i);
  });

  it('rejects password with no number', async () => {
    const token = mockValidUser();
    const res = await request(app)
      .post('/api/auth/set-password')
      .send({ token, email: 'alice@acmecorp.com', newPassword: 'NewPassXX' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/number/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY-INVITE — expiry gap per-path test
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /verify-invite — invite token expiry', () => {
  it('rejects an inviteToken with no expiry (expired or never set)', async () => {
    const raw  = crypto.randomBytes(32).toString('hex');
    const findOneSpy = vi.spyOn(User, 'findOne').mockReturnValue(queryOf(null));

    const res = await request(app)
      .get('/api/auth/verify-invite')
      .query({ token: raw, email: 'alice@acmecorp.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or has expired/i);

    // Verify the fix: inviteToken branch must include expiry condition
    expect(findOneSpy).toHaveBeenCalledWith(expect.objectContaining({
      $or: expect.arrayContaining([
        expect.objectContaining({
          inviteTokenExpiry: expect.objectContaining({ $gt: expect.any(Date) }),
        }),
      ]),
    }));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE-PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
describe('change-password', () => {
  it('correct password succeeds + invalidates refresh tokens', async () => {
    const userId   = new mongoose.Types.ObjectId();
    const tenantId = new mongoose.Types.ObjectId();
    const user     = makeUser({ _id: userId, tenantId });

    vi.spyOn(User, 'findById')
      .mockReturnValueOnce(queryOf(user))         // middleware
      .mockReturnValueOnce(Promise.resolve(user)); // route

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${makeToken('admin', userId, tenantId)}`)
      .send({ currentPassword: 'SecurePass1', newPassword: 'NewSecure2' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(RefreshToken.deleteMany).toHaveBeenCalledWith({ userId: user._id });
  });

  it('wrong current password returns 401', async () => {
    const userId   = new mongoose.Types.ObjectId();
    const tenantId = new mongoose.Types.ObjectId();
    const user     = makeUser({ _id: userId, tenantId });

    vi.spyOn(User, 'findById')
      .mockReturnValueOnce(queryOf(user))
      .mockReturnValueOnce(Promise.resolve(user));

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${makeToken('admin', userId, tenantId)}`)
      .send({ currentPassword: 'WrongOld1', newPassword: 'NewSecure2' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/incorrect/i);
  });

  it('rejects new password shorter than 8 chars', async () => {
    const userId   = new mongoose.Types.ObjectId();
    const tenantId = new mongoose.Types.ObjectId();
    const user     = makeUser({ _id: userId, tenantId });
    vi.spyOn(User, 'findById').mockReturnValueOnce(queryOf(user));

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${makeToken('admin', userId, tenantId)}`)
      .send({ currentPassword: 'SecurePass1', newPassword: 'Ab1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/i);
  });

  it('rejects new password with no uppercase letter', async () => {
    const userId   = new mongoose.Types.ObjectId();
    const tenantId = new mongoose.Types.ObjectId();
    const user     = makeUser({ _id: userId, tenantId });
    vi.spyOn(User, 'findById').mockReturnValueOnce(queryOf(user));

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${makeToken('admin', userId, tenantId)}`)
      .send({ currentPassword: 'SecurePass1', newPassword: 'newpass1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/uppercase/i);
  });

  it('rejects new password with no number', async () => {
    const userId   = new mongoose.Types.ObjectId();
    const tenantId = new mongoose.Types.ObjectId();
    const user     = makeUser({ _id: userId, tenantId });
    vi.spyOn(User, 'findById').mockReturnValueOnce(queryOf(user));

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${makeToken('admin', userId, tenantId)}`)
      .send({ currentPassword: 'SecurePass1', newPassword: 'NewPassXX' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/number/i);
  });
});

/**
 * Module audit: platformReferrals.js route
 *
 * Behaviors proven:
 *   PREF-A  GET /my-stats              — 401; 200 with stats.
 *   PREF-B  POST /track-invite         — 401; 200.
 *   PREF-C  POST /credit               — 401; 400 invalid code; 400 self-referral; 200.
 *   PREF-D  POST /redeem-verified-badge — 401; 400 not enough coins; 200.
 *   PREF-E  GET /admin/all             — 401; 403 non-super_admin; 200.
 *   PREF-F  GET /admin/stats           — 401; 200 super_admin.
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

const _r               = createRequire(import.meta.url);
const _authModule      = _r('../src/middleware/auth.js');
const User             = _r('../src/models/User.js');
const PlatformReferral = _r('../src/models/PlatformReferral.js');
const logger           = _r('../src/middleware/logger.js');

import platformReferralsRouter from '../src/routes/platformReferrals.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const REFERRER_ID   = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin', userId = ADMIN_ID) {
  return jwt.sign({ userId, role, tenantId: TENANT_ID }, JWT_SECRET, { expiresIn: '1h' });
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
  app.use('/api/platform-referrals', platformReferralsRouter);
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
    _id: ADMIN_ID, id: ADMIN_ID, role: 'admin', tenantId: TENANT_ID,
    isActive: true, name: 'Admin', email: 'a@t.example',
    platformVerified: false, platformVerifiedAt: null,
  }));
});

// ── PREF-A: GET /my-stats ─────────────────────────────────────────────────────
describe('GET /api/platform-referrals/my-stats — referral stats (PREF-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/platform-referrals/my-stats');
    expect(res.status).toBe(401);
  });

  it('returns 200 with referral stats', async () => {
    vi.spyOn(PlatformReferral, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/platform-referrals/my-stats')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('referralCode');
    expect(res.body).toHaveProperty('coins');
    expect(res.body).toHaveProperty('referrals');
  });
});

// ── PREF-B: POST /track-invite ────────────────────────────────────────────────
describe('POST /api/platform-referrals/track-invite — track link share (PREF-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/platform-referrals/track-invite');
    expect(res.status).toBe(401);
  });

  it('returns 200 when invite tracked', async () => {
    vi.spyOn(PlatformReferral, 'create').mockResolvedValue({});

    const res = await request(buildApp())
      .post('/api/platform-referrals/track-invite')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── PREF-C: POST /credit ──────────────────────────────────────────────────────
describe('POST /api/platform-referrals/credit — credit referral (PREF-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/platform-referrals/credit').send({ referralCode: REFERRER_ID });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid referral code', async () => {
    const res = await request(buildApp())
      .post('/api/platform-referrals/credit')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ referralCode: 'not-a-valid-objectid' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for self-referral', async () => {
    const res = await request(buildApp())
      .post('/api/platform-referrals/credit')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ referralCode: ADMIN_ID });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/self-referral/i);
  });

  it('returns 200 when referral credited', async () => {
    vi.spyOn(User, 'findById').mockImplementation((id) => {
      if (String(id) === REFERRER_ID) {
        return chainOf({ _id: REFERRER_ID, name: 'Referrer', email: 'ref@t.example' });
      }
      return chainOf({
        _id: ADMIN_ID, id: ADMIN_ID, role: 'admin', tenantId: TENANT_ID,
        isActive: true, name: 'Admin', email: 'a@t.example',
      });
    });
    vi.spyOn(PlatformReferral, 'findOne').mockResolvedValue(null);
    vi.spyOn(PlatformReferral, 'create').mockResolvedValue({});

    const res = await request(buildApp())
      .post('/api/platform-referrals/credit')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ referralCode: REFERRER_ID });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.coinsAwarded).toBe(25);
  });
});

// ── PREF-D: POST /redeem-verified-badge ──────────────────────────────────────
describe('POST /api/platform-referrals/redeem-verified-badge — spend coins for badge (PREF-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/platform-referrals/redeem-verified-badge');
    expect(res.status).toBe(401);
  });

  it('returns 400 when not enough coins', async () => {
    vi.spyOn(PlatformReferral, 'find').mockReturnValue(chainOf([])); // 0 coins < 100 threshold

    const res = await request(buildApp())
      .post('/api/platform-referrals/redeem-verified-badge')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/coins/i);
  });

  it('returns 200 when badge redeemed', async () => {
    vi.spyOn(PlatformReferral, 'find').mockReturnValue(chainOf([{ coinsAwarded: 100 }]));
    vi.spyOn(PlatformReferral, 'create').mockResolvedValue({});
    vi.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({});

    const res = await request(buildApp())
      .post('/api/platform-referrals/redeem-verified-badge')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── PREF-E: GET /admin/all ────────────────────────────────────────────────────
describe('GET /api/platform-referrals/admin/all — admin list (PREF-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/platform-referrals/admin/all');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-super_admin', async () => {
    const res = await request(buildApp())
      .get('/api/platform-referrals/admin/all')
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 for super_admin', async () => {
    vi.spyOn(User, 'findById').mockReturnValue(chainOf({
      _id: ADMIN_ID, id: ADMIN_ID, role: 'super_admin', tenantId: TENANT_ID,
      isActive: true, name: 'SuperAdmin', email: 'sa@t.example',
    }));
    vi.spyOn(PlatformReferral, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(PlatformReferral, 'countDocuments').mockResolvedValue(0);

    const res = await request(buildApp())
      .get('/api/platform-referrals/admin/all')
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('referrals');
    expect(res.body).toHaveProperty('total');
  });
});

// ── PREF-F: GET /admin/stats ──────────────────────────────────────────────────
describe('GET /api/platform-referrals/admin/stats — admin stats (PREF-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/platform-referrals/admin/stats');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-super_admin', async () => {
    const res = await request(buildApp())
      .get('/api/platform-referrals/admin/stats')
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 for super_admin', async () => {
    vi.spyOn(User, 'findById').mockReturnValue(chainOf({
      _id: ADMIN_ID, id: ADMIN_ID, role: 'super_admin', tenantId: TENANT_ID,
      isActive: true, name: 'SuperAdmin', email: 'sa@t.example',
    }));
    vi.spyOn(PlatformReferral, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(PlatformReferral, 'aggregate').mockResolvedValue([]);
    vi.spyOn(User, 'countDocuments').mockResolvedValue(0);

    const res = await request(buildApp())
      .get('/api/platform-referrals/admin/stats')
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('badgeTiers');
    expect(res.body).toHaveProperty('verifiedBadgeCost');
  });
});

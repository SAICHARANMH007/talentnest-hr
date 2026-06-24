/**
 * Module audit: dashboard.js route (5 425-line multi-role campus/HR dashboard)
 *
 * Behaviors proven:
 *   DASH-A  GET /public             — no auth; 200 public stats.
 *   DASH-B  GET /colleges           — 401; 200 list.
 *   DASH-C  GET /college-directory  — no auth; 200 list.
 *   DASH-D  GET /college/overview   — 401; 403 non-college tenant.
 *   DASH-E  GET /admin/drive-approvals  — 401; 403 recruiter; 200 admin.
 *   DASH-F  GET /candidate/opportunities — 401; 403 non-candidate.
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

const _r              = createRequire(import.meta.url);
const _authModule     = _r('../src/middleware/auth.js');
const User            = _r('../src/models/User.js');
const Tenant          = _r('../src/models/Tenant.js');
const Candidate       = _r('../src/models/Candidate.js');
const Application     = _r('../src/models/Application.js');
const Job             = _r('../src/models/Job.js');
const PlacementDrive  = _r('../src/models/PlacementDrive.js');
const logger          = _r('../src/middleware/logger.js');

import dashboardRouter from '../src/routes/dashboard.js';

const JWT_SECRET      = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET   = 'test_cookie_secret';
const TENANT_ID       = new mongoose.Types.ObjectId().toString();
const ADMIN_ID        = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID    = new mongoose.Types.ObjectId().toString();
const CANDIDATE_ID    = new mongoose.Types.ObjectId().toString();

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
  app.use('/api/dashboard', dashboardRouter);
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

  vi.spyOn(User, 'findById').mockImplementation((id) => {
    if (String(id) === RECRUITER_ID) {
      return chainOf({ _id: RECRUITER_ID, id: RECRUITER_ID, role: 'recruiter',
        tenantId: TENANT_ID, isActive: true, name: 'Rec', email: 'r@t.example' });
    }
    if (String(id) === CANDIDATE_ID) {
      return chainOf({ _id: CANDIDATE_ID, id: CANDIDATE_ID, role: 'candidate',
        tenantId: TENANT_ID, isActive: true, name: 'Cand', email: 'c@t.example' });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example' });
  });
});

// ── DASH-A: GET /public ───────────────────────────────────────────────────────
describe('GET /api/dashboard/public — public platform stats (DASH-A)', () => {
  it('returns 200 with platform stats (no auth required)', async () => {
    vi.spyOn(Application, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(Job, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(Job, 'distinct').mockResolvedValue([]);
    vi.spyOn(User, 'countDocuments').mockResolvedValue(0);

    const res = await request(buildApp()).get('/api/dashboard/public');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('openJobs');
    expect(res.body).toHaveProperty('candidatesHired');
  });
});

// ── DASH-B: GET /colleges ─────────────────────────────────────────────────────
describe('GET /api/dashboard/colleges — list college tenants (DASH-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/dashboard/colleges');
    expect(res.status).toBe(401);
  });

  it('returns 200 with college list', async () => {
    vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/dashboard/colleges')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── DASH-C: GET /college-directory ───────────────────────────────────────────
describe('GET /api/dashboard/college-directory — college autocomplete (DASH-C)', () => {
  it('returns 200 without auth (public endpoint)', async () => {
    vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(Candidate, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp()).get('/api/dashboard/college-directory');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── DASH-D: GET /college/overview ────────────────────────────────────────────
describe('GET /api/dashboard/college/overview — college placement overview (DASH-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/dashboard/college/overview');
    expect(res.status).toBe(401);
  });

  it('returns 403 for admin without college tenant', async () => {
    // Admin role passes allowRoles but getCollegeFilter returns null for non-college tenants
    vi.spyOn(Tenant, 'findById').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get('/api/dashboard/college/overview')
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/college/i);
  });
});

// ── DASH-E: GET /admin/drive-approvals ───────────────────────────────────────
describe('GET /api/dashboard/admin/drive-approvals — drive approval queue (DASH-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/dashboard/admin/drive-approvals');
    expect(res.status).toBe(401);
  });

  it('returns 403 for recruiter', async () => {
    const res = await request(buildApp())
      .get('/api/dashboard/admin/drive-approvals')
      .set('Authorization', `Bearer ${makeToken('recruiter', RECRUITER_ID)}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 for admin', async () => {
    vi.spyOn(PlacementDrive, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/dashboard/admin/drive-approvals')
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── DASH-F: GET /candidate/opportunities ─────────────────────────────────────
describe('GET /api/dashboard/candidate/opportunities — candidate drives (DASH-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/dashboard/candidate/opportunities');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-candidate', async () => {
    const res = await request(buildApp())
      .get('/api/dashboard/candidate/opportunities')
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(403);
  });
});

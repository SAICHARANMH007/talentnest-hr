/**
 * Module 11 audit: importedCandidates.js route
 *
 * Behaviors proven:
 *   IMPCAND-A  GET /         — 401 no token; 403 candidate; 200 admin list; 200 recruiter list.
 *   IMPCAND-B  POST /bulk    — 401 no token; 400 no rows; 200 ingested.
 *   IMPCAND-C  POST /invite  — 401 no token; 400 no ids; 200 invites sent; 200 email-not-found count.
 *   IMPCAND-D  DELETE /      — 401 no token; 403 recruiter; 200 admin cleared.
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
  sendEmailWithRetry: vi.fn().mockResolvedValue({}),
  sendOrgEmail:       vi.fn().mockResolvedValue({}),
}));

// ── CJS references ─────────────────────────────────────────────────────────────
const _r = createRequire(import.meta.url);

const _authModule       = _r('../src/middleware/auth.js');
const User              = _r('../src/models/User.js');
const Organization      = _r('../src/models/Organization.js');
const Tenant            = _r('../src/models/Tenant.js');
const ImportedCandidate = _r('../src/models/ImportedCandidate.js');
const logger            = _r('../src/middleware/logger.js');

import importedCandidatesRouter from '../src/routes/importedCandidates.js';

// ── Constants ──────────────────────────────────────────────────────────────────
const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID  = new mongoose.Types.ObjectId().toString();
const CANDIDATE_ID  = new mongoose.Types.ObjectId().toString();

// ── Helpers ────────────────────────────────────────────────────────────────────
function makeToken(role = 'admin', opts = {}) {
  let defaultId = ADMIN_ID;
  if (role === 'recruiter') defaultId = RECRUITER_ID;
  if (role === 'candidate') defaultId = CANDIDATE_ID;
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

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/imported-candidates', importedCandidatesRouter);
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
  }));
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));

  vi.spyOn(User, 'findById').mockImplementation((id) => {
    const s = String(id);
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
      toObject: () => ({}) });
  });
});

// ── IMPCAND-A: GET / ───────────────────────────────────────────────────────────
describe('GET /api/imported-candidates — list (IMPCAND-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/imported-candidates');
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate role', async () => {
    const res = await request(buildApp())
      .get('/api/imported-candidates')
      .set('Authorization', `Bearer ${makeToken('candidate')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 paginated list for admin', async () => {
    vi.spyOn(ImportedCandidate, 'find').mockReturnValue(
      chainOf([{ _id: 'r1', email: 'a@test.example', name: 'A', status: 'pending' }]),
    );
    vi.spyOn(ImportedCandidate, 'countDocuments').mockResolvedValue(1);

    const res = await request(buildApp())
      .get('/api/imported-candidates')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(1);
  });

  it('returns 200 paginated list for recruiter', async () => {
    vi.spyOn(ImportedCandidate, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(ImportedCandidate, 'countDocuments').mockResolvedValue(0);

    const res = await request(buildApp())
      .get('/api/imported-candidates')
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });
});

// ── IMPCAND-B: POST /bulk ──────────────────────────────────────────────────────
describe('POST /api/imported-candidates/bulk — fast ingestion (IMPCAND-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post('/api/imported-candidates/bulk')
      .send({ rows: [{ email: 'a@test.example' }] });
    expect(res.status).toBe(401);
  });

  it('returns 400 when rows is missing or empty', async () => {
    const res = await request(buildApp())
      .post('/api/imported-candidates/bulk')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/rows/i);
  });

  it('ingests rows and returns 200 with count', async () => {
    vi.spyOn(ImportedCandidate, 'insertMany').mockResolvedValue([]);

    const rows = [
      { name: 'John Doe', email: 'john@test.example' },
      { 'full name': 'Jane Smith', email: 'jane@test.example' },
    ];

    const res = await request(buildApp())
      .post('/api/imported-candidates/bulk')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ rows });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/2/);
  });
});

// ── IMPCAND-C: POST /invite ────────────────────────────────────────────────────
describe('POST /api/imported-candidates/invite — deep scan + send (IMPCAND-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post('/api/imported-candidates/invite')
      .send({ ids: ['r1'] });
    expect(res.status).toBe(401);
  });

  it('returns 400 when ids is missing or empty', async () => {
    const res = await request(buildApp())
      .post('/api/imported-candidates/invite')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/records selected/i);
  });

  it('sends invites for records with extractable email', async () => {
    const record = {
      _id: 'r1',
      data: { name: 'John Doe', email: 'john@test.example' },
      status: 'pending',
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(ImportedCandidate, 'find').mockResolvedValue([record]);

    const res = await request(buildApp())
      .post('/api/imported-candidates/invite')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ ids: ['r1'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/1 sent/i);
  });

  it('counts failures when email cannot be extracted from row data', async () => {
    const record = {
      _id: 'r2',
      data: { company: 'Acme Corp', position: 'Engineer' }, // no email field
      status: 'pending',
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(ImportedCandidate, 'find').mockResolvedValue([record]);

    const res = await request(buildApp())
      .post('/api/imported-candidates/invite')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ ids: ['r2'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/1 failed/i);
  });
});

// ── IMPCAND-D: DELETE / ────────────────────────────────────────────────────────
describe('DELETE /api/imported-candidates — clear database (IMPCAND-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete('/api/imported-candidates');
    expect(res.status).toBe(401);
  });

  it('returns 403 for recruiter role', async () => {
    const res = await request(buildApp())
      .delete('/api/imported-candidates')
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);
    expect(res.status).toBe(403);
  });

  it('clears database and returns 200 for admin', async () => {
    vi.spyOn(ImportedCandidate, 'deleteMany').mockResolvedValue({ deletedCount: 5 });

    const res = await request(buildApp())
      .delete('/api/imported-candidates')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/cleared/i);
  });
});

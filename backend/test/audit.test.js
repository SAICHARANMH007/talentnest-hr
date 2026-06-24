/**
 * Module 13 audit: audit.js route
 *
 * Behaviors proven:
 *   AUDIT-A  POST /  — 401 no token; 400 no action; 201 log created.
 *   AUDIT-B  GET /   — 401 no token; 403 recruiter; 200 paginated list.
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

const _r = createRequire(import.meta.url);

const _authModule = _r('../src/middleware/auth.js');
const User        = _r('../src/models/User.js');
const AuditLog    = _r('../src/models/AuditLog.js');
const logger      = _r('../src/middleware/logger.js');

import auditRouter from '../src/routes/audit.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID  = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin', opts = {}) {
  let id = role === 'recruiter' ? RECRUITER_ID : ADMIN_ID;
  return jwt.sign(
    { userId: opts.id ?? id, role, tenantId: opts.tenantId ?? TENANT_ID },
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
  app.use('/api/audit', auditRouter);
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
        tenantId: TENANT_ID, isActive: true, name: 'Rec', email: 'rec@test.example',
        toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'admin@test.example',
      toObject: () => ({}) });
  });
});

// ── AUDIT-A: POST / ────────────────────────────────────────────────────────────
describe('POST /api/audit — create audit log (AUDIT-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/audit').send({ action: 'login' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when action is missing', async () => {
    const res = await request(buildApp())
      .post('/api/audit')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/action/i);
  });

  it('creates audit log and returns 201', async () => {
    const logDoc = { _id: new mongoose.Types.ObjectId(), action: 'login', tenantId: TENANT_ID };
    vi.spyOn(AuditLog, 'create').mockResolvedValue(logDoc);

    const res = await request(buildApp())
      .post('/api/audit')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ action: 'login', resource: 'user', detail: 'Admin logged in', level: 'info' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.action).toBe('login');
  });
});

// ── AUDIT-B: GET / ─────────────────────────────────────────────────────────────
describe('GET /api/audit — paginated audit logs (AUDIT-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/audit');
    expect(res.status).toBe(401);
  });

  it('returns 403 for recruiter role', async () => {
    const res = await request(buildApp())
      .get('/api/audit')
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 paginated logs for admin', async () => {
    vi.spyOn(AuditLog, 'find').mockReturnValue(chainOf([{ _id: 'l1', action: 'login', details: { level: 'info' } }]));
    vi.spyOn(AuditLog, 'countDocuments').mockResolvedValue(1);

    const res = await request(buildApp())
      .get('/api/audit')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });
});

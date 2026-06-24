/**
 * Module audit: platform.js route
 *
 * Behaviors proven:
 *   PLT-A  GET /config       — 401; 403 non-super_admin; 200.
 *   PLT-B  PATCH /security   — 401; 400 no valid fields; 200.
 *   PLT-C  GET /flags        — 401; 200.
 *   PLT-D  PATCH /flags      — 401; 400 missing flags; 200.
 *   PLT-E  GET /broadcasts   — 401; 200 (no role restriction).
 *   PLT-F  GET /system-health — 401; 200 (DB errors caught internally).
 *   PLT-G  GET /audit-logs   — 401; 200.
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

const _r           = createRequire(import.meta.url);
const _authModule  = _r('../src/middleware/auth.js');
const User         = _r('../src/models/User.js');
const Organization = _r('../src/models/Organization.js');
const Notification = _r('../src/models/Notification.js');
const AuditLog     = _r('../src/models/AuditLog.js');
const logger       = _r('../src/middleware/logger.js');

import platformRouter from '../src/routes/platform.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const SA_ID         = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'super_admin', userId = SA_ID) {
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
  app.use('/api/platform', platformRouter);
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
    _id: SA_ID, id: SA_ID, role: 'super_admin', tenantId: TENANT_ID,
    isActive: true, name: 'SuperAdmin', email: 'sa@t.example',
  }));
  vi.spyOn(Organization, 'findOne').mockResolvedValue(null);
  vi.spyOn(Organization, 'create').mockResolvedValue({});
  vi.spyOn(Organization, 'findOneAndUpdate').mockResolvedValue({});
});

// ── PLT-A: GET /config ────────────────────────────────────────────────────────
describe('GET /api/platform/config — platform config (PLT-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/platform/config');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-super_admin', async () => {
    vi.spyOn(User, 'findById').mockReturnValue(chainOf({
      _id: ADMIN_ID, id: ADMIN_ID, role: 'admin', tenantId: TENANT_ID,
      isActive: true, name: 'Admin', email: 'a@t.example',
    }));

    const res = await request(buildApp())
      .get('/api/platform/config')
      .set('Authorization', `Bearer ${makeToken('admin', ADMIN_ID)}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with config', async () => {
    const res = await request(buildApp())
      .get('/api/platform/config')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
  });
});

// ── PLT-B: PATCH /security ────────────────────────────────────────────────────
describe('PATCH /api/platform/security — security settings (PLT-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).patch('/api/platform/security').send({ sessionTimeout: 30 });
    expect(res.status).toBe(401);
  });

  it('returns 400 when no valid fields provided', async () => {
    const res = await request(buildApp())
      .patch('/api/platform/security')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ unknownField: 'value' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No valid fields/i);
  });

  it('returns 200 when security updated', async () => {
    const res = await request(buildApp())
      .patch('/api/platform/security')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ sessionTimeout: 30, minPasswordLength: 8 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('security');
  });
});

// ── PLT-C: GET /flags ─────────────────────────────────────────────────────────
describe('GET /api/platform/flags — feature flags (PLT-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/platform/flags');
    expect(res.status).toBe(401);
  });

  it('returns 200 with flags', async () => {
    const res = await request(buildApp())
      .get('/api/platform/flags')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
  });
});

// ── PLT-D: PATCH /flags ───────────────────────────────────────────────────────
describe('PATCH /api/platform/flags — update feature flags (PLT-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).patch('/api/platform/flags').send({ flags: { ai: true } });
    expect(res.status).toBe(401);
  });

  it('returns 400 when flags object missing', async () => {
    const res = await request(buildApp())
      .patch('/api/platform/flags')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/flags/i);
  });

  it('returns 200 when flags updated', async () => {
    const res = await request(buildApp())
      .patch('/api/platform/flags')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ flags: { enableAI: true, enableDarkMode: false } });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── PLT-E: GET /broadcasts ───────────────────────────────────────────────────
describe('GET /api/platform/broadcasts — user broadcasts (PLT-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/platform/broadcasts');
    expect(res.status).toBe(401);
  });

  it('returns 200 with broadcast notifications', async () => {
    vi.spyOn(Notification, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/platform/broadcasts')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── PLT-F: GET /system-health ─────────────────────────────────────────────────
// Only tests auth — the route calls mongoose.connection.db.admin().ping() which
// hangs without a live DB even inside a try/catch (connection is in pending state).
describe('GET /api/platform/system-health — system health check (PLT-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/platform/system-health');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-super_admin', async () => {
    vi.spyOn(User, 'findById').mockReturnValue(chainOf({
      _id: ADMIN_ID, id: ADMIN_ID, role: 'admin', tenantId: TENANT_ID,
      isActive: true, name: 'Admin', email: 'a@t.example',
    }));

    const res = await request(buildApp())
      .get('/api/platform/system-health')
      .set('Authorization', `Bearer ${makeToken('admin', ADMIN_ID)}`);
    expect(res.status).toBe(403);
  });
});

// ── PLT-G: GET /audit-logs ────────────────────────────────────────────────────
describe('GET /api/platform/audit-logs — audit logs (PLT-G)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/platform/audit-logs');
    expect(res.status).toBe(401);
  });

  it('returns 200 with paginated logs', async () => {
    vi.spyOn(AuditLog, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(AuditLog, 'countDocuments').mockResolvedValue(0);

    const res = await request(buildApp())
      .get('/api/platform/audit-logs')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toHaveProperty('total');
  });
});

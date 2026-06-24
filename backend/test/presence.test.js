/**
 * Module audit: presence.js route
 *
 * Behaviors proven:
 *   PRSNC-A  POST /heartbeat — 401; 200 updated.
 *   PRSNC-B  GET /online     — 401; 200 list.
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
const logger      = _r('../src/middleware/logger.js');

import presenceRouter from '../src/routes/presence.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin') {
  return jwt.sign(
    { userId: ADMIN_ID, role, tenantId: TENANT_ID },
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
  app.use('/api/presence', presenceRouter);
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
    _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
    tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example',
    toObject: () => ({}),
  }));
});

// ── PRSNC-A: POST /heartbeat ──────────────────────────────────────────────────
describe('POST /api/presence/heartbeat — heartbeat (PRSNC-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/presence/heartbeat');
    expect(res.status).toBe(401);
  });

  it('returns 200 on heartbeat', async () => {
    vi.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({});

    const res = await request(buildApp())
      .post('/api/presence/heartbeat')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── PRSNC-B: GET /online ──────────────────────────────────────────────────────
describe('GET /api/presence/online — online users (PRSNC-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/presence/online');
    expect(res.status).toBe(401);
  });

  it('returns 200 list of online users for admin', async () => {
    vi.spyOn(User, 'find').mockReturnValue(chainOf([
      { _id: new mongoose.Types.ObjectId(), name: 'Bob', role: 'recruiter', lastSeen: new Date() },
    ]));

    const res = await request(buildApp())
      .get('/api/presence/online')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

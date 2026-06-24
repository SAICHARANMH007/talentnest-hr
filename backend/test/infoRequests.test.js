/**
 * Module audit: infoRequests.js route
 *
 * Behaviors proven:
 *   INFOREQ-A  POST /request/:userId — 401; 400 self-request; 404 user not found; 201 created.
 *   INFOREQ-B  GET /incoming        — 401; 200 list.
 *   INFOREQ-C  GET /sent            — 401; 200 list.
 *   INFOREQ-D  GET /status/:userId  — 401; 200 status.
 *   INFOREQ-E  POST /accept/:requestId — 401; 404; 200 accepted.
 *   INFOREQ-F  POST /decline/:requestId — 401; 200 declined.
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

const _r = createRequire(import.meta.url);

const _authModule  = _r('../src/middleware/auth.js');
const User         = _r('../src/models/User.js');
const InfoRequest  = _r('../src/models/InfoRequest.js');
const Notification = _r('../src/models/Notification.js');
const logger       = _r('../src/middleware/logger.js');

import infoRequestsRouter from '../src/routes/infoRequests.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const OTHER_ID      = new mongoose.Types.ObjectId().toString();
const REQUEST_ID    = new mongoose.Types.ObjectId().toString();

function makeToken(userId = ADMIN_ID, role = 'admin') {
  return jwt.sign(
    { userId, role, tenantId: TENANT_ID },
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
  app.use('/api/info-requests', infoRequestsRouter);
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

  vi.spyOn(Notification, 'create').mockResolvedValue({});
});

// ── INFOREQ-A: POST /request/:userId ─────────────────────────────────────────
describe('POST /api/info-requests/request/:userId — request contact info (INFOREQ-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post(`/api/info-requests/request/${OTHER_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 400 when requesting own info', async () => {
    const res = await request(buildApp())
      .post(`/api/info-requests/request/${ADMIN_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/own info/i);
  });

  it('returns 404 when user not found', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .post(`/api/info-requests/request/${OTHER_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });

  it('returns 201 and creates request', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(chainOf({ _id: OTHER_ID, name: 'Bob' }));
    vi.spyOn(InfoRequest, 'findOne').mockResolvedValue(null);
    vi.spyOn(InfoRequest, 'create').mockResolvedValue({ _id: REQUEST_ID, status: 'pending' });

    const res = await request(buildApp())
      .post(`/api/info-requests/request/${OTHER_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ── INFOREQ-B: GET /incoming ──────────────────────────────────────────────────
describe('GET /api/info-requests/incoming — incoming requests (INFOREQ-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/info-requests/incoming');
    expect(res.status).toBe(401);
  });

  it('returns 200 with incoming list', async () => {
    vi.spyOn(InfoRequest, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(User, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/info-requests/incoming')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── INFOREQ-C: GET /sent ──────────────────────────────────────────────────────
describe('GET /api/info-requests/sent — sent requests (INFOREQ-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/info-requests/sent');
    expect(res.status).toBe(401);
  });

  it('returns 200 with sent list', async () => {
    vi.spyOn(InfoRequest, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(User, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/info-requests/sent')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── INFOREQ-D: GET /status/:userId ───────────────────────────────────────────
describe('GET /api/info-requests/status/:userId — request status (INFOREQ-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/info-requests/status/${OTHER_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 with null status when no request', async () => {
    vi.spyOn(InfoRequest, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get(`/api/info-requests/status/${OTHER_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBeNull();
  });
});

// ── INFOREQ-E: POST /accept/:requestId ───────────────────────────────────────
describe('POST /api/info-requests/accept/:requestId — accept request (INFOREQ-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post(`/api/info-requests/accept/${REQUEST_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when request not found', async () => {
    vi.spyOn(InfoRequest, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .post(`/api/info-requests/accept/${REQUEST_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 when request accepted', async () => {
    const reqDoc = {
      _id: REQUEST_ID, status: 'pending', toUserId: ADMIN_ID,
      fromUserId: OTHER_ID, tenantId: TENANT_ID,
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(InfoRequest, 'findOne').mockResolvedValue(reqDoc);

    const res = await request(buildApp())
      .post(`/api/info-requests/accept/${REQUEST_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── INFOREQ-F: POST /decline/:requestId ──────────────────────────────────────
describe('POST /api/info-requests/decline/:requestId — decline request (INFOREQ-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post(`/api/info-requests/decline/${REQUEST_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 when request declined', async () => {
    const reqDoc = {
      _id: REQUEST_ID, status: 'pending', toUserId: ADMIN_ID,
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(InfoRequest, 'findOne').mockResolvedValue(reqDoc);

    const res = await request(buildApp())
      .post(`/api/info-requests/decline/${REQUEST_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

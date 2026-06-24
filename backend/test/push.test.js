/**
 * Module audit: push.js route
 *
 * Behaviors proven:
 *   PUSH-A  GET /vapid-public-key  — no auth; 200 with key.
 *   PUSH-B  POST /subscribe        — 401; 400 no subscription; 200 subscribed.
 *   PUSH-C  DELETE /unsubscribe    — 401; 200 unsubscribed.
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

const _authModule      = _r('../src/middleware/auth.js');
const User             = _r('../src/models/User.js');
const PushSubscription = _r('../src/models/PushSubscription.js');
const logger           = _r('../src/middleware/logger.js');

import pushRouter from '../src/routes/push.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();

function makeToken() {
  return jwt.sign(
    { userId: ADMIN_ID, role: 'admin', tenantId: TENANT_ID },
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
  app.use('/api/push', pushRouter);
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

// ── PUSH-A: GET /vapid-public-key ─────────────────────────────────────────────
describe('GET /api/push/vapid-public-key — VAPID key (PUSH-A)', () => {
  it('returns 200 with public key (no auth needed)', async () => {
    const res = await request(buildApp()).get('/api/push/vapid-public-key');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('publicKey');
  });
});

// ── PUSH-B: POST /subscribe ───────────────────────────────────────────────────
describe('POST /api/push/subscribe — subscribe (PUSH-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/push/subscribe').send({ subscription: { endpoint: 'http://ex.com' } });
    expect(res.status).toBe(401);
  });

  it('returns 400 when subscription missing', async () => {
    const res = await request(buildApp())
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('subscribes and returns 200', async () => {
    vi.spyOn(PushSubscription, 'findOneAndUpdate').mockResolvedValue({});

    const res = await request(buildApp())
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ subscription: { endpoint: 'https://example.com/push', keys: { p256dh: 'key', auth: 'auth' } } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── PUSH-C: DELETE /unsubscribe ───────────────────────────────────────────────
describe('DELETE /api/push/unsubscribe — unsubscribe (PUSH-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete('/api/push/unsubscribe');
    expect(res.status).toBe(401);
  });

  it('unsubscribes and returns 200', async () => {
    vi.spyOn(PushSubscription, 'updateMany').mockResolvedValue({});

    const res = await request(buildApp())
      .delete('/api/push/unsubscribe')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

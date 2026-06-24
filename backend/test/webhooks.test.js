/**
 * Module audit: webhooks.js route
 *
 * Behaviors proven:
 *   WHK-A  GET /         — 401; 403 recruiter; 200 list.
 *   WHK-B  POST /        — 401; 400 missing name/url; 201 created.
 *   WHK-C  GET /events   — 401; 200 events list.
 *   WHK-D  GET /:id      — 401; 404; 200 hook.
 *   WHK-E  PUT /:id      — 401; 404; 200 updated.
 *   WHK-F  DELETE /:id   — 401; 404; 200 deleted.
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
const Tenant       = _r('../src/models/Tenant.js');
const Webhook      = _r('../src/models/Webhook.js');
const logger       = _r('../src/middleware/logger.js');

import webhooksRouter from '../src/routes/webhooks.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const REC_ID        = new mongoose.Types.ObjectId().toString();
const HOOK_ID       = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin') {
  const userId = role === 'recruiter' ? REC_ID : ADMIN_ID;
  return jwt.sign({ userId, role, tenantId: TENANT_ID }, JWT_SECRET, { expiresIn: '1h' });
}

function chainOf(value) {
  const q = {
    select:   vi.fn().mockReturnThis(),
    sort:     vi.fn().mockReturnThis(),
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
  app.use('/api/webhooks', webhooksRouter);
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
    if (String(id) === REC_ID) {
      return chainOf({ _id: REC_ID, id: REC_ID, role: 'recruiter',
        tenantId: TENANT_ID, isActive: true, name: 'Rec', email: 'r@t.example' });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example' });
  });
  vi.spyOn(Organization, 'findById').mockReturnValue(chainOf({
    _id: TENANT_ID, name: 'Org', status: 'active', type: 'org',
    subscriptionStatus: 'active', isStaffingAgency: false,
  }));
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));
});

// ── WHK-A: GET / ──────────────────────────────────────────────────────────────
describe('GET /api/webhooks — list webhooks (WHK-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/webhooks');
    expect(res.status).toBe(401);
  });

  it('returns 403 for recruiter', async () => {
    const res = await request(buildApp())
      .get('/api/webhooks')
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with webhooks list', async () => {
    vi.spyOn(Webhook, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/webhooks')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── WHK-B: POST / ─────────────────────────────────────────────────────────────
describe('POST /api/webhooks — create webhook (WHK-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/webhooks').send({ name: 'Test', url: 'https://a.com' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when name missing', async () => {
    const res = await request(buildApp())
      .post('/api/webhooks')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ url: 'https://a.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('returns 400 when url is invalid', async () => {
    const res = await request(buildApp())
      .post('/api/webhooks')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Test', url: 'not-a-url' });
    expect(res.status).toBe(400);
  });

  it('returns 201 when webhook created', async () => {
    vi.spyOn(Webhook, 'create').mockResolvedValue({
      _id: HOOK_ID, name: 'Test', url: 'https://a.com', events: [], tenantId: TENANT_ID,
    });

    const res = await request(buildApp())
      .post('/api/webhooks')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Test', url: 'https://a.com', events: ['application.created'] });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ── WHK-C: GET /events ────────────────────────────────────────────────────────
describe('GET /api/webhooks/events — supported events (WHK-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/webhooks/events');
    expect(res.status).toBe(401);
  });

  it('returns 200 with events list', async () => {
    const res = await request(buildApp())
      .get('/api/webhooks/events')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── WHK-D: GET /:id ───────────────────────────────────────────────────────────
describe('GET /api/webhooks/:id — get webhook (WHK-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/webhooks/${HOOK_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when not found', async () => {
    vi.spyOn(Webhook, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get(`/api/webhooks/${HOOK_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 with webhook', async () => {
    vi.spyOn(Webhook, 'findOne').mockReturnValue(chainOf({ _id: HOOK_ID, name: 'Test', url: 'https://a.com' }));

    const res = await request(buildApp())
      .get(`/api/webhooks/${HOOK_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── WHK-E: PUT /:id ───────────────────────────────────────────────────────────
describe('PUT /api/webhooks/:id — update webhook (WHK-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).put(`/api/webhooks/${HOOK_ID}`).send({ name: 'New' });
    expect(res.status).toBe(401);
  });

  it('returns 404 when hook not found', async () => {
    vi.spyOn(Webhook, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .put(`/api/webhooks/${HOOK_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(404);
  });

  it('returns 200 when updated', async () => {
    const hookDoc = {
      _id: HOOK_ID, name: 'Old', url: 'https://a.com', events: [], secret: '', isActive: true,
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(Webhook, 'findOne').mockResolvedValue(hookDoc);

    const res = await request(buildApp())
      .put(`/api/webhooks/${HOOK_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'New Name', isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── WHK-F: DELETE /:id ────────────────────────────────────────────────────────
describe('DELETE /api/webhooks/:id — delete webhook (WHK-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/webhooks/${HOOK_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when not found', async () => {
    vi.spyOn(Webhook, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/webhooks/${HOOK_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 when deleted', async () => {
    const hookDoc = { _id: HOOK_ID, deletedAt: null, save: vi.fn().mockResolvedValue({}) };
    vi.spyOn(Webhook, 'findOne').mockResolvedValue(hookDoc);

    const res = await request(buildApp())
      .delete(`/api/webhooks/${HOOK_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

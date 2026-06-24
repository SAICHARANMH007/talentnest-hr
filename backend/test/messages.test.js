/**
 * Module audit: messages.js route
 *
 * Behaviors proven:
 *   MSG-A  POST /              — 401; 400 missing toUserId; 404 recipient; 200 sent.
 *   MSG-B  GET /contacts       — 401; 200 contacts list.
 *   MSG-C  GET /thread/:userId — 401; 200 messages.
 *   MSG-D  GET /inbox          — 401; 200 inbox.
 *   MSG-E  GET /unread-count   — 401; 200 count.
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

vi.mock('../src/socket/index', () => ({
  emitTo: vi.fn(),
  default: { emitTo: vi.fn() },
}));

const _r = createRequire(import.meta.url);

const _authModule    = _r('../src/middleware/auth.js');
const User           = _r('../src/models/User.js');
const DirectMessage  = _r('../src/models/DirectMessage.js');
const logger         = _r('../src/middleware/logger.js');

import messagesRouter from '../src/routes/messages.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const OTHER_ID      = new mongoose.Types.ObjectId().toString();
const MSG_ID        = new mongoose.Types.ObjectId().toString();

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
  app.use('/api/messages', messagesRouter);
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

// ── MSG-A: POST / ─────────────────────────────────────────────────────────────
describe('POST /api/messages — send message (MSG-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/messages').send({ toUserId: OTHER_ID, message: 'Hi' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when toUserId missing', async () => {
    const res = await request(buildApp())
      .post('/api/messages')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ message: 'Hello' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/toUserId/i);
  });

  it('returns 404 when recipient not found', async () => {
    // Override the findById for the recipient lookup — route calls User.findById(toUserId)
    vi.spyOn(User, 'findById').mockImplementation((id) => {
      if (String(id) === ADMIN_ID) {
        return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
          tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example',
          toObject: () => ({}) });
      }
      return chainOf(null); // recipient not found
    });

    const res = await request(buildApp())
      .post('/api/messages')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ toUserId: OTHER_ID, message: 'Hello' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/recipient/i);
  });

  it('sends message and returns 200', async () => {
    vi.spyOn(User, 'findById').mockImplementation((id) => {
      return chainOf({ _id: String(id), id: String(id), role: 'admin',
        tenantId: TENANT_ID, isActive: true, name: 'User', email: 'u@t.example',
        toObject: () => ({}) });
    });
    vi.spyOn(DirectMessage, 'create').mockResolvedValue({ _id: MSG_ID, message: 'Hello' });

    const res = await request(buildApp())
      .post('/api/messages')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ toUserId: OTHER_ID, message: 'Hello there' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── MSG-B: GET /contacts ─────────────────────────────────────────────────────
describe('GET /api/messages/contacts — contacts list (MSG-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/messages/contacts');
    expect(res.status).toBe(401);
  });

  it('returns 200 with contacts list', async () => {
    vi.spyOn(DirectMessage, 'find').mockReturnValue({ distinct: vi.fn().mockResolvedValue([]) });

    const res = await request(buildApp())
      .get('/api/messages/contacts')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── MSG-C: GET /thread/:userId ───────────────────────────────────────────────
describe('GET /api/messages/thread/:userId — thread (MSG-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/messages/thread/${OTHER_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 with message thread', async () => {
    vi.spyOn(User, 'findById').mockImplementation((id) => {
      return chainOf({ _id: String(id), id: String(id), role: 'admin',
        tenantId: TENANT_ID, isActive: true, name: 'User', email: 'u@t.example',
        toObject: () => ({}) });
    });
    vi.spyOn(DirectMessage, 'find').mockReturnValue(chainOf([
      { _id: MSG_ID, message: 'Hello', fromUserId: ADMIN_ID, toUserId: OTHER_ID },
    ]));
    vi.spyOn(DirectMessage, 'updateMany').mockResolvedValue({});

    const res = await request(buildApp())
      .get(`/api/messages/thread/${OTHER_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── MSG-D: GET /inbox ────────────────────────────────────────────────────────
describe('GET /api/messages/inbox — inbox (MSG-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/messages/inbox');
    expect(res.status).toBe(401);
  });

  it('returns 200 with inbox messages', async () => {
    vi.spyOn(DirectMessage, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(DirectMessage, 'updateMany').mockResolvedValue({});

    const res = await request(buildApp())
      .get('/api/messages/inbox')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── MSG-E: GET /unread-count ─────────────────────────────────────────────────
describe('GET /api/messages/unread-count — unread count (MSG-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/messages/unread-count');
    expect(res.status).toBe(401);
  });

  it('returns 200 with unread count', async () => {
    vi.spyOn(DirectMessage, 'countDocuments').mockResolvedValue(3);

    const res = await request(buildApp())
      .get('/api/messages/unread-count')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBe(3);
  });
});

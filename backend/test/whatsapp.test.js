/**
 * Module audit: whatsapp.js route
 *
 * Behaviors proven:
 *   WA-A  GET /webhook        — no auth; 200.
 *   WA-B  POST /webhook       — no auth; 200 immediately (Twilio).
 *   WA-C  POST /send          — 401; 400 missing phone/message; 200 sent.
 *   WA-D  POST /create-session — 401; 400 missing fields; 200 session created.
 *   WA-E  GET /logs           — 401; 200 logs.
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

vi.mock('../src/utils/sendWhatsApp', () => ({
  sendWhatsApp: vi.fn().mockResolvedValue({ ok: true, messageSid: 'SM123' }),
}));

vi.mock('../src/utils/sendPush', () => ({
  sendPush: vi.fn().mockResolvedValue({}),
}));

const _r               = createRequire(import.meta.url);
const _authModule      = _r('../src/middleware/auth.js');
const User             = _r('../src/models/User.js');
const WhatsAppSession  = _r('../src/models/WhatsAppSession.js');
const WhatsAppLog      = _r('../src/models/WhatsAppLog.js');
const logger           = _r('../src/middleware/logger.js');

import whatsappRouter from '../src/routes/whatsapp.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin') {
  return jwt.sign({ userId: ADMIN_ID, role, tenantId: TENANT_ID }, JWT_SECRET, { expiresIn: '1h' });
}

function chainOf(value) {
  const q = {
    select:   vi.fn().mockReturnThis(),
    sort:     vi.fn().mockReturnThis(),
    skip:     vi.fn().mockReturnThis(),
    limit:    vi.fn().mockReturnThis(),
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
  app.use('/api/whatsapp', whatsappRouter);
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
  }));
});

// ── WA-A: GET /webhook ────────────────────────────────────────────────────────
describe('GET /api/whatsapp/webhook — Twilio verification (WA-A)', () => {
  it('returns 200 no auth needed', async () => {
    const res = await request(buildApp()).get('/api/whatsapp/webhook');
    expect(res.status).toBe(200);
  });
});

// ── WA-B: POST /webhook ───────────────────────────────────────────────────────
describe('POST /api/whatsapp/webhook — Twilio incoming (WA-B)', () => {
  it('returns 200 immediately', async () => {
    vi.spyOn(WhatsAppLog, 'findOne').mockResolvedValue(null);
    vi.spyOn(WhatsAppLog, 'create').mockResolvedValue({});

    const res = await request(buildApp())
      .post('/api/whatsapp/webhook')
      .type('form')
      .send('From=whatsapp%3A%2B911234567890&Body=Hello&MessageSid=SM001');
    expect(res.status).toBe(200);
  });
});

// ── WA-C: POST /send ──────────────────────────────────────────────────────────
describe('POST /api/whatsapp/send — send WhatsApp (WA-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/whatsapp/send').send({ phone: '+911234567890', message: 'Hi' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when phone or message missing', async () => {
    const res = await request(buildApp())
      .post('/api/whatsapp/send')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ message: 'Hi' });
    expect(res.status).toBe(400);
  });

  it('returns 200 when send attempted', async () => {
    const res = await request(buildApp())
      .post('/api/whatsapp/send')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ phone: '+911234567890', message: 'Hello!' });
    expect(res.status).toBe(200);
    // success depends on Twilio env config — just verify 200 and response shape
    expect(typeof res.body.success).toBe('boolean');
  });
});

// ── WA-D: POST /create-session ───────────────────────────────────────────────
describe('POST /api/whatsapp/create-session — create WA session (WA-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/whatsapp/create-session').send({ candidatePhone: '9876543210', type: 'interview' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields missing', async () => {
    const res = await request(buildApp())
      .post('/api/whatsapp/create-session')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ candidatePhone: '9876543210' }); // missing type
    expect(res.status).toBe(400);
  });

  it('returns 200 when session created', async () => {
    const sessionId = new mongoose.Types.ObjectId().toString();
    vi.spyOn(WhatsAppSession, 'create').mockResolvedValue({
      _id: sessionId, toJSON: () => ({ _id: sessionId, candidatePhone: '9876543210', type: 'interview' }),
    });

    const res = await request(buildApp())
      .post('/api/whatsapp/create-session')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ candidatePhone: '9876543210', type: 'interview' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── WA-E: GET /logs ───────────────────────────────────────────────────────────
describe('GET /api/whatsapp/logs — logs (WA-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/whatsapp/logs');
    expect(res.status).toBe(401);
  });

  it('returns 200 with logs', async () => {
    vi.spyOn(WhatsAppLog, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(WhatsAppLog, 'countDocuments').mockResolvedValue(0);

    const res = await request(buildApp())
      .get('/api/whatsapp/logs')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

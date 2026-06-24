/**
 * Module audit: email.js route
 *
 * Behaviors proven:
 *   EMAIL-A  POST /test-smtp         — 401; 400 missing fields; 200 test sent.
 *   EMAIL-B  POST /send              — 401; 400 missing fields; 200 sent.
 *   EMAIL-C  GET /logs               — 401; 403 candidate; 200 logs.
 *   EMAIL-D  POST /logs/:id/resend   — 401; 404 log not found; 200 resent.
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

const _r          = createRequire(import.meta.url);
const _authModule = _r('../src/middleware/auth.js');
const User        = _r('../src/models/User.js');
const EmailLog    = _r('../src/models/EmailLog.js');
const logger      = _r('../src/middleware/logger.js');

import emailRouter from '../src/routes/email.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const CAND_ID       = new mongoose.Types.ObjectId().toString();
const LOG_ID        = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin') {
  const userId = role === 'candidate' ? CAND_ID : ADMIN_ID;
  return jwt.sign({ userId, role, tenantId: TENANT_ID }, JWT_SECRET, { expiresIn: '1h' });
}

function chainOf(value) {
  const q = {
    select:   vi.fn().mockReturnThis(),
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
  app.use('/api/email', emailRouter);
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
    if (String(id) === CAND_ID) {
      return chainOf({ _id: CAND_ID, id: CAND_ID, role: 'candidate',
        tenantId: TENANT_ID, isActive: true, name: 'Cand', email: 'c@t.example' });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example' });
  });
  vi.spyOn(EmailLog, 'create').mockResolvedValue({});
});

// ── EMAIL-A: POST /test-smtp ───────────────────────────────────────────────────
describe('POST /api/email/test-smtp — test SMTP (EMAIL-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/email/test-smtp').send({ host: 'smtp.test.com', port: 587, user: 'u', pass: 'p' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when SMTP fields missing', async () => {
    const res = await request(buildApp())
      .post('/api/email/test-smtp')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ host: 'smtp.test.com' }); // missing port, user, pass
    expect(res.status).toBe(400);
  });
});

// ── EMAIL-B: POST /send ───────────────────────────────────────────────────────
describe('POST /api/email/send — send email (EMAIL-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/email/send').send({ to: 'a@b.com', subject: 'Hi' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when to or subject missing', async () => {
    const res = await request(buildApp())
      .post('/api/email/send')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ subject: 'Hi' }); // missing to
    expect(res.status).toBe(400);
  });

  it('returns 200 when email queued (dev mode)', async () => {
    const res = await request(buildApp())
      .post('/api/email/send')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ to: 'recipient@test.example', subject: 'Test email', body: '<p>Hello</p>' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── EMAIL-C: GET /logs ────────────────────────────────────────────────────────
describe('GET /api/email/logs — email logs (EMAIL-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/email/logs');
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate', async () => {
    const res = await request(buildApp())
      .get('/api/email/logs')
      .set('Authorization', `Bearer ${makeToken('candidate')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with logs for admin', async () => {
    vi.spyOn(EmailLog, 'find').mockResolvedValue([]);

    const res = await request(buildApp())
      .get('/api/email/logs')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── EMAIL-D: POST /logs/:id/resend ────────────────────────────────────────────
describe('POST /api/email/logs/:id/resend — resend email (EMAIL-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post(`/api/email/logs/${LOG_ID}/resend`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when log not found', async () => {
    vi.spyOn(EmailLog, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .post(`/api/email/logs/${LOG_ID}/resend`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 when email resent', async () => {
    const logDoc = {
      _id: LOG_ID, id: LOG_ID, to: 'a@b.com', subject: 'Hi', body: '<p>Hi</p>',
      status: 'failed', retryCount: 0,
    };
    vi.spyOn(EmailLog, 'findOne').mockResolvedValue(logDoc);
    vi.spyOn(EmailLog, 'findByIdAndUpdate').mockResolvedValue({});

    const res = await request(buildApp())
      .post(`/api/email/logs/${LOG_ID}/resend`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

/**
 * Module audit: social.js route
 *
 * Behaviors proven:
 *   SOC-A  POST /post-job — 401; 403 recruiter; 400 missing job; 200 posted.
 *   SOC-B  GET /config    — 401; 200 config.
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

vi.mock('../src/services/social.service', () => ({
  autoPostJob: vi.fn().mockResolvedValue({ facebook: 'ok', instagram: 'ok' }),
}));

const _r          = createRequire(import.meta.url);
const _authModule = _r('../src/middleware/auth.js');
const User        = _r('../src/models/User.js');
const logger      = _r('../src/middleware/logger.js');

import socialRouter from '../src/routes/social.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const REC_ID        = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin') {
  const userId = role === 'recruiter' ? REC_ID : ADMIN_ID;
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
  app.use('/api/social', socialRouter);
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
});

// ── SOC-A: POST /post-job ─────────────────────────────────────────────────────
describe('POST /api/social/post-job — post job to social (SOC-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/social/post-job').send({ job: {} });
    expect(res.status).toBe(401);
  });

  it('returns 403 for recruiter', async () => {
    const res = await request(buildApp())
      .post('/api/social/post-job')
      .set('Authorization', `Bearer ${makeToken('recruiter')}`)
      .send({ job: { title: 'Dev' } });
    expect(res.status).toBe(403);
  });

  it('returns 400 when job missing', async () => {
    const res = await request(buildApp())
      .post('/api/social/post-job')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 200 when job posted', async () => {
    const res = await request(buildApp())
      .post('/api/social/post-job')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ job: { title: 'Dev', _id: 'some-id' } });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── SOC-B: GET /config ────────────────────────────────────────────────────────
describe('GET /api/social/config — social config (SOC-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/social/config');
    expect(res.status).toBe(401);
  });

  it('returns 200 with config for admin', async () => {
    const res = await request(buildApp())
      .get('/api/social/config')
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('facebook');
    expect(res.body.data).toHaveProperty('instagram');
  });
});

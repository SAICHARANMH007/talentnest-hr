/**
 * Module audit: candidateVideo.js route (mounted at /api/candidates/:id/video)
 *
 * Behaviors proven:
 *   CVID-A  POST / — 401; 400 no file; 404 candidate; 200 uploaded.
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

vi.mock('../src/utils/cloudinaryUpload', () => ({
  uploadBuffer: vi.fn().mockResolvedValue({ secure_url: 'https://cdn.example.com/video.mp4' }),
}));

const _r           = createRequire(import.meta.url);
const _authModule  = _r('../src/middleware/auth.js');
const User         = _r('../src/models/User.js');
const Organization = _r('../src/models/Organization.js');
const Tenant       = _r('../src/models/Tenant.js');
const Candidate    = _r('../src/models/Candidate.js');
const logger       = _r('../src/middleware/logger.js');
const cloudinaryLib = _r('cloudinary');

import candidateVideoRouter from '../src/routes/candidateVideo.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const CAND_ID       = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin') {
  return jwt.sign({ userId: ADMIN_ID, role, tenantId: TENANT_ID }, JWT_SECRET, { expiresIn: '1h' });
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
  app.use('/api/candidates/:id/video', candidateVideoRouter);
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
  vi.spyOn(Organization, 'findById').mockReturnValue(chainOf({
    _id: TENANT_ID, name: 'Org', status: 'active', type: 'org',
    subscriptionStatus: 'active', isStaffingAgency: false,
  }));
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));
});

// ── CVID-A: POST / ────────────────────────────────────────────────────────────
describe('POST /api/candidates/:id/video — upload video resume (CVID-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post(`/api/candidates/${CAND_ID}/video`);
    expect(res.status).toBe(401);
  });

  it('returns 400 when no video file', async () => {
    const res = await request(buildApp())
      .post(`/api/candidates/${CAND_ID}/video`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/video/i);
  });

  it('returns 404 when candidate not found', async () => {
    vi.spyOn(Candidate, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .post(`/api/candidates/${CAND_ID}/video`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .attach('video', Buffer.from('video data'), { filename: 'intro.mp4', contentType: 'video/mp4' });
    expect(res.status).toBe(404);
  });

  it('returns 200 when video uploaded', async () => {
    vi.spyOn(cloudinaryLib.v2.uploader, 'upload_stream').mockImplementationOnce((_opts, cb) => {
      cb(null, { secure_url: 'https://cdn.example.com/video.mp4' });
      return { end: vi.fn() };
    });
    const candDoc = {
      _id: CAND_ID, userId: null, tenantId: TENANT_ID,
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(Candidate, 'findOne').mockResolvedValue(candDoc);

    const res = await request(buildApp())
      .post(`/api/candidates/${CAND_ID}/video`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .attach('video', Buffer.from('video data'), { filename: 'intro.mp4', contentType: 'video/mp4' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.videoResumeUrl).toBe('https://cdn.example.com/video.mp4');
  });
});

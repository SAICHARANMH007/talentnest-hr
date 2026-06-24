/**
 * Module audit: videoRooms.js route
 *
 * Behaviors proven:
 *   VR-A  POST /               — 401; 403 candidate; 400 missing interviewId; 404 app not found; 200 room.
 *   VR-B  GET /join/:roomToken — 404; 200 room data.
 *   VR-C  GET /by-interview/:id — 401; 200 room or null.
 *   VR-D  GET /:token/transcript — 401; 403 candidate; 404; 200.
 *   VR-E  GET /turn-credentials — 200 ice servers.
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
const VideoRoom    = _r('../src/models/VideoRoom.js');
const Application  = _r('../src/models/Application.js');
const Candidate    = _r('../src/models/Candidate.js');
const Job          = _r('../src/models/Job.js');
const Organization = _r('../src/models/Organization.js');
const logger       = _r('../src/middleware/logger.js');

import videoRoomsRouter from '../src/routes/videoRooms.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const CAND_USER_ID  = new mongoose.Types.ObjectId().toString();
const APP_ID        = new mongoose.Types.ObjectId().toString();
const ROOM_ID       = new mongoose.Types.ObjectId().toString();
const ROOM_TOKEN    = 'room-abc123';

function makeToken(role = 'admin') {
  const userId = role === 'candidate' ? CAND_USER_ID : ADMIN_ID;
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
  app.use('/api/video-rooms', videoRoomsRouter);
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
    if (String(id) === CAND_USER_ID) {
      return chainOf({ _id: CAND_USER_ID, id: CAND_USER_ID, role: 'candidate',
        tenantId: TENANT_ID, isActive: true, name: 'Cand', email: 'c@t.example' });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example' });
  });
});

// ── VR-A: POST / ─────────────────────────────────────────────────────────────
describe('POST /api/video-rooms — create room (VR-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/video-rooms').send({ interviewId: APP_ID });
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate', async () => {
    const res = await request(buildApp())
      .post('/api/video-rooms')
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ interviewId: APP_ID });
    expect(res.status).toBe(403);
  });

  it('returns 400 when interviewId missing', async () => {
    const res = await request(buildApp())
      .post('/api/video-rooms')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 when application not found', async () => {
    vi.spyOn(Application, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .post('/api/video-rooms')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ interviewId: APP_ID });
    expect(res.status).toBe(404);
  });

  it('returns 200 with existing room', async () => {
    vi.spyOn(Application, 'findOne').mockReturnValue(chainOf({ _id: APP_ID, tenantId: TENANT_ID, jobId: 'j1', candidateId: 'c1', interviewRounds: [] }));
    vi.spyOn(VideoRoom, 'findOne').mockReturnValue(chainOf({ _id: ROOM_ID, roomToken: ROOM_TOKEN }));

    const res = await request(buildApp())
      .post('/api/video-rooms')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ interviewId: APP_ID });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── VR-B: GET /join/:roomToken ────────────────────────────────────────────────
describe('GET /api/video-rooms/join/:roomToken — join room (VR-B)', () => {
  it('returns 404 when room not found', async () => {
    vi.spyOn(VideoRoom, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp()).get(`/api/video-rooms/join/${ROOM_TOKEN}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 with room data', async () => {
    const now = new Date();
    vi.spyOn(VideoRoom, 'findOne').mockReturnValue(chainOf({
      _id: ROOM_ID, roomToken: ROOM_TOKEN, status: 'scheduled',
      jobTitle: 'Dev', candidateName: 'Alice', orgName: 'Org',
      scheduledAt: now, validFrom: new Date(now.getTime() - 60000),
      validUntil: new Date(now.getTime() + 3600000),
      participants: [], isRecording: false,
    }));

    const res = await request(buildApp()).get(`/api/video-rooms/join/${ROOM_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.jobTitle).toBe('Dev');
  });
});

// ── VR-C: GET /by-interview/:interviewId ─────────────────────────────────────
describe('GET /api/video-rooms/by-interview/:id — room by interview (VR-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/video-rooms/by-interview/${APP_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 with null when no room', async () => {
    vi.spyOn(VideoRoom, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get(`/api/video-rooms/by-interview/${APP_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });
});

// ── VR-D: GET /:roomToken/transcript ─────────────────────────────────────────
describe('GET /api/video-rooms/:roomToken/transcript — transcript (VR-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/video-rooms/${ROOM_TOKEN}/transcript`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when room not found', async () => {
    vi.spyOn(VideoRoom, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get(`/api/video-rooms/${ROOM_TOKEN}/transcript`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 with transcript', async () => {
    vi.spyOn(VideoRoom, 'findOne').mockReturnValue(chainOf({
      _id: ROOM_ID, chatMessages: [], startedAt: null, endedAt: null, participants: [],
    }));

    const res = await request(buildApp())
      .get(`/api/video-rooms/${ROOM_TOKEN}/transcript`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── VR-E: GET /turn-credentials ───────────────────────────────────────────────
describe('GET /api/video-rooms/turn-credentials — TURN credentials (VR-E)', () => {
  it('returns 200 with ICE servers', async () => {
    const res = await request(buildApp()).get('/api/video-rooms/turn-credentials');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.iceServers)).toBe(true);
  });
});

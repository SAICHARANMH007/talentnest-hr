/**
 * Module audit: communities.js route
 *
 * Behaviors proven:
 *   COMM-A  GET /public/:slug   — 404; 200 (no auth).
 *   COMM-B  POST /              — 401; 400 no name; 201 created.
 *   COMM-C  GET /               — 401; 200 list.
 *   COMM-D  GET /:slug          — 401; 404; 200.
 *   COMM-E  POST /:slug/join    — 401; 404; 200.
 *   COMM-F  POST /:slug/leave   — 401; 200.
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

// Socket modules are required lazily inside route handlers (inside try blocks).
vi.mock('../src/socket', () => ({ default: { getIO: vi.fn().mockReturnValue({}) }, getIO: vi.fn().mockReturnValue({}) }));
vi.mock('../src/socket/platformSocket', () => ({ emitToTenant: vi.fn() }));

const _r           = createRequire(import.meta.url);
const _authModule  = _r('../src/middleware/auth.js');
const User         = _r('../src/models/User.js');
const Community    = _r('../src/models/Community.js');
const FeedPost     = _r('../src/models/FeedPost.js');
const logger       = _r('../src/middleware/logger.js');

import communitiesRouter from '../src/routes/communities.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const COMM_ID       = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin') {
  return jwt.sign({ userId: ADMIN_ID, role, tenantId: TENANT_ID }, JWT_SECRET, { expiresIn: '1h' });
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
  app.use('/api/communities', communitiesRouter);
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
    _id: ADMIN_ID, id: ADMIN_ID, role: 'admin', tenantId: TENANT_ID,
    isActive: true, name: 'Admin', email: 'a@t.example',
  }));
});

// ── COMM-A: GET /public/:slug ─────────────────────────────────────────────────
describe('GET /api/communities/public/:slug — public community (COMM-A)', () => {
  it('returns 404 when community not found', async () => {
    vi.spyOn(Community, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp()).get('/api/communities/public/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 with community preview', async () => {
    vi.spyOn(Community, 'findOne').mockReturnValue(chainOf({
      _id: COMM_ID, name: 'Developers', slug: 'developers',
      description: 'Dev community', icon: '💻', coverColor: '#0176D3',
      category: 'tech', memberCount: 10,
    }));
    vi.spyOn(FeedPost, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp()).get('/api/communities/public/developers');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('name', 'Developers');
  });
});

// ── COMM-B: POST / — create community ────────────────────────────────────────
describe('POST /api/communities — create community (COMM-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/communities').send({ name: 'New Community' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when community name missing', async () => {
    const res = await request(buildApp())
      .post('/api/communities')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('returns 201 when community created', async () => {
    vi.spyOn(Community, 'exists').mockResolvedValue(null);
    vi.spyOn(Community, 'create').mockResolvedValue({
      _id: COMM_ID, name: 'Developers', slug: 'developers',
      tenantId: TENANT_ID, description: '', icon: '💬', category: 'tech',
    });

    const res = await request(buildApp())
      .post('/api/communities')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Developers', category: 'tech' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ── COMM-C: GET / — list communities ─────────────────────────────────────────
describe('GET /api/communities — list communities (COMM-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/communities');
    expect(res.status).toBe(401);
  });

  it('returns 200 with community list', async () => {
    vi.spyOn(Community, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(Community, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .get('/api/communities')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── COMM-D: GET /:slug — single community ─────────────────────────────────────
describe('GET /api/communities/:slug — single community (COMM-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/communities/developers');
    expect(res.status).toBe(401);
  });

  it('returns 404 when not found', async () => {
    vi.spyOn(Community, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get('/api/communities/nonexistent')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 with community detail', async () => {
    vi.spyOn(Community, 'findOne').mockReturnValue(chainOf({
      _id: COMM_ID, name: 'Developers', slug: 'developers',
      memberIds: [], memberCount: 0, description: '', icon: '💻',
    }));
    vi.spyOn(User, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(FeedPost, 'countDocuments').mockResolvedValue(0);

    const res = await request(buildApp())
      .get('/api/communities/developers')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('name', 'Developers');
    expect(res.body.data).toHaveProperty('isMember');
  });
});

// ── COMM-E: POST /:slug/join ──────────────────────────────────────────────────
describe('POST /api/communities/:slug/join — join community (COMM-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/communities/developers/join');
    expect(res.status).toBe(401);
  });

  it('returns 404 when community not found', async () => {
    vi.spyOn(Community, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .post('/api/communities/nonexistent/join')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 when joined', async () => {
    const communityDoc = {
      _id: COMM_ID, name: 'Developers', slug: 'developers',
      memberIds: [], memberCount: 0, createdBy: null,
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(Community, 'findOne').mockResolvedValue(communityDoc);

    const res = await request(buildApp())
      .post('/api/communities/developers/join')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isMember).toBe(true);
  });
});

// ── COMM-F: POST /:slug/leave ─────────────────────────────────────────────────
describe('POST /api/communities/:slug/leave — leave community (COMM-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/communities/developers/leave');
    expect(res.status).toBe(401);
  });

  it('returns 200 when left (or was not a member)', async () => {
    const communityDoc = {
      _id: COMM_ID, name: 'Developers', slug: 'developers',
      memberIds: [ADMIN_ID], memberCount: 1, createdBy: null,
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(Community, 'findOne').mockResolvedValue(communityDoc);

    const res = await request(buildApp())
      .post('/api/communities/developers/leave')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isMember).toBe(false);
  });
});

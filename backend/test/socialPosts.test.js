/**
 * Module audit: socialPosts.js route
 *
 * Behaviors proven:
 *   SP-A  GET /public/:id   — no auth; 404; 200.
 *   SP-B  GET /             — 401; 200 list.
 *   SP-C  POST /            — 401; 201 created.
 *   SP-D  DELETE /:id       — 401; 404; 200 deleted.
 *   SP-E  POST /:id/react   — 401; 200 reacted.
 *   SP-F  POST /:id/comment — 401; 200 commented.
 *   SP-G  POST /:id/report  — 401; 200 reported.
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
  uploadBuffer: vi.fn().mockResolvedValue({ secure_url: 'https://cdn.example.com/img.jpg' }),
}));

const _r          = createRequire(import.meta.url);
const _authModule = _r('../src/middleware/auth.js');
const User        = _r('../src/models/User.js');
const FeedPost    = _r('../src/models/FeedPost.js');
const PostReport  = _r('../src/models/PostReport.js');
const logger      = _r('../src/middleware/logger.js');

import socialPostsRouter from '../src/routes/socialPosts.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const POST_ID       = new mongoose.Types.ObjectId().toString();
const REPORT_ID     = new mongoose.Types.ObjectId().toString();

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
  app.use('/api/social-posts', socialPostsRouter);
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

// ── SP-A: GET /public/:id ─────────────────────────────────────────────────────
describe('GET /api/social-posts/public/:id — public post (SP-A)', () => {
  it('returns 404 when post not found', async () => {
    vi.spyOn(FeedPost, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp()).get(`/api/social-posts/public/${POST_ID}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 with post data', async () => {
    vi.spyOn(FeedPost, 'findOne').mockReturnValue(chainOf({
      _id: POST_ID, content: 'Hello world', authorName: 'Admin',
      images: [], reactions: [], comments: [], isDeleted: false,
    }));

    const res = await request(buildApp()).get(`/api/social-posts/public/${POST_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content).toBe('Hello world');
  });
});

// ── SP-B: GET / ───────────────────────────────────────────────────────────────
describe('GET /api/social-posts — list posts (SP-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/social-posts');
    expect(res.status).toBe(401);
  });

  it('returns 200 with post list', async () => {
    vi.spyOn(FeedPost, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(FeedPost, 'countDocuments').mockResolvedValue(0);

    const res = await request(buildApp())
      .get('/api/social-posts')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── SP-C: POST / ──────────────────────────────────────────────────────────────
describe('POST /api/social-posts — create post (SP-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/social-posts').send({ content: 'Hello' });
    expect(res.status).toBe(401);
  });

  it('returns 201 when post created', async () => {
    vi.spyOn(FeedPost, 'create').mockResolvedValue({
      _id: POST_ID, content: 'Hello', authorName: 'Admin',
    });

    const res = await request(buildApp())
      .post('/api/social-posts')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ content: 'Hello world', postType: 'update' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ── SP-D: DELETE /:id ─────────────────────────────────────────────────────────
describe('DELETE /api/social-posts/:id — delete post (SP-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/social-posts/${POST_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when post not found', async () => {
    vi.spyOn(FeedPost, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/social-posts/${POST_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 when post deleted', async () => {
    const postDoc = {
      _id: POST_ID, authorId: ADMIN_ID, isDeleted: false,
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(FeedPost, 'findOne').mockResolvedValue(postDoc);

    const res = await request(buildApp())
      .delete(`/api/social-posts/${POST_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── SP-E: POST /:id/react ─────────────────────────────────────────────────────
describe('POST /api/social-posts/:id/react — react to post (SP-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post(`/api/social-posts/${POST_ID}/react`).send({ type: 'like' });
    expect(res.status).toBe(401);
  });

  it('returns 200 when reacted', async () => {
    const postDoc = {
      _id: POST_ID, reactions: [],
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(FeedPost, 'findOne').mockResolvedValue(postDoc);

    const res = await request(buildApp())
      .post(`/api/social-posts/${POST_ID}/react`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ type: 'like' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── SP-F: POST /:id/comment ───────────────────────────────────────────────────
describe('POST /api/social-posts/:id/comment — comment on post (SP-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post(`/api/social-posts/${POST_ID}/comment`).send({ text: 'Nice!' });
    expect(res.status).toBe(401);
  });

  it('returns 200 when comment added', async () => {
    const postDoc = {
      _id: POST_ID, comments: [],
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(FeedPost, 'findOne').mockResolvedValue(postDoc);

    const res = await request(buildApp())
      .post(`/api/social-posts/${POST_ID}/comment`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ content: 'Great post!' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── SP-G: POST /:id/report ────────────────────────────────────────────────────
describe('POST /api/social-posts/:id/report — report post (SP-G)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post(`/api/social-posts/${POST_ID}/report`).send({ reason: 'spam' });
    expect(res.status).toBe(401);
  });

  it('returns 200 when post reported', async () => {
    vi.spyOn(FeedPost, 'findOne').mockReturnValue(chainOf({ _id: POST_ID, isDeleted: false, authorId: 'other-author', content: 'Hello' }));
    vi.spyOn(PostReport, 'findOne').mockResolvedValue(null);
    vi.spyOn(PostReport, 'create').mockResolvedValue({ _id: REPORT_ID });

    const res = await request(buildApp())
      .post(`/api/social-posts/${POST_ID}/report`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ reason: 'spam' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

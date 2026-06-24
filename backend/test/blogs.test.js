/**
 * Module audit: blogs.js route
 *
 * Behaviors proven:
 *   BLOG-A  GET /public            — no auth; 200 list.
 *   BLOG-B  GET /public/:slug      — no auth; 404; 200.
 *   BLOG-C  GET /                  — 401; 403 non-super_admin; 200 list.
 *   BLOG-D  GET /:id               — 401; 404; 200.
 *   BLOG-E  POST /                 — 401; 409 duplicate slug; 201 created.
 *   BLOG-F  PUT /:id               — 401; 404; 200 updated.
 *   BLOG-G  PATCH /:id/publish     — 401; 404; 200 toggled.
 *   BLOG-H  DELETE /:id            — 401; 404; 200 deleted.
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

const _authModule = _r('../src/middleware/auth.js');
const User        = _r('../src/models/User.js');
const Blog        = _r('../src/models/Blog.js');
const logger      = _r('../src/middleware/logger.js');

import blogsRouter from '../src/routes/blogs.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const SA_ID         = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const BLOG_ID       = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'super_admin') {
  const id = role === 'admin' ? ADMIN_ID : SA_ID;
  return jwt.sign(
    { userId: id, role, tenantId: TENANT_ID },
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
  app.use('/api/blogs', blogsRouter);
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
    if (String(id) === ADMIN_ID) {
      return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
        tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example',
        toObject: () => ({}) });
    }
    return chainOf({ _id: SA_ID, id: SA_ID, role: 'super_admin',
      tenantId: null, isActive: true, name: 'SA', email: 'sa@t.example',
      toObject: () => ({}) });
  });
});

// ── BLOG-A: GET /public ────────────────────────────────────────────────────
describe('GET /api/blogs/public — public list (BLOG-A)', () => {
  it('returns 200 with published blogs', async () => {
    vi.spyOn(Blog, 'find').mockReturnValue(chainOf([
      { _id: BLOG_ID, title: 'Hello World', slug: 'hello-world', published: true },
    ]));

    const res = await request(buildApp()).get('/api/blogs/public');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── BLOG-B: GET /public/:slug ──────────────────────────────────────────────
describe('GET /api/blogs/public/:slug — single public blog (BLOG-B)', () => {
  it('returns 404 when slug not found', async () => {
    vi.spyOn(Blog, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp()).get('/api/blogs/public/nonexistent');
    expect(res.status).toBe(404);
  });

  it('returns 200 with blog data', async () => {
    vi.spyOn(Blog, 'findOne').mockReturnValue(chainOf(
      { _id: BLOG_ID, title: 'Hello', slug: 'hello', published: true },
    ));
    vi.spyOn(Blog, 'findByIdAndUpdate').mockReturnValue({ exec: vi.fn() });

    const res = await request(buildApp()).get('/api/blogs/public/hello');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── BLOG-C: GET / ─────────────────────────────────────────────────────────
describe('GET /api/blogs — admin list (BLOG-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/blogs');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-super_admin', async () => {
    const res = await request(buildApp())
      .get('/api/blogs')
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 list for super_admin', async () => {
    vi.spyOn(Blog, 'find').mockReturnValue(chainOf([
      { _id: BLOG_ID, title: 'Hello', published: true },
    ]));

    const res = await request(buildApp())
      .get('/api/blogs')
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── BLOG-D: GET /:id ───────────────────────────────────────────────────────
describe('GET /api/blogs/:id — single blog (BLOG-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/blogs/${BLOG_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when blog not found', async () => {
    vi.spyOn(Blog, 'findById').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get(`/api/blogs/${BLOG_ID}`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);

    expect(res.status).toBe(404);
  });

  it('returns 200 with blog data', async () => {
    vi.spyOn(Blog, 'findById').mockReturnValue(chainOf(
      { _id: BLOG_ID, title: 'Hello', slug: 'hello' },
    ));

    const res = await request(buildApp())
      .get(`/api/blogs/${BLOG_ID}`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── BLOG-E: POST / ────────────────────────────────────────────────────────
describe('POST /api/blogs — create blog (BLOG-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/blogs').send({ title: 'T', slug: 's' });
    expect(res.status).toBe(401);
  });

  it('returns 409 when slug already exists', async () => {
    vi.spyOn(Blog, 'findOne').mockResolvedValue({ _id: BLOG_ID, slug: 'hello' });

    const res = await request(buildApp())
      .post('/api/blogs')
      .set('Authorization', `Bearer ${makeToken('super_admin')}`)
      .send({ title: 'Hello Again', slug: 'hello' });

    expect(res.status).toBe(409);
  });

  it('creates blog and returns 201', async () => {
    vi.spyOn(Blog, 'findOne').mockResolvedValue(null);
    vi.spyOn(Blog, 'create').mockResolvedValue({ _id: BLOG_ID, title: 'New Post', slug: 'new-post' });

    const res = await request(buildApp())
      .post('/api/blogs')
      .set('Authorization', `Bearer ${makeToken('super_admin')}`)
      .send({ title: 'New Post', category: 'Tech', excerpt: 'About tech', sections: [] });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ── BLOG-F: PUT /:id ──────────────────────────────────────────────────────
describe('PUT /api/blogs/:id — update blog (BLOG-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).put(`/api/blogs/${BLOG_ID}`).send({ title: 'X' });
    expect(res.status).toBe(401);
  });

  it('returns 404 when blog not found', async () => {
    vi.spyOn(Blog, 'findOne').mockResolvedValue(null);
    vi.spyOn(Blog, 'findById').mockResolvedValue(null);

    const res = await request(buildApp())
      .put(`/api/blogs/${BLOG_ID}`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`)
      .send({ title: 'Updated' });

    expect(res.status).toBe(404);
  });

  it('updates blog and returns 200', async () => {
    vi.spyOn(Blog, 'findOne').mockResolvedValue(null); // no slug conflict
    const blogDoc = {
      _id: BLOG_ID, title: 'Old', published: false,
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(Blog, 'findById').mockResolvedValue(blogDoc);

    const res = await request(buildApp())
      .put(`/api/blogs/${BLOG_ID}`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`)
      .send({ title: 'Updated Title', sections: [] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── BLOG-G: PATCH /:id/publish ────────────────────────────────────────────
describe('PATCH /api/blogs/:id/publish — toggle publish (BLOG-G)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).patch(`/api/blogs/${BLOG_ID}/publish`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when blog not found', async () => {
    vi.spyOn(Blog, 'findById').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/blogs/${BLOG_ID}/publish`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);

    expect(res.status).toBe(404);
  });

  it('toggles publish and returns 200', async () => {
    const blogDoc = { _id: BLOG_ID, published: false, save: vi.fn().mockResolvedValue({}) };
    vi.spyOn(Blog, 'findById').mockResolvedValue(blogDoc);

    const res = await request(buildApp())
      .patch(`/api/blogs/${BLOG_ID}/publish`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.published).toBe(true);
  });
});

// ── BLOG-H: DELETE /:id ───────────────────────────────────────────────────
describe('DELETE /api/blogs/:id — delete blog (BLOG-H)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/blogs/${BLOG_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when blog not found', async () => {
    vi.spyOn(Blog, 'findByIdAndDelete').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/blogs/${BLOG_ID}`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);

    expect(res.status).toBe(404);
  });

  it('deletes blog and returns 200', async () => {
    vi.spyOn(Blog, 'findByIdAndDelete').mockResolvedValue({ _id: BLOG_ID });

    const res = await request(buildApp())
      .delete(`/api/blogs/${BLOG_ID}`)
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

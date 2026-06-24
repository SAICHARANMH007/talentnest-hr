/**
 * Module audit: companyReviews.js route
 *
 * Behaviors proven:
 *   CREV-A  GET /public/:orgSlug        — no auth; 200 list.
 *   CREV-B  POST /public/:orgSlug       — no auth; 400 invalid rating; 200 posted.
 *   CREV-C  GET /by-company/:name       — 401; 200 reviews.
 *   CREV-D  GET /my-org                 — 401; 200 list.
 *   CREV-E  POST /my-org                — 401; 400 bad rating; 200 posted.
 *   CREV-F  GET /                       — 401; 403 recruiter; 200 list.
 *   CREV-G  PATCH /:id/report           — 401; 404; 200 reported.
 *   CREV-H  DELETE /:id                 — 401; 404; 200 deleted.
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

const _authModule     = _r('../src/middleware/auth.js');
const User            = _r('../src/models/User.js');
const Organization    = _r('../src/models/Organization.js');
const Tenant          = _r('../src/models/Tenant.js');
const CompanyReview   = _r('../src/models/CompanyReview.js');
const logger          = _r('../src/middleware/logger.js');

import companyReviewsRouter from '../src/routes/companyReviews.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID  = new mongoose.Types.ObjectId().toString();
const REVIEW_ID     = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin') {
  const id = role === 'recruiter' ? RECRUITER_ID : ADMIN_ID;
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
  app.use('/api/company-reviews', companyReviewsRouter);
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

  vi.spyOn(Organization, 'findById').mockReturnValue(chainOf({
    _id: TENANT_ID, name: 'Test Org', status: 'active', type: 'org',
    subscriptionStatus: 'active', isStaffingAgency: false,
  }));
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));

  vi.spyOn(User, 'findById').mockImplementation((id) => {
    if (String(id) === RECRUITER_ID) {
      return chainOf({ _id: RECRUITER_ID, id: RECRUITER_ID, role: 'recruiter',
        tenantId: TENANT_ID, isActive: true, name: 'Rec', email: 'r@t.example',
        toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example',
      toObject: () => ({}) });
  });
});

// ── CREV-A: GET /public/:orgSlug ─────────────────────────────────────────────
describe('GET /api/company-reviews/public/:orgSlug — public reviews (CREV-A)', () => {
  it('returns 200 with empty list when org not found', async () => {
    vi.spyOn(Organization, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp()).get('/api/company-reviews/public/unknown-org');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 200 with reviews when org found', async () => {
    vi.spyOn(Organization, 'findOne').mockReturnValue(chainOf({ _id: TENANT_ID, slug: 'test-org' }));
    vi.spyOn(CompanyReview, 'find').mockReturnValue(chainOf([
      { _id: REVIEW_ID, rating: 5, title: 'Great place' },
    ]));

    const res = await request(buildApp()).get('/api/company-reviews/public/test-org');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

// ── CREV-B: POST /public/:orgSlug ────────────────────────────────────────────
describe('POST /api/company-reviews/public/:orgSlug — submit review (CREV-B)', () => {
  it('returns 404 when org not found', async () => {
    vi.spyOn(Organization, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .post('/api/company-reviews/public/unknown')
      .send({ rating: 5 });
    expect(res.status).toBe(404);
  });

  it('returns 400 when rating invalid', async () => {
    vi.spyOn(Organization, 'findOne').mockReturnValue(chainOf({ _id: TENANT_ID }));

    const res = await request(buildApp())
      .post('/api/company-reviews/public/test-org')
      .send({ rating: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/rating/i);
  });

  it('posts review and returns 200', async () => {
    vi.spyOn(Organization, 'findOne').mockReturnValue(chainOf({ _id: TENANT_ID }));
    vi.spyOn(CompanyReview, 'create').mockResolvedValue({ _id: REVIEW_ID });

    const res = await request(buildApp())
      .post('/api/company-reviews/public/test-org')
      .send({ rating: 5, title: 'Great', pros: 'Good team', cons: 'None' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── CREV-C: GET /by-company/:name ────────────────────────────────────────────
describe('GET /api/company-reviews/by-company/:name — reviews by company (CREV-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/company-reviews/by-company/Acme');
    expect(res.status).toBe(401);
  });

  it('returns 200 with company reviews', async () => {
    vi.spyOn(CompanyReview, 'find').mockReturnValue(chainOf([
      { _id: REVIEW_ID, rating: 4, companyName: 'Acme' },
    ]));

    const res = await request(buildApp())
      .get('/api/company-reviews/by-company/Acme')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── CREV-D: GET /my-org ───────────────────────────────────────────────────────
describe('GET /api/company-reviews/my-org — my org reviews (CREV-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/company-reviews/my-org');
    expect(res.status).toBe(401);
  });

  it('returns 200 for authenticated user', async () => {
    vi.spyOn(CompanyReview, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/company-reviews/my-org')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── CREV-E: POST /my-org ──────────────────────────────────────────────────────
describe('POST /api/company-reviews/my-org — submit my-org review (CREV-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/company-reviews/my-org').send({ rating: 5 });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid rating', async () => {
    const res = await request(buildApp())
      .post('/api/company-reviews/my-org')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ rating: 10 });
    expect(res.status).toBe(400);
  });

  it('posts review and returns 200', async () => {
    vi.spyOn(CompanyReview, 'create').mockResolvedValue({ _id: REVIEW_ID });

    const res = await request(buildApp())
      .post('/api/company-reviews/my-org')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ rating: 4, title: 'Good place', pros: 'Nice team', cons: 'Long hours' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── CREV-F: GET / ─────────────────────────────────────────────────────────────
describe('GET /api/company-reviews — list all reviews (CREV-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/company-reviews');
    expect(res.status).toBe(401);
  });

  it('returns 403 for recruiter role', async () => {
    const res = await request(buildApp())
      .get('/api/company-reviews')
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 list for admin', async () => {
    vi.spyOn(CompanyReview, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/company-reviews')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── CREV-G: PATCH /:id/report ─────────────────────────────────────────────────
describe('PATCH /api/company-reviews/:id/report — report review (CREV-G)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).patch(`/api/company-reviews/${REVIEW_ID}/report`).send({ reason: 'Spam' });
    expect(res.status).toBe(401);
  });

  it('returns 404 when review not found', async () => {
    vi.spyOn(CompanyReview, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/company-reviews/${REVIEW_ID}/report`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ reason: 'Spam' });

    expect(res.status).toBe(404);
  });

  it('reports review and returns 200', async () => {
    vi.spyOn(CompanyReview, 'findOneAndUpdate').mockResolvedValue({ _id: REVIEW_ID, isReported: true });

    const res = await request(buildApp())
      .patch(`/api/company-reviews/${REVIEW_ID}/report`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ reason: 'This review is fake' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── CREV-H: DELETE /:id ───────────────────────────────────────────────────────
describe('DELETE /api/company-reviews/:id — delete review (CREV-H)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/company-reviews/${REVIEW_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when review not found', async () => {
    vi.spyOn(CompanyReview, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/company-reviews/${REVIEW_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('deletes review and returns 200', async () => {
    vi.spyOn(CompanyReview, 'findOneAndUpdate').mockResolvedValue({ _id: REVIEW_ID });

    const res = await request(buildApp())
      .delete(`/api/company-reviews/${REVIEW_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

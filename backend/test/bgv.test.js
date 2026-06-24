/**
 * BGV route tests — bgv.js
 *
 * Behaviors tested (NO tenantGuard — authMiddleware only):
 *   BGV-A  GET /                — 401, 200 list
 *   BGV-B  GET /user/:userId    — 401, 200 for recruiter
 *   BGV-C  GET /:id/file        — 401, 404, 200
 *   BGV-D  POST /               — 401, 400 no file, 201 with file
 *   BGV-E  PATCH /:id/verify    — 401, 400 invalid status, 200 verified
 *   BGV-F  DELETE /:id          — 401, 404, 200
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

vi.mock('../src/services/webhookService', () => ({
  fireWebhooks: vi.fn().mockResolvedValue({}),
}));

// ── CJS references (same instances the route module holds) ────────────────────
const _r = createRequire(import.meta.url);

const _authModule = _r('../src/middleware/auth.js');
const User        = _r('../src/models/User.js');
const BgvDocument = _r('../src/models/BgvDocument.js');
const logger      = _r('../src/middleware/logger.js');

import bgvRouter from '../src/routes/bgv.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID  = new mongoose.Types.ObjectId().toString();
const DOC_ID        = new mongoose.Types.ObjectId().toString();

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(role = 'admin', opts = {}) {
  const id = opts.id || (role === 'recruiter' ? RECRUITER_ID : ADMIN_ID);
  return jwt.sign(
    { userId: id, role, tenantId: opts.tenantId ?? TENANT_ID },
    JWT_SECRET,
    { expiresIn: '1h' },
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
    then:     (r, j) => Promise.resolve(value).then(r, j),
    catch:    (j)    => Promise.resolve(value).catch(j),
  };
  return q;
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/bgv', bgvRouter);
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  });
  return app;
}

// ── beforeEach setup ──────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  _authModule.clearAllUserAuthCache();

  vi.spyOn(logger, 'info').mockImplementation(() => {});
  vi.spyOn(logger, 'error').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
  vi.spyOn(logger, 'audit').mockImplementation(() => {});

  // authMiddleware: ID-aware spy — recruiter for RECRUITER_ID, admin for everyone else
  vi.spyOn(User, 'findById').mockImplementation((id) => {
    const s = String(id);
    if (s === RECRUITER_ID) {
      return chainOf({
        _id: RECRUITER_ID, id: RECRUITER_ID, role: 'recruiter',
        tenantId: TENANT_ID, isActive: true, name: 'Test Recruiter',
        email: 'rec@test.example',
      });
    }
    return chainOf({
      _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Test Admin',
      email: 'admin@test.example',
    });
  });
});

// ── BGV-A: GET / ──────────────────────────────────────────────────────────────
describe('GET /api/bgv — list my BGV docs (BGV-A)', () => {
  it('returns 401 with no auth token', async () => {
    const res = await request(buildApp()).get('/api/bgv');
    expect(res.status).toBe(401);
  });

  it('returns 200 with doc list for authenticated user', async () => {
    vi.spyOn(BgvDocument, 'find').mockReturnValue(chainOf([
      { _id: DOC_ID, docType: 'other', docName: 'test.pdf', status: 'uploaded',
        userId: ADMIN_ID, tenantId: TENANT_ID, toObject: () => ({
          _id: DOC_ID, docType: 'other', docName: 'test.pdf', status: 'uploaded',
          userId: ADMIN_ID, tenantId: TENANT_ID,
        }),
      },
    ]));

    const res = await request(buildApp())
      .get('/api/bgv')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── BGV-B: GET /user/:userId ──────────────────────────────────────────────────
describe('GET /api/bgv/user/:userId — admin/recruiter view candidate docs (BGV-B)', () => {
  it('returns 401 with no auth token', async () => {
    const res = await request(buildApp()).get(`/api/bgv/user/${ADMIN_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 with docs for recruiter', async () => {
    vi.spyOn(BgvDocument, 'find').mockReturnValue(chainOf([
      { _id: DOC_ID, docType: 'pan', docName: 'pan.pdf', status: 'uploaded',
        userId: ADMIN_ID, tenantId: TENANT_ID, toObject: () => ({
          _id: DOC_ID, docType: 'pan', docName: 'pan.pdf', status: 'uploaded',
          userId: ADMIN_ID, tenantId: TENANT_ID,
        }),
      },
    ]));

    const res = await request(buildApp())
      .get(`/api/bgv/user/${ADMIN_ID}`)
      .set('Authorization', `Bearer ${makeToken('recruiter', { id: RECRUITER_ID })}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── BGV-C: GET /:id/file ──────────────────────────────────────────────────────
describe('GET /api/bgv/:id/file — fetch single doc with fileUrl (BGV-C)', () => {
  it('returns 401 with no auth token', async () => {
    const res = await request(buildApp()).get(`/api/bgv/${DOC_ID}/file`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when doc not found', async () => {
    vi.spyOn(BgvDocument, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get(`/api/bgv/${DOC_ID}/file`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('returns 200 with doc data for owner', async () => {
    const docObj = {
      _id: DOC_ID, docType: 'other', docName: 'test.pdf', status: 'uploaded',
      userId: ADMIN_ID, tenantId: TENANT_ID, fileUrl: 'data:application/pdf;base64,abc',
      toObject: () => ({
        _id: DOC_ID, docType: 'other', docName: 'test.pdf', status: 'uploaded',
        userId: ADMIN_ID, tenantId: TENANT_ID, fileUrl: 'data:application/pdf;base64,abc',
      }),
    };
    vi.spyOn(BgvDocument, 'findOne').mockReturnValue(chainOf(docObj));

    const res = await request(buildApp())
      .get(`/api/bgv/${DOC_ID}/file`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ── BGV-D: POST / ─────────────────────────────────────────────────────────────
describe('POST /api/bgv — upload a BGV document (BGV-D)', () => {
  it('returns 401 with no auth token', async () => {
    const res = await request(buildApp())
      .post('/api/bgv')
      .attach('file', Buffer.from('%PDF-test'), 'test.pdf');
    expect(res.status).toBe(401);
  });

  it('returns 400 when no file is attached', async () => {
    const res = await request(buildApp())
      .post('/api/bgv')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ docType: 'other' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file/i);
  });

  it('returns 201 with created doc when file is attached', async () => {
    const createdDoc = {
      _id: DOC_ID, docType: 'other', docName: 'test.pdf', status: 'uploaded',
      userId: ADMIN_ID, tenantId: TENANT_ID, fileUrl: 'data:application/pdf;base64,abc',
      toObject: () => ({
        _id: DOC_ID, docType: 'other', docName: 'test.pdf', status: 'uploaded',
        userId: ADMIN_ID, tenantId: TENANT_ID,
      }),
    };
    vi.spyOn(BgvDocument, 'create').mockResolvedValue(createdDoc);

    const res = await request(buildApp())
      .post('/api/bgv')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .attach('file', Buffer.from('%PDF-test'), { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ── BGV-E: PATCH /:id/verify ──────────────────────────────────────────────────
describe('PATCH /api/bgv/:id/verify — admin verifies a doc (BGV-E)', () => {
  it('returns 401 with no auth token', async () => {
    const res = await request(buildApp())
      .patch(`/api/bgv/${DOC_ID}/verify`)
      .send({ status: 'verified' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid status value', async () => {
    const res = await request(buildApp())
      .patch(`/api/bgv/${DOC_ID}/verify`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ status: 'approved' }); // not a valid status

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid status/i);
  });

  it('returns 200 with verified doc data', async () => {
    const docObj = {
      _id: DOC_ID, docType: 'other', docName: 'test.pdf', status: 'verified',
      userId: ADMIN_ID, tenantId: TENANT_ID,
      toObject: () => ({
        _id: DOC_ID, docType: 'other', docName: 'test.pdf', status: 'verified',
        userId: ADMIN_ID, tenantId: TENANT_ID,
      }),
    };
    vi.spyOn(BgvDocument, 'findOneAndUpdate').mockResolvedValue(docObj);
    vi.spyOn(BgvDocument, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({});

    const res = await request(buildApp())
      .patch(`/api/bgv/${DOC_ID}/verify`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ status: 'verified' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ── BGV-F: DELETE /:id ────────────────────────────────────────────────────────
describe('DELETE /api/bgv/:id — delete a BGV document (BGV-F)', () => {
  it('returns 401 with no auth token', async () => {
    const res = await request(buildApp()).delete(`/api/bgv/${DOC_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when doc not found', async () => {
    vi.spyOn(BgvDocument, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/bgv/${DOC_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('returns 200 after successful soft-delete', async () => {
    const docObj = {
      _id: DOC_ID, docType: 'other', docName: 'test.pdf', status: 'uploaded',
      userId: ADMIN_ID, tenantId: TENANT_ID, deletedAt: null,
      save: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(BgvDocument, 'findOne').mockResolvedValue(docObj);

    const res = await request(buildApp())
      .delete(`/api/bgv/${DOC_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

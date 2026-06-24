/**
 * Module audit: candidateDocs.js route (mounted at /api/candidates/:id/documents)
 *
 * Behaviors proven:
 *   CDOC-A  POST /    — 401; 400 no file/type; 404 candidate; 201 uploaded.
 *   CDOC-B  GET /     — 401; 404 candidate; 200 doc list.
 *   CDOC-C  PATCH /:docId — 401; 403 candidate; 400 bad status; 404 doc; 200 updated.
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
  uploadBuffer: vi.fn().mockResolvedValue({ secure_url: 'https://cdn.example.com/doc.pdf' }),
}));

vi.mock('../src/utils/email', () => ({
  sendEmailWithRetry: vi.fn().mockResolvedValue({}),
}));

const _r              = createRequire(import.meta.url);
const _authModule     = _r('../src/middleware/auth.js');
const User            = _r('../src/models/User.js');
const Organization    = _r('../src/models/Organization.js');
const Tenant          = _r('../src/models/Tenant.js');
const Candidate       = _r('../src/models/Candidate.js');
const CandidateDocument = _r('../src/models/CandidateDocument.js');
const logger          = _r('../src/middleware/logger.js');
const cloudinaryLib   = _r('cloudinary');

import candidateDocsRouter from '../src/routes/candidateDocs.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const CAND_USER_ID  = new mongoose.Types.ObjectId().toString();
const CAND_ID       = new mongoose.Types.ObjectId().toString();
const DOC_ID        = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin') {
  const userId = role === 'candidate' ? CAND_USER_ID : ADMIN_ID;
  return jwt.sign({ userId, role, tenantId: TENANT_ID }, JWT_SECRET, { expiresIn: '1h' });
}

function chainOf(value) {
  const q = {
    select:   vi.fn().mockReturnThis(),
    sort:     vi.fn().mockReturnThis(),
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
  // The router is mounted with mergeParams, simulating /api/candidates/:id/documents
  app.use('/api/candidates/:id/documents', (req, _res, next) => { req.params.id = req.params.id; next(); }, candidateDocsRouter);
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
  vi.spyOn(Organization, 'findById').mockReturnValue(chainOf({
    _id: TENANT_ID, name: 'Org', status: 'active', type: 'org',
    subscriptionStatus: 'active', isStaffingAgency: false,
  }));
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));
});

// ── CDOC-A: POST / ────────────────────────────────────────────────────────────
describe('POST /api/candidates/:id/documents — upload doc (CDOC-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post(`/api/candidates/${CAND_ID}/documents`);
    expect(res.status).toBe(401);
  });

  it('returns 400 when no file uploaded', async () => {
    const res = await request(buildApp())
      .post(`/api/candidates/${CAND_ID}/documents`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/file/i);
  });

  it('returns 404 when candidate not found', async () => {
    vi.spyOn(Candidate, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .post(`/api/candidates/${CAND_ID}/documents`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .attach('document', Buffer.from('pdf content'), { filename: 'doc.pdf', contentType: 'application/pdf' })
      .field('documentType', 'aadhaar');
    expect(res.status).toBe(404);
  });

  it('returns 201 when document uploaded', async () => {
    vi.spyOn(cloudinaryLib.v2.uploader, 'upload_stream').mockImplementationOnce((_opts, cb) => {
      cb(null, { secure_url: 'https://cdn.example.com/doc.pdf' });
      return { end: vi.fn() };
    });
    vi.spyOn(Candidate, 'findOne').mockReturnValue(chainOf({ _id: CAND_ID, tenantId: TENANT_ID }));
    vi.spyOn(CandidateDocument, 'create').mockResolvedValue({
      _id: DOC_ID, documentType: 'aadhaar', fileUrl: 'https://cdn.example.com/doc.pdf',
      toObject: () => ({ _id: DOC_ID, documentType: 'aadhaar' }),
    });

    const res = await request(buildApp())
      .post(`/api/candidates/${CAND_ID}/documents`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .attach('document', Buffer.from('pdf content'), { filename: 'doc.pdf', contentType: 'application/pdf' })
      .field('documentType', 'aadhaar');
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ── CDOC-B: GET / ─────────────────────────────────────────────────────────────
describe('GET /api/candidates/:id/documents — list docs (CDOC-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/candidates/${CAND_ID}/documents`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when candidate not found', async () => {
    vi.spyOn(Candidate, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get(`/api/candidates/${CAND_ID}/documents`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 with doc list', async () => {
    vi.spyOn(Candidate, 'findOne').mockReturnValue(chainOf({ _id: CAND_ID }));
    vi.spyOn(CandidateDocument, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get(`/api/candidates/${CAND_ID}/documents`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── CDOC-C: PATCH /:docId ─────────────────────────────────────────────────────
describe('PATCH /api/candidates/:id/documents/:docId — verify doc (CDOC-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).patch(`/api/candidates/${CAND_ID}/documents/${DOC_ID}`).send({ verificationStatus: 'verified' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate role', async () => {
    const res = await request(buildApp())
      .patch(`/api/candidates/${CAND_ID}/documents/${DOC_ID}`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ verificationStatus: 'verified' });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid verificationStatus', async () => {
    const res = await request(buildApp())
      .patch(`/api/candidates/${CAND_ID}/documents/${DOC_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ verificationStatus: 'rejected' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when document not found', async () => {
    vi.spyOn(CandidateDocument, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/candidates/${CAND_ID}/documents/${DOC_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ verificationStatus: 'verified' });
    expect(res.status).toBe(404);
  });

  it('returns 200 when document verified', async () => {
    const docDoc = {
      _id: DOC_ID, documentType: 'aadhaar', verificationStatus: 'pending',
      label: 'Aadhaar Card',
      save: vi.fn().mockResolvedValue({}),
      toObject: () => ({ _id: DOC_ID, documentType: 'aadhaar' }),
    };
    vi.spyOn(CandidateDocument, 'findOne').mockResolvedValue(docDoc);

    const res = await request(buildApp())
      .patch(`/api/candidates/${CAND_ID}/documents/${DOC_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ verificationStatus: 'verified' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

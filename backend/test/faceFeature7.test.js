/**
 * Feature 7 — Face Verification deepening
 *
 * FV7-A  Confidence bands in /verify response (very_high, high, medium, low)
 * FV7-B  Confidence band in /proctor-check response
 * FV7-C  Admin duplicate review: escalated action
 * FV7-D  Admin duplicate stats endpoint (GET /admin/duplicates/stats)
 * FV7-E  Edge case hint endpoint (POST /edge-case-hint)
 * FV7-F  Invalid action still returns 400 (backward-compat)
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
  uploadBuffer: vi.fn().mockResolvedValue({ secure_url: 'https://res.cloudinary.com/test/face.jpg' }),
}));

vi.mock('../src/utils/syncProfile', () => ({
  syncProfile: vi.fn().mockResolvedValue({}),
}));

vi.mock('../src/utils/email', () => ({
  sendEmailWithRetry: vi.fn().mockResolvedValue({}),
}));

vi.mock('../src/services/auth.service', () => ({
  default: {
    checkOrgAccess: vi.fn(),
    issueTokens: vi.fn().mockResolvedValue({ user: { id: 'u1' }, token: 'access_token' }),
  },
}));

const _r = createRequire(import.meta.url);

const _authModule        = _r('../src/middleware/auth.js');
const User               = _r('../src/models/User.js');
const Organization       = _r('../src/models/Organization.js');
const Tenant             = _r('../src/models/Tenant.js');
const Candidate          = _r('../src/models/Candidate.js');
const FaceDuplicateAlert = _r('../src/models/FaceDuplicateAlert.js');
const AssessmentSubmission = _r('../src/models/AssessmentSubmission.js');
const Notification       = _r('../src/models/Notification.js');
const logger             = _r('../src/middleware/logger.js');

import faceRouter from '../src/routes/face.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const CANDIDATE_ID  = new mongoose.Types.ObjectId().toString();
const ALERT_ID      = new mongoose.Types.ObjectId().toString();
const SUB_ID        = new mongoose.Types.ObjectId().toString();

// 128-dim descriptor — L2-normalised so similarity with itself = ~1.0
const VALID_DESC = Array.from({ length: 128 }, (_, i) => Math.sin(i) * 0.1);
// Low-matching descriptor (all near-zero) → similarity ~0 with VALID_DESC
const ZERO_DESC  = new Array(128).fill(0.001);

function makeToken(role = 'admin', id = null) {
  const userId = id ?? (role === 'candidate' ? CANDIDATE_ID : ADMIN_ID);
  return jwt.sign({ userId, role, tenantId: TENANT_ID }, JWT_SECRET, { expiresIn: '1h' });
}

function chainOf(value) {
  const q = {
    select:   vi.fn().mockReturnThis(),
    sort:     vi.fn().mockReturnThis(),
    limit:    vi.fn().mockReturnThis(),
    lean:     vi.fn().mockResolvedValue(value),
    then: (r, j) => Promise.resolve(value).then(r, j),
    catch: (j)   => Promise.resolve(value).catch(j),
  };
  return q;
}

function makeAlert(overrides = {}) {
  return {
    _id: ALERT_ID, id: ALERT_ID,
    tenantId: TENANT_ID,
    userId1: ADMIN_ID, userId2: CANDIDATE_ID,
    name1: 'Alice', name2: 'Bob',
    status: 'pending',
    similarityScore: 0.91,
    save: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/face', faceRouter);
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

  vi.spyOn(User, 'findById').mockImplementation(id => {
    if (String(id) === CANDIDATE_ID) {
      return chainOf({ _id: CANDIDATE_ID, id: CANDIDATE_ID, role: 'candidate',
        tenantId: TENANT_ID, isActive: true, name: 'Cand', email: 'cand@test.example', toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'admin@test.example', toObject: () => ({}) });
  });

  vi.spyOn(User, 'findByIdAndUpdate').mockReturnValue(chainOf({}));
  vi.spyOn(User, 'updateMany').mockResolvedValue({});
  vi.spyOn(User, 'find').mockReturnValue(chainOf([]));
  vi.spyOn(Candidate, 'updateMany').mockResolvedValue({});
  vi.spyOn(Notification, 'insertMany').mockResolvedValue([]);
});

// ── FV7-A: Confidence bands in /verify ───────────────────────────────────────
describe('POST /api/face/verify — confidence bands (FV7-A)', () => {
  it('returns confidence.band=very_high when score ≥ 0.90 (same descriptor)', async () => {
    vi.spyOn(User, 'findById').mockReturnValue(chainOf({
      _id: ADMIN_ID, id: ADMIN_ID, role: 'admin', tenantId: TENANT_ID,
      isActive: true, name: 'Admin', email: 'a@t.example', toObject: () => ({}),
      faceEnrolled: true, faceDescriptor: VALID_DESC,
    }));

    const res = await request(buildApp())
      .post('/api/face/verify')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ descriptor: VALID_DESC });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.confidence).toBeDefined();
    expect(res.body.confidence.band).toBe('very_high');
    expect(res.body.confidence.label).toBe('Very High');
    expect(res.body.passed).toBe(true);
  });

  it('returns confidence.band=low and hint when score is near-zero', async () => {
    vi.spyOn(User, 'findById').mockReturnValue(chainOf({
      _id: ADMIN_ID, id: ADMIN_ID, role: 'admin', tenantId: TENANT_ID,
      isActive: true, name: 'Admin', email: 'a@t.example', toObject: () => ({}),
      faceEnrolled: true, faceDescriptor: VALID_DESC,
    }));

    const res = await request(buildApp())
      .post('/api/face/verify')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ descriptor: ZERO_DESC });

    expect(res.status).toBe(200);
    expect(res.body.confidence.band).toBe('low');
    expect(res.body.confidence.hint).toBeTruthy();
    expect(res.body.passed).toBe(false);
  });

  it('returns enrolled:false shape when user has no face enrolled (no confidence field)', async () => {
    vi.spyOn(User, 'findById').mockReturnValue(chainOf({
      _id: ADMIN_ID, id: ADMIN_ID, role: 'admin', tenantId: TENANT_ID,
      isActive: true, name: 'Admin', email: 'a@t.example', toObject: () => ({}),
      faceEnrolled: false, faceDescriptor: [],
    }));

    const res = await request(buildApp())
      .post('/api/face/verify')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ descriptor: VALID_DESC });

    expect(res.status).toBe(200);
    expect(res.body.enrolled).toBe(false);
  });
});

// ── FV7-B: Confidence band in /proctor-check ─────────────────────────────────
describe('POST /api/face/proctor-check — confidence band (FV7-B)', () => {
  it('includes confidence.band in proctor-check response', async () => {
    const submission = {
      _id: SUB_ID,
      candidateId: CANDIDATE_ID,
      faceVerifications: [],
      faceVerificationSummary: {},
      save: vi.fn().mockResolvedValue(true),
    };
    vi.spyOn(AssessmentSubmission, 'findOne').mockResolvedValue(submission);
    vi.spyOn(User, 'findById').mockImplementation(id => {
      if (String(id) === CANDIDATE_ID) {
        return chainOf({ _id: CANDIDATE_ID, id: CANDIDATE_ID, role: 'candidate',
          tenantId: TENANT_ID, isActive: true, name: 'Cand', email: 'cand@test.example', toObject: () => ({}),
          faceEnrolled: true, faceDescriptor: VALID_DESC });
      }
      return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin', tenantId: TENANT_ID,
        isActive: true, name: 'Admin', email: 'a@t.example', toObject: () => ({}) });
    });

    const res = await request(buildApp())
      .post('/api/face/proctor-check')
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ submissionId: SUB_ID, descriptor: VALID_DESC });

    expect(res.status).toBe(200);
    expect(res.body.confidence).toBeDefined();
    expect(['very_high', 'high', 'medium', 'low']).toContain(res.body.confidence.band);
    expect(typeof res.body.confidence.label).toBe('string');
  });
});

// ── FV7-C: Escalate action ────────────────────────────────────────────────────
describe('PATCH /api/face/admin/duplicates/:id — escalated action (FV7-C)', () => {
  it('admin can escalate a duplicate alert and sets escalatedBy/At', async () => {
    const alert = makeAlert();
    vi.spyOn(FaceDuplicateAlert, 'findOne').mockResolvedValue(alert);
    vi.spyOn(User, 'find').mockReturnValue(chainOf([])); // no super_admins found

    const res = await request(buildApp())
      .patch(`/api/face/admin/duplicates/${ALERT_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ action: 'escalated', note: 'Needs super admin review' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(alert.status).toBe('escalated');
    expect(String(alert.escalatedBy)).toBe(ADMIN_ID);
    expect(alert.escalationNote).toBe('Needs super admin review');
    expect(alert.save).toHaveBeenCalled();
  });

  it('escalated action notifies super_admins via Notification.insertMany', async () => {
    const superAdminId = new mongoose.Types.ObjectId().toString();
    const alert = makeAlert();
    vi.spyOn(FaceDuplicateAlert, 'findOne').mockResolvedValue(alert);
    vi.spyOn(User, 'find').mockReturnValue(chainOf([{ _id: superAdminId }]));

    await request(buildApp())
      .patch(`/api/face/admin/duplicates/${ALERT_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ action: 'escalated', note: 'Suspected fraud' });

    expect(Notification.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ userId: superAdminId, type: 'alert' }),
      ])
    );
  });

  it('invalid action still returns 400 (backward compat)', async () => {
    vi.spyOn(FaceDuplicateAlert, 'findOne').mockResolvedValue(makeAlert());

    const res = await request(buildApp())
      .patch(`/api/face/admin/duplicates/${ALERT_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ action: 'not_a_real_action' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cleared/i);
    expect(res.body.error).toMatch(/confirmed_duplicate/i);
    expect(res.body.error).toMatch(/escalated/i);
  });
});

// ── FV7-D: Admin duplicate stats ─────────────────────────────────────────────
describe('GET /api/face/admin/duplicates/stats (FV7-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/face/admin/duplicates/stats');
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate', async () => {
    const res = await request(buildApp())
      .get('/api/face/admin/duplicates/stats')
      .set('Authorization', `Bearer ${makeToken('candidate')}`);
    expect(res.status).toBe(403);
  });

  it('returns correct stats shape for admin', async () => {
    vi.spyOn(FaceDuplicateAlert, 'countDocuments')
      .mockResolvedValueOnce(5)  // pending
      .mockResolvedValueOnce(10) // cleared
      .mockResolvedValueOnce(3)  // confirmed_duplicate
      .mockResolvedValueOnce(1)  // escalated
      .mockResolvedValueOnce(19); // total
    vi.spyOn(FaceDuplicateAlert, 'find').mockReturnValue(
      chainOf([{ similarityScore: 0.90 }, { similarityScore: 0.92 }])
    );

    const res = await request(buildApp())
      .get('/api/face/admin/duplicates/stats')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const d = res.body.data;
    expect(d.totalAlerts).toBe(19);
    expect(d.byStatus.pending).toBe(5);
    expect(d.byStatus.cleared).toBe(10);
    expect(d.byStatus.confirmed_duplicate).toBe(3);
    expect(d.byStatus.escalated).toBe(1);
    expect(typeof d.pendingAvgSimilarity).toBe('number');
    expect(d.pendingAvgSimilarity).toBeCloseTo(0.91, 2);
  });

  it('pendingAvgSimilarity is null when no pending alerts', async () => {
    vi.spyOn(FaceDuplicateAlert, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(FaceDuplicateAlert, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/face/admin/duplicates/stats')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pendingAvgSimilarity).toBeNull();
  });
});

// ── FV7-E: Edge case hint endpoint ────────────────────────────────────────────
describe('POST /api/face/edge-case-hint (FV7-E)', () => {
  it('returns 400 when no issue provided', async () => {
    const res = await request(buildApp())
      .post('/api/face/edge-case-hint')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/issue/i);
  });

  it('returns hint for no_camera issue', async () => {
    const res = await request(buildApp())
      .post('/api/face/edge-case-hint')
      .send({ issue: 'no_camera' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.found).toBe(true);
    expect(res.body.issue).toBe('no_camera');
    expect(res.body.hint.title).toBeTruthy();
    expect(Array.isArray(res.body.hint.tips)).toBe(true);
    expect(res.body.hint.tips.length).toBeGreaterThan(0);
  });

  it('returns hint for poor_lighting issue', async () => {
    const res = await request(buildApp())
      .post('/api/face/edge-case-hint')
      .send({ issue: 'poor_lighting' });

    expect(res.status).toBe(200);
    expect(res.body.hint.title).toContain('lighting');
  });

  it('returns hint for glasses issue', async () => {
    const res = await request(buildApp())
      .post('/api/face/edge-case-hint')
      .send({ issue: 'glasses' });

    expect(res.status).toBe(200);
    expect(res.body.hint.title).toBeTruthy();
    expect(res.body.hint.tips.some(t => /glasses/i.test(t))).toBe(true);
  });

  it('returns found:false with knownIssues list for unknown issue', async () => {
    const res = await request(buildApp())
      .post('/api/face/edge-case-hint')
      .send({ issue: 'alien_interference' });

    expect(res.status).toBe(200);
    expect(res.body.found).toBe(false);
    expect(Array.isArray(res.body.knownIssues)).toBe(true);
    expect(res.body.knownIssues).toContain('no_camera');
    expect(res.body.knownIssues).toContain('poor_lighting');
  });

  it('covers all 7 known issue types', async () => {
    const issues = ['no_camera', 'poor_lighting', 'glasses', 'face_too_small', 'face_obstructed', 'multiple_faces', 'liveness_failed'];
    for (const issue of issues) {
      const res = await request(buildApp())
        .post('/api/face/edge-case-hint')
        .send({ issue });
      expect(res.status).toBe(200);
      expect(res.body.found).toBe(true);
      expect(res.body.hint.tips.length).toBeGreaterThan(0);
    }
  });
});

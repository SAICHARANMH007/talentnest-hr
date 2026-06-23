/**
 * Module 7 audit: offers.js route
 *
 * Behaviors proven:
 *   OFFER-A  GET /mine              — 401 no token; 200 returns [] when no
 *                                     candidate doc; 200 returns offer list.
 *   OFFER-B  GET /application/:id  — 401; 404 app not found; 200 returns
 *                                     existing offer; 200 auto-creates draft.
 *   OFFER-C  GET /:id              — 401; 404 not found; 200 admin scoped
 *                                     to tenant; candidate verified via email.
 *   OFFER-D  PATCH /:id            — candidate role → 403; 404 not found;
 *                                     400 cannot edit signed offer; 200 admin.
 *   OFFER-E  POST /:id/send        — candidate role → 403; 400 already signed.
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

// ── CJS references ────────────────────────────────────────────────────────────
const _r = createRequire(import.meta.url);

const _authModule       = _r('../src/middleware/auth.js');
const OfferLetter       = _r('../src/models/OfferLetter.js');
const Application       = _r('../src/models/Application.js');
const Candidate         = _r('../src/models/Candidate.js');
const Job               = _r('../src/models/Job.js');
const User              = _r('../src/models/User.js');
const Organization      = _r('../src/models/Organization.js');
const Tenant            = _r('../src/models/Tenant.js');
const OrgCustomizations = _r('../src/models/OrgCustomizations.js');
const emailUtils        = _r('../src/utils/email.js');
const logger            = _r('../src/middleware/logger.js');

import offersRouter from '../src/routes/offers.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID  = new mongoose.Types.ObjectId().toString();
const CANDIDATE_ID  = new mongoose.Types.ObjectId().toString();
const OFFER_ID      = new mongoose.Types.ObjectId().toString();
const APP_ID        = new mongoose.Types.ObjectId().toString();
const CAND_DOC_ID   = new mongoose.Types.ObjectId().toString();
const JOB_ID        = new mongoose.Types.ObjectId().toString();

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(role = 'admin', opts = {}) {
  const defaultId = role === 'recruiter' ? RECRUITER_ID
                  : role === 'candidate' ? CANDIDATE_ID
                  : ADMIN_ID;
  return jwt.sign(
    { userId: opts.id ?? defaultId, role, tenantId: opts.tenantId ?? TENANT_ID,
      email: opts.email ?? 'admin@test.example' },
    JWT_SECRET, { expiresIn: '1h' },
  );
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

function makeOffer(overrides = {}) {
  const id = new mongoose.Types.ObjectId();
  const offer = {
    _id: id, id: id.toString(),
    tenantId: TENANT_ID,
    applicationId: APP_ID,
    candidateId: CAND_DOC_ID,
    status: 'draft',
    templateData: { candidateName: 'Jane Doe', designation: 'Engineer', companyName: 'Acme' },
    sentAt: null, signedAt: null,
    toObject: function() { return { ...this }; },
    save: vi.fn().mockResolvedValue(true),
    markModified: vi.fn(),
    ...overrides,
  };
  return offer;
}

function makeApp(overrides = {}) {
  return {
    _id: APP_ID, tenantId: TENANT_ID,
    jobId: JOB_ID, candidateId: CAND_DOC_ID,
    currentStage: 'Offer', deletedAt: null,
    ...overrides,
  };
}

function makeOrg() {
  return {
    _id: TENANT_ID, name: 'Test Org',
    status: 'active', type: 'org',
    subscriptionStatus: 'active', isStaffingAgency: false,
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/offers', offersRouter);
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  });
  return app;
}

// ── Per-test setup ─────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  _authModule.clearAllUserAuthCache();

  vi.spyOn(logger, 'info').mockImplementation(() => {});
  vi.spyOn(logger, 'error').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
  vi.spyOn(logger, 'audit').mockImplementation(() => {});

  vi.spyOn(emailUtils, 'sendOrgEmail').mockResolvedValue(undefined);
  vi.spyOn(emailUtils, 'sendEmailWithRetry').mockResolvedValue(undefined);
  vi.spyOn(OrgCustomizations, 'getOrCreate').mockResolvedValue({ offerLetterTemplate: {} });

  // tenantGuard
  vi.spyOn(Organization, 'findById').mockReturnValue(chainOf(makeOrg()));
  vi.spyOn(Tenant, 'findById').mockReturnValue(chainOf(null));
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));

  // Auth: ID-aware
  vi.spyOn(User, 'findById').mockImplementation((id) => {
    const s = String(id);
    if (s === RECRUITER_ID) {
      return chainOf({ _id: RECRUITER_ID, id: RECRUITER_ID, role: 'recruiter',
        tenantId: TENANT_ID, isActive: true, name: 'Recruiter',
        email: 'rec@test.example', toObject: () => ({}) });
    }
    if (s === CANDIDATE_ID) {
      return chainOf({ _id: CANDIDATE_ID, id: CANDIDATE_ID, role: 'candidate',
        tenantId: TENANT_ID, isActive: true, name: 'Candidate',
        email: 'cand@test.example', toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin',
      email: 'admin@test.example', toObject: () => ({}) });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/offers/mine — candidate offer list (OFFER-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/offers/mine');
    expect(res.status).toBe(401);
  });

  it('returns 200 with empty array when no candidate doc exists', async () => {
    vi.spyOn(Candidate, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/offers/mine')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns 200 with offer list when candidate has offers', async () => {
    const candDoc = { _id: new mongoose.Types.ObjectId() };
    vi.spyOn(Candidate, 'find').mockReturnValue(chainOf([candDoc]));
    vi.spyOn(OfferLetter, 'find').mockReturnValue(chainOf([makeOffer({ status: 'sent' })]));

    const res = await request(buildApp())
      .get('/api/offers/mine')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('sent');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/offers/application/:appId — get or auto-create (OFFER-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/offers/application/${APP_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when application not found', async () => {
    vi.spyOn(Application, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get(`/api/offers/application/${APP_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('returns 200 with existing offer', async () => {
    vi.spyOn(Application, 'findOne').mockReturnValue(chainOf(makeApp()));
    vi.spyOn(OfferLetter, 'findOne').mockReturnValue(chainOf(makeOffer()));

    const res = await request(buildApp())
      .get(`/api/offers/application/${APP_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('draft');
  });

  it('auto-creates a draft offer when none exists', async () => {
    vi.spyOn(Application, 'findOne').mockReturnValue(chainOf(makeApp()));
    vi.spyOn(OfferLetter, 'findOne').mockReturnValue(chainOf(null));
    vi.spyOn(Candidate, 'findById').mockReturnValue(chainOf({ name: 'Jane', email: 'jane@x.com', phone: '' }));
    vi.spyOn(Job, 'findById').mockReturnValue(chainOf({ title: 'Engineer' }));
    const createSpy = vi.spyOn(OfferLetter, 'create').mockResolvedValue(makeOffer({ status: 'draft' }));

    const res = await request(buildApp())
      .get(`/api/offers/application/${APP_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(createSpy).toHaveBeenCalledOnce();
    expect(createSpy.mock.calls[0][0].status).toBe('draft');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/offers/:id — single offer (OFFER-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/offers/${OFFER_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when offer not found for admin', async () => {
    vi.spyOn(OfferLetter, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .get(`/api/offers/${OFFER_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('admin: returns offer scoped to their tenantId', async () => {
    const offer = makeOffer();
    const findOneSpy = vi.spyOn(OfferLetter, 'findOne').mockReturnValue(chainOf(offer));

    const res = await request(buildApp())
      .get(`/api/offers/${OFFER_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    const filter = findOneSpy.mock.calls[0][0];
    expect(filter.tenantId.toString()).toBe(TENANT_ID);
  });

  it('candidate: 404 when offer belongs to a different candidate email', async () => {
    const offer = makeOffer();
    vi.spyOn(OfferLetter, 'findById').mockReturnValue(chainOf(offer));
    // Candidate doc has a different email than the token's email
    vi.spyOn(Candidate, 'findById').mockReturnValue(chainOf({ email: 'other@example.com' }));

    const res = await request(buildApp())
      .get(`/api/offers/${OFFER_ID}`)
      .set('Authorization', `Bearer ${makeToken('candidate', { email: 'cand@test.example' })}`);

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/offers/:id — update offer (OFFER-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .patch(`/api/offers/${OFFER_ID}`)
      .send({ templateData: { ctc: '12 LPA' } });
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate role', async () => {
    const res = await request(buildApp())
      .patch(`/api/offers/${OFFER_ID}`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ templateData: { ctc: '12 LPA' } });
    expect(res.status).toBe(403);
  });

  it('returns 404 when offer not found', async () => {
    vi.spyOn(OfferLetter, 'findById').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .patch(`/api/offers/${OFFER_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ templateData: { ctc: '12 LPA' } });

    expect(res.status).toBe(404);
  });

  it('returns 400 when trying to edit a signed offer', async () => {
    vi.spyOn(OfferLetter, 'findById').mockReturnValue(chainOf(makeOffer({ status: 'signed' })));
    vi.spyOn(Application, 'findOne').mockReturnValue(chainOf(makeApp()));

    const res = await request(buildApp())
      .patch(`/api/offers/${OFFER_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ templateData: { ctc: '12 LPA' } });

    expect(res.status).toBe(400);
  });

  it('admin can update template data on a draft offer', async () => {
    const offer = makeOffer({ status: 'draft' });
    vi.spyOn(OfferLetter, 'findById').mockReturnValue(chainOf(offer));
    vi.spyOn(Application, 'findOne').mockReturnValue(chainOf(makeApp()));

    const res = await request(buildApp())
      .patch(`/api/offers/${OFFER_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ templateData: { ctc: '12 LPA' } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/offers/:id/send — send offer (OFFER-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post(`/api/offers/${OFFER_ID}/send`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate role', async () => {
    const res = await request(buildApp())
      .post(`/api/offers/${OFFER_ID}/send`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 when offer not found', async () => {
    vi.spyOn(OfferLetter, 'findById').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .post(`/api/offers/${OFFER_ID}/send`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('returns 400 when offer is already signed', async () => {
    vi.spyOn(OfferLetter, 'findById').mockReturnValue(chainOf(makeOffer({ status: 'signed' })));
    vi.spyOn(Application, 'findOne').mockReturnValue(chainOf(makeApp()));

    const res = await request(buildApp())
      .post(`/api/offers/${OFFER_ID}/send`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(400);
  });

  it('admin can send a draft offer and it is marked sent', async () => {
    const offer = makeOffer({ status: 'draft' });
    vi.spyOn(OfferLetter, 'findById').mockReturnValue(chainOf(offer));
    vi.spyOn(Application, 'findOne').mockReturnValue(chainOf(makeApp()));
    vi.spyOn(Candidate, 'findById').mockReturnValue(chainOf({ name: 'Jane', email: 'jane@x.com' }));
    vi.spyOn(Job, 'findById').mockReturnValue(chainOf({ title: 'Engineer' }));

    const res = await request(buildApp())
      .post(`/api/offers/${OFFER_ID}/send`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(offer.status).toBe('sent');
    expect(offer.save).toHaveBeenCalled();
  });
});

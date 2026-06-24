/**
 * Module audit: interest.js route
 *
 * Behaviors proven:
 *   INT-A  GET /confirm/:token — invalid token → redirect; valid → redirect confirmed.
 *   INT-B  GET /decline/:token — invalid token → redirect; valid → redirect declined.
 */

process.env.JWT_SECRET = 'test_jwt_secret_for_vitest_only';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
import express      from 'express';
import request      from 'supertest';
import jwt          from 'jsonwebtoken';
import mongoose     from 'mongoose';

vi.mock('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next(),
}));

const _r          = createRequire(import.meta.url);
const Application = _r('../src/models/Application.js');
const Job         = _r('../src/models/Job.js');
const logger      = _r('../src/middleware/logger.js');

import interestRouter from '../src/routes/interest.js';

const JWT_SECRET   = 'test_jwt_secret_for_vitest_only';
const TENANT_ID    = new mongoose.Types.ObjectId().toString();
const JOB_ID       = new mongoose.Types.ObjectId().toString();
const CAND_ID      = new mongoose.Types.ObjectId().toString();

function makeInterestToken(action = 'interest') {
  return jwt.sign({ candidateId: CAND_ID, jobId: JOB_ID, tenantId: TENANT_ID, action }, JWT_SECRET, { expiresIn: '7d' });
}

function makeAppDoc() {
  return {
    _id: new mongoose.Types.ObjectId(),
    interestStatus: null,
    currentStage: 'Applied',
    stageHistory: [],
    save: vi.fn().mockResolvedValue({}),
  };
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
  app.use('/api/interest', interestRouter);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(logger, 'info').mockImplementation(() => {});
  vi.spyOn(logger, 'error').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
  vi.spyOn(logger, 'audit').mockImplementation(() => {});
});

// ── INT-A: GET /confirm/:token ────────────────────────────────────────────────
describe('GET /api/interest/confirm/:token — confirm interest (INT-A)', () => {
  it('redirects when token is invalid', async () => {
    const res = await request(buildApp()).get('/api/interest/confirm/bad-token');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/interest-expired/);
  });

  it('redirects when token has wrong action', async () => {
    const token = makeInterestToken('other');
    const res = await request(buildApp()).get(`/api/interest/confirm/${token}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/interest-expired/);
  });

  it('redirects to expired when application not found', async () => {
    vi.spyOn(Application, 'findOne').mockResolvedValue(null);

    const token = makeInterestToken('interest');
    const res = await request(buildApp()).get(`/api/interest/confirm/${token}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/interest-expired/);
  });

  it('redirects to confirmed when interest confirmed', async () => {
    const appDoc = makeAppDoc();
    vi.spyOn(Application, 'findOne').mockResolvedValue(appDoc);
    vi.spyOn(Job, 'findById').mockReturnValue(chainOf({ _id: JOB_ID, title: 'Dev', assignedRecruiters: [] }));

    const token = makeInterestToken('interest');
    const res = await request(buildApp()).get(`/api/interest/confirm/${token}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/interest-confirmed/);
  });
});

// ── INT-B: GET /decline/:token ────────────────────────────────────────────────
describe('GET /api/interest/decline/:token — decline interest (INT-B)', () => {
  it('redirects when token is invalid', async () => {
    const res = await request(buildApp()).get('/api/interest/decline/bad-token');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/interest-expired/);
  });

  it('redirects to declined when interest declined', async () => {
    const appDoc = makeAppDoc();
    vi.spyOn(Application, 'findOne').mockResolvedValue(appDoc);

    const token = makeInterestToken('interest');
    const res = await request(buildApp()).get(`/api/interest/decline/${token}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/interest-declined/);
  });
});

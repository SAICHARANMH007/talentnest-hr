/**
 * Feature 3 — 9-Channel Job Distribution deepening
 *
 * Tests:
 *   DIST-F  PATCH /mark-posted/:jobId/:platform — manual platforms
 *   DIST-G  Auto-confirm feed platforms (distributionRetry.autoConfirmFeedPlatforms)
 *   DIST-H  Retry skips when API key not configured
 *   DIST-I  IndexNow platform appears in platform list
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

const _r              = createRequire(import.meta.url);
const _authModule     = _r('../src/middleware/auth.js');
const User            = _r('../src/models/User.js');
const Job             = _r('../src/models/Job.js');
const JobDistribution = _r('../src/models/JobDistribution.js');
const logger          = _r('../src/middleware/logger.js');

import distributionRouter from '../src/routes/distribution.js';
import { autoConfirmFeedPlatforms, retryFailedApiPlatforms } from '../src/jobs/distributionRetry.js';

const JWT_SECRET   = 'test_jwt_secret_for_vitest_only';
const TENANT_ID    = new mongoose.Types.ObjectId().toString();
const ADMIN_ID     = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID = new mongoose.Types.ObjectId().toString();
const JOB_ID       = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin') {
  const userId = role === 'recruiter' ? RECRUITER_ID : ADMIN_ID;
  return jwt.sign({ userId, role, tenantId: TENANT_ID }, JWT_SECRET, { expiresIn: '1h' });
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
    catch: (j) => Promise.resolve(value).catch(j),
  };
  return q;
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser('test_cookie_secret'));
  app.use('/api/distribution', distributionRouter);
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
    if (String(id) === RECRUITER_ID) {
      return chainOf({ _id: RECRUITER_ID, id: RECRUITER_ID, role: 'recruiter',
        tenantId: TENANT_ID, isActive: true, name: 'Recruiter', email: 'r@t.example' });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example' });
  });
});

// ── DIST-F: PATCH /mark-posted/:jobId/:platform ───────────────────────────────
describe('PATCH /api/distribution/mark-posted/:jobId/:platform (DIST-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .patch(`/api/distribution/mark-posted/${JOB_ID}/naukri`);
    expect(res.status).toBe(401);
  });

  it('returns 400 for non-manual platform', async () => {
    const res = await request(buildApp())
      .patch(`/api/distribution/mark-posted/${JOB_ID}/jooble`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not a manual platform/i);
  });

  it('returns 404 when distribution log not found', async () => {
    vi.spyOn(JobDistribution, 'findOne').mockResolvedValue(null);
    const res = await request(buildApp())
      .patch(`/api/distribution/mark-posted/${JOB_ID}/naukri`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });

  it('marks naukri as posted (status=success) for admin', async () => {
    const saveFn = vi.fn().mockResolvedValue({});
    vi.spyOn(JobDistribution, 'findOne').mockResolvedValue({
      jobId: JOB_ID, platform: 'naukri', status: 'pending', save: saveFn,
    });
    const res = await request(buildApp())
      .patch(`/api/distribution/mark-posted/${JOB_ID}/naukri`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(saveFn).toHaveBeenCalled();
  });

  it('marks shine as posted for recruiter', async () => {
    const saveFn = vi.fn().mockResolvedValue({});
    vi.spyOn(JobDistribution, 'findOne').mockResolvedValue({
      jobId: JOB_ID, platform: 'shine', status: 'pending', save: saveFn,
    });
    const res = await request(buildApp())
      .patch(`/api/distribution/mark-posted/${JOB_ID}/shine`)
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('marks timesjobs as posted', async () => {
    const saveFn = vi.fn().mockResolvedValue({});
    vi.spyOn(JobDistribution, 'findOne').mockResolvedValue({
      jobId: JOB_ID, platform: 'timesjobs', status: 'pending', save: saveFn,
    });
    const res = await request(buildApp())
      .patch(`/api/distribution/mark-posted/${JOB_ID}/timesjobs`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.distributedAt).toBeTruthy();
  });
});

// ── DIST-G: Feed auto-confirm ─────────────────────────────────────────────────
describe('autoConfirmFeedPlatforms (DIST-G)', () => {
  it('marks pending feed platforms as success after 24h', async () => {
    const past = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h ago
    const logs = [
      { _id: 'log1', jobId: JOB_ID, platform: 'jooble',    status: 'pending', lastAttemptedAt: past },
      { _id: 'log2', jobId: JOB_ID, platform: 'adzuna',    status: 'pending', lastAttemptedAt: past },
      { _id: 'log3', jobId: JOB_ID, platform: 'careerjet', status: 'pending', lastAttemptedAt: past },
    ];
    vi.spyOn(JobDistribution, 'find').mockReturnValue(chainOf(logs));
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf({ _id: JOB_ID, title: 'Dev', status: 'active' }));
    const updateSpy = vi.spyOn(JobDistribution, 'findByIdAndUpdate').mockResolvedValue({});

    await autoConfirmFeedPlatforms();

    expect(updateSpy).toHaveBeenCalledTimes(3);
    for (const call of updateSpy.mock.calls) {
      expect(call[1].$set.status).toBe('success');
    }
  });

  it('expires feed platforms when job is no longer active', async () => {
    const past = new Date(Date.now() - 25 * 60 * 60 * 1000);
    vi.spyOn(JobDistribution, 'find').mockReturnValue(chainOf([
      { _id: 'log1', jobId: JOB_ID, platform: 'jooble', status: 'pending', lastAttemptedAt: past },
    ]));
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf(null)); // job gone
    const updateSpy = vi.spyOn(JobDistribution, 'findByIdAndUpdate').mockResolvedValue({});

    await autoConfirmFeedPlatforms();
    expect(updateSpy.mock.calls[0][1].$set.status).toBe('expired');
  });

  it('does nothing when no platforms are pending past 24h', async () => {
    vi.spyOn(JobDistribution, 'find').mockReturnValue(chainOf([]));
    const updateSpy = vi.spyOn(JobDistribution, 'findByIdAndUpdate').mockResolvedValue({});

    await autoConfirmFeedPlatforms();
    expect(updateSpy).not.toHaveBeenCalled();
  });
});

// ── DIST-H: Retry skips when API key missing ──────────────────────────────────
describe('retryFailedApiPlatforms — skips when no API key (DIST-H)', () => {
  it('marks google_indexing as skipped when no API key', async () => {
    delete process.env.GOOGLE_INDEXING_API_KEY;

    vi.spyOn(JobDistribution, 'find').mockReturnValue(chainOf([
      { _id: 'log1', jobId: JOB_ID, platform: 'google_indexing', status: 'failed', attemptCount: 1, lastAttemptedAt: new Date() },
    ]));
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf({ _id: JOB_ID, title: 'Dev', status: 'active' }));
    const updateSpy = vi.spyOn(JobDistribution, 'findByIdAndUpdate').mockResolvedValue({});

    await retryFailedApiPlatforms();
    expect(updateSpy.mock.calls[0][1].$set.status).toBe('skipped');
  });

  it('marks permanently_failed after 3 attempts with API key', async () => {
    process.env.GOOGLE_INDEXING_API_KEY = 'test_key';

    vi.spyOn(JobDistribution, 'find').mockReturnValue(chainOf([
      { _id: 'log1', jobId: JOB_ID, platform: 'google_indexing', status: 'failed', attemptCount: 2 },
    ]));
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf({ _id: JOB_ID, title: 'Dev', status: 'active', careerPageSlug: 'dev-job' }));

    // Mock the fetch to fail
    const origFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403, statusText: 'Forbidden' });
    const updateSpy = vi.spyOn(JobDistribution, 'findByIdAndUpdate').mockResolvedValue({});

    await retryFailedApiPlatforms();

    global.fetch = origFetch;
    delete process.env.GOOGLE_INDEXING_API_KEY;

    expect(updateSpy.mock.calls[0][1].$set.status).toBe('permanently_failed');
    expect(updateSpy.mock.calls[0][1].$set.attemptCount).toBe(3);
  });
});

// ── DIST-I: IndexNow platform in platform list ────────────────────────────────
describe('GET /api/distribution/job/:jobId — IndexNow in platform list (DIST-I)', () => {
  it('includes indexnow in platform list', async () => {
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf({
      _id: JOB_ID, title: 'Dev', status: 'active', tenantId: TENANT_ID, location: 'Bangalore',
    }));
    vi.spyOn(JobDistribution, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get(`/api/distribution/job/${JOB_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    const platforms = res.body.data.platforms;
    const indexnow = platforms.find(p => p.platform === 'indexnow');
    expect(indexnow).toBeTruthy();
    expect(indexnow.type).toBe('api');
    expect(indexnow.label).toMatch(/IndexNow/i);
  });

  it('includes all 10 platforms total (was 9, now +indexnow)', async () => {
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf({
      _id: JOB_ID, title: 'Dev', status: 'active', tenantId: TENANT_ID,
    }));
    vi.spyOn(JobDistribution, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get(`/api/distribution/job/${JOB_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.body.data.platforms).toHaveLength(10);
  });
});

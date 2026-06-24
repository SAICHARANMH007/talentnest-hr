/**
 * Module audit: track.js route
 *
 * Behaviors proven:
 *   TRACK-A  GET /open/:trackingId — no auth; 200 returns tracking pixel GIF.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
import express      from 'express';
import cookieParser from 'cookie-parser';
import request      from 'supertest';

vi.mock('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next(),
}));

const _r = createRequire(import.meta.url);

const AuditLog = _r('../src/models/AuditLog.js');
const logger   = _r('../src/middleware/logger.js');

import trackRouter from '../src/routes/track.js';

const COOKIE_SECRET = 'test_cookie_secret';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/track', trackRouter);
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(logger, 'info').mockImplementation(() => {});
  vi.spyOn(logger, 'error').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
  vi.spyOn(logger, 'audit').mockImplementation(() => {});
  vi.spyOn(AuditLog, 'create').mockResolvedValue({});
});

// ── TRACK-A: GET /open/:trackingId ───────────────────────────────────────────
describe('GET /api/track/open/:trackingId — tracking pixel (TRACK-A)', () => {
  it('returns 200 with GIF content type', async () => {
    const res = await request(buildApp()).get('/api/track/open/test-tracking-id-123');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/gif/);
  });

  it('works without auth token', async () => {
    const res = await request(buildApp()).get('/api/track/open/abc123');
    expect(res.status).toBe(200);
  });
});

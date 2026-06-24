/**
 * Module audit: feed.js route
 *
 * Behaviors proven:
 *   FEED-A  GET /xml                     — no auth; 200 XML.
 *   FEED-B  GET /json                    — no auth; 200 JSON.
 *   FEED-C  GET /employer/:tenantId/xml  — no auth; 200 XML.
 *   FEED-D  GET /employer/:tenantId/json — no auth; 200 JSON.
 *   FEED-E  GET /sitemap.xml             — no auth; 200 XML.
 *   FEED-F  GET /robots.txt             — no auth; 200 text.
 *   FEED-G  GET /job/:id/schema         — no auth; 200 JSON-LD.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
import express      from 'express';
import request      from 'supertest';
import mongoose     from 'mongoose';

const _r           = createRequire(import.meta.url);
const Job          = _r('../src/models/Job.js');
const Organization = _r('../src/models/Organization.js');

import feedRouter from '../src/routes/feed.js';

const TENANT_ID = new mongoose.Types.ObjectId().toString();
const JOB_ID    = new mongoose.Types.ObjectId().toString();

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

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/feed', feedRouter);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Job, 'find').mockReturnValue(chainOf([]));
  vi.spyOn(Job, 'findOne').mockReturnValue(chainOf(null));
  vi.spyOn(Organization, 'find').mockReturnValue(chainOf([]));
  vi.spyOn(Organization, 'findOne').mockReturnValue(chainOf(null));
  // Reset internal feed cache by clearing module state on each test
  // The cache is a module-level variable in feed.js — we can't control it directly,
  // but since we mock Job.find to return [] it'll always refresh.
});

// ── FEED-A: GET /xml ──────────────────────────────────────────────────────────
describe('GET /api/feed/xml — XML job feed (FEED-A)', () => {
  it('returns 200 with XML content type', async () => {
    const res = await request(buildApp()).get('/api/feed/xml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/xml/);
  });
});

// ── FEED-B: GET /json ─────────────────────────────────────────────────────────
describe('GET /api/feed/json — JSON job feed (FEED-B)', () => {
  it('returns 200 with JSON array', async () => {
    const res = await request(buildApp()).get('/api/feed/json');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── FEED-C: GET /employer/:tenantId/xml ──────────────────────────────────────
describe('GET /api/feed/employer/:tenantId/xml — employer XML feed (FEED-C)', () => {
  it('returns 200 with XML content', async () => {
    const res = await request(buildApp()).get(`/api/feed/employer/${TENANT_ID}/xml`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/xml/);
  });
});

// ── FEED-D: GET /employer/:tenantId/json ─────────────────────────────────────
describe('GET /api/feed/employer/:tenantId/json — employer JSON feed (FEED-D)', () => {
  it('returns 200 with JSON array', async () => {
    const res = await request(buildApp()).get(`/api/feed/employer/${TENANT_ID}/json`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── FEED-E: GET /sitemap.xml ──────────────────────────────────────────────────
describe('GET /api/feed/sitemap.xml — sitemap (FEED-E)', () => {
  it('returns 200 with XML sitemap', async () => {
    const res = await request(buildApp()).get('/api/feed/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/xml/);
    expect(res.text).toMatch(/urlset/);
  });
});

// ── FEED-F: GET /robots.txt ───────────────────────────────────────────────────
describe('GET /api/feed/robots.txt — robots (FEED-F)', () => {
  it('returns 200 with text/plain', async () => {
    const res = await request(buildApp()).get('/api/feed/robots.txt');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toMatch(/User-agent/);
  });
});

// ── FEED-G: GET /job/:id/schema ───────────────────────────────────────────────
describe('GET /api/feed/job/:id/schema — job JSON-LD (FEED-G)', () => {
  it('returns 200 with inactive when job not found', async () => {
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp()).get(`/api/feed/job/${JOB_ID}/schema`);
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);
  });

  it('returns 200 with schema for active job', async () => {
    vi.spyOn(Job, 'findOne').mockReturnValue(chainOf({
      _id: JOB_ID, title: 'Dev', status: 'active', location: 'Hyderabad',
      description: 'Build stuff', jobType: 'full-time', tenantId: TENANT_ID,
      createdAt: new Date(), updatedAt: new Date(),
    }));

    const res = await request(buildApp()).get(`/api/feed/job/${JOB_ID}/schema`);
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(true);
    expect(res.body.schema).toHaveProperty('@type', 'JobPosting');
  });
});

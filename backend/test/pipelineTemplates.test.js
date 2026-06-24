/**
 * Module 17 audit: pipelineTemplates.js route
 *
 * Behaviors proven:
 *   PLTPL-A  GET /              — 401; 403 recruiter; 200 presets + custom list.
 *   PLTPL-B  POST /             — 401; 400 no name; 400 too few stages; 200 saved.
 *   PLTPL-C  PATCH /:name/apply — 401; 404 template not found; 200 applied.
 *   PLTPL-D  DELETE /:name      — 401; 200 deleted.
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
const Tenant      = _r('../src/models/Tenant.js');
const logger      = _r('../src/middleware/logger.js');

import pipelineTemplatesRouter from '../src/routes/pipelineTemplates.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID  = new mongoose.Types.ObjectId().toString();

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

function makeTenant(overrides = {}) {
  return {
    _id:           TENANT_ID,
    settings:      { pipelineTemplates: [{ name: 'Custom Flow', stages: ['A', 'B', 'C'] }] },
    markModified:  vi.fn(),
    save:          vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/pipeline-templates', pipelineTemplatesRouter);
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
        tenantId: TENANT_ID, isActive: true, name: 'Rec', email: 'rec@t.example',
        toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'a@t.example',
      toObject: () => ({}) });
  });
});

// ── PLTPL-A: GET / ─────────────────────────────────────────────────────────────
describe('GET /api/pipeline-templates — list templates (PLTPL-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/pipeline-templates');
    expect(res.status).toBe(401);
  });

  it('returns 403 for recruiter role', async () => {
    const res = await request(buildApp())
      .get('/api/pipeline-templates')
      .set('Authorization', `Bearer ${makeToken('recruiter')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with presets and custom templates for admin', async () => {
    vi.spyOn(Tenant, 'findById').mockReturnValue(
      chainOf({ settings: { pipelineTemplates: [{ name: 'Custom', stages: ['A', 'B', 'C'] }] } }),
    );

    const res = await request(buildApp())
      .get('/api/pipeline-templates')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.presets)).toBe(true);
    expect(res.body.data.presets.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data.custom)).toBe(true);
  });
});

// ── PLTPL-B: POST / ────────────────────────────────────────────────────────────
describe('POST /api/pipeline-templates — create template (PLTPL-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post('/api/pipeline-templates')
      .send({ name: 'My Template', stages: ['A', 'B', 'C'] });
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(buildApp())
      .post('/api/pipeline-templates')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ stages: ['A', 'B', 'C'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('returns 400 when stages has fewer than 2 items', async () => {
    const res = await request(buildApp())
      .post('/api/pipeline-templates')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Short', stages: ['Only One'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/stages/i);
  });

  it('saves template and returns 200', async () => {
    vi.spyOn(Tenant, 'findById').mockResolvedValue(makeTenant());

    const res = await request(buildApp())
      .post('/api/pipeline-templates')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'My Flow', stages: ['Applied', 'Interview', 'Offer', 'Hired'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('My Flow');
  });
});

// ── PLTPL-C: PATCH /:name/apply ────────────────────────────────────────────────
describe('PATCH /api/pipeline-templates/:name/apply — apply template (PLTPL-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).patch('/api/pipeline-templates/Fast Track/apply');
    expect(res.status).toBe(401);
  });

  it('returns 404 when template name not found', async () => {
    vi.spyOn(Tenant, 'findById').mockResolvedValue(makeTenant({
      settings: { pipelineTemplates: [] }, // no custom templates
    }));

    const res = await request(buildApp())
      .patch('/api/pipeline-templates/nonexistent/apply')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('applies preset template and returns 200', async () => {
    vi.spyOn(Tenant, 'findById').mockResolvedValue(makeTenant({
      settings: { pipelineTemplates: [] },
    }));

    const res = await request(buildApp())
      .patch('/api/pipeline-templates/Fast%20Track/apply')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.stages)).toBe(true);
  });
});

// ── PLTPL-D: DELETE /:name ─────────────────────────────────────────────────────
describe('DELETE /api/pipeline-templates/:name — delete template (PLTPL-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete('/api/pipeline-templates/My%20Flow');
    expect(res.status).toBe(401);
  });

  it('deletes template and returns 200', async () => {
    vi.spyOn(Tenant, 'findById').mockResolvedValue(makeTenant());

    const res = await request(buildApp())
      .delete('/api/pipeline-templates/Custom%20Flow')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/deleted/i);
  });
});

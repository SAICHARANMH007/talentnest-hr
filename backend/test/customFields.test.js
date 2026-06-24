/**
 * Module audit: customFields.js route
 *
 * Behaviors proven:
 *   CFD-A  GET /                          — 401 no token; 200 list.
 *   CFD-B  POST /                         — 401; 400 no label; 409 duplicate; 201 created.
 *   CFD-C  PATCH /:id                     — 401; 404 not found; 200 updated.
 *   CFD-D  DELETE /:id                    — 401; 404; 200 deactivated.
 *   CFD-E  PATCH /reorder/batch           — 401; 400 no items; 200 reordered.
 *   CFD-F  GET /values/:entity/:recordId  — 401; 200 with values.
 *   CFD-G  PUT /values/:entity/:recordId  — 401; 400 no values; 200 saved.
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

const _authModule           = _r('../src/middleware/auth.js');
const User                  = _r('../src/models/User.js');
const CustomFieldDefinition = _r('../src/models/CustomFieldDefinition.js');
const CustomFieldValue      = _r('../src/models/CustomFieldValue.js');
const logger                = _r('../src/middleware/logger.js');

import customFieldsRouter from '../src/routes/customFields.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const RECRUITER_ID  = new mongoose.Types.ObjectId().toString();
const FIELD_ID      = new mongoose.Types.ObjectId().toString();
const RECORD_ID     = new mongoose.Types.ObjectId().toString();

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  app.use('/api/custom-fields', customFieldsRouter);
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

  // customFields uses inline tenantGuard (checks req.user.tenantId only) —
  // no Organization.findById mock needed here.

  vi.spyOn(User, 'findById').mockImplementation((id) => {
    if (String(id) === RECRUITER_ID) {
      return chainOf({ _id: RECRUITER_ID, id: RECRUITER_ID, role: 'recruiter',
        tenantId: TENANT_ID, isActive: true, name: 'Recruiter', email: 'rec@test.example',
        toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'admin@test.example',
      toObject: () => ({}) });
  });
});

// ── CFD-A: GET / ──────────────────────────────────────────────────────────────
describe('GET /api/custom-fields — list fields (CFD-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/custom-fields');
    expect(res.status).toBe(401);
  });

  it('returns 200 list of custom fields for admin', async () => {
    vi.spyOn(CustomFieldDefinition, 'find').mockReturnValue(chainOf([
      { _id: FIELD_ID, label: 'Test', entity: 'candidate', isActive: true },
    ]));

    const res = await request(buildApp())
      .get('/api/custom-fields')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });
});

// ── CFD-B: POST / ─────────────────────────────────────────────────────────────
describe('POST /api/custom-fields — create field (CFD-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/custom-fields').send({ label: 'Test', entity: 'candidate' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when label is missing', async () => {
    const res = await request(buildApp())
      .post('/api/custom-fields')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ entity: 'candidate' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/label/i);
  });

  it('returns 409 when a duplicate field key exists', async () => {
    vi.spyOn(CustomFieldDefinition, 'findOne').mockResolvedValue({
      _id: FIELD_ID, fieldKey: 'test', entity: 'candidate',
    });

    const res = await request(buildApp())
      .post('/api/custom-fields')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ label: 'Test', entity: 'candidate' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('creates field and returns 201', async () => {
    vi.spyOn(CustomFieldDefinition, 'findOne').mockResolvedValue(null);
    vi.spyOn(CustomFieldDefinition, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(CustomFieldDefinition, 'create').mockResolvedValue({
      _id: FIELD_ID,
      toObject: () => ({ _id: FIELD_ID, label: 'Test', entity: 'candidate' }),
    });

    const res = await request(buildApp())
      .post('/api/custom-fields')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ label: 'Test', entity: 'candidate' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.label).toBe('Test');
  });
});

// ── CFD-C: PATCH /:id ─────────────────────────────────────────────────────────
describe('PATCH /api/custom-fields/:id — update field (CFD-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .patch(`/api/custom-fields/${FIELD_ID}`)
      .send({ label: 'Updated' });
    expect(res.status).toBe(401);
  });

  it('returns 404 when field not found', async () => {
    vi.spyOn(CustomFieldDefinition, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/custom-fields/${FIELD_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ label: 'Updated' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('updates field and returns 200', async () => {
    const updatedDoc = {
      _id: FIELD_ID,
      toObject: () => ({ _id: FIELD_ID, label: 'Updated', entity: 'candidate' }),
    };
    vi.spyOn(CustomFieldDefinition, 'findOneAndUpdate').mockResolvedValue(updatedDoc);

    const res = await request(buildApp())
      .patch(`/api/custom-fields/${FIELD_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ label: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.label).toBe('Updated');
  });
});

// ── CFD-D: DELETE /:id ────────────────────────────────────────────────────────
describe('DELETE /api/custom-fields/:id — deactivate field (CFD-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/custom-fields/${FIELD_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when field not found', async () => {
    vi.spyOn(CustomFieldDefinition, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/custom-fields/${FIELD_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('deactivates field and returns 200', async () => {
    const deactivatedDoc = {
      _id: FIELD_ID,
      toObject: () => ({ _id: FIELD_ID, label: 'Test', entity: 'candidate', isActive: false }),
    };
    vi.spyOn(CustomFieldDefinition, 'findOneAndUpdate').mockResolvedValue(deactivatedDoc);

    const res = await request(buildApp())
      .delete(`/api/custom-fields/${FIELD_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/deactivated/i);
  });
});

// ── CFD-E: PATCH /reorder/batch ───────────────────────────────────────────────
describe('PATCH /api/custom-fields/reorder/batch — reorder fields (CFD-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .patch('/api/custom-fields/reorder/batch')
      .send({ items: [{ id: FIELD_ID, order: 0 }] });
    expect(res.status).toBe(401);
  });

  it('returns 400 when items array is missing', async () => {
    const res = await request(buildApp())
      .patch('/api/custom-fields/reorder/batch')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/items/i);
  });

  it('reorders fields and returns 200', async () => {
    vi.spyOn(CustomFieldDefinition, 'findOneAndUpdate').mockResolvedValue({ _id: FIELD_ID });

    const res = await request(buildApp())
      .patch('/api/custom-fields/reorder/batch')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ items: [{ id: FIELD_ID, order: 0 }, { id: new mongoose.Types.ObjectId().toString(), order: 1 }] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── CFD-F: GET /values/:entity/:recordId ──────────────────────────────────────
describe('GET /api/custom-fields/values/:entity/:recordId — get values (CFD-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/custom-fields/values/candidate/${RECORD_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 with field definitions and values', async () => {
    vi.spyOn(CustomFieldDefinition, 'find').mockReturnValue(chainOf([
      { _id: FIELD_ID, label: 'Notes', entity: 'candidate', isActive: true },
    ]));
    vi.spyOn(CustomFieldValue, 'find').mockReturnValue(chainOf([
      { fieldId: FIELD_ID, value: 'Some note', recordId: RECORD_ID },
    ]));

    const res = await request(buildApp())
      .get(`/api/custom-fields/values/candidate/${RECORD_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });
});

// ── CFD-G: PUT /values/:entity/:recordId ──────────────────────────────────────
describe('PUT /api/custom-fields/values/:entity/:recordId — save values (CFD-G)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .put(`/api/custom-fields/values/candidate/${RECORD_ID}`)
      .send({ values: { [FIELD_ID]: 'hello' } });
    expect(res.status).toBe(401);
  });

  it('returns 400 when values object is missing', async () => {
    const res = await request(buildApp())
      .put(`/api/custom-fields/values/candidate/${RECORD_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/values/i);
  });

  it('saves field values and returns 200', async () => {
    vi.spyOn(CustomFieldValue, 'bulkWrite').mockResolvedValue({ ok: 1 });

    const res = await request(buildApp())
      .put(`/api/custom-fields/values/candidate/${RECORD_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ values: { [FIELD_ID]: 'Updated note' } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/saved/i);
  });
});

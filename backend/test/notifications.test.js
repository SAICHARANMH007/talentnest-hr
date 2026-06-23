/**
 * Module 8 audit: notifications.js route
 *
 * Behaviors proven:
 *   NOTIF-A  GET /                   — 401 no token; 200 returns user notifications.
 *   NOTIF-B  GET /preferences        — 401 no token; 200 returns category list.
 *   NOTIF-C  PATCH /preferences      — 401 no token; 200 saves muted categories.
 *   NOTIF-D  PATCH /read-all         — 401 no token; 200 marks all read.
 *   NOTIF-E  PATCH /:id/read         — 401 no token; 404 wrong user; 200 marks read.
 *   NOTIF-F  DELETE /                — 401 no token; 200 clears all.
 *   NOTIF-G  POST /platform-summary  — 401 no token; 403 non-SA; 200 for super_admin.
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

const _authModule  = _r('../src/middleware/auth.js');
const User         = _r('../src/models/User.js');
const Organization = _r('../src/models/Organization.js');
const Tenant       = _r('../src/models/Tenant.js');
const Notification = _r('../src/models/Notification.js');
const logger       = _r('../src/middleware/logger.js');

import notificationsRouter from '../src/routes/notifications.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const JWT_SECRET   = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID    = new mongoose.Types.ObjectId().toString();
const ADMIN_ID     = new mongoose.Types.ObjectId().toString();
const SA_ID        = new mongoose.Types.ObjectId().toString();
const NOTIF_ID     = new mongoose.Types.ObjectId().toString();

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(role = 'admin', opts = {}) {
  let defaultId = ADMIN_ID;
  if (role === 'super_admin') defaultId = SA_ID;
  return jwt.sign(
    { userId: opts.id ?? defaultId, role, tenantId: opts.tenantId ?? TENANT_ID },
    JWT_SECRET, { expiresIn: '1h' },
  );
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

function makeNotif(overrides = {}) {
  return {
    _id: NOTIF_ID,
    id: NOTIF_ID,
    userId: ADMIN_ID,
    type: 'system',
    title: 'Test notification',
    body: 'Test body',
    message: 'Test body',
    read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/notifications', notificationsRouter);
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

  // tenantGuard
  vi.spyOn(Organization, 'findById').mockReturnValue(chainOf({
    _id: TENANT_ID, name: 'Test Org', status: 'active', type: 'org',
    subscriptionStatus: 'active', isStaffingAgency: false,
  }));
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));

  // Auth
  vi.spyOn(User, 'findById').mockImplementation((id) => {
    const s = String(id);
    if (s === SA_ID) {
      return chainOf({ _id: SA_ID, id: SA_ID, role: 'super_admin',
        tenantId: null, isActive: true, name: 'Super', email: 'sa@test.example',
        settings: {}, toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'admin@test.example',
      settings: {}, toObject: () => ({}) });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/notifications — list notifications (NOTIF-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('returns 200 with notification array', async () => {
    vi.spyOn(Notification, 'find').mockReturnValue(chainOf([makeNotif()]));

    const res = await request(buildApp())
      .get('/api/notifications')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].title).toBe('Test notification');
  });

  it('returns empty array when user has no notifications', async () => {
    vi.spyOn(Notification, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/notifications')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/notifications/preferences — get preferences (NOTIF-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/notifications/preferences');
    expect(res.status).toBe(401);
  });

  it('returns 200 with category list', async () => {
    const res = await request(buildApp())
      .get('/api/notifications/preferences')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.categories)).toBe(true);
    expect(res.body.categories.length).toBeGreaterThan(0);
    expect(res.body.categories[0]).toHaveProperty('key');
    expect(res.body.categories[0]).toHaveProperty('label');
    expect(res.body.categories[0]).toHaveProperty('enabled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/notifications/preferences — update preferences (NOTIF-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .patch('/api/notifications/preferences')
      .send({ muted: ['interviews'] });
    expect(res.status).toBe(401);
  });

  it('saves muted categories and returns updated list', async () => {
    vi.spyOn(User, 'findByIdAndUpdate').mockReturnValue(chainOf({}));

    const res = await request(buildApp())
      .patch('/api/notifications/preferences')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ muted: ['interviews'] });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.categories)).toBe(true);
    const interviews = res.body.categories.find(c => c.key === 'interviews');
    expect(interviews.enabled).toBe(false);
  });

  it('ignores unknown category keys', async () => {
    vi.spyOn(User, 'findByIdAndUpdate').mockReturnValue(chainOf({}));

    const res = await request(buildApp())
      .patch('/api/notifications/preferences')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ muted: ['nonexistent_category'] });

    expect(res.status).toBe(200);
    // All known categories should remain enabled
    res.body.categories.forEach(c => expect(c.enabled).toBe(true));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/notifications/read-all — mark all read (NOTIF-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).patch('/api/notifications/read-all');
    expect(res.status).toBe(401);
  });

  it('returns 200 and marks all notifications read', async () => {
    vi.spyOn(Notification, 'updateMany').mockResolvedValue({ modifiedCount: 3 });

    const res = await request(buildApp())
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/notifications/:id/read — mark single read (NOTIF-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).patch(`/api/notifications/${NOTIF_ID}/read`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when notification not found or belongs to another user', async () => {
    vi.spyOn(Notification, 'findOneAndUpdate').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/notifications/${NOTIF_ID}/read`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('returns 200 when notification marked as read', async () => {
    vi.spyOn(Notification, 'findOneAndUpdate').mockResolvedValue(makeNotif({ read: true }));

    const res = await request(buildApp())
      .patch(`/api/notifications/${NOTIF_ID}/read`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/notifications — clear all (NOTIF-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('returns 200 and deletes all notifications for user', async () => {
    vi.spyOn(Notification, 'deleteMany').mockResolvedValue({ deletedCount: 5 });

    const res = await request(buildApp())
      .delete('/api/notifications')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/notifications/platform-summary — SA summary (NOTIF-G)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post('/api/notifications/platform-summary');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-super_admin', async () => {
    const res = await request(buildApp())
      .post('/api/notifications/platform-summary')
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 for super_admin and inserts summary notifications', async () => {
    vi.spyOn(User, 'countDocuments').mockResolvedValue(10);
    vi.spyOn(Organization, 'countDocuments').mockResolvedValue(5);
    vi.spyOn(Notification, 'deleteMany').mockResolvedValue({});
    vi.spyOn(Notification, 'insertMany').mockResolvedValue([]);
    vi.spyOn(Notification, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .post('/api/notifications/platform-summary')
      .set('Authorization', `Bearer ${makeToken('super_admin')}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

/**
 * Module 9 audit: connections.js route
 *
 * Behaviors proven:
 *   CONN-A  GET /                    — 401 no token; 200 accepted connections list.
 *   CONN-B  GET /pending             — 401 no token; 200 incoming pending list.
 *   CONN-C  GET /sent                — 401 no token; 200 outgoing pending list.
 *   CONN-D  GET /search              — 401 no token; 400 query < 2 chars; 200 results.
 *   CONN-E  POST /request/:userId    — 401 no token; 400 self-connect; 404 target not
 *                                      found; 400 duplicate request; 201 created.
 *   CONN-F  POST /accept/:requestId  — 401 no token; 404 not found; 403 wrong user;
 *                                      200 accepted.
 *   CONN-G  POST /reject/:requestId  — 401 no token; 404 not found; 200 rejected.
 *   CONN-H  DELETE /remove/:userId   — 401 no token; 404 not found; 200 removed.
 *   CONN-I  DELETE /cancel/:requestId — 401 no token; 404 not found; 200 cancelled.
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
const Connection   = _r('../src/models/Connection.js');
const Candidate    = _r('../src/models/Candidate.js');
const Application  = _r('../src/models/Application.js');
const logger       = _r('../src/middleware/logger.js');

import connectionsRouter from '../src/routes/connections.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const OTHER_ID      = new mongoose.Types.ObjectId().toString();
const CONN_ID       = new mongoose.Types.ObjectId().toString();

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(role = 'admin', opts = {}) {
  return jwt.sign(
    { userId: opts.id ?? ADMIN_ID, role, tenantId: opts.tenantId ?? TENANT_ID },
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

function makeConn(overrides = {}) {
  return {
    _id: CONN_ID,
    id: CONN_ID,
    fromUserId: ADMIN_ID,
    toUserId: OTHER_ID,
    tenantId: TENANT_ID,
    status: 'pending',
    createdAt: new Date().toISOString(),
    save: vi.fn().mockResolvedValue(true),
    deleteOne: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/connections', connectionsRouter);
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
  vi.spyOn(User, 'findById').mockReturnValue(
    chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'admin@test.example',
      skills: [], department: 'Eng', toObject: () => ({}) })
  );
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/connections — accepted list (CONN-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/connections');
    expect(res.status).toBe(401);
  });

  it('returns 200 with accepted connection users', async () => {
    vi.spyOn(Connection, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(User, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/connections')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/connections/pending — incoming pending (CONN-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/connections/pending');
    expect(res.status).toBe(401);
  });

  it('returns 200 with pending request list', async () => {
    vi.spyOn(Connection, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(User, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/connections/pending')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/connections/sent — outgoing pending (CONN-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/connections/sent');
    expect(res.status).toBe(401);
  });

  it('returns 200 with sent request list', async () => {
    vi.spyOn(Connection, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(User, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/connections/sent')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/connections/search — user search (CONN-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/connections/search?q=test');
    expect(res.status).toBe(401);
  });

  it('returns 400 when query is less than 2 characters', async () => {
    const res = await request(buildApp())
      .get('/api/connections/search?q=a')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 2/i);
  });

  it('returns 200 with matching users and connection status', async () => {
    vi.spyOn(User, 'find').mockReturnValue(chainOf([
      { _id: OTHER_ID, name: 'Test User', email: 'test@example.com', role: 'recruiter' },
    ]));
    vi.spyOn(Connection, 'find').mockReturnValue(chainOf([]));

    const res = await request(buildApp())
      .get('/api/connections/search?q=test')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/connections/request/:userId — send request (CONN-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post(`/api/connections/request/${OTHER_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 400 when trying to connect with yourself', async () => {
    const res = await request(buildApp())
      .post(`/api/connections/request/${ADMIN_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/yourself/i);
  });

  it('returns 404 when target user not found', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .post(`/api/connections/request/${OTHER_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
  });

  it('returns 400 when connection request already exists', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(chainOf({ _id: OTHER_ID, name: 'Other' }));
    vi.spyOn(Connection, 'findOne').mockReturnValue(chainOf(makeConn()));

    const res = await request(buildApp())
      .post(`/api/connections/request/${OTHER_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('returns 201 when request is created', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(chainOf({ _id: OTHER_ID, name: 'Other' }));
    vi.spyOn(Connection, 'findOne').mockReturnValue(chainOf(null));
    vi.spyOn(Connection, 'create').mockResolvedValue(makeConn({ status: 'pending' }));

    const res = await request(buildApp())
      .post(`/api/connections/request/${OTHER_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/connections/accept/:requestId — accept request (CONN-F)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post(`/api/connections/accept/${CONN_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when request not found', async () => {
    // All four fallback calls use .lean() or return the doc directly;
    // chainOf(null) satisfies both call patterns.
    vi.spyOn(Connection, 'findOne').mockReturnValue(chainOf(null));
    vi.spyOn(Connection, 'findById').mockReturnValue(chainOf(null));

    const res = await request(buildApp())
      .post(`/api/connections/accept/${CONN_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 when user is not the recipient', async () => {
    // connection goes to OTHER_ID, but we're ADMIN_ID
    const wrongConn = makeConn({ toUserId: OTHER_ID, status: 'pending' });
    vi.spyOn(Connection, 'findOne').mockResolvedValue(wrongConn);

    const res = await request(buildApp())
      .post(`/api/connections/accept/${CONN_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(403);
  });

  it('returns 200 when recipient accepts the request', async () => {
    // connection goes to ADMIN_ID (the authenticated user)
    const conn = makeConn({ fromUserId: OTHER_ID, toUserId: ADMIN_ID, status: 'pending' });
    vi.spyOn(Connection, 'findOne').mockResolvedValue(conn);

    const res = await request(buildApp())
      .post(`/api/connections/accept/${CONN_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(conn.save).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/connections/reject/:requestId — reject request (CONN-G)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).post(`/api/connections/reject/${CONN_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when request not found', async () => {
    vi.spyOn(Connection, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .post(`/api/connections/reject/${CONN_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
  });

  it('returns 200 when recipient rejects the request', async () => {
    const conn = makeConn({ fromUserId: OTHER_ID, toUserId: ADMIN_ID, status: 'pending' });
    vi.spyOn(Connection, 'findOne').mockResolvedValue(conn);

    const res = await request(buildApp())
      .post(`/api/connections/reject/${CONN_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(conn.save).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/connections/remove/:userId — remove connection (CONN-H)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/connections/remove/${OTHER_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when accepted connection not found', async () => {
    vi.spyOn(Connection, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/connections/remove/${OTHER_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
  });

  it('returns 200 and deletes the connection', async () => {
    const conn = makeConn({ status: 'accepted' });
    vi.spyOn(Connection, 'findOne').mockResolvedValue(conn);

    const res = await request(buildApp())
      .delete(`/api/connections/remove/${OTHER_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(conn.deleteOne).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/connections/cancel/:requestId — cancel outgoing (CONN-I)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/connections/cancel/${CONN_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when pending request not found or not the sender', async () => {
    vi.spyOn(Connection, 'findOne').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/connections/cancel/${CONN_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
  });

  it('returns 200 and cancels the outgoing request', async () => {
    const conn = makeConn({ fromUserId: ADMIN_ID, status: 'pending' });
    vi.spyOn(Connection, 'findOne').mockResolvedValue(conn);

    const res = await request(buildApp())
      .delete(`/api/connections/cancel/${CONN_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(conn.deleteOne).toHaveBeenCalled();
  });
});

/**
 * Module audit: clients.js route
 *
 * Behaviors proven:
 *   CLI-A  GET /         — 401 no token; 200 paginated list for admin.
 *   CLI-B  GET /:id      — 401 no token; 404 not found; 200 client data.
 *   CLI-C  POST /        — 401 no token; 403 recruiter; 400 no companyName; 201 created.
 *   CLI-D  PATCH /:id    — 401 no token; 403 recruiter; 404 not found; 200 updated.
 *   CLI-E  DELETE /:id   — 401 no token; 403 recruiter; 404 not found; 200 deactivated.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRequire } from 'module'
import express from 'express'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

vi.mock('express-rate-limit', () => ({ default: () => (_req, _res, next) => next() }))

const _r = createRequire(import.meta.url)
const _authModule  = _r('../src/middleware/auth.js')
const User         = _r('../src/models/User.js')
const logger       = _r('../src/middleware/logger.js')
const Organization = _r('../src/models/Organization.js')
const Tenant       = _r('../src/models/Tenant.js')
const Client       = _r('../src/models/Client.js')

import clientsRouter from '../src/routes/clients.js'

// ── Constants ─────────────────────────────────────────────────────────────────
const JWT_SECRET    = 'test_jwt_secret_for_vitest_only'
const COOKIE_SECRET = 'test_cookie_secret'
const TENANT_ID     = new mongoose.Types.ObjectId().toString()
const ADMIN_ID      = new mongoose.Types.ObjectId().toString()
const RECRUITER_ID  = new mongoose.Types.ObjectId().toString()
const CLIENT_ID     = new mongoose.Types.ObjectId().toString()

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(role = 'admin', opts = {}) {
  const defaultId = role === 'recruiter' ? RECRUITER_ID : ADMIN_ID
  return jwt.sign(
    { userId: opts.id ?? defaultId, role, tenantId: opts.tenantId ?? TENANT_ID },
    JWT_SECRET,
    { expiresIn: '1h' },
  )
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
  }
  return q
}

function makeOrg() {
  return {
    _id: TENANT_ID, name: 'Test Org',
    status: 'active', type: 'org',
    subscriptionStatus: 'active',
    isStaffingAgency: false,
  }
}

function makeClientDoc(overrides = {}) {
  return {
    _id: CLIENT_ID,
    tenantId: TENANT_ID,
    companyName: 'Acme Corp',
    contactPerson: 'John Doe',
    email: 'john@acme.com',
    phone: '9999999999',
    industry: 'Technology',
    billingType: 'percentage_of_ctc',
    billingValue: 10,
    billingCurrency: 'INR',
    billingNotes: '',
    isActive: true,
    toObject: function() { return { _id: this._id, companyName: this.companyName, ...overrides } },
    ...overrides,
  }
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser(COOKIE_SECRET))
  app.use('/api/clients', clientsRouter)
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message })
  })
  return app
}

// ── Per-test setup ─────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks()
  _authModule.clearAllUserAuthCache()

  vi.spyOn(logger, 'info').mockImplementation(() => {})
  vi.spyOn(logger, 'error').mockImplementation(() => {})
  vi.spyOn(logger, 'warn').mockImplementation(() => {})
  vi.spyOn(logger, 'audit').mockImplementation(() => {})

  vi.spyOn(Organization, 'findById').mockReturnValue(chainOf(makeOrg()))
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]))

  vi.spyOn(User, 'findById').mockImplementation((id) => {
    const s = String(id)
    if (s === RECRUITER_ID) {
      return chainOf({
        _id: RECRUITER_ID, id: RECRUITER_ID, role: 'recruiter',
        tenantId: TENANT_ID, isActive: true, name: 'Recruiter',
        email: 'rec@test.example', toObject: () => ({}),
      })
    }
    return chainOf({
      _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin',
      email: 'admin@test.example', toObject: () => ({}),
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/clients — paginated list (CLI-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/clients')
    expect(res.status).toBe(401)
  })

  it('returns 200 with paginated list for admin', async () => {
    const clientItem = { _id: CLIENT_ID, companyName: 'Acme Corp', tenantId: TENANT_ID }
    vi.spyOn(Client, 'find').mockReturnValue(chainOf([clientItem]))
    vi.spyOn(Client, 'countDocuments').mockResolvedValue(1)

    const res = await request(buildApp())
      .get('/api/clients')
      .set('Authorization', `Bearer ${makeToken('admin')}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.pagination.total).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/clients/:id — single client (CLI-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get(`/api/clients/${CLIENT_ID}`)
    expect(res.status).toBe(401)
  })

  it('returns 404 when client not found', async () => {
    vi.spyOn(Client, 'findOne').mockReturnValue(chainOf(null))

    const res = await request(buildApp())
      .get(`/api/clients/${CLIENT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  it('returns 200 with client data', async () => {
    const clientPlain = {
      _id: CLIENT_ID, companyName: 'Acme Corp',
      tenantId: TENANT_ID, isActive: true,
    }
    vi.spyOn(Client, 'findOne').mockReturnValue(chainOf(clientPlain))

    const res = await request(buildApp())
      .get(`/api/clients/${CLIENT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeDefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/clients — create client (CLI-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post('/api/clients')
      .send({ companyName: 'Acme Corp' })
    expect(res.status).toBe(401)
  })

  it('returns 403 for recruiter role', async () => {
    const res = await request(buildApp())
      .post('/api/clients')
      .set('Authorization', `Bearer ${makeToken('recruiter')}`)
      .send({ companyName: 'Acme Corp' })
    expect(res.status).toBe(403)
  })

  it('returns 400 when companyName is missing', async () => {
    const res = await request(buildApp())
      .post('/api/clients')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ contactPerson: 'John' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/companyName/i)
  })

  it('returns 201 with created client', async () => {
    const doc = makeClientDoc()
    vi.spyOn(Client, 'create').mockResolvedValue(doc)

    const res = await request(buildApp())
      .post('/api/clients')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ companyName: 'Acme Corp', industry: 'Technology' })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeDefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/clients/:id — update client (CLI-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .patch(`/api/clients/${CLIENT_ID}`)
      .send({ companyName: 'Updated Corp' })
    expect(res.status).toBe(401)
  })

  it('returns 403 for recruiter role', async () => {
    const res = await request(buildApp())
      .patch(`/api/clients/${CLIENT_ID}`)
      .set('Authorization', `Bearer ${makeToken('recruiter')}`)
      .send({ companyName: 'Updated Corp' })
    expect(res.status).toBe(403)
  })

  it('returns 404 when client not found', async () => {
    vi.spyOn(Client, 'findOneAndUpdate').mockResolvedValue(null)

    const res = await request(buildApp())
      .patch(`/api/clients/${CLIENT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ companyName: 'Updated Corp' })

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  it('returns 200 with updated client', async () => {
    const doc = makeClientDoc({ companyName: 'Updated Corp' })
    vi.spyOn(Client, 'findOneAndUpdate').mockResolvedValue(doc)

    const res = await request(buildApp())
      .patch(`/api/clients/${CLIENT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ companyName: 'Updated Corp' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeDefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/clients/:id — deactivate client (CLI-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).delete(`/api/clients/${CLIENT_ID}`)
    expect(res.status).toBe(401)
  })

  it('returns 403 for recruiter role', async () => {
    const res = await request(buildApp())
      .delete(`/api/clients/${CLIENT_ID}`)
      .set('Authorization', `Bearer ${makeToken('recruiter')}`)
    expect(res.status).toBe(403)
  })

  it('returns 404 when client not found', async () => {
    vi.spyOn(Client, 'findOneAndUpdate').mockResolvedValue(null)

    const res = await request(buildApp())
      .delete(`/api/clients/${CLIENT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  it('returns 200 with deactivation message', async () => {
    const doc = { _id: CLIENT_ID, isActive: false, toObject: () => ({}) }
    vi.spyOn(Client, 'findOneAndUpdate').mockResolvedValue(doc)

    const res = await request(buildApp())
      .delete(`/api/clients/${CLIENT_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.message).toBe('Client deactivated.')
  })
})

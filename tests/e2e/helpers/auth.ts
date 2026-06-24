/**
 * Auth helpers — inject a session into the browser without hitting a real backend.
 *
 * HOW IT WORKS
 * ─────────────
 * TalentNest stores auth state in sessionStorage (token + user object).
 * App.jsx reads that storage in its mount useEffect, calls initAuth() which
 * hits POST /api/auth/refresh. If the refresh token cookie is absent the server
 * returns null, so we also intercept /api/auth/refresh to return a fresh token
 * for our test user.  That way every page loads already-logged-in without
 * needing Render/MongoDB running.
 *
 * The JWT is self-signed with a fake secret — the frontend only reads the payload
 * (userId, role, etc.); it never verifies the signature itself.
 */

import { Page, Route } from '@playwright/test';

// ── Shared mock data ──────────────────────────────────────────────────────────

const TENANT_ID = 'aaaabbbbcccc111122223333';
const ORG_ID    = TENANT_ID;

/** Make a compact, non-expiring JWT with the given payload (no signature check on frontend). */
function fakeJwt(payload: Record<string, unknown>): string {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body    = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 86400, ...payload })).toString('base64url');
  return `${header}.${body}.fakesignature`;
}

export interface TestUser {
  _id: string;
  id:  string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  orgId: string;
  orgName: string;
  isActive: boolean;
  title?: string;
  avatarUrl?: string;
  planTier?: string;
  tenantType?: string;
}

// ── Role fixtures ─────────────────────────────────────────────────────────────

export const USERS: Record<string, TestUser> = {
  super_admin: {
    _id: '000000000000000000000001', id: '000000000000000000000001',
    name: 'Super Admin', email: 'admin@talentnesthr.com', role: 'super_admin',
    tenantId: TENANT_ID, orgId: ORG_ID, orgName: 'TalentNest Platform',
    isActive: true, title: 'Platform Admin',
  },
  admin: {
    _id: '000000000000000000000002', id: '000000000000000000000002',
    name: 'Priya Sharma', email: 'admin@acmetech.in', role: 'admin',
    tenantId: TENANT_ID, orgId: ORG_ID, orgName: 'AcmeTech',
    isActive: true, title: 'HR Manager',
  },
  recruiter: {
    _id: '000000000000000000000003', id: '000000000000000000000003',
    name: 'Rahul Verma', email: 'recruiter@acmetech.in', role: 'recruiter',
    tenantId: TENANT_ID, orgId: ORG_ID, orgName: 'AcmeTech',
    isActive: true, title: 'Senior Recruiter',
  },
  hiring_manager: {
    _id: '000000000000000000000004', id: '000000000000000000000004',
    name: 'Arjun Mehta', email: 'hiring@acmetech.in', role: 'hiring_manager',
    tenantId: TENANT_ID, orgId: ORG_ID, orgName: 'AcmeTech',
    isActive: true, title: 'Engineering Manager',
  },
  candidate: {
    _id: '000000000000000000000005', id: '000000000000000000000005',
    name: 'Karan Singh', email: 'candidate@acmetech.in', role: 'candidate',
    tenantId: TENANT_ID, orgId: ORG_ID, orgName: 'AcmeTech',
    isActive: true, title: 'Software Engineer',
  },
  client: {
    _id: '000000000000000000000006', id: '000000000000000000000006',
    name: 'Client User', email: 'client@acmetech.in', role: 'client',
    tenantId: TENANT_ID, orgId: ORG_ID, orgName: 'AcmeTech',
    isActive: true,
  },
  college_admin: {
    _id: '000000000000000000000007', id: '000000000000000000000007',
    name: 'Dr. Lakshmi Rao', email: 'placement@greenvalley.edu', role: 'placement_officer',
    tenantId: TENANT_ID, orgId: ORG_ID, orgName: 'Green Valley Engineering College',
    isActive: true, title: 'Placement Officer',
    tenantType: 'college',
  },
};

// ── Mock route patterns ───────────────────────────────────────────────────────

/** Returns 200 JSON. Helper to reduce boilerplate in mocks. */
export function jsonOk(route: Route, data: unknown) {
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
}

/** Returns a standard API error. */
export function jsonErr(route: Route, status: number, message: string) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ success: false, message }) });
}

/** Pass-through: let the real network handle the request (useful for static assets). */
export function passThrough(route: Route) {
  return route.continue();
}

// ── Core session injector ─────────────────────────────────────────────────────

/**
 * loginAs — injects a test session for the given role, then navigates to `path`.
 *
 * Uses addInitScript to pre-seed storage before React mounts (no /login detour),
 * which halves test time by doing a single navigation instead of two.
 */
export async function loginAs(page: Page, role: keyof typeof USERS, path = '/app') {
  const user  = USERS[role];
  const token = fakeJwt({ userId: user._id, role: user.role, tenantId: user.tenantId, orgId: user.orgId });

  // Pre-seed auth storage so App.jsx's sessionStorage fallback finds the user.
  // addInitScript runs before any page script, including React's initial load.
  await page.addInitScript(({ u, t }) => {
    const uJson = JSON.stringify(u);
    try { sessionStorage.setItem('tn_token', t); sessionStorage.setItem('tn_user', uJson); } catch {}
    try { localStorage.setItem('tn_token', t); localStorage.setItem('tn_user', uJson); localStorage.setItem('tn_logged_in', 'true'); } catch {}
  }, { u: user, t: token });

  // Auth route mocks — registered before navigation so initAuth() picks them up.
  await page.route('**/api/auth/refresh', (route) =>
    jsonOk(route, { success: true, user, token }),
  );
  await page.route('**/api/auth/me', (route) =>
    jsonOk(route, { success: true, user }),
  );
  await page.route('**/api/health', (route) =>
    jsonOk(route, { status: 'ok', db: 'connected', sentry: 'disabled', uptime: 300, timestamp: new Date().toISOString() }),
  );

  // Single navigation — no /login detour needed since storage is already set.
  await page.goto(path, { waitUntil: 'domcontentloaded' });

  return { user, token };
}

// ── Convenience wrappers per role ─────────────────────────────────────────────

export const loginAsSuperAdmin    = (p: Page, path?: string) => loginAs(p, 'super_admin', path);
export const loginAsAdmin         = (p: Page, path?: string) => loginAs(p, 'admin', path);
export const loginAsRecruiter     = (p: Page, path?: string) => loginAs(p, 'recruiter', path);
export const loginAsHiringManager = (p: Page, path?: string) => loginAs(p, 'hiring_manager', path);
export const loginAsCandidate     = (p: Page, path?: string) => loginAs(p, 'candidate', path);
export const loginAsClient        = (p: Page, path?: string) => loginAs(p, 'client', path);
export const loginAsCollegeAdmin  = (p: Page, path?: string) => loginAs(p, 'college_admin', path);

// ── Common mock data factories ────────────────────────────────────────────────

export function mockJob(overrides: Record<string, unknown> = {}) {
  return {
    _id: '666600000000000000000001', id: '666600000000000000000001',
    title: 'Senior Software Engineer', company: 'AcmeTech', companyName: 'AcmeTech',
    department: 'Engineering', location: 'Bangalore', jobType: 'full_time',
    workMode: 'hybrid', experience: '3-5 years', status: 'active',
    urgency: 'High', skills: ['React', 'Node.js'], tenantId: TENANT_ID,
    salaryMin: 1200000, salaryMax: 2000000, salaryCurrency: 'INR',
    applicationCount: 12, applicantsCount: 12,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

export function mockCandidate(overrides: Record<string, unknown> = {}) {
  return {
    _id: '777700000000000000000001', id: '777700000000000000000001',
    name: 'Test Candidate', email: 'testcandidate@example.com',
    phone: '9876543210', title: 'Software Engineer',
    location: 'Bangalore', experience: 3, skills: ['React', 'TypeScript'],
    source: 'direct', tenantId: TENANT_ID, deletedAt: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    ...overrides,
  };
}

export function mockApplication(overrides: Record<string, unknown> = {}) {
  return {
    _id: '888800000000000000000001', id: '888800000000000000000001',
    jobId: { _id: '666600000000000000000001', title: 'Senior Software Engineer', company: 'AcmeTech' },
    candidateId: { _id: '777700000000000000000001', name: 'Test Candidate', email: 'testcandidate@example.com' },
    currentStage: 'Applied', stage: 'applied', status: 'active',
    tenantId: TENANT_ID, deletedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function paginatedResponse(data: unknown[], total?: number) {
  const arr = Array.isArray(data) ? data : [data];
  return { success: true, data: arr, total: total ?? arr.length, page: 1, limit: 20, pages: 1 };
}

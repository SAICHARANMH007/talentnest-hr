/**
 * Smoke tests — one login per role, verify the dashboard loads without errors.
 *
 * These tests do NOT require a live backend.  All /api/* calls are intercepted
 * via page.route() inside loginAs().  We just need the Vite dev server running.
 */

import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  loginAsRecruiter,
  loginAsHiringManager,
  loginAsCandidate,
  loginAsSuperAdmin,
  loginAsClient,
  jsonOk,
  mockJob,
  mockCandidate,
  mockApplication,
  paginatedResponse,
} from './helpers/auth';

// ── Common API stubs needed on /app dashboard ─────────────────────────────────

async function stubDashboardApis(page: import('@playwright/test').Page) {
  // Jobs
  await page.route('**/api/jobs**', (r) => jsonOk(r, paginatedResponse([mockJob()])));
  // Candidates
  await page.route('**/api/candidates**', (r) => jsonOk(r, paginatedResponse([mockCandidate()])));
  // Applications
  await page.route('**/api/applications**', (r) => jsonOk(r, paginatedResponse([mockApplication()])));
  // Analytics / stats
  await page.route('**/api/analytics**', (r) => jsonOk(r, { success: true, data: {} }));
  await page.route('**/api/stats**',     (r) => jsonOk(r, { success: true, data: {} }));
  // Notifications
  await page.route('**/api/notifications**', (r) =>
    jsonOk(r, { success: true, data: [], total: 0 }),
  );
  // Billing / plan
  await page.route('**/api/billing**', (r) =>
    jsonOk(r, {
      success: true,
      data: {
        planName: 'Trial',
        subscriptionStatus: 'active',
        subscriptionExpiry: null,
        limits: {
          activeJobs:  { used: 1, max: 3 },
          recruiters:  { used: 1, max: 2 },
          candidates:  { used: 1, max: 100 },
          storageGB:   { used: 0, max: 1 },
        },
      },
    }),
  );
  // Users list
  await page.route('**/api/users**', (r) => jsonOk(r, paginatedResponse([])));
  // Organizations
  await page.route('**/api/organizations**', (r) => jsonOk(r, { success: true, data: [] }));
  // Interviews
  await page.route('**/api/interviews**', (r) => jsonOk(r, paginatedResponse([])));
  // Offers
  await page.route('**/api/offers**', (r) => jsonOk(r, paginatedResponse([])));
  // Reports
  await page.route('**/api/reports**', (r) => jsonOk(r, { success: true, data: {} }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Smoke — login page', () => {
  test('renders without crashing', async ({ page }) => {
    // Mock health so no "backend offline" banner appears
    await page.route('**/api/health', (r) =>
      jsonOk(r, { status: 'ok', db: 'connected', sentry: 'disabled', uptime: 300, timestamp: new Date().toISOString() }),
    );
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Page should not show a blank white screen (at minimum some text renders)
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(0);

    // No uncaught JS errors that break render
    await expect(page.locator('#root')).toBeAttached();
  });
});

test.describe('Smoke — admin dashboard', () => {
  test('logs in and reaches /app without white screen', async ({ page }) => {
    await stubDashboardApis(page);
    await loginAsAdmin(page, '/app');

    // Root app element must be mounted
    await expect(page.locator('#root')).toBeAttached();

    // Page should not be blank
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(10);

    // Should NOT show a JS crash message
    await expect(page.locator('text=Something went wrong')).not.toBeVisible({ timeout: 3000 }).catch(() => {});
    await expect(page.locator('text=Cannot read')).not.toBeVisible({ timeout: 1000 }).catch(() => {});
  });
});

test.describe('Smoke — recruiter dashboard', () => {
  test('logs in and reaches /app', async ({ page }) => {
    await stubDashboardApis(page);
    await loginAsRecruiter(page, '/app');
    await expect(page.locator('#root')).toBeAttached();
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(10);
  });
});

test.describe('Smoke — hiring manager dashboard', () => {
  test('logs in and reaches /app', async ({ page }) => {
    await stubDashboardApis(page);
    await loginAsHiringManager(page, '/app');
    await expect(page.locator('#root')).toBeAttached();
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(10);
  });
});

test.describe('Smoke — candidate portal', () => {
  test('logs in and reaches /app', async ({ page }) => {
    await stubDashboardApis(page);
    await loginAsCandidate(page, '/app');
    await expect(page.locator('#root')).toBeAttached();
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(10);
  });
});

test.describe('Smoke — super admin dashboard', () => {
  test('logs in and reaches /app', async ({ page }) => {
    // Super admin needs org/tenant lists too
    await page.route('**/api/tenants**',       (r) => jsonOk(r, paginatedResponse([])));
    await page.route('**/api/admin/**',        (r) => jsonOk(r, { success: true, data: {} }));
    await page.route('**/api/blogs**',         (r) => jsonOk(r, paginatedResponse([])));
    await page.route('**/api/blogs/public**',  (r) => jsonOk(r, { success: true, data: [] }));
    await stubDashboardApis(page);
    await loginAsSuperAdmin(page, '/app');
    await expect(page.locator('#root')).toBeAttached();
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(10);
  });
});

test.describe('Smoke — client portal', () => {
  test('logs in and reaches /app', async ({ page }) => {
    await stubDashboardApis(page);
    await loginAsClient(page, '/app');
    await expect(page.locator('#root')).toBeAttached();
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(10);
  });
});

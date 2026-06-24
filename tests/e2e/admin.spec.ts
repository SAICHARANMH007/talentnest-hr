/**
 * Group 6: Admin authenticated pages
 *
 * Covers /app/analytics, /app/insights, /app/jobs, /app/job-approvals,
 * /app/org-settings, /app/billing, /app/recruiters, /app/candidates,
 * /app/hiring-managers, /app/pipeline, /app/nps-dashboard, /app/reviews,
 * /app/referrals, /app/talent-pool, /app/interview-kits
 */

import { test, expect, Page } from '@playwright/test';
import {
  loginAsAdmin,
  jsonOk,
  mockJob,
  mockCandidate,
  paginatedResponse,
  USERS,
} from './helpers/auth';

// ── helper ────────────────────────────────────────────────────────────────────

async function gotoAsAdmin(page: Page, path: string) {
  await loginAsAdmin(page, path);
  await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
  await page.waitForSelector('#root > *', { timeout: 50000 });
}

// ── 1. Analytics ──────────────────────────────────────────────────────────────

test.describe('Admin: Analytics', () => {
  test('renders /app/analytics without crash', async ({ page }) => {
    await gotoAsAdmin(page, '/app/analytics');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });
});

// ── 2. Insights ───────────────────────────────────────────────────────────────

test.describe('Admin: Insights', () => {
  test('renders /app/insights without crash', async ({ page }) => {
    await gotoAsAdmin(page, '/app/insights');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 3. Jobs (admin view) ──────────────────────────────────────────────────────

test.describe('Admin: Jobs', () => {
  test('renders /app/jobs without crash', async ({ page }) => {
    await loginAsAdmin(page, '/app/jobs');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/jobs**', (r) =>
      jsonOk(r, paginatedResponse([mockJob()])),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
  });

  test('renders /app/job-approvals without crash', async ({ page }) => {
    await gotoAsAdmin(page, '/app/job-approvals');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 4. Org Settings ───────────────────────────────────────────────────────────

test.describe('Admin: Org Settings', () => {
  test('renders /app/org-settings without crash', async ({ page }) => {
    await loginAsAdmin(page, '/app/org-settings');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/orgs/**', (r) =>
      jsonOk(r, { success: true, data: { name: 'AcmeTech', plan: 'starter', teamSize: '10-50' } }),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });
});

// ── 5. Billing ────────────────────────────────────────────────────────────────

test.describe('Admin: Billing', () => {
  test('renders /app/billing without crash', async ({ page }) => {
    await loginAsAdmin(page, '/app/billing');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/billing/**', (r) =>
      jsonOk(r, { success: true, data: { plan: 'starter', seats: 5 } }),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 6. User Management ────────────────────────────────────────────────────────

test.describe('Admin: User Management', () => {
  test('renders /app/recruiters without crash', async ({ page }) => {
    await loginAsAdmin(page, '/app/recruiters');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/users**', (r) =>
      jsonOk(r, paginatedResponse([USERS.recruiter])),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
  });

  test('renders /app/candidates (admin view) without crash', async ({ page }) => {
    await loginAsAdmin(page, '/app/candidates');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/candidates**', (r) =>
      jsonOk(r, paginatedResponse([mockCandidate()])),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
  });

  test('renders /app/hiring-managers without crash', async ({ page }) => {
    await gotoAsAdmin(page, '/app/hiring-managers');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 7. Pipeline ───────────────────────────────────────────────────────────────

test.describe('Admin: Pipeline', () => {
  test('renders /app/pipeline without crash', async ({ page }) => {
    await loginAsAdmin(page, '/app/pipeline');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/jobs**', (r) =>
      jsonOk(r, paginatedResponse([mockJob()])),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 8. NPS Dashboard ─────────────────────────────────────────────────────────

test.describe('Admin: NPS Dashboard', () => {
  test('renders /app/nps-dashboard without crash', async ({ page }) => {
    await gotoAsAdmin(page, '/app/nps-dashboard');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 9. Reviews & Referrals ────────────────────────────────────────────────────

test.describe('Admin: Reviews & Referrals', () => {
  test('renders /app/reviews without crash', async ({ page }) => {
    await gotoAsAdmin(page, '/app/reviews');
    await expect(page.locator('#root')).toBeAttached();
  });

  test('renders /app/referrals without crash', async ({ page }) => {
    await gotoAsAdmin(page, '/app/referrals');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 10. Interview Kits & Onboarding ──────────────────────────────────────────

test.describe('Admin: Interview Kits', () => {
  test('renders /app/interview-kits without crash', async ({ page }) => {
    await gotoAsAdmin(page, '/app/interview-kits');
    await expect(page.locator('#root')).toBeAttached();
  });
});

test.describe('Admin: Onboarding', () => {
  test('renders /app/onboarding (admin view) without crash', async ({ page }) => {
    await gotoAsAdmin(page, '/app/onboarding');
    await expect(page.locator('#root')).toBeAttached();
  });
});

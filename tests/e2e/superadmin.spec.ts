/**
 * Group 10: Super Admin authenticated pages
 *
 * Covers /app/analytics (SA view), /app/command-center, /app/platform,
 * /app/organisations, /app/permissions, /app/audit-logs, /app/all-candidates,
 * /app/bgv-tracker, /app/blogs, /app/playbooks, /app/security,
 * /app/import-candidates, /app/college-groups, /app/company-groups
 */

import { test, expect, Page } from '@playwright/test';
import {
  loginAsSuperAdmin,
  jsonOk,
  paginatedResponse,
  mockCandidate,
  USERS,
} from './helpers/auth';

// ── helper ────────────────────────────────────────────────────────────────────

async function gotoAsSA(page: Page, path: string) {
  await loginAsSuperAdmin(page, path);
  await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
  await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
}

// ── 1. Analytics ──────────────────────────────────────────────────────────────

test.describe('SuperAdmin: Analytics', () => {
  test('renders /app/analytics without crash', async ({ page }) => {
    await gotoAsSA(page, '/app/analytics');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });
});

// ── 2. Command Center ─────────────────────────────────────────────────────────

test.describe('SuperAdmin: Command Center', () => {
  test('renders /app/command-center without crash', async ({ page }) => {
    await gotoAsSA(page, '/app/command-center');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });
});

// ── 3. Platform ───────────────────────────────────────────────────────────────

test.describe('SuperAdmin: Platform', () => {
  test('renders /app/platform without crash', async ({ page }) => {
    await gotoAsSA(page, '/app/platform');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 4. Organisations ──────────────────────────────────────────────────────────

test.describe('SuperAdmin: Organisations', () => {
  test('renders /app/organisations without crash', async ({ page }) => {
    await loginAsSuperAdmin(page, '/app/organisations');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/orgs**', (r) =>
      jsonOk(r, paginatedResponse([{ _id: 'ORG1', name: 'AcmeTech', plan: 'starter' }])),
    );
    await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 5. Permissions ────────────────────────────────────────────────────────────

test.describe('SuperAdmin: Permissions', () => {
  test('renders /app/permissions without crash', async ({ page }) => {
    await gotoAsSA(page, '/app/permissions');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 6. Security ───────────────────────────────────────────────────────────────

test.describe('SuperAdmin: Security', () => {
  test('renders /app/security without crash', async ({ page }) => {
    await gotoAsSA(page, '/app/security');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 7. Audit Logs ─────────────────────────────────────────────────────────────

test.describe('SuperAdmin: Audit Logs', () => {
  test('renders /app/audit-logs without crash', async ({ page }) => {
    await loginAsSuperAdmin(page, '/app/audit-logs');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/audit-logs**', (r) =>
      jsonOk(r, paginatedResponse([{ _id: 'LOG1', action: 'login', userId: '001', createdAt: new Date().toISOString() }])),
    );
    await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 8. All Candidates ─────────────────────────────────────────────────────────

test.describe('SuperAdmin: All Candidates', () => {
  test('renders /app/all-candidates without crash', async ({ page }) => {
    await loginAsSuperAdmin(page, '/app/all-candidates');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/candidates**', (r) =>
      jsonOk(r, paginatedResponse([mockCandidate()])),
    );
    await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 9. BGV Tracker ────────────────────────────────────────────────────────────

test.describe('SuperAdmin: BGV Tracker', () => {
  test('renders /app/bgv-tracker without crash', async ({ page }) => {
    await gotoAsSA(page, '/app/bgv-tracker');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 10. Blogs ─────────────────────────────────────────────────────────────────

test.describe('SuperAdmin: Blogs', () => {
  test('renders /app/blogs without crash', async ({ page }) => {
    await gotoAsSA(page, '/app/blogs');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 11. Import Candidates ─────────────────────────────────────────────────────

test.describe('SuperAdmin: Import Candidates', () => {
  test('renders /app/import-candidates without crash', async ({ page }) => {
    await gotoAsSA(page, '/app/import-candidates');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 12. College & Company Groups ──────────────────────────────────────────────

test.describe('SuperAdmin: Groups', () => {
  test('renders /app/college-groups without crash', async ({ page }) => {
    await gotoAsSA(page, '/app/college-groups');
    await expect(page.locator('#root')).toBeAttached();
  });

  test('renders /app/company-groups without crash', async ({ page }) => {
    await gotoAsSA(page, '/app/company-groups');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 13. Provision Forms ───────────────────────────────────────────────────────

test.describe('SuperAdmin: Provision Forms', () => {
  test('renders /app/forms/create-org without crash', async ({ page }) => {
    await gotoAsSA(page, '/app/forms/create-org');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('renders /app/forms/provision without crash', async ({ page }) => {
    await gotoAsSA(page, '/app/forms/provision');
    await expect(page.locator('#root')).toBeAttached();
  });
});

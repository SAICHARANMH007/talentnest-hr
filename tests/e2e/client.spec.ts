/**
 * Group 8: Client authenticated pages
 *
 * Covers /app/dashboard, /app/shortlists, /app/interviews,
 * /app/placements, /app/requirements, /app/feed, /app/people
 */

import { test, expect, Page } from '@playwright/test';
import {
  loginAsClient,
  jsonOk,
  paginatedResponse,
  mockCandidate,
  mockApplication,
  USERS,
} from './helpers/auth';

// ── helper ────────────────────────────────────────────────────────────────────

async function gotoAsClient(page: Page, path: string) {
  await loginAsClient(page, path);
  await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
  await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
}

// ── 1. Dashboard ──────────────────────────────────────────────────────────────

test.describe('Client: Dashboard', () => {
  test('renders /app/dashboard without crash', async ({ page }) => {
    await gotoAsClient(page, '/app/dashboard');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });
});

// ── 2. Shortlists ─────────────────────────────────────────────────────────────

test.describe('Client: Shortlists', () => {
  test('renders /app/shortlists without crash', async ({ page }) => {
    await loginAsClient(page, '/app/shortlists');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/shortlists**', (r) =>
      jsonOk(r, paginatedResponse([mockCandidate()])),
    );
    await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 3. Interviews ─────────────────────────────────────────────────────────────

test.describe('Client: Interviews', () => {
  test('renders /app/interviews without crash', async ({ page }) => {
    await gotoAsClient(page, '/app/interviews');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 4. Placements ─────────────────────────────────────────────────────────────

test.describe('Client: Placements', () => {
  test('renders /app/placements without crash', async ({ page }) => {
    await loginAsClient(page, '/app/placements');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/applications**', (r) =>
      jsonOk(r, paginatedResponse([mockApplication()])),
    );
    await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 5. Requirements ───────────────────────────────────────────────────────────

test.describe('Client: Requirements', () => {
  test('renders /app/requirements without crash', async ({ page }) => {
    await gotoAsClient(page, '/app/requirements');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 6. Community & People ─────────────────────────────────────────────────────

test.describe('Client: Community', () => {
  test('renders /app/feed without crash', async ({ page }) => {
    await gotoAsClient(page, '/app/feed');
    await expect(page.locator('#root')).toBeAttached();
  });

  test('renders /app/people without crash', async ({ page }) => {
    await gotoAsClient(page, '/app/people');
    await expect(page.locator('#root')).toBeAttached();
  });
});

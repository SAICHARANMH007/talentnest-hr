/**
 * Group 7: Hiring Manager authenticated pages
 *
 * Covers /app/dashboard, /app/my-team, /app/pipeline, /app/interviews,
 * /app/job-requirements, /app/feed, /app/people, /app/clients
 */

import { test, expect, Page } from '@playwright/test';
import {
  loginAsHiringManager,
  jsonOk,
  mockJob,
  mockApplication,
  paginatedResponse,
  USERS,
} from './helpers/auth';

// ── helper ────────────────────────────────────────────────────────────────────

async function gotoAsHM(page: Page, path: string) {
  await loginAsHiringManager(page, path);
  await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
  await page.waitForSelector('#root > *', { timeout: 50000 });
}

// ── 1. Dashboard ──────────────────────────────────────────────────────────────

test.describe('HiringManager: Dashboard', () => {
  test('renders /app/dashboard without crash', async ({ page }) => {
    await gotoAsHM(page, '/app/dashboard');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });
});

// ── 2. My Team ────────────────────────────────────────────────────────────────

test.describe('HiringManager: My Team', () => {
  test('renders /app/my-team without crash', async ({ page }) => {
    await loginAsHiringManager(page, '/app/my-team');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/users**', (r) =>
      jsonOk(r, { success: true, data: [] }),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 3. Pipeline ───────────────────────────────────────────────────────────────

test.describe('HiringManager: Pipeline', () => {
  test('renders /app/pipeline without crash', async ({ page }) => {
    await loginAsHiringManager(page, '/app/pipeline');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/jobs**', (r) =>
      jsonOk(r, paginatedResponse([mockJob()])),
    );
    await page.route('**/api/applications**', (r) =>
      jsonOk(r, paginatedResponse([mockApplication()])),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 4. Interviews ─────────────────────────────────────────────────────────────

test.describe('HiringManager: Interviews', () => {
  test('renders /app/interviews without crash', async ({ page }) => {
    await gotoAsHM(page, '/app/interviews');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 5. Job Requirements ───────────────────────────────────────────────────────

test.describe('HiringManager: Job Requirements', () => {
  test('renders /app/job-requirements without crash', async ({ page }) => {
    await gotoAsHM(page, '/app/job-requirements');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 6. Community Feed ─────────────────────────────────────────────────────────

test.describe('HiringManager: Community Feed', () => {
  test('renders /app/feed without crash', async ({ page }) => {
    await gotoAsHM(page, '/app/feed');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 7. People Page ────────────────────────────────────────────────────────────

test.describe('HiringManager: People', () => {
  test('renders /app/people without crash', async ({ page }) => {
    await gotoAsHM(page, '/app/people');
    await expect(page.locator('#root')).toBeAttached();
  });
});

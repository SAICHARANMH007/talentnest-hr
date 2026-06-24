/**
 * Group 3: Candidate authenticated pages
 *
 * Covers /app/dashboard, /app/applications, /app/interviews, /app/smart-match,
 * /app/career-journey, /app/opportunities, /app/onboarding, /app/job-alerts,
 * /app/refer-earn, /app/feed, /app/profile (candidate view)
 */

import { test, expect, Page } from '@playwright/test';
import {
  loginAsCandidate,
  jsonOk,
  mockJob,
  mockApplication,
  paginatedResponse,
  USERS,
} from './helpers/auth';

// ── helper ────────────────────────────────────────────────────────────────────

async function gotoAs(page: Page, path: string) {
  // loginAs must be called FIRST — it registers auth routes and navigates.
  // Adding the catch-all before loginAs interferes with Playwright's LIFO route ordering.
  await loginAsCandidate(page, path);
  await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
  await page.waitForSelector('#root > *', { timeout: 50000 });
}

// ── 1. Dashboard ──────────────────────────────────────────────────────────────

test.describe('Candidate: Dashboard', () => {
  test('renders /app/dashboard without crash', async ({ page }) => {
    await gotoAs(page, '/app/dashboard');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('dashboard has some visible content', async ({ page }) => {
    await gotoAs(page, '/app/dashboard');
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(10);
  });
});

// ── 2. Applications ───────────────────────────────────────────────────────────

test.describe('Candidate: Applications', () => {
  test('renders /app/applications without crash', async ({ page }) => {
    await loginAsCandidate(page, '/app/applications');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/applications**', (r) =>
      jsonOk(r, paginatedResponse([mockApplication()])),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });
});

// ── 3. Interviews ─────────────────────────────────────────────────────────────

test.describe('Candidate: Interviews', () => {
  test('renders /app/interviews without crash', async ({ page }) => {
    await gotoAs(page, '/app/interviews');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 4. Smart Match ────────────────────────────────────────────────────────────

test.describe('Candidate: Smart Match', () => {
  test('renders /app/smart-match without crash', async ({ page }) => {
    await loginAsCandidate(page, '/app/smart-match');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/jobs/public**', (r) =>
      jsonOk(r, paginatedResponse([mockJob()])),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 5. Career Journey ─────────────────────────────────────────────────────────

test.describe('Candidate: Career Journey', () => {
  test('renders /app/career-journey without crash', async ({ page }) => {
    await gotoAs(page, '/app/career-journey');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 6. Opportunities ─────────────────────────────────────────────────────────

test.describe('Candidate: Opportunities', () => {
  test('renders /app/opportunities without crash', async ({ page }) => {
    await loginAsCandidate(page, '/app/opportunities');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/jobs/public**', (r) =>
      jsonOk(r, paginatedResponse([mockJob()])),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 7. Onboarding ─────────────────────────────────────────────────────────────

test.describe('Candidate: Onboarding', () => {
  test('renders /app/onboarding without crash', async ({ page }) => {
    await gotoAs(page, '/app/onboarding');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(0);
  });
});

// ── 8. Job Alerts ─────────────────────────────────────────────────────────────

test.describe('Candidate: Job Alerts', () => {
  test('renders /app/job-alerts without crash', async ({ page }) => {
    await gotoAs(page, '/app/job-alerts');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(0);
  });
});

// ── 9. Refer & Earn ───────────────────────────────────────────────────────────

test.describe('Candidate: Refer & Earn', () => {
  test('renders /app/refer-earn without crash', async ({ page }) => {
    await gotoAs(page, '/app/refer-earn');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 10. Community Feed ────────────────────────────────────────────────────────

test.describe('Candidate: Community Feed', () => {
  test('renders /app/feed without crash', async ({ page }) => {
    await loginAsCandidate(page, '/app/feed');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/community/**', (r) =>
      jsonOk(r, { success: true, data: [], total: 0 }),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 11. Candidate Profile ─────────────────────────────────────────────────────

test.describe('Candidate: Profile Page', () => {
  test('renders /app/profile without crash', async ({ page }) => {
    await loginAsCandidate(page, '/app/profile');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/users/**', (r) =>
      jsonOk(r, { success: true, data: USERS.candidate }),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });
});

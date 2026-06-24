/**
 * Group 4: Recruiter authenticated pages
 *
 * Covers /app/dashboard, /app/jobs, /app/candidates, /app/pipeline,
 * /app/assessments, /app/interviews, /app/offers, /app/talent-pool,
 * /app/my-performance, /app/smart-match, /app/forms/invite
 */

import { test, expect, Page } from '@playwright/test';
import {
  loginAsRecruiter,
  jsonOk,
  mockJob,
  mockCandidate,
  mockApplication,
  paginatedResponse,
  USERS,
} from './helpers/auth';

// ── helper ────────────────────────────────────────────────────────────────────

async function gotoAsRecruiter(page: Page, path: string) {
  await loginAsRecruiter(page, path);
  await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
  await page.waitForSelector('#root > *', { timeout: 50000 });
}

// ── 1. Dashboard ──────────────────────────────────────────────────────────────

test.describe('Recruiter: Dashboard', () => {
  test('renders /app/dashboard without crash', async ({ page }) => {
    await gotoAsRecruiter(page, '/app/dashboard');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });
});

// ── 2. Jobs ───────────────────────────────────────────────────────────────────

test.describe('Recruiter: Jobs', () => {
  test('renders /app/jobs without crash', async ({ page }) => {
    await loginAsRecruiter(page, '/app/jobs');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/jobs**', (r) =>
      jsonOk(r, paginatedResponse([mockJob()])),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('Create Job page renders', async ({ page }) => {
    await gotoAsRecruiter(page, '/app/jobs/create');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(0);
  });
});

// ── 3. Candidates ─────────────────────────────────────────────────────────────

test.describe('Recruiter: Candidates', () => {
  test('renders /app/candidates without crash', async ({ page }) => {
    await loginAsRecruiter(page, '/app/candidates');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/candidates**', (r) =>
      jsonOk(r, paginatedResponse([mockCandidate()])),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 4. Pipeline ───────────────────────────────────────────────────────────────

test.describe('Recruiter: Pipeline', () => {
  test('renders /app/pipeline without crash', async ({ page }) => {
    await loginAsRecruiter(page, '/app/pipeline');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/applications**', (r) =>
      jsonOk(r, paginatedResponse([mockApplication()])),
    );
    await page.route('**/api/jobs**', (r) =>
      jsonOk(r, paginatedResponse([mockJob()])),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 5. Assessments ────────────────────────────────────────────────────────────

test.describe('Recruiter: Assessments', () => {
  test('renders /app/assessments without crash', async ({ page }) => {
    await gotoAsRecruiter(page, '/app/assessments');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 6. Interviews ─────────────────────────────────────────────────────────────

test.describe('Recruiter: Interviews', () => {
  test('renders /app/interviews without crash', async ({ page }) => {
    await gotoAsRecruiter(page, '/app/interviews');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 7. Offers ─────────────────────────────────────────────────────────────────

test.describe('Recruiter: Offers', () => {
  test('renders /app/offers without crash', async ({ page }) => {
    await gotoAsRecruiter(page, '/app/offers');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 8. Talent Pool ───────────────────────────────────────────────────────────

test.describe('Recruiter: Talent Pool', () => {
  test('renders /app/talent-pool without crash', async ({ page }) => {
    await gotoAsRecruiter(page, '/app/talent-pool');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 9. My Performance ─────────────────────────────────────────────────────────

test.describe('Recruiter: My Performance', () => {
  test('renders /app/my-performance without crash', async ({ page }) => {
    await gotoAsRecruiter(page, '/app/my-performance');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 10. Smart Match ───────────────────────────────────────────────────────────

test.describe('Recruiter: Smart Match', () => {
  test('renders /app/smart-match without crash', async ({ page }) => {
    await loginAsRecruiter(page, '/app/smart-match');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/jobs**', (r) =>
      jsonOk(r, paginatedResponse([mockJob()])),
    );
    await page.route('**/api/candidates**', (r) =>
      jsonOk(r, paginatedResponse([mockCandidate()])),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 11. Invite Form ───────────────────────────────────────────────────────────

test.describe('Recruiter: Forms', () => {
  test('renders /app/forms/invite without crash', async ({ page }) => {
    await loginAsRecruiter(page, '/app/forms/invite');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/jobs**', (r) =>
      jsonOk(r, paginatedResponse([mockJob()])),
    );
    await page.route('**/api/candidates**', (r) =>
      jsonOk(r, paginatedResponse([mockCandidate()])),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
  });

  test('renders /app/forms/offer without crash', async ({ page }) => {
    await gotoAsRecruiter(page, '/app/forms/offer');
    await expect(page.locator('#root')).toBeAttached();
  });
});

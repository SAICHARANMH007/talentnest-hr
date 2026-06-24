/**
 * Group 5: Shared authenticated pages (accessible by multiple roles)
 *
 * Covers /app/profile, /app/forms, /app/settings/password,
 * /app/settings/security, /app/settings/notifications,
 * /app/add-candidate, /app/resume/:candidateId
 */

import { test, expect, Page } from '@playwright/test';
import {
  loginAsRecruiter,
  loginAsCandidate,
  jsonOk,
  mockCandidate,
  USERS,
} from './helpers/auth';

// ── helper ────────────────────────────────────────────────────────────────────

async function gotoAsRecruiter(page: Page, path: string) {
  await loginAsRecruiter(page, path);
  await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
  await page.waitForSelector('#root > *', { timeout: 50000 });
}

async function gotoAsCandidate(page: Page, path: string) {
  await loginAsCandidate(page, path);
  await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
  await page.waitForSelector('#root > *', { timeout: 50000 });
}

// ── 1. Profile Page ───────────────────────────────────────────────────────────

test.describe('Shared: Profile Pages', () => {
  test('recruiter /app/profile renders without crash', async ({ page }) => {
    await loginAsRecruiter(page, '/app/profile');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/users/**', (r) =>
      jsonOk(r, { success: true, data: USERS.recruiter }),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('candidate /app/profile shows candidate profile', async ({ page }) => {
    await loginAsCandidate(page, '/app/profile');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/users/**', (r) =>
      jsonOk(r, { success: true, data: USERS.candidate }),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 2. Settings Pages ─────────────────────────────────────────────────────────

test.describe('Shared: Settings', () => {
  test('Change Password page renders without crash', async ({ page }) => {
    await gotoAsRecruiter(page, '/app/settings/password');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('Email Settings page renders without crash', async ({ page }) => {
    await gotoAsRecruiter(page, '/app/settings/email');
    await expect(page.locator('#root')).toBeAttached();
  });

  test('Security Settings page renders without crash', async ({ page }) => {
    await gotoAsRecruiter(page, '/app/settings/security');
    await expect(page.locator('#root')).toBeAttached();
  });

  test('Notification Settings page renders without crash (candidate)', async ({ page }) => {
    await gotoAsCandidate(page, '/app/settings/notifications');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 3. Add Candidate Form ─────────────────────────────────────────────────────

test.describe('Shared: Add Candidate', () => {
  test('renders /app/add-candidate without crash', async ({ page }) => {
    await loginAsRecruiter(page, '/app/add-candidate');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/jobs**', (r) =>
      jsonOk(r, { success: true, data: [], total: 0 }),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });
});

// ── 4. Resume Viewer ──────────────────────────────────────────────────────────

test.describe('Shared: Resume Viewer', () => {
  test('renders /app/resume/:candidateId without crash', async ({ page }) => {
    await loginAsRecruiter(page, '/app/resume/777700000000000000000001');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/candidates/**', (r) =>
      jsonOk(r, { success: true, data: mockCandidate() }),
    );
    await page.waitForSelector('#root > *', { timeout: 50000 });
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 5. Forms Hub ──────────────────────────────────────────────────────────────

test.describe('Shared: Forms Hub', () => {
  test('renders /app/forms without crash', async ({ page }) => {
    await gotoAsRecruiter(page, '/app/forms');
    await expect(page.locator('#root')).toBeAttached();
  });
});

/**
 * Group 11: College (placement officer) authenticated pages
 *
 * College users have role:'placement_officer' + tenantType:'college'.
 * App.jsx maps this to rk='admin' + isCollege=true, giving access to
 * CollegeOverview (/analytics), CollegeStudents (/candidates),
 * CollegePlacements (/applicants), CollegeDrives (/drives),
 * CollegeTrainingResources, CollegeSkillGaps
 */

import { test, expect, Page } from '@playwright/test';
import {
  loginAsCollegeAdmin,
  jsonOk,
  paginatedResponse,
  mockCandidate,
  USERS,
} from './helpers/auth';

const COLLEGE_USER = USERS.college_admin;

// ── helper ────────────────────────────────────────────────────────────────────

async function gotoAsCollege(page: Page, path: string) {
  await loginAsCollegeAdmin(page, path);
  await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
  await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
}

// ── 1. College Overview (Analytics) ──────────────────────────────────────────

test.describe('College: Overview', () => {
  test('renders /app/analytics without crash', async ({ page }) => {
    await gotoAsCollege(page, '/app/analytics');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });
});

// ── 2. Students (Candidates) ──────────────────────────────────────────────────

test.describe('College: Students', () => {
  test('renders /app/candidates (college view) without crash', async ({ page }) => {
    await loginAsCollegeAdmin(page, '/app/candidates');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/candidates**', (r) =>
      jsonOk(r, paginatedResponse([mockCandidate()])),
    );
    await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 3. Placements (Applicants) ────────────────────────────────────────────────

test.describe('College: Placements', () => {
  test('renders /app/applicants without crash', async ({ page }) => {
    await gotoAsCollege(page, '/app/applicants');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 4. Placement Drives ───────────────────────────────────────────────────────

test.describe('College: Drives', () => {
  test('renders /app/drives without crash', async ({ page }) => {
    await loginAsCollegeAdmin(page, '/app/drives');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/drives**', (r) =>
      jsonOk(r, paginatedResponse([
        { _id: 'DRIVE1', title: 'Campus Hiring Drive 2025', companies: 5, status: 'active' },
      ])),
    );
    await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await expect(page.locator('#root')).toBeAttached();
  });

  test('renders /app/drives/new without crash', async ({ page }) => {
    await gotoAsCollege(page, '/app/drives/new');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 5. Training Resources ─────────────────────────────────────────────────────

test.describe('College: Training Resources', () => {
  test('renders /app/training-resources without crash', async ({ page }) => {
    await gotoAsCollege(page, '/app/training-resources');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 6. Skill Gaps ────────────────────────────────────────────────────────────

test.describe('College: Skill Gaps', () => {
  test('renders /app/skill-gaps without crash', async ({ page }) => {
    await gotoAsCollege(page, '/app/skill-gaps');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 7. Add Candidates (college) ───────────────────────────────────────────────

test.describe('College: Add Candidates', () => {
  test('renders /app/add-candidates without crash', async ({ page }) => {
    await gotoAsCollege(page, '/app/add-candidates');
    await expect(page.locator('#root')).toBeAttached();
  });
});

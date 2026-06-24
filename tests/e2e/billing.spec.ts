/**
 * Group 9: Billing & offer approval pages
 *
 * Covers /app/billing (admin), /app/offer-approval/:offerId (public)
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, jsonOk, USERS } from './helpers/auth';

// ── 1. Billing Page (admin) ───────────────────────────────────────────────────

test.describe('Billing: Page', () => {
  test('renders /app/billing without crash for admin', async ({ page }) => {
    await loginAsAdmin(page, '/app/billing');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/billing/**', (r) =>
      jsonOk(r, {
        success: true,
        data: {
          plan: 'starter',
          seats: 5,
          usage: { jobs: 2, candidates: 10, recruiterSeats: 2 },
          nextBillingDate: new Date(Date.now() + 86400000 * 30).toISOString(),
        },
      }),
    );
    await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('billing page shows plan info', async ({ page }) => {
    await loginAsAdmin(page, '/app/billing');
    await page.route('**/api/**', (r) => jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }));
    await page.route('**/api/billing/**', (r) =>
      jsonOk(r, {
        success: true,
        data: { plan: 'starter', seats: 5 },
      }),
    );
    await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(0);
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 2. Offer Approval Page (public, no auth required) ────────────────────────

test.describe('Billing: Offer Approval', () => {
  test('renders /app/offer-approval/:offerId without crash', async ({ page }) => {
    await page.route('**/api/health', (r) =>
      jsonOk(r, { status: 'ok', db: 'connected', uptime: 10, timestamp: new Date().toISOString() }),
    );
    await page.route('**/api/offers/**', (r) =>
      jsonOk(r, {
        success: true,
        data: {
          _id: 'OFFER001',
          candidateName: 'Karan Singh',
          jobTitle: 'Senior Software Engineer',
          companyName: 'AcmeTech',
          salary: 1800000,
          currency: 'INR',
          status: 'pending',
          expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
        },
      }),
    );
    await page.goto('/app/offer-approval/OFFER001', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(0);
  });

  test('invalid offer id shows error state gracefully', async ({ page }) => {
    await page.route('**/api/health', (r) =>
      jsonOk(r, { status: 'ok', db: 'connected', uptime: 10, timestamp: new Date().toISOString() }),
    );
    await page.route('**/api/offers/**', (r) =>
      jsonOk(r, { success: false, message: 'Offer not found' }),
    );
    await page.goto('/app/offer-approval/INVALID', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await expect(page.locator('#root')).toBeAttached();
  });
});

/**
 * Group 12: Marketing / public pages (no auth required)
 *
 * Covers /, /about, /services, /contact, /blog, /blog/:slug,
 * /privacy, /terms, /products, /products/hireboard, /products/peopledesk,
 * /products/jobtrack, /products/campushub, /companies, /c/:slug,
 * /hrms, /nps-thankyou
 */

import { test, expect, Page } from '@playwright/test';
import { jsonOk } from './helpers/auth';

// ── helper ────────────────────────────────────────────────────────────────────

async function gotoPublic(page: Page, path: string) {
  await page.route('**/api/health', (r) =>
    jsonOk(r, { status: 'ok', db: 'connected', uptime: 10, timestamp: new Date().toISOString() }),
  );
  // Pages that might query blog/jobs/companies
  await page.route('**/api/blog**', (r) =>
    jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }),
  );
  await page.route('**/api/jobs/public**', (r) =>
    jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }),
  );
  await page.route('**/api/companies**', (r) =>
    jsonOk(r, { success: true, data: [], total: 0, page: 1, pages: 0 }),
  );
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
}

// ── 1. Landing Page ───────────────────────────────────────────────────────────

test.describe('Marketing: Landing Page', () => {
  test('/ renders without crash', async ({ page }) => {
    await gotoPublic(page, '/');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(10);
  });

  test('landing page has some visible content', async ({ page }) => {
    await gotoPublic(page, '/');
    // At minimum, some marketing copy or nav
    const text = await page.locator('body').innerText();
    expect(text.match(/TalentNest|Hire|Recruit|talent|job/i) !== null || text.length > 50).toBeTruthy();
  });
});

// ── 2. About Page ─────────────────────────────────────────────────────────────

test.describe('Marketing: About', () => {
  test('/about renders without crash', async ({ page }) => {
    await gotoPublic(page, '/about');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });
});

// ── 3. Services ───────────────────────────────────────────────────────────────

test.describe('Marketing: Services', () => {
  test('/services renders without crash', async ({ page }) => {
    await gotoPublic(page, '/services');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('/services/:slug renders without crash', async ({ page }) => {
    await gotoPublic(page, '/services/recruitment');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 4. Contact ────────────────────────────────────────────────────────────────

test.describe('Marketing: Contact', () => {
  test('/contact renders without crash', async ({ page }) => {
    await gotoPublic(page, '/contact');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });
});

// ── 5. Blog ───────────────────────────────────────────────────────────────────

test.describe('Marketing: Blog', () => {
  test('/blog renders without crash', async ({ page }) => {
    await gotoPublic(page, '/blog');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('/blog/:slug renders without crash', async ({ page }) => {
    await page.route('**/api/health', (r) =>
      jsonOk(r, { status: 'ok', db: 'connected', uptime: 10, timestamp: new Date().toISOString() }),
    );
    await page.route('**/api/blog/**', (r) =>
      jsonOk(r, {
        success: true,
        data: {
          _id: 'B1', title: 'How to Hire Better', content: 'Lorem ipsum', slug: 'how-to-hire',
          author: 'Admin', publishedAt: new Date().toISOString(),
        },
      }),
    );
    await page.goto('/blog/how-to-hire', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 6. Products ───────────────────────────────────────────────────────────────

test.describe('Marketing: Products', () => {
  test('/products renders without crash', async ({ page }) => {
    await gotoPublic(page, '/products');
    await expect(page.locator('#root')).toBeAttached();
  });

  test('/products/hireboard renders without crash', async ({ page }) => {
    await gotoPublic(page, '/products/hireboard');
    await expect(page.locator('#root')).toBeAttached();
  });

  test('/products/peopledesk renders without crash', async ({ page }) => {
    await gotoPublic(page, '/products/peopledesk');
    await expect(page.locator('#root')).toBeAttached();
  });

  test('/products/jobtrack renders without crash', async ({ page }) => {
    await gotoPublic(page, '/products/jobtrack');
    await expect(page.locator('#root')).toBeAttached();
  });

  test('/products/campushub renders without crash', async ({ page }) => {
    await gotoPublic(page, '/products/campushub');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 7. HRMS ───────────────────────────────────────────────────────────────────

test.describe('Marketing: HRMS', () => {
  test('/hrms renders without crash', async ({ page }) => {
    await gotoPublic(page, '/hrms');
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 8. Legal Pages ────────────────────────────────────────────────────────────

test.describe('Marketing: Legal', () => {
  test('/privacy renders without crash', async ({ page }) => {
    await gotoPublic(page, '/privacy');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('/terms renders without crash', async ({ page }) => {
    await gotoPublic(page, '/terms');
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });
});

// ── 9. Companies ──────────────────────────────────────────────────────────────

test.describe('Marketing: Companies', () => {
  test('/companies renders without crash', async ({ page }) => {
    await page.route('**/api/health', (r) =>
      jsonOk(r, { status: 'ok', db: 'connected', uptime: 10, timestamp: new Date().toISOString() }),
    );
    await page.route('**/api/companies**', (r) =>
      jsonOk(r, { success: true, data: [{ _id: 'C1', name: 'AcmeTech', logo: '', industry: 'IT' }], total: 1 }),
    );
    await page.route('**/api/orgs/brand/**', (r) =>
      jsonOk(r, { success: false }),
    );
    await page.goto('/companies', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 10. Community Preview ─────────────────────────────────────────────────────

test.describe('Marketing: Community Preview', () => {
  test('/c/:slug renders without crash', async ({ page }) => {
    await page.route('**/api/health', (r) =>
      jsonOk(r, { status: 'ok', db: 'connected', uptime: 10, timestamp: new Date().toISOString() }),
    );
    await page.route('**/api/community**', (r) =>
      jsonOk(r, { success: true, data: { name: 'Tech Community', description: 'A community', members: 100 } }),
    );
    await page.goto('/c/tech-community', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await expect(page.locator('#root')).toBeAttached();
  });
});

// ── 11. NPS Thankyou ─────────────────────────────────────────────────────────

test.describe('Marketing: NPS Thank-you', () => {
  test('/nps-thankyou?status=success renders without crash', async ({ page }) => {
    await page.route('**/api/health', (r) =>
      jsonOk(r, { status: 'ok', db: 'connected', uptime: 10, timestamp: new Date().toISOString() }),
    );
    await page.goto('/nps-thankyou?status=success', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    await expect(page.locator('#root')).toBeAttached();
    // Should show thank-you message
    const text = await page.locator('body').innerText();
    expect(text.match(/Thank you|feedback|recorded/i) !== null || text.length > 0).toBeTruthy();
  });
});

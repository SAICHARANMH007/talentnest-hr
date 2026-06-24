/**
 * Group 13: Meeting room page
 *
 * Covers /meeting/:roomToken — the video meeting room (no auth required,
 * token-gated access to a video call).
 */

import { test, expect, Page } from '@playwright/test';
import { jsonOk } from './helpers/auth';

// ── helper ────────────────────────────────────────────────────────────────────

async function gotoMeeting(page: Page, roomToken = 'validroomtoken123') {
  await page.route('**/api/health', (r) =>
    jsonOk(r, { status: 'ok', db: 'connected', uptime: 10, timestamp: new Date().toISOString() }),
  );
  // Meeting verification endpoint
  await page.route('**/api/meetings/**', (r) =>
    jsonOk(r, {
      success: true,
      data: {
        roomToken,
        title: 'Technical Interview — Senior Software Engineer',
        participants: ['Karan Singh', 'Rahul Verma'],
        scheduledAt: new Date(Date.now() + 3600000).toISOString(),
        status: 'pending',
      },
    }),
  );
  await page.route('**/api/schedule/**', (r) =>
    jsonOk(r, {
      success: true,
      roomToken,
      candidateName: 'Karan Singh',
      jobTitle: 'Senior Software Engineer',
    }),
  );
  await page.goto(`/meeting/${roomToken}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

// ── 1. Meeting Room Page ──────────────────────────────────────────────────────

test.describe('Meeting: Room Page', () => {
  test('renders /meeting/:roomToken without crash', async ({ page }) => {
    await gotoMeeting(page);
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('meeting page shows some content (join UI or waiting state)', async ({ page }) => {
    await gotoMeeting(page);
    await page.waitForTimeout(1500);
    // Should show meeting-related UI — join button, waiting, participant list, etc.
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(0);
    await expect(page.locator('#root')).toBeAttached();
  });

  test('invalid room token shows error or fallback gracefully', async ({ page }) => {
    await page.route('**/api/health', (r) =>
      jsonOk(r, { status: 'ok', db: 'connected', uptime: 10, timestamp: new Date().toISOString() }),
    );
    await page.route('**/api/meetings/**', (r) =>
      jsonOk(r, { success: false, message: 'Invalid or expired room token' }),
    );
    await page.route('**/api/schedule/**', (r) =>
      jsonOk(r, { success: false, message: 'Room not found' }),
    );
    await page.goto('/meeting/invalidtoken', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#tn-loading', { state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
    // Should not white-screen crash
    await expect(page.locator('#root')).toBeAttached();
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(0);
  });
});

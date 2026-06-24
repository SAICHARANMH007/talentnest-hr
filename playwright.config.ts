import { defineConfig, devices } from '@playwright/test';

/**
 * TalentNest HR — Playwright E2E Config
 *
 * Browser: system Chromium at /opt/pw-browsers (playwright CDN is blocked).
 * Server:  Vite dev server started automatically before tests run.
 * API:     All /api/* calls are intercepted per-test (no live backend needed).
 *
 * Run all tests:  npm run test:e2e
 * Run one file:   npm run test:e2e -- tests/e2e/auth.spec.ts
 * Run headed:     npm run test:e2e -- --headed
 * Debug:          npm run test:e2e -- --debug
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',

  // Give each test plenty of room; loginAs does 2 navigations and Vite cold-start adds latency
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // Run tests in parallel — each worker gets its own browser context
  fullyParallel: true,
  workers: process.env.CI ? 1 : 2,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],

  use: {
    baseURL: 'http://localhost:5173',
    // Use the system Chromium found at this path
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    headless: true,
    // Capture on failure for debugging
    screenshot: 'only-on-failure',
    video: 'off',
    // Narrow viewport to catch mobile regressions in a second pass
    viewport: { width: 1280, height: 800 },
    // All requests go through the mock — no real network calls
    extraHTTPHeaders: { 'x-e2e-test': '1' },
  },

  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5'],
        executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
      },
    },
  ],

  // Start Vite dev server before any tests run
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
    stdout: 'pipe',
  },
});

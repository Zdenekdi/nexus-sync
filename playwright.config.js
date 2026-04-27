import { defineConfig, devices } from '@playwright/test';

/**
 * Nexus Hub Playwright Configuration
 *
 * Test strategy:
 *  - API tests (rbac.spec.js, sms-relay.spec.js): Hit the LIVE production API directly.
 *    → No dev server needed for these. They run fast (~5-10s).
 *
 *  - E2E browser tests (smoke.spec.js, dashboard.spec.js): Open the local Vite dev server.
 *    → The frontend automatically connects to https://nexus-api.myvnc.com/api (production).
 *    → So browser tests also validate against the LIVE production DB.
 *
 * Run all tests:  npm run test:smoke
 * Run API-only:   npx playwright test rbac sms-relay  (no dev server needed)
 * Run E2E-only:   npx playwright test smoke dashboard (now hits live site directly)
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,    // Parallelize tests for speed
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Reverted to 1 worker to avoid RBAC race conditions on live production DB
  timeout: 45_000,        // Reduce timeout to fail faster
  reporter: process.env.CI ? 'list' : 'html',

  use: {
    baseURL: process.env.FRONTEND_URL || 'https://nexus-sync-8d50b.web.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],

  /**
   * webServer is disabled by default since we test against the LIVE frontend.
   * If you ever want to test locally again, you can uncomment this block.
   */
  webServer: {
    command: 'cd client && npx vite --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

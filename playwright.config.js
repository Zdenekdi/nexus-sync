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
  timeout: 180_000,        // Increase timeout for long video recording
  reporter: [['list'], ['json', { outputFile: 'test-results.json' }]],

  use: {
    baseURL: process.env.FRONTEND_URL || 'https://nexus-sync-8d50b.web.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        }
      },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /*
   * webServer is disabled because of local binding restrictions (EPERM).
   * We test against the live production frontend but use setupApiMocks() 
   * to intercept all backend traffic.
   */
  // webServer: [ ... ],
});

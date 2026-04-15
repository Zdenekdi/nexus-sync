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
 * Run E2E-only:   npx playwright test smoke dashboard
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,   // Sequential — we have one production DB, avoid race conditions
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
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
  ],

  /**
   * webServer: Auto-starts the Vite dev client before E2E tests run.
   * API tests (rbac, sms-relay) don't use the browser so they work without this too.
   *
   * reuseExistingServer: if you already have `npm run dev:client` running, Playwright
   * will reuse it instead of starting a new one.
   */
  webServer: {
    command: 'npm run dev:client',
    url: 'http://localhost:5173',
    reuseExistingServer: true,    // Reuse if already running — no duplicate server
    timeout: 60_000,
    cwd: '/Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub',
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

import { defineConfig, devices } from '@playwright/test';

/**
 * Android Native Testing Configuration
 * 
 * To run:
 *  1. Start Emulator or connect Physical Device
 *  2. Ensure ADB is running: `adb devices`
 *  3. Run: `npx playwright test --config=playwright.android.config.js`
 */
export default defineConfig({
  testDir: './tests/android',
  timeout: 120 * 1000,
  fullyParallel: false,
  workers: 1, 
  reporter: 'html',
  
  use: {
    // Custom options for Android
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'android-relay',
      use: {
        // We'll use a custom fixture in our tests to handle the Android connection
      },
    },
  ],
});

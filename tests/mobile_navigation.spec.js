import { test, expect, devices } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { doLogin } from './helpers/auth.js';

test.use({ ...devices['Pixel 5'] });

test.describe('Mobile Navigation Verification', () => {
  test('MobileBottomNav should render correctly for Senior Operator', async ({ page }) => {
    console.log('📱 Starting Mobile Verification (Pixel 5)...');
    await doLogin(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    // Check if bottom nav items exist (this verifies the fix in MobileBottomNav.jsx)
    await expect(page.getByTestId('nav-mobile-dashboard')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('nav-mobile-inbox')).toBeVisible();
    await expect(page.getByTestId('nav-mobile-calendar')).toBeVisible();

    console.log('✅ MobileBottomNav verified for Senior Operator');
  });

  test('MobileBottomNav should hide relay/calendar for App Owner', async ({ page }) => {
    await doLogin(page, TEST_USERS.appOwner.email, TEST_USERS.appOwner.password);

    await expect(page.getByTestId('nav-mobile-dashboard')).toBeVisible({ timeout: 15000 });

    // These should be HIDDEN for App Owner on mobile
    await expect(page.getByTestId('nav-mobile-calendar')).not.toBeVisible();
    await expect(page.getByTestId('nav-mobile-relay')).not.toBeVisible();

    console.log('✅ MobileBottomNav filtering verified for App Owner');
  });
});

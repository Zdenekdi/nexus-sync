import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 5'] });

test.describe('Mobile Navigation Verification', () => {
  test('MobileBottomNav should render correctly for Senior Operator', async ({ page }) => {
    console.log('📱 Starting Mobile Verification (Pixel 5)...');
    await page.goto('https://nexus-sync-8d50b.web.app/login');
    
    // Login flow
    await page.getByTestId('login-email').fill('alice@nexus.sync');
    await page.getByTestId('login-password').fill('password123');
    await page.getByTestId('login-submit').click();
    
    // Wait for dashboard
    await expect(page.getByTestId('nav-mobile-dashboard')).toBeVisible({ timeout: 15000 });
    
    // Check if bottom nav items exist (this verifies the fix in MobileBottomNav.jsx)
    await expect(page.getByTestId('nav-mobile-inbox')).toBeVisible();
    await expect(page.getByTestId('nav-mobile-calendar')).toBeVisible();
    
    console.log('✅ MobileBottomNav verified for Senior Operator');
  });

  test('MobileBottomNav should hide relay/calendar for App Owner', async ({ page }) => {
    await page.goto('https://nexus-sync-8d50b.web.app/login');
    
    await page.getByTestId('login-email').fill('dias.zd@gmail.com');
    await page.getByTestId('login-password').fill('Nexus2024!');
    await page.getByTestId('login-submit').click();
    
    await expect(page.getByTestId('nav-mobile-dashboard')).toBeVisible({ timeout: 15000 });
    
    // These should be HIDDEN for App Owner on mobile
    await expect(page.getByTestId('nav-mobile-calendar')).not.toBeVisible();
    await expect(page.getByTestId('nav-mobile-relay')).not.toBeVisible();
    
    console.log('✅ MobileBottomNav filtering verified for App Owner');
  });
});

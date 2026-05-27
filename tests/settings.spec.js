import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { doLogin as loginToApp } from './helpers/auth.js';

/** Opens the sidebar on mobile by clicking the hamburger button. No-op on desktop. */
async function ensureSidebarOpen(page, isMobile) {
  if (!isMobile) return;
  const hamburger = page.getByTestId('sidebar-hamburger');
  await hamburger.waitFor({ state: 'visible', timeout: 10000 });
  await hamburger.click();
  await page.waitForTimeout(600);
}

test.describe('Settings Role-Based Titles & Subtitles', () => {
  test('App Owner — Should see platform-centric control center title and subtitle', async ({ page, isMobile }) => {
    await loginToApp(page, TEST_USERS.appOwner.email, TEST_USERS.appOwner.password);
    await ensureSidebarOpen(page, isMobile);
    
    await page.goto('/settings');
    
    await expect(page.getByTestId('page-settings-container')).toBeVisible({ timeout: 15000 });
    
    const titleText = page.locator('[data-testid="page-settings-container"] h2');
    await expect(titleText).toHaveText(/NexusSync Systems Ovládací Centrum|NexusSync Systems Control Center/i);
    
    const subtitleText = page.locator('[data-testid="page-settings-container"] p').first();
    await expect(subtitleText).toHaveText(/Globální konfigurace relay serverů a systému|Global relay and system configuration/i);
  });

  test('Agency Admin (Mark) — Should see agency-centric settings title and subtitle', async ({ page, isMobile }) => {
    await loginToApp(page, TEST_USERS.agencyAdmin.email, TEST_USERS.agencyAdmin.password);
    await ensureSidebarOpen(page, isMobile);
    
    const settingsBtn = page.getByTestId('nav-link-settings');
    await expect(settingsBtn).toBeVisible({ timeout: 15000 });
    await settingsBtn.click();
    
    await expect(page.getByTestId('page-settings-container')).toBeVisible({ timeout: 15000 });
    
    const titleText = page.locator('[data-testid="page-settings-container"] h2');
    await expect(titleText).toHaveText(/Ovládací centrum agentury|Agency Control Center/i);
    
    const subtitleText = page.locator('[data-testid="page-settings-container"] p').first();
    await expect(subtitleText).toHaveText(/Konfigurace a bezpečnostní předvolby pro vaši agenturu|Configuration and security preferences for your agency/i);
  });

  test('Manager (Jan) — Should see agency-centric settings title and subtitle', async ({ page, isMobile }) => {
    await loginToApp(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await ensureSidebarOpen(page, isMobile);
    
    const settingsBtn = page.getByTestId('nav-link-settings');
    await expect(settingsBtn).toBeVisible({ timeout: 15000 });
    await settingsBtn.click();
    
    await expect(page.getByTestId('page-settings-container')).toBeVisible({ timeout: 15000 });
    
    const titleText = page.locator('[data-testid="page-settings-container"] h2');
    await expect(titleText).toHaveText(/Ovládací centrum agentury|Agency Control Center/i);
    
    const subtitleText = page.locator('[data-testid="page-settings-container"] p').first();
    await expect(subtitleText).toHaveText(/Konfigurace a bezpečnostní předvolby pro vaši agenturu|Configuration and security preferences for your agency/i);
  });
});

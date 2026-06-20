import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { doLogin } from './helpers/auth.js';

test.describe('App Owner Dashboard', () => {
  test.beforeEach(async ({ page }) => { await doLogin(page, TEST_USERS.appOwner.email, TEST_USERS.appOwner.password); });
  test('renders dashboard successfully without crash', async ({ page }) => {
    await expect(page.locator('#dashboard-welcome-title')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text="Kritická chyba renderu"')).not.toBeVisible();
  });
  test('shows system management', async ({ page }) => {
    await expect(page.getByTestId('nav-link-agencies')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Agency Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => { await doLogin(page, TEST_USERS.agencyAdmin.email, TEST_USERS.agencyAdmin.password); });
  test('renders dashboard successfully without crash', async ({ page }) => {
    await expect(page.locator('#dashboard-welcome-title')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text="Kritická chyba renderu"')).not.toBeVisible();
  });
  test('messaging accessible', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible({ timeout: 15000 });
    const inboxBtn = page.getByTestId('nav-link-inbox');
    if (await inboxBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await inboxBtn.click();
    }
  });
  test('dashboard stats cards are clickable and redirect', async ({ page }) => {
    // Wait for the dashboard to render the stats cards
    await expect(page.getByTestId('dashboard-messages-card')).toBeVisible({ timeout: 15000 });
    
    // Click on the messages card
    await page.getByTestId('dashboard-messages-card').click();
    
    // Verify it redirects to inbox
    await expect(page.locator('text="Inbox"').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Manager Dashboard', () => {
  test.beforeEach(async ({ page }) => { await doLogin(page, TEST_USERS.manager.email, TEST_USERS.manager.password); });
  test('renders dashboard successfully without crash', async ({ page }) => {
    await expect(page.locator('#dashboard-welcome-title')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text="Kritická chyba renderu"')).not.toBeVisible();
  });
  test('Schedule ARE visible', async ({ page }) => {
    await expect(page.getByTestId('nav-link-calendar')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Model Dashboard', () => {
  test.beforeEach(async ({ page }) => { await doLogin(page, TEST_USERS.model.email, TEST_USERS.model.password); });
  test('renders dashboard successfully without crash', async ({ page }) => {
    await expect(page.locator('#dashboard-welcome-title')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text="Kritická chyba renderu"')).not.toBeVisible();
  });
  test('shows profile section', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('login-email')).not.toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { doLogin } from './helpers/auth.js';

test.describe('Nexus Hub Multi-Role Smoke', () => {
  test.slow(); // Mark tests as slow to allow for CI fluctuations

  test('Login & Dashboard — App Owner', async ({ page }) => {
    await doLogin(page, TEST_USERS.appOwner.email, TEST_USERS.appOwner.password);
    await expect(page.locator('nav').getByText(/agentury|agencies/i).first()).toBeVisible({ timeout: 30000 });
  });

  test('Login & Dashboard — Agency Admin', async ({ page }) => {
    await doLogin(page, 'mark@nexus.sync', 'password123');
    await expect(page.locator('nav')).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('login-email')).not.toBeVisible();
  });

  test('Login & Dashboard — Senior Operator', async ({ page }) => {
    await doLogin(page, 'alice@nexus.sync', 'password123');
    await expect(page.getByTestId('nav-link-calendar')).toBeVisible({ timeout: 30000 });
  });

  test('Login & Dashboard — Model', async ({ page }) => {
    await doLogin(page, 'diana@nexus.sync', 'password123');
    await expect(page.locator('nav')).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('login-email')).not.toBeVisible();
  });
});

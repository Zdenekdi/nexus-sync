import { test, expect } from '@playwright/test';

test.describe('Sanity / Smoke Tests', () => {
  test('Homepage loads correctly', async ({ page }) => {
    await page.goto('/');

    // Check that there is a root element or typical app container
    const rootOrApp = page.locator('#root, .app-container').first();
    await expect(rootOrApp).toBeAttached({ timeout: 10000 });
  });
});

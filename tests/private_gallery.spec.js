import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/api.js';
import { doLogin as loginToApp } from './helpers/auth.js';

const PRIVATE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64'
);

test.describe('Private profile gallery', () => {
  test('loads private gallery photos through the authorized blob endpoint', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('nexus_active_profile_id', 'prof-1');
    });

    await loginToApp(page, TEST_USERS.agencyAdmin.email, TEST_USERS.agencyAdmin.password);

    let fileRequest = null;
    await page.route('**/api/profiles/prof-1/gallery', async route => {
      const apiOrigin = new URL(route.request().url()).origin;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          photos: [
            {
              id: 'private-photo-1',
              filename: 'private-photo.png',
              contentType: 'image/png',
              visibility: 'private',
              caption: 'Private auth blob',
              url: `${apiOrigin}/api/profiles/prof-1/gallery/private-photo-1/file`
            }
          ]
        })
      });
    });

    await page.route('**/api/profiles/prof-1/gallery/private-photo-1/file', async route => {
      fileRequest = route.request();
      const authorization = fileRequest.headers().authorization || '';
      await route.fulfill({
        status: authorization.startsWith('Bearer ') ? 200 : 401,
        contentType: 'image/png',
        body: PRIVATE_PNG
      });
    });

    await page.goto('/web-profiles', { waitUntil: 'load' });

    await expect(page.getByTestId('page-web-profiles-container')).toBeVisible({ timeout: 15000 });
    const privateImage = page.locator('img[alt="Private auth blob"]');
    await expect(privateImage).toBeVisible({ timeout: 15000 });

    expect(fileRequest).not.toBeNull();
    expect(fileRequest.headers().authorization).toContain('Bearer mock-token-admin');
    await expect(page.getByText(/No private photos|Zadne privatni fotky|Žádné privátní fotky/i)).toHaveCount(0);
  });
});

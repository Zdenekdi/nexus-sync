/**
 * Nexus Hub - Test API Mocks
 * Intercepts all /api requests and returns static mock data.
 * This ensures tests run reliably even without a backend or internet.
 */

export async function setupApiMocks(page) {
  await page.route('**/api/auth/login', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'mock-token-123',
        user: { id: 'alice-001', name: 'Alice (Senior Op)', role: 'Senior Operator' }
      })
    });
  });

  await page.route('**/api/inventory/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'item-1', name: 'Mock Item 1', quantity: 50, threshold: 10, locationId: 'loc-1' },
        { id: 'item-2', name: 'Mock Item 2', quantity: 5, threshold: 10, locationId: 'loc-1' }
      ])
    });
  });

  await page.route('**/api/profiles', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'prof-1', name: 'Model Diana', status: 'active', active: true, agencyId: 'agency-1' },
        { id: 'prof-2', name: 'Model Sarah', status: 'offline', active: false, agencyId: 'agency-1' }
      ])
    });
  });

  await page.route('**/api/safety/sessions', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'sess-1', profileId: 'prof-1', profile: { name: 'Diana' }, bpm: 75, battery: 85, status: 'safe' }
      ])
    });
  });

  await page.route('**/api/chat/conversations', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'conv-1', profileId: 'prof-1', lastMessage: 'Hello!', unreadCount: 0, updatedAt: new Date() }
      ])
    });
  });

  await page.route('**/api/messages/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'msg-1', content: 'Hello from mock!', sender: 'model', createdAt: new Date() }
      ])
    });
  });

  // Default fallback for other API calls to prevent 404s
  await page.route('**/api/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Mocked Response' })
    });
  });
}

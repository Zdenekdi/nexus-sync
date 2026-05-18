import fs from 'fs';
import path from 'path';

/**
 * Nexus Hub - Test API Mocks
 * Intercepts all backend requests and returns static mock data.
 * This ensures tests run reliably even without a backend or internet.
 */

export async function setupApiMocks(page) {
  const context = page.context();

  // Match /auth/login universally (handles both /api/auth/login and localhost:5000/auth/login)
  await context.route(url => url.toString().includes('/auth/login'), async route => {
    let email = '';
    try {
      const postData = route.request().postDataJSON();
      if (postData && postData.email) {
        email = postData.email;
      } else {
        const raw = route.request().postData();
        if (raw) {
          const parsed = JSON.parse(raw);
          email = parsed.email || '';
        }
      }
    } catch (err) {
      console.error('🔴 Failed to parse login request body:', err);
    }
    
    console.log(`📡 [Mock API] Login request intercepted for email: "${email}"`);
    
    let user = { id: 'alice-001', name: 'Alice (Senior Op)', role: 'Senior Operator' };
    
    if (email.includes('owner')) {
      user = { id: 'owner-001', name: 'Owner (App Owner)', role: 'App Owner' };
    } else if (email.includes('mark') || email.includes('admin')) {
      user = { id: 'mark-001', name: 'Mark (Agency Admin)', role: 'Agency Admin' };
    } else if (email.includes('diana') || email.includes('model')) {
      user = { id: 'diana-001', name: 'Diana (Model)', role: 'Model' };
    } else if (email.includes('jan') || email.includes('manager')) {
      user = { id: 'jan-001', name: 'Jan (Manager)', role: 'Manager' };
    }

    console.log(`🛰️ [Mock API] Returning user role: "${user.role}"`);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'mock-token-123',
        user
      })
    });
  });

  await context.route('**/inventory/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'item-1', name: 'Mock Item 1', quantity: 50, threshold: 10, locationId: 'loc-1' },
        { id: 'item-2', name: 'Mock Item 2', quantity: 5, threshold: 10, locationId: 'loc-1' }
      ])
    });
  });

  await context.route('**/safety/settings', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ audioSentinelEnabled: true, audioSentinelInterval: 300, audioSentinelVolume: 0.5 })
      });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    }
  });

  await context.route('**/profiles', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'prof-1', name: 'Model Diana', status: 'active', active: true, agencyId: 'agency-1' },
        { id: 'prof-2', name: 'Model Sarah', status: 'offline', active: false, agencyId: 'agency-1' }
      ])
    });
  });

  await context.route('**/safety/sessions/summary', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  await context.route('**/safety/sessions', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'sess-1', profileId: 'prof-1', profile: { name: 'Diana' }, bpm: 75, battery: 85, state: 'CHECKED_IN' }
      ])
    });
  });

  await context.route('**/chat/conversations', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'conv-1', profileId: 'prof-1', lastMessage: 'Hello!', unreadCount: 0, updatedAt: new Date() }
      ])
    });
  });

  await context.route('**/messages/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'msg-1', content: 'Hello from mock!', sender: 'model', createdAt: new Date() }
      ])
    });
  });

  // Default fallback for any other API/backend requests to prevent unmocked 404s/hangs
  await context.route(
    url => {
      const s = url.toString();
      return s.includes('/api/') || s.includes(':5000/') || s.includes('/auth/');
    },
    async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Mocked Response' })
      });
    }
  );
}

/**
 * Setup complete local offline intercepts.
 * Serves SPA frontend pages and static assets directly from client/dist universally across any domain.
 */
export async function setupOfflineMocks(page) {
  const context = page.context();

  // 1. First setup the API mocks
  await setupApiMocks(page);

  // 2. Intercept and serve assets locally across any domain with exact MIME types
  await context.route('**/assets/**', async route => {
    const url = route.request().url();
    try {
      const assetName = url.split('/assets/')[1].split('?')[0];
      const filePath = path.resolve(process.cwd(), 'client/dist/assets', assetName);
      
      if (fs.existsSync(filePath)) {
        let contentType = 'application/octet-stream';
        if (filePath.endsWith('.js')) {
          contentType = 'application/javascript';
        } else if (filePath.endsWith('.css')) {
          contentType = 'text/css';
        } else if (filePath.endsWith('.svg')) {
          contentType = 'image/svg+xml';
        } else if (filePath.endsWith('.png')) {
          contentType = 'image/png';
        } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
          contentType = 'image/jpeg';
        } else if (filePath.endsWith('.woff') || filePath.endsWith('.woff2')) {
          contentType = 'font/woff2';
        }

        await route.fulfill({ path: filePath, contentType });
      } else {
        console.warn(`⚠️ Asset file not found: ${filePath}`);
        await route.continue();
      }
    } catch (err) {
      console.error(`🔴 Error routing asset ${url}:`, err);
      await route.continue();
    }
  });

  // 3. Intercept all page/SPA requests universally and serve index.html
  await context.route(
    url => {
      const s = url.toString();
      // Ignore API/backend calls, asset requests, and external browser/chrome extension assets
      return !s.includes('/api/') && !s.includes(':5000/') && !s.includes('/auth/') && !s.includes('/assets/') && s.startsWith('http');
    },
    async route => {
      try {
        const indexPath = path.resolve(process.cwd(), 'client/dist/index.html');
        await route.fulfill({ path: indexPath, contentType: 'text/html' });
      } catch (err) {
        console.error(`🔴 Error routing page ${route.request().url()}:`, err);
        await route.continue();
      }
    }
  );
}

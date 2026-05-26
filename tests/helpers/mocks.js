import fs from 'fs';
import path from 'path';

/**
 * Nexus Hub - Test API Mocks
 * Intercepts all backend requests and returns static mock data.
 * This ensures tests run reliably even without a backend or internet.
 */

export async function setupApiMocks(page) {
  const context = page.context();

  // Default fallback for any other API/backend requests to prevent unmocked 404s/hangs
  // Registered first so that specific mocks registered later override it
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

  const TEST_USERS = {
    owner: { id: 'owner-001', name: 'Owner (App Owner)', role: 'App Owner' },
    admin: { id: 'mark-001', name: 'Mark (Agency Admin)', role: 'Agency Admin' },
    senior: { id: 'alice-001', name: 'Alice (Senior Op)', role: 'Senior Operator' },
    model: { id: 'diana-001', name: 'Diana (Model)', role: 'Model' },
    manager: { id: 'jan-001', name: 'Jan (Manager)', role: 'Manager' }
  };

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
    
    let token = 'mock-token-senior';
    let user = TEST_USERS.senior;
    
    if (email.includes('owner')) {
      token = 'mock-token-owner';
      user = TEST_USERS.owner;
    } else if (email.includes('mark') || email.includes('admin')) {
      token = 'mock-token-admin';
      user = TEST_USERS.admin;
    } else if (email.includes('diana') || email.includes('model')) {
      token = 'mock-token-model';
      user = TEST_USERS.model;
    } else if (email.includes('jan') || email.includes('manager')) {
      token = 'mock-token-manager';
      user = TEST_USERS.manager;
    }

    console.log(`🛰️ [Mock API] Returning user role: "${user.role}" with token: "${token}"`);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token,
        user
      })
    });
  });

  // Match /auth/me universally (returns the profile corresponding to the authorization token)
  await context.route(url => url.toString().includes('/auth/me'), async route => {
    const authHeader = route.request().headers()['authorization'] || '';
    let user = TEST_USERS.senior;

    if (authHeader.includes('owner')) {
      user = TEST_USERS.owner;
    } else if (authHeader.includes('admin')) {
      user = TEST_USERS.admin;
    } else if (authHeader.includes('model')) {
      user = TEST_USERS.model;
    } else if (authHeader.includes('manager')) {
      user = TEST_USERS.manager;
    }

    console.log(`🛰️ [Mock API] Me request intercepted. Header: "${authHeader}". Returning: "${user.role}"`);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user)
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

  await context.route('**/agency/all', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'agency-1', name: 'Premium Sync Europe', region: 'EU', subscription: { status: 'active', plan: 'Enterprise' } },
        { id: 'agency-2', name: 'Global Talents UK', region: 'UK', subscription: { status: 'active', plan: 'Pro' } }
      ])
    });
  });

  await context.route('**/admin/health', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        cpu: { loadAvg: [0.15, 0.22, 0.18] },
        memory: { percent: 42 },
        disk: { percent: '60%', used: '120GB / 200GB' },
        uptime: { days: 5, hours: 12, minutes: 30 }
      })
    });
  });

  await context.route('**/subscriptions/admin/stats', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        activeSubscriptions: 20,
        revenueByCurrency: { CZK: 150000, EUR: 6000, GBP: 5000, USD: 7000 },
        planDistribution: { TRIAL: 5, ANNUAL: 8, SEMI_ANNUAL: 4, MONTHLY: 3 },
        recentTransactions: [
          { id: 'tx-1', agencyName: 'Premium Sync Europe', plan: 'Enterprise', amount: 6000, currency: 'EUR', status: 'ACTIVE' },
          { id: 'tx-2', agencyName: 'Global Talents UK', plan: 'Pro', amount: 5000, currency: 'GBP', status: 'ACTIVE' }
        ]
      })
    });
  });

  await context.route('**/admin/features', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  await context.route('**/admin/settings', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  await context.route('**/admin/permissions', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        roles: ['App Owner', 'Agency Admin', 'Manager', 'Senior Operator', 'Operator', 'Model']
      })
    });
  });

  await context.route('**/agency/users', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'user-1', email: 'mark@nexus.sync', role: 'Agency Admin' },
        { id: 'user-2', email: 'alice@nexus.sync', role: 'Senior Operator' }
      ])
    });
  });

  await context.route('**/agency/roles', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'role-1', name: 'Agency Admin', permissions: { settings: true, messaging: true } },
        { id: 'role-2', name: 'Senior Operator', permissions: { settings: false, messaging: true } }
      ])
    });
  });

  await context.route('**/bookings', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'booking-1', title: 'Diana - Photo Shoot', start: new Date().toISOString(), end: new Date().toISOString() }
      ])
    });
  });

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

  // 3. Intercept all page/SPA requests universally and serve index.html or root static assets
  await context.route(
    url => {
      const s = url.toString();
      // Ignore API/backend calls, asset requests, and external browser/chrome extension assets
      return !s.includes('/api/') && !s.includes(':5000/') && !s.includes('/auth/') && !s.includes('/assets/') && s.startsWith('http');
    },
    async route => {
      try {
        const urlStr = route.request().url();
        const urlObj = new URL(urlStr);
        // Get the filename at the end of the pathname (e.g., /safety.mp4 -> safety.mp4)
        const pathname = urlObj.pathname;
        const filename = pathname.startsWith('/') ? pathname.substring(1) : pathname;
        const filePath = path.resolve(process.cwd(), 'client/dist', filename);

        if (filename && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          let contentType = 'application/octet-stream';
          if (filePath.endsWith('.mp4')) {
            contentType = 'video/mp4';
          } else if (filePath.endsWith('.png')) {
            contentType = 'image/png';
          } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            contentType = 'image/jpeg';
          } else if (filePath.endsWith('.svg')) {
            contentType = 'image/svg+xml';
          } else if (filePath.endsWith('.ico')) {
            contentType = 'image/x-icon';
          }
          await route.fulfill({ path: filePath, contentType });
        } else {
          const indexPath = path.resolve(process.cwd(), 'client/dist/index.html');
          await route.fulfill({ path: indexPath, contentType: 'text/html' });
        }
      } catch (err) {
        console.error(`🔴 Error routing page ${route.request().url()}:`, err);
        await route.continue();
      }
    }
  );
}

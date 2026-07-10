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
        body: JSON.stringify([])  // Empty array is safer than object for list-based views
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

  // Analytics — structured response prevents crashes in AnalyticsView
  await context.route('**/analytics/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalRevenue: 0,
        currency: 'CZK',
        profileCount: 0,
        messageCount: 0,
        revenueByProfile: [],
        revenueByDay: [],
        topProfiles: [],
        summary: { total: 0, change: 0 }
      })
    });
  });

  // Activity feed
  await context.route('**/activity/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  // Hierarchy (org chart)
  await context.route('**/hierarchy/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  // Audit logs
  await context.route('**/audit-logs/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ logs: [], total: 0, page: 1, pageSize: 20 })
    });
  });
  await context.route('**/audit/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ logs: [], total: 0 })
    });
  });

  // CRM
  await context.route('**/crm/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  // QA Hub
  await context.route('**/qa/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  // Payouts
  await context.route('**/payouts/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ payouts: [], total: 0 })
    });
  });

  // Referrals
  await context.route('**/referrals/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  // Web profiles / platforms
  await context.route('**/web-profiles/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });
  await context.route('**/platforms/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  // Settings (object not array)
  await context.route(url => {
    const s = url.toString();
    return s.includes('/settings') && !s.includes('/safety/settings') && !s.includes('/admin/settings');
  }, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({})
    });
  });

  // Notifications
  await context.route('**/notifications/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  // Device relay endpoints — auth required so return proper error
  await context.route(url => url.toString().includes('/device/relay'), async route => {
    const authHeader = route.request().headers()['authorization'] || '';
    if (!authHeader) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }
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
        { id: 'agency-2', name: 'Global Talents UK', region: 'UK', subscription: { status: 'active', plan: 'Professional' } }
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
        planDistribution: { TRIAL: 5, Starter: 3, Professional: 12, Agency: 5 },
        agencySubscriptions: [
          {
            agencyId: 'agency-1',
            agencyName: 'Premium Sync Europe',
            email: 'owner@premium.example',
            region: 'EU',
            plan: 'Agency',
            status: 'ACTIVE',
            amountPaid: 6000,
            currency: 'EUR',
            provider: 'stripe',
            paidUntil: '2026-08-10T00:00:00.000Z',
            daysRemaining: 31
          },
          {
            agencyId: 'agency-2',
            agencyName: 'Global Talents UK',
            email: 'owner@global.example',
            region: 'UK',
            plan: 'Professional',
            status: 'TRIAL',
            amountPaid: 0,
            currency: 'GBP',
            provider: null,
            paidUntil: '2026-07-24T00:00:00.000Z',
            daysRemaining: 14
          }
        ],
        recentTransactions: [
          { id: 'tx-1', agencyName: 'Premium Sync Europe', plan: 'Enterprise', amount: 6000, currency: 'EUR', status: 'ACTIVE' },
          { id: 'tx-2', agencyName: 'Global Talents UK', plan: 'Professional', amount: 5000, currency: 'GBP', status: 'ACTIVE' }
        ]
      })
    });
  });

  // Salon Keys mock
  await context.route('**/salon-keys', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'key-001',
            label: 'Klíče od salonu',
            holderId: null,
            holder: null,
            takenAt: null,
            note: null,
            agencyId: 'agency-001'
          },
          {
            id: 'key-002',
            label: 'Klíče – zadní vchod',
            holderId: 'alice-001',
            holder: { id: 'alice-001', name: 'Alice (Senior Op)', email: 'alice@nexus.sync' },
            takenAt: new Date(Date.now() - 3600000).toISOString(),
            note: 'Jsem v salonu do 18:00',
            agencyId: 'agency-001'
          }
        ])
      });
    } else {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'key-new', label: 'Nové klíče', holderId: null, holder: null, takenAt: null, note: null }) });
    }
  });

  await context.route('**/salon-keys/*/take', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'key-001', label: 'Klíče od salonu', holderId: 'owner-001', holder: { id: 'owner-001', name: 'Owner (App Owner)' }, takenAt: new Date().toISOString(), note: null }) });
  });

  await context.route('**/salon-keys/*/return', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'key-001', label: 'Klíče od salonu', holderId: null, holder: null, takenAt: null, note: null }) });
  });

  await context.route('**/salon-keys/*/history', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'log-1', action: 'RETURNED', userId: 'alice-001', user: { id: 'alice-001', name: 'Alice (Senior Op)' }, note: null, createdAt: new Date(Date.now() - 7200000).toISOString() },
        { id: 'log-2', action: 'TAKEN', userId: 'alice-001', user: { id: 'alice-001', name: 'Alice (Senior Op)' }, note: 'Otevírám salon', createdAt: new Date(Date.now() - 10800000).toISOString() }
      ])
    });
  });

  // Team Chat mocks
  await context.route('**/team-chat/messages**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'msg-001',
            room: 'general',
            text: 'Ahoj všichni, nový den!',
            author: { id: 'jan-001', name: 'Jan (Manager)', email: 'jan@nexus.sync' },
            authorId: 'jan-001',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            deletedAt: null
          },
          {
            id: 'msg-002',
            room: 'general',
            text: 'Dobré ráno! ☀️',
            author: { id: 'alice-001', name: 'Alice (Senior Op)', email: 'alice@nexus.sync' },
            authorId: 'alice-001',
            createdAt: new Date(Date.now() - 1800000).toISOString(),
            deletedAt: null
          }
        ])
      });
    } else {
      // POST
      const body = route.request().postDataJSON() || {};
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `msg-new-${Date.now()}`,
          room: body.room || 'general',
          text: body.text || '',
          author: { id: 'owner-001', name: 'Owner (App Owner)', email: 'owner@nexus.sync' },
          authorId: 'owner-001',
          createdAt: new Date().toISOString(),
          deletedAt: null
        })
      });
    }
  });

  await context.route('**/team-chat/messages/*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  await context.route('**/team-chat/unread**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 0 }) });
  });

  // Calendar / events mocks
  await context.route('**/events**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });
  await context.route('**/calendar**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });
  await context.route('**/bookings**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
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

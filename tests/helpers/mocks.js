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
      // Nemockovaný endpoint se tímhle tiše promění v prázdný seznam. UI pak
      // vykreslí prázdný stav, který vypadá jako legitimní „nic tu není" —
      // a test na něm klidně projde, aniž by cokoli ověřil. Přesně tak byla
      // schránka v testech prázdná: ruta na /chats nikdy neexistovala.
      //
      // Prázdné pole tu zůstává, aby se nic nerozbilo. Ale ať je aspoň vidět,
      // co se sem propadá.
      // Ne `path` — ten je nahoře naimportovaný z Node a používá se níž
      // při servírování client/dist.
      const reqPath = (() => { try { return new URL(route.request().url()).pathname; } catch { return route.request().url(); } })();
      if (!globalThis.__nexusUnmockedPaths) globalThis.__nexusUnmockedPaths = new Set();
      if (!globalThis.__nexusUnmockedPaths.has(reqPath)) {
        globalThis.__nexusUnmockedPaths.add(reqPath);
        console.warn(`⚠️  [Mock API] NEMOCKOVÁNO → vracím []: ${reqPath}`);
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])  // Empty array is safer than object for list-based views
      });
    }
  );

  // Tvar musí odpovídat tomu, co /auth/me opravdu vrací (authController.getProfile):
  // kromě id/name/role posílá i isAppOwner a isManager. Mock ty dva příznaky
  // vynechával, takže se tvářil jako by roli nikdo nepoznal — a kód, který se
  // podle nich rozhoduje, se v testech choval jinak než na produkci.
  const TEST_USERS = {
    owner: { id: 'owner-001', name: 'Owner (App Owner)', role: 'App Owner', isAppOwner: true, isManager: true },
    admin: { id: 'mark-001', name: 'Mark (Agency Admin)', role: 'Agency Admin', isAppOwner: false, isManager: true },
    senior: { id: 'alice-001', name: 'Alice (Senior Op)', role: 'Senior Operator', isAppOwner: false, isManager: true },
    model: { id: 'diana-001', name: 'Diana (Model)', role: 'Model', isAppOwner: false, isManager: false },
    manager: { id: 'jan-001', name: 'Jan (Manager)', role: 'Manager', isAppOwner: false, isManager: true }
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
      body: JSON.stringify([])  // /payouts/summary vrací POLE (Object.values), ne objekt
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

  // POZOR NA TVAR: getActiveSession vrací JEDEN objekt, nebo null — ne pole.
  // Dokud tahle ruta chyběla, vracel výchozí zachytávač []. Prázdné pole je
  // ale pravdivostní a `typeof [] === 'object'`, takže klient v useNexusData
  // uvěřil, že běží bezpečnostní relace, a spustil odpočet. V každém testu se
  // tak vykresloval panel „Safety Guard Active" pro relaci, která neexistuje,
  // a tlačítko CHECK-IN v kalendáři bylo zakázané.
  await context.route('**/safety/sessions/active', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(null) });
  });

  await context.route('**/safety/sessions/summary', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  // POZOR NA METODU: GET vrací seznam, POST zakládá JEDNU relaci a vrací ji
  // jako objekt (safetyController.createSession, stav rovnou CHECKED_IN).
  // Dřív se na obojí vracelo pole, takže check-in z kalendáře dostal seznam
  // místo relace a neměl z čeho vzít id ani plannedEndAt.
  await context.route('**/safety/sessions', async route => {
    if (route.request().method() === 'POST') {
      let body = {};
      try { body = JSON.parse(route.request().postData() || '{}'); } catch { /* prázdné tělo */ }
      const plannedEndAt = body.plannedEndAt || new Date(Date.now() + 45 * 60000).toISOString();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'sess-new-1',
          agencyId: 'agency-1',
          profileId: body.profileId || 'prof-1',
          bookingId: body.bookingId || null,
          state: 'CHECKED_IN',
          plannedEndAt,
          graceUntil: new Date(new Date(plannedEndAt).getTime() + 10 * 60000).toISOString(),
          locationType: body.locationType || 'incall'
        })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'sess-1', profileId: 'prof-1', profile: { name: 'Diana' }, bpm: 75, battery: 85, state: 'CHECKED_IN' }
      ])
    });
  });

  await context.route('**/safety/sessions/*/check-out', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'sess-new-1', state: 'GRACE' }) });
  });

  await context.route('**/safety/sessions/*/ack', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'sess-new-1', state: 'CHECKED_IN' }) });
  });

  // Schránka. Dřív tu stála ruta '**/chat/conversations' — takový endpoint
  // nemá server ani klient, nikdo ho nikdy nevolal. Skutečné volání je
  // GET /api/chats (chatController.getChats) a to se propadalo do výchozího
  // zachytávače, který vrací []. Schránka proto byla v každém testu prázdná.
  //
  // Tvar odpovídá getChats: profile, poslední zpráva v poli messages
  // a _count. Klient z toho v useChatLogic.js čte messages[0].text,
  // sender.name, lastMessageAt a externalId.
  // Auditní logy. Zachytávač tu vracel [], takže `data.logs` bylo undefined
  // a stránka padala na `logs.length` — v testech tedy nešlo o prázdný
  // seznam, ale o „Kritickou chybu renderu".
  await context.route('**/audit-logs**', async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ logs: [], total: 0, pages: 1 })
    });
  });

  // Přehled klientů. Server vždycky posílá všechna tři čísla
  // (`totalRevenue._sum.totalSpent || 0`), takže nuly jsou věrný nudný stav.
  // Klient dělá setStats(statsData), čímž přepíše i výchozí nuly — když
  // odpověď pole nemá, vyjde z Number(undefined) hodnota NaN a v CRM svítí
  // „NaN CZK". Kód je proti tomu od téhle větve zpevněný, ale mock ať sedí.
  await context.route('**/clients/stats', async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ totalClients: 0, vipClients: 0, totalRevenue: 0 })
    });
  });

  // Blacklist. Prázdný seznam ve tvaru, který server opravdu vrací
  // ({ entries, total, page, totalPages }) — panel čte `data.entries`,
  // takže holé pole ze zachytávače mu nikdy nic nedalo.
  await context.route('**/blacklist', async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ entries: [], total: 0, page: 1, totalPages: 0 })
    });
  });

  // Předplatné. `null` je to, co server vrací agentuře BEZ předplatného
  // (`res.json(active || null)`), takže banner se schová — nejnudnější stav.
  //
  // Prázdné pole ze zachytávače tady bylo aktivně škodlivé: `[]` je
  // pravdivostně true, takže stráž `if (!activeSubscription) return null`
  // v DashboardHome neplatila a banner se vykreslil s „NaN dní“
  // a „Invalid Date“. V produkci se to nestane (expiresAt je v schématu
  // povinné), ale v testech to zašumělo každý dashboard.
  await context.route('**/subscriptions/current', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
  });

  await context.route('**/subscriptions/history', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  // Přehled agentury. Nuly jsou nejnudnější stav — dashboard pak ukáže
  // samé nuly, což nerozbije nic. Spec, který na číslech něco tvrdí, si
  // rutu přebije sám.
  await context.route('**/agency/stats', async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        totalMessages: 0, totalBookings: 0, totalCalls: 0,
        revenue: '0.00', uptime: '100%', chartData: [0, 0, 0, 0, 0, 0, 0]
      })
    });
  });

  // Stav relaye. Schválně OFFLINE — je to nudnější a poctivější výchozí stav
  // než tvrdit, že zařízení běží. Spec, který na tom něco staví, si rutu
  // přebije sám.
  await context.route('**/agency/relay-status', async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ online: false, activeRelays: 0 })
    });
  });

  // Spárovaná zařízení. Schválně PRÁZDNÉ — nastavení pak ukáže „žádná
  // zařízení", což je nejnudnější stav. Spec, který na zařízeních něco
  // tvrdí, si rutu přebije sám.
  await context.route('**/device/bindings', async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, bindings: [] })
    });
  });

  // Zámky nedodělaných funkcí. Prázdné `locks` = všechno zamčené, protože
  // isLockedForUsers má výchozí hodnotu „zamčeno" (fail-closed). Je to
  // nejnudnější možný stav a odpovídá tomu, co dělal zachytávač předtím.
  await context.route('**/admin/feature-locks', async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ locks: {} })
    });
  });

  // Čísla pro odchozí hovory. Schválně PRÁZDNÉ — tlačítko volání je pak
  // nedostupné, což je nudnější stav a nerozbije nic. Spec, který volání
  // ověřuje, si rutu přebije sám.
  await context.route('**/sip/dids', async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, dids: [] })
    });
  });

  await context.route('**/chats', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'chat-1',
          agencyId: 'agency-1',
          profileId: 'prof-1',
          externalId: '+420777123456',
          lastMessageAt: '2026-08-04T09:12:00.000Z',
          client: null,
          profile: { id: 'prof-1', name: 'Model Diana' },
          messages: [
            {
              id: 'msg-2', chatId: 'chat-1', text: 'Dobrý den, mám zájem o schůzku.',
              direction: 'INBOUND', transport: 'sms', status: 'read',
              senderId: null, sender: null, createdAt: '2026-08-04T09:12:00.000Z'
            }
          ],
          _count: { messages: 2 }
        },
        {
          id: 'chat-2',
          agencyId: 'agency-1',
          profileId: 'prof-2',
          externalId: '+420608999111',
          lastMessageAt: '2026-08-04T08:40:00.000Z',
          client: null,
          profile: { id: 'prof-2', name: 'Model Sarah' },
          messages: [
            {
              id: 'msg-4', chatId: 'chat-2', text: 'Potvrzuji termín na zítra v 18:00.',
              direction: 'OUTBOUND', transport: 'sms', status: 'delivered',
              senderId: 'user-op-1', sender: { id: 'user-op-1', name: 'Alice' },
              createdAt: '2026-08-04T08:40:00.000Z'
            }
          ],
          _count: { messages: 5 }
        }
      ])
    });
  });

  await context.route('**/chats/*/sync', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, synced: 0 }) });
  });

  // Tvar podle modelu Message a messageController.getMessages.
  // Dřív tu bylo { content, sender: 'model' } — pole, která v databázi ani
  // v odpovědi neexistují. Klient čte text a sender.name, takže se každá
  // zpráva vykreslila jako „No messages" s neznámým odesílatelem.
  await context.route('**/messages/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'msg-1', chatId: 'chat-1', text: 'Dobrý den, jste dnes volná?',
          direction: 'INBOUND', transport: 'sms', status: 'read',
          senderId: null, sender: null, createdAt: '2026-08-04T09:05:00.000Z'
        },
        {
          id: 'msg-2', chatId: 'chat-1', text: 'Dobrý den, mám zájem o schůzku.',
          direction: 'INBOUND', transport: 'sms', status: 'read',
          senderId: null, sender: null, createdAt: '2026-08-04T09:12:00.000Z'
        }
      ])
    });
  });

  // Vlastní agentura přihlášeného. DŮLEŽITÉ: klient tuhle rutu volá jako
  // ZÁLOŽNÍ cestu, když /agency/all nic nevrátí — a to je případ všech rolí
  // kromě App Ownera, protože /agency/all je vyhrazené jemu.
  //
  // Bez tohohle mocku se odpověď propadala do výchozího zachytávače, který
  // vrací [], takže operátorce vyšel prázdný tarif a aplikace jí zamkla AI
  // funkce (překlad, návrhy) i s tarifem, který na ně má nárok. Vypadalo to
  // jako vada v oprávněních; byla to díra v mocích.
  //
  // Tvar podle agencyController.getSettings (select vrací i plan).
  await context.route('**/agency/settings', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        // Tarif SCHVÁLNĚ nízký. Kdyby tu byl Professional, tlačítka pro
        // upgrade v nastavení by se chovala jako „už tento tarif máte"
        // a rozbila by spec settings.spec.js. Testy, které potřebují AI
        // funkce, si tuhle rutu přebijí vlastní odpovědí — viz
        // inbox_translator.spec.js.
        id: 'agency-1', name: 'Premium Sync Europe', tier: 'Starter', plan: 'Starter',
        safetyAlertMode: 'MANAGERS_AND_ASSIGNED', inviteCode: 'NEXUS-TEST',
        referralCode: 'REF-TEST', aiInstructions: null,
        email: 'info@premium.test', region: 'EU'
      })
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

  await context.route('**/subscriptions/trial', async route => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'trial-mock',
        agencyId: 'agency-2',
        plan: 'Starter',
        status: 'TRIAL',
        amountPaid: 0,
        expiresAt: '2026-07-24T00:00:00.000Z'
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
  // Tvar podle modelu Booking a bookingController.getBookings (include profile).
  // Dřív se vracelo prázdné pole, takže kalendář neměl na co kliknout —
  // a tlačítka CHECK-IN, „Upravit" i „Smazat" tím zůstala neověřená.
  //
  // Časy jsou počítané ode dneška: kalendář filtruje podle vybraného dne,
  // s pevným datem by rezervace zmizely hned druhý den.
  await context.route('**/bookings**', async route => {
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      return;
    }
    const den = new Date().toISOString().split('T')[0];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'book-1', profileId: 'prof-1', agencyId: 'agency-1',
          title: 'Schůzka — hotel Central', price: 4000,
          startTime: `${den}T09:00:00.000Z`, endTime: `${den}T23:30:00.000Z`,
          locationType: 'outcall', address: 'Hotel Central', source: 'manual',
          profile: { id: 'prof-1', name: 'Model Diana' }
        },
        {
          id: 'book-2', profileId: 'prof-2', agencyId: 'agency-1',
          title: 'Schůzka — provozovna', price: 2500,
          startTime: `${den}T14:00:00.000Z`, endTime: `${den}T15:00:00.000Z`,
          locationType: 'incall', address: null, source: 'manual',
          profile: { id: 'prof-2', name: 'Model Sarah' }
        }
      ])
    });
  });

  await context.route('**/admin/features', async route => {


    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  // Banner údržby a globální oznámení — čte je KAŽDÝ přihlášený, ne jen
  // App Owner (jinak by banner nikoho nevaroval). Vrací se objekt, ne pole.
  // Překlad zprávy. Server čte { text, target } a vrací { translated } —
  // ne { targetLang } / { translatedText }, jak to měla původní (nezapojená)
  // implementace. Mock vrací cílový jazyk zpátky, aby šlo ověřit, že se
  // posílá výběr z UI, a ne natvrdo nastavená dvojice.
  await context.route('**/ai/translate', async route => {
    let body = {};
    try { body = JSON.parse(route.request().postData() || '{}'); } catch { /* prázdné tělo */ }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ translated: `[${body.target}] ${body.text}` })
    });
  });

  await context.route('**/admin/settings/public', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ maintenanceMode: false, globalAnnouncement: '' })
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
        // `name` je v schématu povinné a server ho vždycky posílá. Když
        // v mocku chybělo, padala celá stránka Hierarchie na
        // `user.name.charAt(0)` — a nikdo si toho nevšiml, protože tam
        // žádný test nechodil.
        { id: 'user-1', name: 'Mark (Admin)', email: 'mark@nexus.sync', role: 'Agency Admin' },
        { id: 'user-2', name: 'Alice (Senior Op)', email: 'alice@nexus.sync', role: 'Senior Operator' }
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

  // POZOR: tady stál DRUHÝ mock rezervací, registrovaný později, takže
  // přebíjel ten výš. Vracel { id, title, start, end } — tvar, který se
  // s modelem Booking nepotkává: chybělo profileId a časy se jmenují
  // startTime/endTime. Check-in z kalendáře proto neměl profil, ke kterému
  // by relaci založil, a tiše se vracel.

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

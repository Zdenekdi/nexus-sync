import fs from 'fs';
import path from 'path';

const indexPath = path.resolve(process.cwd(), 'client/dist/index.html');

if (!fs.existsSync(indexPath)) {
  console.error('Error: client/dist/index.html not found! Run npm run build:client first.');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

const mockScript = `
    <script>
      (function() {
        console.log('🛡️ API Mock Injection active!');
        const mockResponses = {
          '/auth/login': {
            token: 'mock-jwt-token',
            user: {
              id: 'user-1',
              email: 'owner@nexus.sync',
              role: 'App Owner',
              isAppOwner: true,
              activeOperator: {
                id: 'op-1',
                email: 'owner@nexus.sync',
                role: 'App Owner',
                isAppOwner: true
              }
            }
          },
          '/agency/all': [
            { id: 'agency-1', name: 'Premium Sync Europe', slug: 'premium-sync', active: true, masterReferral: 'REF123', plan: 'Enterprise', mrr: 6000, currency: 'EUR' }
          ],
          '/admin/permissions': {
            roles: ['App Owner', 'Agency Admin', 'Manager', 'Senior Operator', 'Operator', 'Model']
          },
          '/admin/health': {
            cpu: { loadAvg: [0.15, 0.22, 0.18] },
            memory: { percent: 42 },
            disk: { percent: '60%', used: '120GB / 200GB' },
            uptime: { days: 5, hours: 12, minutes: 30 }
          },
          '/subscriptions/admin/stats': {
            activeSubscriptions: 20,
            revenueByCurrency: { CZK: 150000, EUR: 6000, GBP: 5000, USD: 7000 },
            planDistribution: { TRIAL: 5, ANNUAL: 8, SEMI_ANNUAL: 4, MONTHLY: 3 },
            recentTransactions: [
              { id: 'tx-1', agencyName: 'Premium Sync Europe', plan: 'Enterprise', amount: 6000, currency: 'EUR', status: 'ACTIVE' },
              { id: 'tx-2', agencyName: 'Global Talents UK', plan: 'Pro', amount: 5000, currency: 'GBP', status: 'ACTIVE' }
            ]
          },
          '/agency/users': [
            { id: 'user-1', email: 'mark@nexus.sync', role: 'Agency Admin' },
            { id: 'user-2', email: 'alice@nexus.sync', role: 'Senior Operator' }
          ],
          '/agency/roles': [
            { id: 'role-1', name: 'Agency Admin', permissions: { settings: true, messaging: true } },
            { id: 'role-2', name: 'Senior Operator', permissions: { settings: false, messaging: true } }
          ],
          '/bookings': [
            { id: 'booking-1', title: 'Diana - Photo Shoot', start: new Date().toISOString(), end: new Date().toISOString() }
          ]
        };

        const originalFetch = window.fetch;
        window.fetch = async function(input, init) {
          const url = (typeof input === 'string') ? input : input.url;
          console.log('Fetch request intercepted:', url);
          for (const key in mockResponses) {
            if (url.includes(key)) {
              return new Response(JSON.stringify(mockResponses[key]), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              });
            }
          }
          return originalFetch(input, init);
        };

        const originalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
          const xhr = new originalXHR();
          const originalOpen = xhr.open;
          let requestUrl = '';
          xhr.open = function(method, url, ...args) {
            requestUrl = url;
            return originalOpen.call(xhr, method, url, ...args);
          };
          const originalSend = xhr.send;
          xhr.send = function(body) {
            console.log('XHR request intercepted:', requestUrl);
            for (const key in mockResponses) {
              if (requestUrl.includes(key)) {
                Object.defineProperty(xhr, 'status', { writable: true, value: 200 });
                Object.defineProperty(xhr, 'readyState', { writable: true, value: 4 });
                Object.defineProperty(xhr, 'responseText', { writable: true, value: JSON.stringify(mockResponses[key]) });
                Object.defineProperty(xhr, 'response', { writable: true, value: JSON.stringify(mockResponses[key]) });
                if (xhr.onreadystatechange) xhr.onreadystatechange();
                if (xhr.onload) xhr.onload();
                return;
              }
            }
            return originalSend.call(xhr, body);
          };
          return xhr;
        };
      })();
    </script>
`;

// Inject right after <head>
html = html.replace('<head>', '<head>' + mockScript);

fs.writeFileSync(indexPath, html, 'utf8');
console.log('✅ Successfully injected client-side mocks into client/dist/index.html!');

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');

const prismaMock = require('../src/services/db');
const { sendAlert } = require('../src/services/alertService');
const monitoringService = require('../src/services/monitoringService');

const NOW = new Date('2026-07-09T12:00:00.000Z');

beforeEach(() => {
  jest.clearAllMocks();
  monitoringService._resetForTests();
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PUBLISHABLE_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.REQUIRE_STRIPE_CONFIG;
  delete process.env.PENDING_BILLING_ALERT_MINUTES;
  delete process.env.RELAY_OFFLINE_ALERT_MINUTES;
  delete process.env.MONITOR_ALERT_COOLDOWN_MINUTES;

  prismaMock.$queryRaw.mockResolvedValue([{ ok: 1 }]);
  prismaMock.subscription.findMany.mockResolvedValue([]);
  prismaMock.deviceBinding.findMany.mockResolvedValue([]);
});

describe('monitoringService', () => {
  it('reports ok when database, Stripe pending payments and Relay devices are healthy', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_configured';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_configured';

    const report = await monitoringService.summarizeOperationalHealth({ now: NOW });

    expect(report.status).toBe('ok');
    expect(report.issues).toEqual([]);
    expect(report.checks.database.status).toBe('ok');
    expect(report.checks.stripe.status).toBe('ok');
    expect(report.checks.relay.status).toBe('ok');
  });

  it('reports stale Stripe card payments, missing webhook secret and offline Relay bindings', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_configured';
    prismaMock.subscription.findMany.mockResolvedValue([
      {
        id: 'sub-old-card',
        agencyId: 'agency-1',
        plan: 'Professional',
        status: 'PENDING',
        paymentRef: 'cs_test_old',
        amountPaid: 990,
        currency: 'CZK',
        note: JSON.stringify({ provider: 'stripe', paymentMethod: 'card' }),
        createdAt: new Date('2026-07-09T10:30:00.000Z')
      },
      {
        id: 'sub-old-transfer',
        agencyId: 'agency-1',
        plan: 'Agency',
        status: 'PENDING',
        paymentRef: '123456',
        amountPaid: 2490,
        currency: 'CZK',
        note: JSON.stringify({ provider: 'bank_transfer', paymentMethod: 'transfer' }),
        createdAt: new Date('2026-07-09T10:20:00.000Z')
      }
    ]);
    prismaMock.deviceBinding.findMany.mockResolvedValue([
      {
        installationId: 'relay-1',
        agencyId: 'agency-1',
        profileId: 'profile-1',
        deviceName: 'Nexus Relay',
        model: 'Pixel',
        lastSeenAt: new Date('2026-07-09T11:20:00.000Z'),
        profile: { name: 'Diana' }
      }
    ]);

    const report = await monitoringService.summarizeOperationalHealth({ now: NOW });

    expect(report.status).toBe('degraded');
    expect(report.checks.stripe.pendingCount).toBe(1);
    expect(report.checks.stripe.pending[0]).toMatchObject({
      id: 'sub-old-card',
      ageMinutes: 90
    });
    expect(report.checks.relay.offlineCount).toBe(1);
    expect(report.checks.relay.offline[0]).toMatchObject({
      installationId: 'relay-1',
      ageMinutes: 40
    });
    expect(report.issues.map(issue => issue.message).join('\n')).toContain('STRIPE_WEBHOOK_SECRET is missing');
  });

  it('sends degraded alerts with cooldown', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_configured';
    process.env.MONITOR_ALERT_COOLDOWN_MINUTES = '60';

    await monitoringService.runOperationalChecks({ now: NOW });
    await monitoringService.runOperationalChecks({ now: new Date('2026-07-09T12:05:00.000Z') });
    await monitoringService.runOperationalChecks({ now: new Date('2026-07-09T13:01:00.000Z') });

    expect(sendAlert).toHaveBeenCalledTimes(2);
    expect(sendAlert).toHaveBeenCalledWith(
      expect.stringContaining('Operational monitoring degraded'),
      'warning'
    );
  });
});

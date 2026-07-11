const { buildUrl, normalizeApiBase, runOperationalSmoke } = require('../scripts/audit-operational-health');

function makeRequester(responses) {
  const calls = [];
  const requester = jest.fn(async (url, options = {}) => {
    calls.push({ url, options });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return next;
  });
  requester.calls = calls;
  return requester;
}

// ─── Response fixtures ───────────────────────────────────────────────────────
const PASS_PUBLIC_HEALTH = { status: 200, body: { status: 'ok' } };
const PASS_LOGIN         = { status: 200, body: { token: 'test-token', user: { isAppOwner: true } } };
const PASS_OPERATIONAL   = { status: 200, body: { status: 'ok' } };
const PASS_BINDINGS      = { status: 200, body: { bindings: [{ active: true, installationId: 'relay_test', profileId: 'ldn-01' }] } };
const PASS_OUTBOX        = { status: 200, body: [] };
const PASS_RELAY_INBOUND = { status: 200, body: { ok: true } };
const PASS_CHATS_RECENT  = {
  status: 200,
  body: [{ id: 'chat-1', lastMessageAt: new Date(Date.now() - 86_400_000).toISOString() }] // 1 day ago
};
const NO_BINDINGS  = { status: 200, body: { bindings: [] } };
const STALE_CHATS  = {
  status: 200,
  body: [{ id: 'chat-1', lastMessageAt: new Date(Date.now() - 30 * 86_400_000).toISOString() }] // 30 days ago
};

const FULL_ENV = {
  OPS_API_BASE_URL:          'https://nexus.example/api',
  OPS_OWNER_EMAIL:           'owner@example.test',
  OPS_OWNER_PASSWORD:        'password',
  OPS_RELAY_PROFILE_ID:      'ldn-01',
  OPS_RELAY_INSTALLATION_ID: 'relay_test',
  OPS_DEVICE_SECRET:         'supersecret',
  STRICT_OPERATIONAL_HEALTH: 'true'
};

describe('operational health smoke audit', () => {
  // ── URL helpers ─────────────────────────────────────────────────────────────
  it('normalizes API bases without trailing slashes', () => {
    expect(normalizeApiBase('https://example.test/api///')).toBe('https://example.test/api');
    expect(buildUrl('https://example.test/api/', '/health')).toBe('https://example.test/api/health');
  });

  // ── Baseline / auth checks ──────────────────────────────────────────────────
  it('passes when public health, App Owner login, and operational health are ok', async () => {
    const requester = makeRequester([
      { status: 200, body: { status: 'ok' } },                                        // /health
      { status: 200, body: { token: 'test-token', user: { isAppOwner: true } } },     // /auth/login
      { status: 200, body: { status: 'ok' } },                                        // /admin/operational-health
      { status: 200, body: { bindings: [{ active: true, installationId: 'x' }] } },   // /device/bindings
      { status: 200, body: [{ id: 'c1', lastMessageAt: new Date(Date.now() - 86_400_000).toISOString() }] } // /chats
    ]);

    const summary = await runOperationalSmoke({
      env: {
        OPS_API_BASE_URL: 'https://nexus.example/api',
        OPS_OWNER_EMAIL:  'owner@example.test',
        OPS_OWNER_PASSWORD: 'password',
        STRICT_OPERATIONAL_HEALTH: 'true'
      },
      requestJson: requester
    });

    // No hard errors – warnings are allowed (relay/outbox skipped because IDs not configured)
    expect(summary.checks.filter((c) => c.level === 'error')).toHaveLength(0);
    expect(requester).toHaveBeenCalledTimes(5);
    expect(requester.calls[2].options.headers.Authorization).toBe('Bearer test-token');
  });


  it('skips protected health as a warning when credentials are missing in advisory mode', async () => {
    const requester = makeRequester([{ status: 200, body: { status: 'ok' } }]);

    const summary = await runOperationalSmoke({
      env: { OPS_API_BASE_URL: 'https://nexus.example/api' },
      requestJson: requester
    });

    expect(summary.checks).toEqual([
      expect.objectContaining({ name: 'public-health',    level: 'ok' }),
      expect.objectContaining({ name: 'app-owner-login',  level: 'warning' })
    ]);
  });

  it('fails when credentials are missing in strict mode', async () => {
    const requester = makeRequester([{ status: 200, body: { status: 'ok' } }]);

    const summary = await runOperationalSmoke({
      env: {
        OPS_API_BASE_URL: 'https://nexus.example/api',
        STRICT_OPERATIONAL_HEALTH: 'true'
      },
      requestJson: requester
    });

    expect(summary.checks).toEqual([
      expect.objectContaining({ name: 'public-health',   level: 'ok' }),
      expect.objectContaining({ name: 'app-owner-login', level: 'error' })
    ]);
  });

  it('fails strict mode when operational health is degraded', async () => {
    const requester = makeRequester([
      { status: 200, body: { status: 'ok' } },
      { status: 200, body: { token: 'test-token', user: { isAppOwner: true } } },
      { status: 503, body: { status: 'degraded' } }
    ]);

    const summary = await runOperationalSmoke({
      env: {
        OPS_API_BASE_URL:  'https://nexus.example/api',
        OPS_OWNER_EMAIL:   'owner@example.test',
        OPS_OWNER_PASSWORD: 'password',
        STRICT_OPERATIONAL_HEALTH: 'true'
      },
      requestJson: requester
    });

    expect(summary.checks).toContainEqual(
      expect.objectContaining({ name: 'operational-health', level: 'error' })
    );
  });

  // ── Relay device bindings ───────────────────────────────────────────────────
  it('passes all strict checks when relay binding is active and DB has recent messages', async () => {
    const requester = makeRequester([
      PASS_PUBLIC_HEALTH,
      PASS_LOGIN,
      PASS_OPERATIONAL,
      PASS_BINDINGS,
      PASS_OUTBOX,
      PASS_RELAY_INBOUND,
      PASS_CHATS_RECENT
    ]);

    const summary = await runOperationalSmoke({ env: FULL_ENV, requestJson: requester });

    expect(summary.checks.filter((c) => c.level === 'error')).toHaveLength(0);
    expect(summary.checks).toContainEqual(expect.objectContaining({ name: 'relay-device-bindings', level: 'ok' }));
    expect(summary.checks).toContainEqual(expect.objectContaining({ name: 'relay-outbox-accessible', level: 'ok' }));
    expect(summary.checks).toContainEqual(expect.objectContaining({ name: 'relay-inbound-smoke',    level: 'ok' }));
    expect(summary.checks).toContainEqual(expect.objectContaining({ name: 'db-message-recency',     level: 'ok' }));
  });

  it('fails strict mode when no active device bindings exist', async () => {
    const requester = makeRequester([
      PASS_PUBLIC_HEALTH,
      PASS_LOGIN,
      PASS_OPERATIONAL,
      NO_BINDINGS,
      PASS_CHATS_RECENT
    ]);

    const summary = await runOperationalSmoke({ env: FULL_ENV, requestJson: requester });

    expect(summary.checks).toContainEqual(
      expect.objectContaining({ name: 'relay-device-bindings', level: 'error' })
    );
  });

  // ── Relay inbound smoke ─────────────────────────────────────────────────────
  it('fails strict mode when relay inbound smoke POST returns 401', async () => {
    const requester = makeRequester([
      PASS_PUBLIC_HEALTH,
      PASS_LOGIN,
      PASS_OPERATIONAL,
      PASS_BINDINGS,
      PASS_OUTBOX,
      { status: 401, body: { message: 'Unauthorized' } },
      PASS_CHATS_RECENT
    ]);

    const summary = await runOperationalSmoke({ env: FULL_ENV, requestJson: requester });

    expect(summary.checks).toContainEqual(
      expect.objectContaining({ name: 'relay-inbound-smoke', level: 'error' })
    );
  });

  it('warns about relay-inbound-smoke when device secret is not configured', async () => {
    const { OPS_DEVICE_SECRET: _omit, ...envWithoutSecret } = FULL_ENV;

    const requester = makeRequester([
      PASS_PUBLIC_HEALTH,
      PASS_LOGIN,
      PASS_OPERATIONAL,
      PASS_BINDINGS,
      PASS_OUTBOX,
      PASS_CHATS_RECENT
    ]);

    const summary = await runOperationalSmoke({ env: envWithoutSecret, requestJson: requester });

    expect(summary.checks).toContainEqual(
      expect.objectContaining({ name: 'relay-inbound-smoke', level: 'warning' })
    );
  });

  it('skips relay outbox and inbound checks when profile/installation IDs are not configured', async () => {
    const { OPS_RELAY_PROFILE_ID: _p, OPS_RELAY_INSTALLATION_ID: _i, OPS_DEVICE_SECRET: _s, ...envNoRelay } = FULL_ENV;

    const requester = makeRequester([
      PASS_PUBLIC_HEALTH,
      PASS_LOGIN,
      PASS_OPERATIONAL,
      PASS_BINDINGS,
      PASS_CHATS_RECENT
    ]);

    const summary = await runOperationalSmoke({ env: envNoRelay, requestJson: requester });

    expect(summary.checks).toContainEqual(expect.objectContaining({ name: 'relay-outbox-accessible', level: 'warning' }));
    expect(summary.checks).toContainEqual(expect.objectContaining({ name: 'relay-inbound-smoke',     level: 'warning' }));
  });

  // ── DB message recency ──────────────────────────────────────────────────────
  it('fails strict mode when the most recent message is older than the configured threshold', async () => {
    const requester = makeRequester([
      PASS_PUBLIC_HEALTH,
      PASS_LOGIN,
      PASS_OPERATIONAL,
      PASS_BINDINGS,
      PASS_OUTBOX,
      PASS_RELAY_INBOUND,
      STALE_CHATS
    ]);

    const summary = await runOperationalSmoke({
      env: { ...FULL_ENV, OPS_MAX_MESSAGE_AGE_DAYS: '7' },
      requestJson: requester
    });

    expect(summary.checks).toContainEqual(
      expect.objectContaining({ name: 'db-message-recency', level: 'error' })
    );
  });
});

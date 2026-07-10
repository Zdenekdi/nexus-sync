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

describe('operational health smoke audit', () => {
  it('normalizes API bases without trailing slashes', () => {
    expect(normalizeApiBase('https://example.test/api///')).toBe('https://example.test/api');
    expect(buildUrl('https://example.test/api/', '/health')).toBe('https://example.test/api/health');
  });

  it('passes when public health, App Owner login, and operational health are ok', async () => {
    const requester = makeRequester([
      { status: 200, body: { status: 'ok' } },
      { status: 200, body: { token: 'test-token', user: { isAppOwner: true } } },
      { status: 200, body: { status: 'ok' } }
    ]);

    const summary = await runOperationalSmoke({
      env: {
        OPS_API_BASE_URL: 'https://nexus.example/api',
        OPS_OWNER_EMAIL: 'owner@example.test',
        OPS_OWNER_PASSWORD: 'password',
        STRICT_OPERATIONAL_HEALTH: 'true'
      },
      requestJson: requester
    });

    expect(summary.checks.every((check) => check.level === 'ok')).toBe(true);
    expect(requester).toHaveBeenCalledTimes(3);
    expect(requester.calls[2].options.headers.Authorization).toBe('Bearer test-token');
  });

  it('skips protected health as a warning when credentials are missing in advisory mode', async () => {
    const requester = makeRequester([{ status: 200, body: { status: 'ok' } }]);

    const summary = await runOperationalSmoke({
      env: { OPS_API_BASE_URL: 'https://nexus.example/api' },
      requestJson: requester
    });

    expect(summary.checks).toEqual([
      expect.objectContaining({ name: 'public-health', level: 'ok' }),
      expect.objectContaining({ name: 'app-owner-login', level: 'warning' })
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
      expect.objectContaining({ name: 'public-health', level: 'ok' }),
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
        OPS_API_BASE_URL: 'https://nexus.example/api',
        OPS_OWNER_EMAIL: 'owner@example.test',
        OPS_OWNER_PASSWORD: 'password',
        STRICT_OPERATIONAL_HEALTH: 'true'
      },
      requestJson: requester
    });

    expect(summary.checks).toContainEqual(expect.objectContaining({
      name: 'operational-health',
      level: 'error'
    }));
  });
});

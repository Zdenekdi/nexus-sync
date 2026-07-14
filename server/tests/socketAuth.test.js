const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

jest.mock('../src/services/db');
const prismaMock = require('../src/services/db');
const { resolveSocketUser } = require('../src/services/socket');

afterEach(() => jest.clearAllMocks());

describe('socket auth — resolveSocketUser', () => {
  // ── API key (local-agent, full-auto) ──────────────────────────────────────
  it('accepts a valid API key with relay:bridge scope (agency-scoped agent)', async () => {
    const keyHash = await bcrypt.hash('secret123', 10);
    prismaMock.apiKey.findUnique.mockResolvedValue({ id: 'k1', keyHash, scopes: 'read:stats,relay:bridge', agencyId: 'a1', expiresAt: null });
    prismaMock.apiKey.update.mockResolvedValue({});

    const user = await resolveSocketUser({ apiKey: 'nx_live_abc.secret123' });
    expect(user).toEqual({ agencyId: 'a1', type: 'agent', apiKeyId: 'k1' });
  });

  it('rejects an API key without the relay:bridge scope', async () => {
    const keyHash = await bcrypt.hash('secret123', 10);
    prismaMock.apiKey.findUnique.mockResolvedValue({ id: 'k1', keyHash, scopes: 'read:stats', agencyId: 'a1' });
    await expect(resolveSocketUser({ apiKey: 'nx_live_abc.secret123' })).rejects.toThrow(/relay:bridge/);
  });

  it('rejects an API key with a wrong secret', async () => {
    const keyHash = await bcrypt.hash('correct', 10);
    prismaMock.apiKey.findUnique.mockResolvedValue({ id: 'k1', keyHash, scopes: 'relay:bridge', agencyId: 'a1' });
    await expect(resolveSocketUser({ apiKey: 'nx_live_abc.wrong' })).rejects.toThrow(/Invalid API key/);
  });

  it('rejects an expired API key', async () => {
    const keyHash = await bcrypt.hash('secret123', 10);
    prismaMock.apiKey.findUnique.mockResolvedValue({ id: 'k1', keyHash, scopes: 'relay:bridge', agencyId: 'a1', expiresAt: new Date(Date.now() - 1000) });
    await expect(resolveSocketUser({ apiKey: 'nx_live_abc.secret123' })).rejects.toThrow(/expired/);
  });

  // ── JWT (operators / relay) ───────────────────────────────────────────────
  it('accepts a normal JWT (operator) without a DB hit', async () => {
    const token = jwt.sign({ userId: 'u1', agencyId: 'a1', role: { name: 'Operator' } }, process.env.JWT_SECRET);
    const user = await resolveSocketUser({ token });
    expect(user.userId).toBe('u1');
  });

  it('rejects a relay JWT whose tv no longer matches (revoked)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ tokenVersion: 4 });
    const token = jwt.sign({ userId: 'u1', type: 'relay', tv: 0 }, process.env.JWT_SECRET);
    await expect(resolveSocketUser({ token })).rejects.toThrow(/revoked/);
  });

  it('rejects when neither apiKey nor token is provided', async () => {
    await expect(resolveSocketUser({})).rejects.toThrow(/No token/);
  });
});

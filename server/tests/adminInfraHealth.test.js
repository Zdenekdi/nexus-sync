const request = require('supertest');
const jwt = require('jsonwebtoken');

const mockSummarize = jest.fn();

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');
jest.mock('../src/services/infraHealthService', () => ({ summarize: mockSummarize }));
jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('node-ssh', () => ({
  NodeSSH: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    execCommand: jest.fn(),
    dispose: jest.fn()
  }))
}));
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
  checkout: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() }
})), { virtual: true });

const app = require('../src/app');

const makeToken = (role) => jwt.sign(
  {
    userId: 'user-1',
    agencyId: 'agency-1',
    role
  },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

beforeEach(() => {
  jest.clearAllMocks();
  mockSummarize.mockResolvedValue({
    status: 'ok',
    timestamp: '2026-07-10T12:00:00.000Z',
    checks: { api: { ok: true } },
    issues: []
  });
});

describe('GET /api/admin/infra-health', () => {
  it('requires an App Owner role', async () => {
    const res = await request(app)
      .get('/api/admin/infra-health')
      .set('Authorization', `Bearer ${makeToken({ name: 'Agency Admin', isManager: true, isAppOwner: false })}`);

    expect(res.status).toBe(403);
    expect(mockSummarize).not.toHaveBeenCalled();
  });

  it('returns an ok infrastructure report for App Owner', async () => {
    const res = await request(app)
      .get('/api/admin/infra-health')
      .set('Authorization', `Bearer ${makeToken({ name: 'App Owner', isAppOwner: true })}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      checks: { api: { ok: true } },
      issues: []
    });
    expect(mockSummarize).toHaveBeenCalledTimes(1);
  });

  it('returns 503 when infrastructure is degraded but still includes the report', async () => {
    mockSummarize.mockResolvedValue({
      status: 'degraded',
      timestamp: '2026-07-10T12:00:00.000Z',
      checks: { ai: { ok: false } },
      issues: [{ check: 'ai', message: 'AI/Ollama is not reachable' }]
    });

    const res = await request(app)
      .get('/api/admin/infra-health')
      .set('Authorization', `Bearer ${makeToken({ name: 'App Owner', isAppOwner: true })}`);

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      status: 'degraded',
      issues: [{ check: 'ai', message: 'AI/Ollama is not reachable' }]
    });
  });
});

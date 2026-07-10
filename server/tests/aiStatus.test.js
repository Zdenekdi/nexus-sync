const request = require('supertest');
const jwt = require('jsonwebtoken');

const mockAiService = {
  model: 'test-model',
  healthCheck: jest.fn(),
  generateResponse: jest.fn(),
  suggestReply: jest.fn(),
  translateText: jest.fn()
};

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');
jest.mock('../src/services/aiService', () => mockAiService);
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
})));

const prismaMock = require('../src/services/db');
const app = require('../src/app');

const makeToken = (overrides = {}) => jwt.sign(
  {
    userId: 'user-1',
    agencyId: 'agency-1',
    role: { name: 'Agency Admin', isManager: true, isAppOwner: false },
    ...overrides
  },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.agency.findUnique.mockResolvedValue({
    plan: 'Professional',
    tier: null,
    extraFeatures: null
  });
  mockAiService.healthCheck.mockResolvedValue({
    ok: true,
    configured: true,
    model: 'test-model',
    models: []
  });
});

describe('GET /api/ai/status', () => {
  it('returns sanitized AI status for plans with AI access', async () => {
    const res = await request(app)
      .get('/api/ai/status')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(mockAiService.healthCheck).toHaveBeenCalledWith({ includeInternal: false });
    expect(res.body).toMatchObject({ ok: true, configured: true, model: 'test-model' });
    expect(res.body).not.toHaveProperty('baseUrl');
  });

  it('rejects Starter plan without AI add-on', async () => {
    prismaMock.agency.findUnique.mockResolvedValue({
      plan: 'Starter',
      tier: null,
      extraFeatures: null
    });

    const res = await request(app)
      .get('/api/ai/status')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(403);
    expect(mockAiService.healthCheck).not.toHaveBeenCalled();
  });

  it('allows App Owner without agency plan lookup', async () => {
    const res = await request(app)
      .get('/api/ai/status')
      .set('Authorization', `Bearer ${makeToken({
        agencyId: null,
        role: { name: 'App Owner', isAppOwner: true }
      })}`);

    expect(res.status).toBe(200);
    expect(prismaMock.agency.findUnique).not.toHaveBeenCalled();
  });
});

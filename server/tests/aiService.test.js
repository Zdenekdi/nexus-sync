jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('../src/services/logger');

const axios = require('axios');
const aiService = require('../src/services/aiService');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('aiService healthCheck', () => {
  it('hides internal endpoint details by default', async () => {
    axios.get.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:11434'));

    const status = await aiService.healthCheck();

    expect(status).toMatchObject({
      ok: false,
      configured: true,
      error: 'AI service is not reachable'
    });
    expect(status).not.toHaveProperty('baseUrl');
    expect(status.error).not.toContain('10.0.0.5');
  });

  it('can include internal details for App Owner infrastructure diagnostics', async () => {
    axios.get.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:11434'));

    const status = await aiService.healthCheck({ includeInternal: true });

    expect(status).toMatchObject({
      ok: false,
      configured: true,
      model: expect.any(String)
    });
    expect(status).toHaveProperty('baseUrl');
    expect(status.error).toContain('10.0.0.5');
  });
});

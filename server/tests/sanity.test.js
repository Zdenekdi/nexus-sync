const request = require('supertest');
const app = require('../src/app');

describe('API Sanity Test', () => {
  it('should return health status successfully', async () => {
    const res = await request(app).get('/health');
    expect([200, 503]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('status');
    expect(['ok', 'degraded']).toContain(res.body.status);
    expect(res.body).toHaveProperty('timestamp');
  });
});

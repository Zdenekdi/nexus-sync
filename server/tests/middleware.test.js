const request = require('supertest');

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');

const app = require('../src/app');

afterEach(() => jest.clearAllMocks());

describe('Health check', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('memory');
    expect(res.body).toHaveProperty('database', 'connected');
  });
});

describe('Auth middleware', () => {
  it('rejects requests without Authorization header', async () => {
    const res = await request(app).get('/api/profiles');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message');
  });

  it('rejects requests with malformed token', async () => {
    const res = await request(app)
      .get('/api/profiles')
      .set('Authorization', 'NotBearer token');
    expect(res.status).toBe(401);
  });

  it('rejects requests with empty Bearer', async () => {
    const res = await request(app)
      .get('/api/profiles')
      .set('Authorization', 'Bearer ');
    expect(res.status).toBe(401);
  });
});

describe('Validation middleware', () => {
  it('rejects login with invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'test' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Validation error');
    expect(res.body).toHaveProperty('errors');
  });
});

describe('404 handling', () => {
  it('returns 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('CORS', () => {
  it('allows requests from Firebase origins', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://nexus-hub.web.app');

    expect(res.headers['access-control-allow-origin']).toBe('https://nexus-hub.web.app');
  });

  it('allows requests from Capacitor origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://localhost');

    expect(res.headers['access-control-allow-origin']).toBe('https://localhost');
  });
});

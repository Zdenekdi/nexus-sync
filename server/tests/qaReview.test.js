const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
  checkout: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() }
})));

const prisma = require('../src/services/db');
const app = require('../src/app');

const token = (role) => jwt.sign(
  { userId: 'manager-1', agencyId: 'agency-1', role },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const MANAGER = { name: 'Manager', isManager: true };
const OPERATOR = { name: 'Operator', isManager: false };

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(undefined);
});

describe('Kontrola komunikace — zápis', () => {
  it('vedoucí může ohodnotit zprávu', async () => {
    prisma.message.findUnique.mockResolvedValue({
      id: 'm1', senderId: 'op-7', chat: { agencyId: 'agency-1' }
    });
    prisma.qaReview.create.mockResolvedValue({ id: 'r1', rating: 4 });

    const res = await request(app)
      .post('/api/qa/reviews')
      .set('Authorization', `Bearer ${token(MANAGER)}`)
      .send({ messageId: 'm1', rating: 4, note: 'Zbytečně strohé' });

    expect(res.status).toBe(201);
    const data = prisma.qaReview.create.mock.calls[0][0].data;
    // Kdo psal a kdo hodnotil — bez obojího nemá kontrola váhu.
    expect(data.operatorId).toBe('op-7');
    expect(data.reviewerId).toBe('manager-1');
    // Text zprávy se sem NEKOPÍRUJE, drží se odkaz.
    expect(data).not.toHaveProperty('text');
    expect(data.messageId).toBe('m1');
  });

  // Tohle je jádro věci: kdyby si operátorky mohly zapisovat hodnocení
  // navzájem, je to něco úplně jiného než nástroj pro vedoucí.
  it('operátorka hodnocení zapsat nesmí', async () => {
    const res = await request(app)
      .post('/api/qa/reviews')
      .set('Authorization', `Bearer ${token(OPERATOR)}`)
      .send({ messageId: 'm1', rating: 5 });

    expect(res.status).toBe(403);
    expect(prisma.qaReview.create).not.toHaveBeenCalled();
  });

  it('nejde hodnotit zprávu cizí agentury', async () => {
    prisma.message.findUnique.mockResolvedValue({
      id: 'm1', senderId: 'op-7', chat: { agencyId: 'jina-agentura' }
    });

    const res = await request(app)
      .post('/api/qa/reviews')
      .set('Authorization', `Bearer ${token(MANAGER)}`)
      .send({ messageId: 'm1', rating: 3 });

    expect(res.status).toBe(404);
    expect(prisma.qaReview.create).not.toHaveBeenCalled();
  });

  it('hodnocení se ořízne do rozsahu 1–5', async () => {
    prisma.message.findUnique.mockResolvedValue({ id: 'm1', senderId: 'op-7', chat: { agencyId: 'agency-1' } });
    prisma.qaReview.create.mockResolvedValue({ id: 'r1' });

    await request(app).post('/api/qa/reviews')
      .set('Authorization', `Bearer ${token(MANAGER)}`).send({ messageId: 'm1', rating: 99 });
    expect(prisma.qaReview.create.mock.calls[0][0].data.rating).toBe(5);
  });

  it('u příchozí zprávy zůstane operátorka prázdná', async () => {
    prisma.message.findUnique.mockResolvedValue({ id: 'm1', senderId: null, chat: { agencyId: 'agency-1' } });
    prisma.qaReview.create.mockResolvedValue({ id: 'r1' });

    await request(app).post('/api/qa/reviews')
      .set('Authorization', `Bearer ${token(MANAGER)}`).send({ messageId: 'm1', rating: 3 });
    expect(prisma.qaReview.create.mock.calls[0][0].data.operatorId).toBeNull();
  });
});

describe('Kontrola komunikace — čtení', () => {
  it('operátorka si hodnocení přečíst nemůže', async () => {
    const res = await request(app)
      .get('/api/qa/reviews')
      .set('Authorization', `Bearer ${token(OPERATOR)}`);

    expect(res.status).toBe(403);
    expect(prisma.qaReview.findMany).not.toHaveBeenCalled();
  });

  it('vedoucí vidí jen svou agenturu', async () => {
    prisma.qaReview.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/qa/reviews')
      .set('Authorization', `Bearer ${token(MANAGER)}`);

    expect(res.status).toBe(200);
    expect(prisma.qaReview.findMany.mock.calls[0][0].where.agencyId).toBe('agency-1');
  });

  it('dá se filtrovat na jednu operátorku', async () => {
    prisma.qaReview.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/qa/reviews?operatorId=op-7')
      .set('Authorization', `Bearer ${token(MANAGER)}`);

    expect(prisma.qaReview.findMany.mock.calls[0][0].where.operatorId).toBe('op-7');
  });
});

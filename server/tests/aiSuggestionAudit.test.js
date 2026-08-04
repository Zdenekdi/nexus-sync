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
  { userId: 'op-1', agencyId: 'agency-1', role },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const MANAGER = { name: 'Manager', isManager: true };
const OPERATOR = { name: 'Operator', isManager: false };

const groupRows = ({ sent = 0, edited = 0, discarded = 0, pending = 0 }) => ([
  { outcome: 'SENT', _count: { _all: sent } },
  { outcome: 'EDITED', _count: { _all: edited } },
  { outcome: 'DISCARDED', _count: { _all: discarded } },
  { outcome: 'PENDING', _count: { _all: pending } }
]);

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(undefined);
});

describe('Zápis výsledku návrhu', () => {
  it('operátorka nahlásí, že návrh odeslala', async () => {
    prisma.aiSuggestion.findUnique.mockResolvedValue({ id: 's1', agencyId: 'agency-1', outcome: 'PENDING' });
    prisma.aiSuggestion.update.mockResolvedValue({ id: 's1', outcome: 'SENT' });

    const res = await request(app)
      .patch('/api/ai/suggestions/s1/outcome')
      .set('Authorization', `Bearer ${token(OPERATOR)}`)
      .send({ outcome: 'SENT', messageId: 'm1' });

    expect(res.status).toBe(200);
    const data = prisma.aiSuggestion.update.mock.calls[0][0].data;
    expect(data.outcome).toBe('SENT');
    expect(data.operatorId).toBe('op-1');
    expect(data.messageId).toBe('m1');
    expect(data.decidedAt).toBeInstanceOf(Date);
  });

  // Kdyby šlo výsledek přepsat, dal by se poměr měnit zpětně — a číslo,
  // podle kterého se hodnotí model i lidé, by nic neznamenalo.
  it('jednou rozhodnutý návrh nejde přepsat', async () => {
    prisma.aiSuggestion.findUnique.mockResolvedValue({ id: 's1', agencyId: 'agency-1', outcome: 'DISCARDED' });

    const res = await request(app)
      .patch('/api/ai/suggestions/s1/outcome')
      .set('Authorization', `Bearer ${token(OPERATOR)}`)
      .send({ outcome: 'SENT' });

    expect(res.status).toBe(409);
    expect(prisma.aiSuggestion.update).not.toHaveBeenCalled();
  });

  it('neznámý výsledek se odmítne', async () => {
    const res = await request(app)
      .patch('/api/ai/suggestions/s1/outcome')
      .set('Authorization', `Bearer ${token(OPERATOR)}`)
      .send({ outcome: 'MOZNA' });

    expect(res.status).toBe(400);
    expect(prisma.aiSuggestion.findUnique).not.toHaveBeenCalled();
  });

  it('nejde rozhodnout o návrhu cizí agentury', async () => {
    prisma.aiSuggestion.findUnique.mockResolvedValue({ id: 's1', agencyId: 'jina', outcome: 'PENDING' });

    const res = await request(app)
      .patch('/api/ai/suggestions/s1/outcome')
      .set('Authorization', `Bearer ${token(OPERATOR)}`)
      .send({ outcome: 'SENT' });

    expect(res.status).toBe(404);
  });
});

describe('Statistika návrhů', () => {
  it('počítá oba poměry a rozlišuje je', async () => {
    // 6 odesláno beze změny, 2 upraveno, 2 zahozeno → rozhodnuto 10
    prisma.aiSuggestion.groupBy.mockResolvedValue(groupRows({ sent: 6, edited: 2, discarded: 2, pending: 5 }));

    const res = await request(app)
      .get('/api/ai/suggestions/stats')
      .set('Authorization', `Bearer ${token(MANAGER)}`);

    expect(res.status).toBe(200);
    expect(res.body.decided).toBe(10);
    expect(res.body.approvalRate).toBe(60);   // 6/10 — prošlo beze změny
    expect(res.body.usageRate).toBe(80);      // 8/10 — použito, byť s úpravou
    expect(res.body.generated).toBe(15);      // rozhodnuté i nerozhodnuté
  });

  // Nula by tvrdila, že model selhává. Když se ještě nic nerozhodlo,
  // není co tvrdit.
  it('bez rozhodnutých návrhů vrací null, ne nulu', async () => {
    prisma.aiSuggestion.groupBy.mockResolvedValue(groupRows({ pending: 3 }));

    const res = await request(app)
      .get('/api/ai/suggestions/stats')
      .set('Authorization', `Bearer ${token(MANAGER)}`);

    expect(res.body.approvalRate).toBeNull();
    expect(res.body.usageRate).toBeNull();
  });

  // Šablonová odpověď o kvalitě modelu nevypovídá.
  it('do statistiky jdou jen návrhy od AI, ne šablony', async () => {
    prisma.aiSuggestion.groupBy.mockResolvedValue(groupRows({ sent: 1 }));

    await request(app)
      .get('/api/ai/suggestions/stats')
      .set('Authorization', `Bearer ${token(MANAGER)}`);

    expect(prisma.aiSuggestion.groupBy.mock.calls[0][0].where.source).toBe('ai');
  });

  it('operátorka statistiku nedostane', async () => {
    const res = await request(app)
      .get('/api/ai/suggestions/stats')
      .set('Authorization', `Bearer ${token(OPERATOR)}`);

    expect(res.status).toBe(403);
    expect(prisma.aiSuggestion.groupBy).not.toHaveBeenCalled();
  });

  it('rozsah dnů se ořízne na rozumnou mez', async () => {
    prisma.aiSuggestion.groupBy.mockResolvedValue(groupRows({}));

    const res = await request(app)
      .get('/api/ai/suggestions/stats?days=9999')
      .set('Authorization', `Bearer ${token(MANAGER)}`);

    expect(res.body.days).toBe(90);
  });
});

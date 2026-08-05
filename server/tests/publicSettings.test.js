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
  { userId: 'u-1', agencyId: 'agency-1', role },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);
const OPERATOR = { name: 'Operator', isManager: false };
const OWNER = { name: 'App Owner', isAppOwner: true };

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(undefined);
});

describe('Banner údržby a globální oznámení', () => {
  // Jádro věci: kdyby to uměl přečíst jen App Owner, banner by nikoho
  // nevaroval — a to je jediné, k čemu je.
  it('přečte je i operátorka, ne jen App Owner', async () => {
    prisma.globalSetting.findMany.mockResolvedValue([
      { key: 'maintenance_mode', value: 'true' },
      { key: 'global_announcement', value: 'Odstávka ve 22:00' }
    ]);

    const res = await request(app)
      .get('/api/admin/settings/public')
      .set('Authorization', `Bearer ${token(OPERATOR)}`);

    expect(res.status).toBe(200);
    expect(res.body.maintenanceMode).toBe(true);
    expect(res.body.globalAnnouncement).toBe('Odstávka ve 22:00');
  });

  it('vrací jen ty dva klíče, ne celé nastavení', async () => {
    prisma.globalSetting.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/admin/settings/public')
      .set('Authorization', `Bearer ${token(OPERATOR)}`);

    const where = prisma.globalSetting.findMany.mock.calls[0][0].where;
    expect(where.key.in.sort()).toEqual(['global_announcement', 'maintenance_mode']);
  });

  it('chybějící hodnoty znamenají vypnuto, ne chybu', async () => {
    prisma.globalSetting.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/admin/settings/public')
      .set('Authorization', `Bearer ${token(OPERATOR)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ maintenanceMode: false, globalAnnouncement: '' });
  });

  // Nedostupné nastavení nesmí shodit aplikaci — banner prostě nebude.
  it('výpadek databáze nesmí shodit odpověď', async () => {
    prisma.globalSetting.findMany.mockRejectedValue(new Error('DB down'));

    const res = await request(app)
      .get('/api/admin/settings/public')
      .set('Authorization', `Bearer ${token(OWNER)}`);

    expect(res.status).toBe(200);
    expect(res.body.maintenanceMode).toBe(false);
  });
});

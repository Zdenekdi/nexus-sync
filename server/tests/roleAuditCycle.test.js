const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');

const prisma = require('../src/services/db');
// POZOR na pořadí requirů: `app` musí být první modul z src/, aby se controllery
// načetly ve stejném pořadí jako v produkci (authRoutes → authController →
// auditController → roleController). Kdyby si tenhle soubor vyžádal roleController
// dřív, cyklus by se otočil, roleController by dostal hotové exporty a chyba,
// kterou tenhle test hlídá, by se vůbec neprojevila.
const app = require('../src/app');

const APP_OWNER = { name: 'App Owner', isManager: true, isAppOwner: true };
const OPERATOR = { name: 'Operator', isManager: false, isAppOwner: false };

const token = (role) => jwt.sign(
  { userId: 'user-1', agencyId: 'agency-1', role },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

// Vrátí zápisy do auditu podle názvu akce.
const auditCalls = (action) =>
  prisma.auditLog.create.mock.calls.filter(([arg]) => arg?.data?.action === action);

beforeEach(() => {
  jest.clearAllMocks();
  // authMiddleware jinak přepíše roli z tokenu rolí z DB; necháme platit token.
  prisma.user.findUnique.mockResolvedValue(undefined);
});

describe('Změna oprávnění role se zapíše do auditu', () => {
  // Regrese: auditController ↔ roleController mají cyklus. Dokud roleController
  // destrukturoval logAction v top-level requiru, zachytil undefined. Volání
  // undefined(...) je až ZA prisma.role.update — oprávnění se tedy uložila,
  // handler pak spadl do catch a uživatel dostal 500. Auditní záznam o změně
  // oprávnění (bezpečnostně citlivá událost) nevznikl vůbec.
  it('úspěšná změna vrátí 200 a založí ROLE_UPDATED', async () => {
    prisma.role.findUnique.mockResolvedValue({
      id: 'role-1', name: 'Operator', agencyId: 'agency-1', permissions: '{}'
    });
    prisma.role.update.mockResolvedValue({ id: 'role-1', permissions: '{"chat":true}' });

    const res = await request(app)
      .patch('/api/agency/roles/role-1/permissions')
      .set('Authorization', `Bearer ${token(APP_OWNER)}`)
      .send({ permissions: { chat: true } });

    expect(res.status).toBe(200);

    const zapisy = auditCalls('ROLE_UPDATED');
    expect(zapisy).toHaveLength(1);
    expect(zapisy[0][0].data.agencyId).toBe('agency-1');
    expect(zapisy[0][0].data.userId).toBe('user-1');
    expect(zapisy[0][0].data.details).toContain('Operator');
  });

  it('přepnutí admin-merge vrátí 200 a založí ROLE_MERGE_TOGGLED', async () => {
    prisma.role.findUnique.mockResolvedValue({
      id: 'role-2', name: 'Manager', agencyId: 'agency-1', permissions: '{}'
    });
    prisma.role.update.mockResolvedValue({ id: 'role-2' });

    const res = await request(app)
      .patch('/api/agency/roles/role-2/toggle-admin-merge')
      .set('Authorization', `Bearer ${token(APP_OWNER)}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.merged).toBe(true);
    expect(auditCalls('ROLE_MERGE_TOGGLED')).toHaveLength(1);
  });

  // Kontrolní vzorek: assert na audit nesmí procházet "sám od sebe". Když se
  // změna zamítne, nezapisuje se nic — a test na počet zápisů to musí poznat.
  it('kontrolní vzorek: operátorka změnu neprovede a audit zůstane prázdný', async () => {
    prisma.role.findUnique.mockResolvedValue({
      id: 'role-1', name: 'Operator', agencyId: 'agency-1', permissions: '{}'
    });

    const res = await request(app)
      .patch('/api/agency/roles/role-1/permissions')
      .set('Authorization', `Bearer ${token(OPERATOR)}`)
      .send({ permissions: { chat: true } });

    expect(res.status).toBe(403);
    expect(prisma.role.update).not.toHaveBeenCalled();
    expect(auditCalls('ROLE_UPDATED')).toHaveLength(0);
  });
});

// authController má stejný destrukturující import auditControlleru, ale v cyklu
// není: načítá se jako první a auditController mu tedy vrátí hotové exporty.
// Tenhle test to drží — kdyby se pořadí requirů v app.js přeházelo tak, že se
// authController do cyklu dostane, spadne tady stejně jako spadl roleController.
describe('Kontrolní vzorek: audit z authControlleru funguje i bez opravy', () => {
  const HESLO = 'ValidPass1';
  const USER = {
    id: 'user-1',
    email: 'test@agency.com',
    name: 'Test User',
    password: '',
    agencyId: 'agency-1',
    roleId: 'role-1',
    role: { name: 'Agency Admin', isManager: true, isAppOwner: false },
    agency: { name: 'Test Agency' },
    assignedProfiles: []
  };

  beforeAll(async () => { USER.password = await bcrypt.hash(HESLO, 10); });

  it('přihlášení založí LOGIN', async () => {
    prisma.user.findUnique.mockResolvedValue(USER);
    prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1', token: 'refresh-tok' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: USER.email, password: HESLO });

    expect(res.status).toBe(200);
    expect(auditCalls('LOGIN')).toHaveLength(1);
  });
});

const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
const prismaMock = require('../src/services/db');
const authMiddleware = require('../src/middleware/authMiddleware');

afterEach(() => jest.clearAllMocks());

// #7: authMiddleware musí brát roli VŽDY z DB (autorita), ne ze snapshotu v JWT.
function runMiddleware(tokenPayload, dbUser) {
  if (dbUser !== undefined) prismaMock.user.findUnique.mockResolvedValue(dbUser);
  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  return authMiddleware(req, res, next).then(() => ({ req, res, next }));
}

describe('authMiddleware — autoritativní role z DB (#7)', () => {
  it('POVÝŠENÍ: token nese starou (nižší) roli, DB má novou (App Owner) — použije se DB', async () => {
    const { req, next } = await runMiddleware(
      { userId: 'u1', agencyId: 'a1', role: { name: 'Operator', isManager: false, isAppOwner: false } },
      { tokenVersion: 0, role: { name: 'App Owner', isManager: true, isAppOwner: true } }
    );
    expect(next).toHaveBeenCalled();
    expect(req.user.role).toEqual({ name: 'App Owner', isManager: true, isAppOwner: true });
    expect(req.user.role.isAppOwner).toBe(true);
  });

  it('DEGRADACE: token nese starou (elevated) roli, DB má nižší — elevated se ZAHODÍ', async () => {
    const { req, next } = await runMiddleware(
      { userId: 'u1', agencyId: 'a1', role: { name: 'App Owner', isManager: true, isAppOwner: true } },
      { tokenVersion: 0, role: { name: 'Operator', isManager: false, isAppOwner: false } }
    );
    expect(next).toHaveBeenCalled();
    expect(req.user.role.isAppOwner).toBe(false);
    expect(req.user.role.isManager).toBe(false);
    expect(req.user.role.name).toBe('Operator');
  });

  it('agencyId a userId z tokenu zůstávají zachované (přepisuje se jen role)', async () => {
    const { req } = await runMiddleware(
      { userId: 'u1', agencyId: 'a1', role: { name: 'Operator', isManager: false, isAppOwner: false } },
      { tokenVersion: 0, role: { name: 'Manager', isManager: true, isAppOwner: false } }
    );
    expect(req.user.userId).toBe('u1');
    expect(req.user.agencyId).toBe('a1');
  });

  it('smazaný účet (DB vrátí null): access token si ponechá roli z tokenu (graceful)', async () => {
    const { req, next } = await runMiddleware(
      { userId: 'ghost', agencyId: 'a1', role: { name: 'Operator', isManager: false, isAppOwner: false } },
      null
    );
    expect(next).toHaveBeenCalled();
    expect(req.user.role.name).toBe('Operator');
  });

  it('relay token s nesouhlasícím tokenVersion je stále odmítnut (401)', async () => {
    const { res, next } = await runMiddleware(
      { userId: 'u1', type: 'relay', tv: 0, role: { name: 'Operator' } },
      { tokenVersion: 5, role: { name: 'Operator', isManager: false, isAppOwner: false } }
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('password_reset token nesmí fungovat jako session bearer (401)', async () => {
    const { res, next } = await runMiddleware(
      { userId: 'u1', type: 'password_reset' },
      undefined
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

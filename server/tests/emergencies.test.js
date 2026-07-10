const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

const prismaMock = require('../src/services/db');
const app = require('../src/app');

function makeToken(overrides = {}) {
  return jwt.sign(
    {
      userId: 'user-1',
      agencyId: 'agency-1',
      role: { name: 'Operator', isManager: false, isAppOwner: false },
      ...overrides,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

afterEach(() => jest.clearAllMocks());

describe('emergency receipt acknowledgment', () => {
  it('uses token userId when acknowledging the current user receipt', async () => {
    prismaMock.emergencyReceipt.findUnique.mockResolvedValue({
      id: 'receipt-1',
      recipientId: 'user-1',
      event: { session: { agencyId: 'agency-1' } },
    });
    prismaMock.emergencyReceipt.update.mockResolvedValue({
      id: 'receipt-1',
      recipientId: 'user-1',
      acknowledgedAt: new Date('2026-07-10T12:00:00.000Z'),
    });

    const res = await request(app)
      .patch('/api/emergencies/receipts/receipt-1/acknowledge')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(prismaMock.emergencyReceipt.findUnique).toHaveBeenCalledWith({
      where: { id: 'receipt-1' },
      include: {
        event: {
          select: {
            session: { select: { agencyId: true } },
          },
        },
      },
    });
    expect(prismaMock.emergencyReceipt.update).toHaveBeenCalledWith({
      where: { id: 'receipt-1' },
      data: { acknowledgedAt: expect.any(Date) },
    });
  });

  it('blocks receipt acknowledgment across agency boundaries', async () => {
    prismaMock.emergencyReceipt.findUnique.mockResolvedValue({
      id: 'receipt-1',
      recipientId: 'user-1',
      event: { session: { agencyId: 'agency-2' } },
    });

    const res = await request(app)
      .patch('/api/emergencies/receipts/receipt-1/acknowledge')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ message: 'Access denied' });
    expect(prismaMock.emergencyReceipt.update).not.toHaveBeenCalled();
  });

  it('blocks users from acknowledging somebody else receipt', async () => {
    prismaMock.emergencyReceipt.findUnique.mockResolvedValue({
      id: 'receipt-1',
      recipientId: 'user-2',
      event: { session: { agencyId: 'agency-1' } },
    });

    const res = await request(app)
      .patch('/api/emergencies/receipts/receipt-1/acknowledge')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ message: 'Not your receipt' });
    expect(prismaMock.emergencyReceipt.update).not.toHaveBeenCalled();
  });
});

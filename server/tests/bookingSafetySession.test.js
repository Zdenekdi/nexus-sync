const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/safetyService');
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
  checkout: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() }
})));

const prisma = require('../src/services/db');
const app = require('../src/app');

const token = (role = { name: 'Senior Operator', isManager: true }) => jwt.sign(
  { userId: 'user-1', agencyId: 'agency-1', role },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const bookingBody = (locationType = 'outcall') => ({
  profileId: 'p1',
  title: 'Schůzka',
  startTime: '2026-09-01T19:00:00.000Z',
  endTime: '2026-09-01T21:00:00.000Z',
  locationType
});

const createdBooking = (locationType = 'outcall') => ({
  id: 'b1',
  agencyId: 'agency-1',
  profileId: 'p1',
  locationType,
  endTime: new Date('2026-09-01T21:00:00.000Z')
});

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(undefined);
  prisma.profile.findUnique.mockResolvedValue({ id: 'p1', agencyId: 'agency-1' });
  prisma.safetySession.upsert.mockResolvedValue({ id: 's-planned', state: 'PLANNED' });
});

describe('Rezervace zakládá bezpečnostní relaci', () => {
  it('výjezd dostane plánovanou relaci', async () => {
    prisma.booking.create.mockResolvedValue(createdBooking('outcall'));

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token()}`)
      .send(bookingBody('outcall'));

    expect(res.status).toBe(201);
    expect(prisma.safetySession.upsert).toHaveBeenCalledTimes(1);
    const call = prisma.safetySession.upsert.mock.calls[0][0];
    expect(call.where).toEqual({ bookingId: 'b1' });
    // PLANNED = evidovaná, ale ještě neběžící. Odpočet spustí až check-in.
    expect(call.create.state).toBe('PLANNED');
    expect(call.create.profileId).toBe('p1');
  });

  // Schůzka v provozovně má jiný rizikový profil. Kdyby relace vznikala u všeho,
  // operátorka by si jich přestala všímat.
  it('schůzka v provozovně relaci nezakládá', async () => {
    prisma.booking.create.mockResolvedValue(createdBooking('incall'));

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token()}`)
      .send(bookingBody('incall'));

    expect(res.status).toBe(201);
    expect(prisma.safetySession.upsert).not.toHaveBeenCalled();
  });

  // Rezervace je hlavní věc, relace nadstavba — selhání jedné nesmí shodit druhou.
  it('selhání relace nezabrání vytvoření rezervace', async () => {
    prisma.booking.create.mockResolvedValue(createdBooking('outcall'));
    prisma.safetySession.upsert.mockRejectedValue(new Error('DB je pryč'));

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token()}`)
      .send(bookingBody('outcall'));

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('b1');
  });

  it('posun konce schůzky se promítne do relace', async () => {
    prisma.booking.findUnique.mockResolvedValue({ id: 'b1', agencyId: 'agency-1' });
    prisma.booking.update.mockResolvedValue(createdBooking('outcall'));

    const res = await request(app)
      .patch('/api/bookings/b1')
      .set('Authorization', `Bearer ${token()}`)
      .send({ endTime: '2026-09-01T22:00:00.000Z' });

    expect(res.status).toBe(200);
    expect(prisma.safetySession.upsert).toHaveBeenCalledTimes(1);
  });
});

describe('Check-in převezme plánovanou relaci místo zakládání druhé', () => {
  // Tohle je hlavní riziko celé změny. PLANNED není mezi ACTIVE_SESSION_STATES,
  // takže by původní hledání na plánovanou relaci nesáhlo a check-in by vyrobil
  // druhou — přesně tu duplicitu, kterou má ten kód bránit.
  it('relace navázaná na rezervaci se převezme, nezaloží se nová', async () => {
    prisma.safetySession.findUnique.mockResolvedValue({ id: 's-planned', state: 'PLANNED' });
    prisma.safetySession.update.mockResolvedValue({ id: 's-planned', state: 'CHECKED_IN' });

    const res = await request(app)
      .post('/api/safety/sessions')
      .set('Authorization', `Bearer ${token()}`)
      .send({ profileId: 'p1', bookingId: 'b1' });

    expect(res.status).toBe(200);
    expect(prisma.safetySession.create).not.toHaveBeenCalled();
    expect(prisma.safetySession.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 's-planned' }
    }));
    expect(prisma.safetySession.update.mock.calls[0][0].data.state).toBe('CHECKED_IN');
  });

  it('uzavřenou relaci neoživuje — založí novou', async () => {
    prisma.safetySession.findUnique.mockResolvedValue({ id: 's-old', state: 'RESOLVED' });
    prisma.safetySession.findFirst.mockResolvedValue(null);
    prisma.safetySession.create.mockResolvedValue({ id: 's-new', state: 'CHECKED_IN' });

    const res = await request(app)
      .post('/api/safety/sessions')
      .set('Authorization', `Bearer ${token()}`)
      .send({ profileId: 'p1', bookingId: 'b1' });

    expect(res.status).toBe(201);
    expect(prisma.safetySession.create).toHaveBeenCalled();
  });

  it('bez rezervace se chová jako dřív', async () => {
    prisma.safetySession.findFirst.mockResolvedValue(null);
    prisma.safetySession.create.mockResolvedValue({ id: 's-new', state: 'CHECKED_IN' });

    const res = await request(app)
      .post('/api/safety/sessions')
      .set('Authorization', `Bearer ${token()}`)
      .send({ profileId: 'p1' });

    expect(res.status).toBe(201);
    expect(prisma.safetySession.findUnique).not.toHaveBeenCalled();
  });
});

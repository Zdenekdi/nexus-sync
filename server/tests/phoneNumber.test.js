const { getPhoneLookupValues, normalizePhoneNumber } = require('../src/utils/phoneNumber');

describe('phone number utilities', () => {
  it('normalizes Czech local mobile numbers to E.164', () => {
    expect(normalizePhoneNumber('739 777 718', { referenceNumber: '+420 773 227 907' })).toBe('+420739777718');
    expect(normalizePhoneNumber('739777718', { referenceNumber: '+420773227907' })).toBe('+420739777718');
    expect(normalizePhoneNumber('420739777718', { referenceNumber: '+420773227907' })).toBe('+420739777718');
  });

  it('builds lookup variants for already-split chat external ids', () => {
    const variants = getPhoneLookupValues('739 777 718', { referenceNumber: '+420 773 227 907' });

    expect(variants).toEqual(expect.arrayContaining([
      '739 777 718',
      '739777718',
      '+420739777718',
      '420739777718'
    ]));
  });
});

const { getPhoneLookupValues, normalizePhoneNumber } = require('../src/utils/phoneNumber');

describe('phone number utilities', () => {
  it('normalizes Czech local mobile numbers to E.164', () => {
    expect(normalizePhoneNumber('739 777 718', { referenceNumber: '+420 773 227 907' })).toBe('+420739777718');
    expect(normalizePhoneNumber('739777718', { referenceNumber: '+420773227907' })).toBe('+420739777718');
    expect(normalizePhoneNumber('420739777718', { referenceNumber: '+420773227907' })).toBe('+420739777718');
    expect(normalizePhoneNumber('0420739777718', { referenceNumber: '+420773227907' })).toBe('+420739777718');
    expect(normalizePhoneNumber('00420739777718', { referenceNumber: '+420773227907' })).toBe('+420739777718');
  });

  it('builds lookup variants for already-split chat external ids', () => {
    const variants = getPhoneLookupValues('739 777 718', { referenceNumber: '+420 773 227 907' });

    expect(variants).toEqual(expect.arrayContaining([
      '739 777 718',
      '739777718',
      '+420739777718',
      '+420 739 777 718',
      '420739777718',
      '0739777718',
      '0420739777718',
      '00420739777718'
    ]));
  });

  it('uses profile country context for UK national trunk prefixes', () => {
    expect(normalizePhoneNumber('020 7946 0018', { referenceNumber: '+44 7700 900456' })).toBe('+442079460018');

    const variants = getPhoneLookupValues('020 7946 0018', { referenceNumber: '+44 7700 900456' });
    expect(variants).toEqual(expect.arrayContaining([
      '02079460018',
      '+442079460018',
      '+44 20 7946 0018',
      '442079460018',
      '00442079460018',
      '011442079460018'
    ]));
  });

  it('handles NANP and international direct dialing prefixes outside Europe', () => {
    expect(normalizePhoneNumber('(212) 555-0101', { referenceNumber: '+1 646 555 0100' })).toBe('+12125550101');
    expect(normalizePhoneNumber('011 44 20 7946 0018', { referenceNumber: '+1 212 555 0101' })).toBe('+442079460018');
    expect(normalizePhoneNumber('0011 44 20 7946 0018', { referenceNumber: '+61 2 1234 5678' })).toBe('+442079460018');
  });

  it('preserves significant leading zeroes where the national plan requires them', () => {
    expect(normalizePhoneNumber('06 1234 5678', { referenceNumber: '+39 06 1111 2222' })).toBe('+390612345678');
  });

  it('normalizes common non-EU mobile national formats from profile context', () => {
    expect(normalizePhoneNumber('0412 345 678', { referenceNumber: '+61 2 1234 5678' })).toBe('+61412345678');
    expect(normalizePhoneNumber('09876543210', { referenceNumber: '+91 98765 43210' })).toBe('+919876543210');
  });

  it('keeps alphanumeric sender ids but accepts Arabic-Indic digits', () => {
    expect(normalizePhoneNumber('Google', { referenceNumber: '+420773227907' })).toBe('Google');
    expect(normalizePhoneNumber('+٤٢٠ ٧٣٩ ٧٧٧ ٧١٨', { referenceNumber: '+420773227907' })).toBe('+420739777718');
  });
});

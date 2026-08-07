import { describe, it, expect } from 'vitest';
import { normalizujCislo, sestavOdchoziCil, najdiDidProfilu } from './sipDial';

describe('normalizujCislo', () => {
  it('zahodí mezery, pomlčky a závorky', () => {
    expect(normalizujCislo('+420 777 111-222')).toBe('+420777111222');
    expect(normalizujCislo('(420) 777.111.222')).toBe('420777111222');
  });

  it('nespadne na tom, co číslo není', () => {
    expect(normalizujCislo(null)).toBe('');
    expect(normalizujCislo(undefined)).toBe('');
    expect(normalizujCislo({})).toBe('');
    expect(normalizujCislo(420777111222)).toBe('420777111222');
  });
});

describe('sestavOdchoziCil', () => {
  it('spojí DID a číslo klienta hvězdičkou', () => {
    expect(sestavOdchoziCil('+420777111222', '+420999888777'))
      .toEqual({ ok: true, cil: '+420777111222*+420999888777' });
  });

  it('snese číslo psané s mezerami', () => {
    expect(sestavOdchoziCil('+420777111222', '777 111 999').cil)
      .toBe('+420777111222*777111999');
  });

  it('odmítne hvězdičku v čísle klienta', () => {
    // Hvězdička je oddělovač — v čísle by rozdělila cíl jinde, než čekáme.
    expect(sestavOdchoziCil('+420777111222', '777*111')).toEqual({
      ok: false, duvod: 'nepouzitelneCislo',
    });
  });

  it('odmítne mřížku a písmena', () => {
    expect(sestavOdchoziCil('+420777111222', '777#111').ok).toBe(false);
    expect(sestavOdchoziCil('+420777111222', 'nevim').ok).toBe(false);
  });

  it('pozná, které z čísel chybí', () => {
    expect(sestavOdchoziCil(null, '+420999888777').duvod).toBe('chybiDid');
    expect(sestavOdchoziCil('+420777111222', '').duvod).toBe('chybiCislo');
  });

  it('odmítne příliš krátké číslo', () => {
    expect(sestavOdchoziCil('+420777111222', '112').ok).toBe(false);
  });

  it('odmítne vadné DID, i když přijde ze serveru', () => {
    expect(sestavOdchoziCil('neznámé', '+420999888777').duvod).toBe('nepouzitelneDid');
  });
});

describe('najdiDidProfilu', () => {
  const DIDS = [
    { number: '+420777111222', profileId: 'p1' },
    { number: '+420777333444', profileId: 'p2' },
  ];

  it('najde číslo profilu', () => {
    expect(najdiDidProfilu(DIDS, 'p2')).toBe('+420777333444');
  });

  it('porovnává i číselné id jako text', () => {
    expect(najdiDidProfilu([{ number: '+420777111222', profileId: 7 }], '7'))
      .toBe('+420777111222');
  });

  it('vrátí null, když profil číslo nemá', () => {
    expect(najdiDidProfilu(DIDS, 'p9')).toBeNull();
    expect(najdiDidProfilu(DIDS, null)).toBeNull();
    expect(najdiDidProfilu(null, 'p1')).toBeNull();
    expect(najdiDidProfilu([null, undefined], 'p1')).toBeNull();
  });
});

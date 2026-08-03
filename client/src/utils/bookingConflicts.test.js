import { describe, it, expect } from 'vitest';
import { findConflicts, overlaps, conflictingBookingIds } from './bookingConflicts';

const bk = (id, profileId, start, end) => ({ id, profileId, startTime: start, endTime: end });

describe('překryv rezervací', () => {
  it('překrývající se časy téhož profilu jsou konflikt', () => {
    const c = findConflicts([
      bk('1', 'p1', '2026-09-01T19:30:00Z', '2026-09-01T20:30:00Z'),
      bk('2', 'p1', '2026-09-01T20:00:00Z', '2026-09-01T21:00:00Z')
    ]);
    expect(c).toHaveLength(1);
    expect(c[0].profileId).toBe('p1');
  });

  // Tohle je ta hranice, kde se dá snadno udělat chyba: schůzka končí přesně
  // tehdy, kdy další začíná. To je normální den, ne dvojitá rezervace.
  it('navazující rezervace konflikt nejsou', () => {
    expect(findConflicts([
      bk('1', 'p1', '2026-09-01T18:00:00Z', '2026-09-01T19:00:00Z'),
      bk('2', 'p1', '2026-09-01T19:00:00Z', '2026-09-01T20:00:00Z')
    ])).toHaveLength(0);
  });

  it('dva různé profily ve stejný čas jsou běžný provoz', () => {
    expect(findConflicts([
      bk('1', 'p1', '2026-09-01T19:00:00Z', '2026-09-01T20:00:00Z'),
      bk('2', 'p2', '2026-09-01T19:00:00Z', '2026-09-01T20:00:00Z')
    ])).toHaveLength(0);
  });

  it('rezervace uvnitř jiné se najde taky', () => {
    expect(findConflicts([
      bk('1', 'p1', '2026-09-01T18:00:00Z', '2026-09-01T22:00:00Z'),
      bk('2', 'p1', '2026-09-01T19:00:00Z', '2026-09-01T20:00:00Z')
    ])).toHaveLength(1);
  });

  it('tři překrývající se dají tři dvojice', () => {
    expect(findConflicts([
      bk('1', 'p1', '2026-09-01T19:00:00Z', '2026-09-01T22:00:00Z'),
      bk('2', 'p1', '2026-09-01T19:30:00Z', '2026-09-01T21:00:00Z'),
      bk('3', 'p1', '2026-09-01T20:00:00Z', '2026-09-01T20:30:00Z')
    ])).toHaveLength(3);
  });

  // Rozbité datum nesmí vyrobit falešný poplach ani spadnout.
  it('nesmyslná data se přeskočí, ne aby hlásila konflikt', () => {
    expect(findConflicts([
      bk('1', 'p1', 'kdovico', '2026-09-01T20:00:00Z'),
      bk('2', 'p1', '2026-09-01T19:00:00Z', '2026-09-01T21:00:00Z'),
      { id: '3' }
    ])).toHaveLength(0);
  });

  it('prázdný vstup nespadne', () => {
    expect(findConflicts()).toEqual([]);
    expect(findConflicts([])).toEqual([]);
  });

  it('overlaps je symetrický', () => {
    const a = bk('1', 'p', '2026-09-01T19:00:00Z', '2026-09-01T21:00:00Z');
    const b = bk('2', 'p', '2026-09-01T20:00:00Z', '2026-09-01T22:00:00Z');
    expect(overlaps(a, b)).toBe(overlaps(b, a));
  });

  it('vrací id všech dotčených rezervací', () => {
    const ids = conflictingBookingIds([
      bk('1', 'p1', '2026-09-01T19:30:00Z', '2026-09-01T20:30:00Z'),
      bk('2', 'p1', '2026-09-01T20:00:00Z', '2026-09-01T21:00:00Z'),
      bk('3', 'p1', '2026-09-02T10:00:00Z', '2026-09-02T11:00:00Z')
    ]);
    expect([...ids].sort()).toEqual(['1', '2']);
  });
});

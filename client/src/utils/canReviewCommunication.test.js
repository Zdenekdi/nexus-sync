import { describe, it, expect } from 'vitest';
import { canReviewCommunication } from './canReviewCommunication';

describe('kdo smí hodnotit komunikaci', () => {
  it('vedoucí role ano', () => {
    for (const u of [
      { isAppOwner: true }, { isAdmin: true }, { isManager: true }, { isSeniorOperator: true },
      { role: 'Agency Admin' }, { role: 'Manager' }, { role: 'Senior Operator' }, { role: 'senior_operator' }
    ]) {
      expect(canReviewCommunication(u)).toBe(true);
    }
  });

  // Tohle je jádro: operátorka ani modelka nesmí vidět ovládání, které by
  // naznačovalo, že se dá hodnotit — server je stejně odmítne.
  it('operátorka a modelka ne', () => {
    for (const u of [{ role: 'Operator' }, { role: 'Model' }, { isModel: true }, {}]) {
      expect(canReviewCommunication(u)).toBe(false);
    }
  });

  it('nepřihlášený ne', () => {
    expect(canReviewCommunication(null)).toBe(false);
    expect(canReviewCommunication(undefined)).toBe(false);
  });
});

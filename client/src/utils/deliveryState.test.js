import { describe, it, expect } from 'vitest';
import { deliveryState } from './deliveryState';

describe('deliveryState', () => {
  // Tohle je ta vlastnost, kvůli které to vzniklo: nedoručená zpráva vypadala
  // stejně jako doručená, takže operátorka byla přesvědčená, že klient zprávu má.
  it('selhání není poznat jen podle barvy — má ikonu i vlastní popisek', () => {
    const s = deliveryState('failed');
    expect(s.kind).toBe('failed');
    expect(s.showIcon).toBe(true);
    expect(s.label).toBe('notDelivered');
  });

  it('u selhání se nabídne odeslat znovu', () => {
    expect(deliveryState('failed').showResend).toBe(true);
  });

  it('u žádného jiného stavu se odeslat znovu nenabízí', () => {
    for (const s of ['sent', 'delivered', 'read', 'pending_relay', undefined]) {
      expect(deliveryState(s).showResend).toBeFalsy();
    }
  });

  it('rozlišuje odesláno od doručeno', () => {
    expect(deliveryState('sent').kind).toBe('sent');
    expect(deliveryState('delivered').kind).toBe('delivered');
    expect(deliveryState('read').kind).toBe('delivered');
  });

  it('čekání ve frontě relaye má vlastní stav', () => {
    expect(deliveryState('pending_relay').kind).toBe('pending');
  });

  // Neznámý stav nesmí tvrdit, že je doručeno.
  it('neznámý stav nic netvrdí', () => {
    expect(deliveryState('kdovico').kind).toBe('none');
    expect(deliveryState(null).kind).toBe('none');
  });
});

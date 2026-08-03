/**
 * Stav doručení odchozí zprávy → co se má ukázat.
 *
 * Vytaženo z JSX schválně: tohle je jediné místo, kde se rozhoduje, jestli
 * operátorka pozná, že zpráva nedorazila. Kolem je jen pár řádků značek, ale
 * tahle tabulka je to podstatné — a jde otestovat bez vykreslování.
 *
 * Hodnoty stavů odpovídají tomu, co zapisuje server: 'pending_relay' při
 * zařazení do fronty, 'sent'/'failed' hlásí relay telefon přes
 * PATCH /api/messages/:id/status, 'delivered'/'read' příchozí cesta.
 */
export const DELIVERY_UNKNOWN = { kind: 'none' };

export function deliveryState(status) {
  switch (status) {
    case 'failed':
      // Nikdy jen barva. Kdo barvy nerozliší nebo jen přejede očima po hustém
      // výpisu, si červené bubliny nevšimne — proto ikona, věta i akce.
      return { kind: 'failed', label: 'notDelivered', showIcon: true, showResend: true };
    case 'pending_relay':
      return { kind: 'pending', label: 'sending', showIcon: true, showResend: false };
    case 'delivered':
    case 'read':
      return { kind: 'delivered', label: 'delivered', showIcon: true, showResend: false };
    case 'sent':
      return { kind: 'sent', label: 'sent', showIcon: true, showResend: false };
    default:
      return DELIVERY_UNKNOWN;
  }
}

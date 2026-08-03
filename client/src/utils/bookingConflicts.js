/**
 * Překrývající se rezervace jednoho profilu.
 *
 * Návrh chce upozornění „Klára má 19:30 i 20:00 na dvou adresách". Je to
 * jediná věc na kalendáři, kterou jde postavit z dat, co v systému opravdu
 * jsou (Booking má profileId, startTime, endTime) — a zároveň ta, kde chyba
 * bolí nejvíc: dvojitě zarezervovaná schůzka znamená, že někdo někam nedorazí
 * a nikdo o tom neví, dokud nezavolá klient.
 *
 * Záměrně se porovnává jen v rámci jednoho profilu. Dvě různé profily ve
 * stejný čas jsou normální provoz, ne konflikt.
 */

const toTime = (value) => {
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
};

/** Dotýkající se rezervace (konec = začátek) konflikt nejsou. */
export function overlaps(a, b) {
  const aStart = toTime(a?.startTime), aEnd = toTime(a?.endTime);
  const bStart = toTime(b?.startTime), bEnd = toTime(b?.endTime);
  if (aStart === null || aEnd === null || bStart === null || bEnd === null) return false;
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Vrátí dvojice rezervací téhož profilu, které se překrývají.
 * @returns {Array<{profileId: string, a: object, b: object}>}
 */
export function findConflicts(bookings = []) {
  const byProfile = new Map();
  for (const b of bookings) {
    if (!b || !b.profileId) continue;
    if (toTime(b.startTime) === null || toTime(b.endTime) === null) continue;
    if (!byProfile.has(b.profileId)) byProfile.set(b.profileId, []);
    byProfile.get(b.profileId).push(b);
  }

  const conflicts = [];
  for (const [profileId, items] of byProfile) {
    const sorted = [...items].sort((x, y) => toTime(x.startTime) - toTime(y.startTime));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        // Seřazeno podle začátku: jakmile další začíná po konci téhle,
        // nemůže se překrývat už žádná další.
        if (toTime(sorted[j].startTime) >= toTime(sorted[i].endTime)) break;
        if (overlaps(sorted[i], sorted[j])) {
          conflicts.push({ profileId, a: sorted[i], b: sorted[j] });
        }
      }
    }
  }
  return conflicts;
}

/** Množina id rezervací, které jsou v nějakém konfliktu — pro označení v mřížce. */
export function conflictingBookingIds(bookings = []) {
  const ids = new Set();
  for (const c of findConflicts(bookings)) {
    if (c.a?.id) ids.add(c.a.id);
    if (c.b?.id) ids.add(c.b.id);
  }
  return ids;
}

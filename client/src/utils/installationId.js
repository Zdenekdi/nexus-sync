// Stabilní ID instalace zařízení (pseudo-IMEI pro phone-tracking, device binding).
// Zdroj pravdy je localStorage['nexus_installation_id'].

export function generateSecureInstallationId() {
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return `inst_${Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

// Vrátí installationId; když ještě neexistuje, vygeneruje ho a uloží.
// Používej všude, kde se ID potřebuje — ať se funkce (hlavně bezpečnostní
// sledování polohy) nespustí „naprázdno" jen proto, že ID nebylo nastaveno.
export function getOrCreateInstallationId() {
  try {
    let id = localStorage.getItem('nexus_installation_id');
    if (!id) {
      id = generateSecureInstallationId();
      localStorage.setItem('nexus_installation_id', id);
    }
    return id;
  } catch {
    return generateSecureInstallationId();
  }
}

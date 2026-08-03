/**
 * nexusRelay.js
 *
 * Jediné místo, kde se registruje Capacitor plugin „NexusRelay".
 *
 * Registroval se na třech místech naráz (NexusSms.js, RelaySmsModal.jsx,
 * phoneTracker.js), takže Capacitor při startu hlásil „Cannot register plugins
 * twice" a druhou i třetí registraci zahodil. Které definici se tím pádem
 * poslouchá, rozhodovalo pořadí importů — a nebylo to jedno:
 *
 *   NexusSms.js       měl kompletní webový stub
 *   RelaySmsModal.jsx měl `{ web: {} }`, tedy PRÁZDNÝ
 *   phoneTracker.js   neměl žádný
 *
 * Kdyby se prosadila některá z posledních dvou, volání na webu by místo
 * bezpečné výchozí hodnoty spadla. Fungovalo to jen shodou okolností.
 */
import { registerPlugin } from '@capacitor/core';

export const NexusRelay = registerPlugin('NexusRelay', {
  // Webový stub — vrací bezpečné výchozí hodnoty, aby appka v prohlížeči
  // nepadala na tom, že nativní plugin není k dispozici.
  web: {
    isDefaultSmsApp:      async () => ({ isDefault: false }),
    requestDefaultSmsApp: async () => ({}),
    isDefaultDialer:      async () => ({ isDefault: false }),
    requestDefaultDialer: async () => ({}),
    configureRelay:       async () => ({}),
    syncHistory:          async () => ({ synced: 0, failed: 0, skipped: 0 }),
    getSmsHistory:        async () => ({ messages: [] }),
    sendSms:              async () => ({ sent: false }),
    markSmsAsRead:        async () => ({}),
    startLocationTracking: async () => ({ started: false }),
    stopLocationTracking:  async () => ({}),
    addListener:          () => ({ remove: async () => {} })
  }
});

export default NexusRelay;

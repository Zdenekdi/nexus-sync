// Připravenost telefonu na sledování polohy na pozadí.
//
// Samotné povolení polohy nestačí: aby služba běžela i se zhasnutou obrazovkou,
// musí být poloha povolená „vždy", zapnutá oznámení (foreground service),
// vypnutá bateriová optimalizace a na OEM nadstavbách (MIUI/EMUI/ColorOS…)
// povolený autostart. Když něco chybí, sledování se tiše zastaví — což je
// u bezpečnostní funkce to nejhorší možné chování.
//
// Tenhle modul stav zjistí a nabídne akce, které uživatele dovedou na správnou
// systémovou obrazovku. Průvodce nad tím staví TrackingSetupGuide.

import { Capacitor } from '@capacitor/core';
import { NexusRelay } from '../plugins/nexusRelay';
import { Geolocation } from '@capacitor/geolocation';



const WEB_READINESS = {
  supported: false,
  fineLocation: true,
  backgroundLocation: true,
  notifications: true,
  batteryUnrestricted: true,
  autostartSupported: false,
  manufacturer: '',
};

/**
 * Zjistí stav všech podmínek. Na webu vrací „vše ok" — průvodce tam nedává smysl
 * (běh na pozadí řeší jen nativní aplikace).
 */
export async function getTrackingReadiness() {
  if (!Capacitor.isNativePlatform()) return { ...WEB_READINESS };
  try {
    const r = await NexusRelay.checkTrackingReadiness();
    return {
      supported: true,
      fineLocation: !!r.fineLocation,
      backgroundLocation: !!r.backgroundLocation,
      notifications: !!r.notifications,
      batteryUnrestricted: !!r.batteryUnrestricted,
      autostartSupported: !!r.autostartSupported,
      manufacturer: r.manufacturer || '',
    };
  } catch {
    // Starší build bez těchto metod — nebudeme blokovat, jen průvodce nenabídneme.
    return { ...WEB_READINESS };
  }
}

/** Chybí něco, bez čeho sledování spolehlivě nepoběží? (autostart neumíme ověřit) */
export function isReadinessBlocking(readiness) {
  if (!readiness?.supported) return false;
  return !readiness.fineLocation || !readiness.backgroundLocation
    || !readiness.notifications || !readiness.batteryUnrestricted;
}

/** Systémový dialog pro polohu (fine). Pro „vždy" je pak potřeba nastavení aplikace. */
export async function requestLocationPermission() {
  try {
    await Geolocation.requestPermissions();
  } catch { /* uživatel odmítl / plugin nedostupný */ }
}

/** Detail aplikace v nastavení — tady se přepíná poloha na „Povolit vždy" a oznámení. */
export async function openAppSettings() {
  try { await NexusRelay.openAppSettings(); } catch { /* ignore */ }
}

/** Systémový dialog „ignorovat optimalizaci baterie". */
export async function requestBatteryExemption() {
  try { await NexusRelay.requestIgnoreBatteryOptimization(); } catch { /* ignore */ }
}

/** Obrazovka autostartu na OEM nadstavbách. Vrací false, když ji zařízení nemá. */
export async function openAutostartSettings() {
  try {
    const r = await NexusRelay.openAutostartSettings();
    return !!r?.opened;
  } catch {
    return false;
  }
}

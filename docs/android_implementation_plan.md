# Implementační plán: Nexus Hub Android App

Tento plán popisuje technickou realizaci mobilní aplikace pro sytém Nexus Hub s důrazem na bezpečnost modelek a efektivitu operátorek.

---

## Fáze 1: Inicializace a Hybridní základ
*   **Technologie**: Ionic Capacitor + React (stávající UI).
*   **Kroky**:
    1.  Instalace `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`.
    2.  Konfigurace `capacitor.config.json` (ID: `com.nexus.hub`).
    3.  Vytvoření `android` projektu přes `npx cap add android`.
    4.  Nastavení ikon a splash screenu (branding viz App.jsx).

## Fáze 2: Biometrika a Push Notifikace
*   **Biometrika**: Implementace `@capacitor-community/fingerprint-auth` pro rychlé a bezpečné přihlášení bez hesla.
*   **Notifikace**: Propojení s Firebase Cloud Messaging (FCM) pro okamžité upozornění na zprávy, které se zobrazí jako interaktivní bannery s možností rychlé odpovědi.

## Fáze 3: Integrovaný Forwarder (SMS & Hovory)
*   **Nativní pluginy**: Vytvoření/použití pluginů pro `android.permission.RECEIVE_SMS` a `android.permission.READ_PHONE_STATE`.
*   **Foreground Service**: Vývoj služby běžící na pozadí, která:
    1.  Interceptuje příchozí SMS a odesílá `POST` na `https://nexus-api.myvnc.com/api/device/mobile/sms`.
    2.  Monitoruje stavy hovorů (RINGING) a odesílá alerty na `.../call`.
    3.  Udržuje spojení se Socket.io i při zamknutém telefonu (Wakelock).

## Fáze 4: Bezpečnostní modul (Safety Guard)
*   **Logika Outcallu**: Funkce v aplikaci porovná `address` schůzky s polem `BASE_ADDRESSES` (uloženo v configu). Pokud se nerovnají, aktivuje se režim **VÝJEZD**.
*   **Časovač (The Timer)**: 
    1.  Při "Potvrzení příchodu" (`check-in`) se v aplikaci i na serveru spustí odpočet.
    2.  **T=0 (Plánovaný konec)**: Aplikace vyvolá `AlarmManager` s vysokou prioritou, který spustí zvuk upozornění ("budík").
    3.  **T+10 min (Eskalace)**: Pokud nedošlo k `check-outu` (ukončení), server vyvolá `EMERGENCY_ALERT`. Manažerovi se na Dashboardu zobrazí červené blikající upozornění s mapou a fotkou modelky.

## Fáze 5: GPS Sledování a Externí Trackery
*   **Nativní sledování**: Integrace `@capacitor/geolocation`. 
    *   **Standby**: Poloha jednou za 15 min.
    *   **Intense (během Outcallu)**: Poloha každých 60 sekund (volitelné v nastavení).
*   **External API**: Backendový mikro-servis pro periodické dotazování na API třetích stran (iSharing, Trackimo) a ukládání polohy do PostgreSQL/SQLite.

## Fáze 6: UI Refactor pro mobil
*   **Inbox v mobilu**: Optimalizace seznamu zpráv pro ovládání palcem, gesta pro rychlé AI odpovědi.
*   **Meeting Navigator**: Tlačítko "Navigovat", které otevře Google Mapy přímo se souřadnicemi zadanými v rezervaci.
*   **Earnings Widget**: Kompaktní zobrazení dnešního výdělku na domovské obrazovce aplikace.

---

## Časový odhad (MVP)
*   **Fáze 1-3 (Core App & Forwarder)**: 2-3 týdny.
*   **Fáze 4-5 (Safety & GPS)**: 2 týdny.
*   **Fáze 6 (UI Polish)**: 1 týden.
*   **Celkem**: ~5-6 týdnů pro plně funkční produkční verzi.

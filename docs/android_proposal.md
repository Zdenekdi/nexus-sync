# Návrh: Mobilní aplikace Nexus Hub pro Android

Cílem je vytvořit nativní (nebo hybridní) mobilní prostředí, které maximalizuje efektivitu operátorek a poskytuje modelkám okamžitý přehled o jejich práci bez nutnosti používat prohlížeč.

## 1. Technologický přístup
Doporučuji použít **Capacitor** (v kombinaci s vaším stávajícím React kódem) nebo **React Native**. 
*   **Proč?** Umožní to znovu použít 80 % vaší stávající logiky a designu, ale získáme přístup k nativním funkcím telefonu (Push notifikace, vibrační vzorce, běh na pozadí).

---

## 2. Klíčové funkce pro Operátorky (Chat & Hovory)
Pro operátorku je nejdůležitější **rychlost** a **pohodlí**.

*   **Interaktivní Push Notifikace**: Operátorka může odpovědět na zprávu přímo z oznamovací lišty telefonu, aniž by musela aplikaci otevírat.
*   **Unified Chat Interface**: Optimalizovaný seznam chatů s podporou gest (swipe doprava pro archivaci, swipe doleva pro rychlou AI odpověď).
*   **Plovoucí hlavy (Chat Heads)**: Podobně jako Messenger, aplikace může mít "bublinu" na ploše, která umožní bleskově přepínat mezi chaty, i když je operátorka v jiné aplikaci.
*   **Hlasový přepis (Speech-to-Text)**: Integrované tlačítko pro diktování zpráv, které AI automaticky přeloží a zformátuje.
*   **Smart Call Handling**: Při příchozím hovoru na synchronizovaný telefon se na displeji operátorky okamžitě zobrazí karta klienta (jméno, poznámky z QA Hubu, historie plateb).

---

## 3. Klíčové funkce pro Modelky (Program & Informace)
Modelka potřebuje **jasné informace** a **pocit bezpečí**.

*   **Booking Dashboard**: Přehledný kalendář s itinerářem na daný den. U každé schůzky vidí:
    *   Čas a místo (s odkazem na Google Mapy).
    *   Detaily o klientovi a jeho preferencích z QA Hubu.
    *   Dojednanou cenu a typ služby.
*   **Earnings Tracker**: Živý graf výdělků a bonusů. Modelka vidí, kolik si už vydělala a kolik jí zbývá do splnění týdenního cíle.
*   **Outcall (Výjezd)**: Režim aktivovaný automaticky, pokud je schůzka mimo adresy přednastavené v rychlých odpovědích.
*   **Safety Guard (Bezpečnostní pojistka)**: 
    *   **Ihned (Konec času schůzky)**: Aplikace na telefonu modelky začne nahlas zvonit jako budík/časovač. Slouží to jako signál pro ni i klienta, že čas vypršel.
    *   **+ 10 minut (Alarm pro manažera)**: Pokud modelka do 10 minut od vypršení času schůzky ručně nedeaktivuje "automatické upozornění" (neprovede checkout), systém odešle urgentní notifikaci manažerovi a operátorce s její aktuální GPS polohou.
*   **Panic Button**: Diskrétní tlačítko pro okamžité vyvolání poplachu v nouzové situaci.
*   **Direct Sync**: Možnost nahrávat nové fotky do galerie přímo z foťáku telefonu (synchronizace s Web Profiles).

---

## 4. Integrovaný Forwarder (Konec aplikací třetích stran)
Toto je největší výhoda nativní aplikace. Namísto nastavování SMS Forwarderu nebo Automate by **Nexus Hub App** dělala vše sama:

*   **Nativní oprávnění**: Při prvním spuštění aplikace požádá o přístup k `READ_SMS` a `READ_CALL_LOG`.
*   **Běh na pozadí (Foreground Service)**: Aplikace poběží jako "služba" s malou ikonkou v liště, která zajistí, že hovory a SMS budou odesílány na API i v případě, že je telefon zamknutý nebo je aplikace "zavřená".
*   **Zero Configuration**: Uživatel jen zadá své př přihlašovací údaje a telefon se automaticky stane "aktivním uzlem" (Relay Hub). Žádné složité kopírování URL adres webhooků.

---

## 5. Integrace GPS Trackerů a třetích stran
Pro maximální bezpečnost lze do aplikace napojit data z externích trackerů:

*   **Mobilní trackery (iSharing, Life360)**: Pokud modelky používají tyto aplikace, můžeme přes jejich API vytáhnout polohu přímo do vašeho Dashboardu v Nexus Hubu.
*   **Hardwarové trackery (Trackimo, Spytec)**: Integrace s fyzickými GPS lokátory. Manažer pak uvidí polohu všech modelek na mapě v reálném čase přímo v "Hierarchy" view.
*   **Nativní sledování**: Aplikace Nexus Hub bude odesílat GPS souřadnice na pozadí.
    *   **Volitelný "Intenzivní režim"**: Modelka si může v nastavení zvolit, zda chce tento režim využívat.
    *   **Automatická aktivace**: Při **Outcallu** (schůzka mimo známou adresu) se tento režim aktivuje automaticky. V tomto režimu odesílá telefon polohu každou 1 minutu (nebo dle nastavení) až do potvrzení konce schůzky, což zajišťuje maximální dohled v terénu.

---

## 6. Postup implementace (Roadmapa)

1.  **Fáze 1: Bridge & Auth**: Propojení stávajícího React webu s Capacitor objektem. Zprovoznění nativního přihlášení a Firebase Cloud Messaging (Push notifikace).
2.  **Fáze 2: Mobilní UI Refactoring**: Úprava Inboxu pro mobilní gesta a vytvoření dedikovaného mobilního dashboardu pro modelky.
3.  **Fáze 3: Nativní moduly**: Implementace Voice-to-Text a Call Overlay (překrytí obrazovky při hovoru).
4.  **Fáze 4: Offline módy**: Ukládání klíčových informací o schůzkách do offline paměti telefonu (pro případ špatného signálu u modelky).

---

Tento přístup zajistí, že si zachováte **jeden zdroj kódu** pro web i mobil, ale uživatelé budou mít pocit, že používají plnohodnotnou "Appku".

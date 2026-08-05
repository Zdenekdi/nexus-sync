# Co komponenty čekají od kontextu a nedostanou

Vzniklo jako vedlejší produkt auditu mocků. Když se schránka v testech
konečně naplnila daty, spadl mobilní běh — a příčina nebyla v testech, ale
v tom, že `NexusContext` nevystavuje `mobileView`/`setMobileView`, na které
`InboxView` spoléhá. Ukázalo se, že to není ojedinělé.

## Jak to vypadá

Komponenty si berou hodnoty z kontextu s výchozími hodnotami:

```js
const { isTimerActive = false, handleCheckIn = () => {}, … } = useNexus();
```

Když kontext takové jméno nevystaví, **nespadne nic**. Použije se výchozí
hodnota: příznak zůstane `false`, obsluha je prázdná funkce. Tlačítko se
vykreslí, jde na něj kliknout a neudělá nic. Žádná chyba v konzoli, žádný
červený test.

## Rozsah

`NexusContext` vystavuje 163 jmen. Napříč komponentami je **64 jmen, která
se rozbalují z kontextu, používají v těle komponenty a kontext je nedává**:

| Soubor | Počet | Jména |
|---|---|---|
| `Views/CalendarView.jsx` | 12 zbývá | `setIsBookingModalOpen`, `handleExportICS`, `handleCheckIn`, `handleCheckOut`, `handleEditBooking`, `handleDeleteBooking`, `isTimerActive`, `activeTimerEvent`, `timeLeft`, `handleSafetyImOk`, … |
| `Views/SettingsView.jsx` | 8 | `agencySettings`, `updateAgencySettings`, `departureIntervalMin`, `isMaintenanceMode`, `globalAnnouncement`, … |
| `Views/WebProfilesView.jsx` | 7 | `assignedProfiles`, `handleSaveCredentials`, `isSyncing`, `syncStatus`, `relayOnline`, `handleSyncAll` |
| `Views/GlobalFeaturesView.jsx` | 7 | `globalFeatures`, `globalSettings`, `isTraining`, `onStartTraining`, `handleUpdateGlobalSetting` |
| `Views/ProfilesView.jsx` | 5 | `setProfiles`, `assigningProfile`, `toggleOperatorStatus`, `handleSaveAssignees` |
| `Views/InboxView.jsx` | 5 | `isTranslating`, `setInlinePanelTab`, `bookingSchedule`, `setNewBookingForm`, `translateTargetLang` |
| `Modals/GlobalModalContainer.jsx` | 4 | `isBookingModalOpen`, `newBookingForm`, `handleSaveBooking`, `isPinModalOpen` |
| `DashboardHome.jsx` | 3 | `calendar`, `setLinkedSessionId`, `pendingNotifications` |
| `QAView.jsx` | 2 | `clientNames`, `updateClientName` |
| `Views/AgenciesView.jsx` | 2 | `fetchAllReferrals`, `handleConfirmReferral` |
| `UI/SystemBanners.jsx` | 1 | `isMaintenanceMode` |

## Co je ověřené a co ne

**Ověřeno za běhu (ne jen čtením kódu):**

- **Mobilní schránka** — po kliknutí na konverzaci se detail neotevřel.
  Opraveno; stav existoval pod `_mobileView`, jen se nikam nepředal.
- **Kalendář** — klik na „Přidat akci" nezměnil stránku ani neotevřel okno.
  Opraveno u těch jmen, která `useNexusData` už vracelo (12: okno rezervace,
  ICS export, synchronizace kalendáře). Zbylých 8 z kalendáře je z druhé
  skupiny — neexistují nikde a je potřeba je napsat.

**Zbytek je statický nález.** Tabulka říká, že jméno chybí a komponenta ho
používá — neříká, jak moc to v praxi vadí. Než se kterákoli položka
prohlásí za chybu, patří ji ověřit v prohlížeči; některé větve nemusí být
dosažitelné a některá jména můžou být pozůstatek.

## Původ

Chybějící jména jsou dvojího druhu:

1. **`useNexusData` je vrací, kontext je nepřepošle.** `NexusContext`
   si z hooku vybírá jednotlivé hodnoty (`nexusData.profiles`,
   `nexusData.operators` …) místo rozprostření celého objektu. Co se
   nevyjmenuje, to se ztratí.
2. **Neexistují nikde.** Například `handleCheckIn`, `handleCheckOut`
   nebo celý odpočet v kalendáři — komponenta je čeká, ale nikdo je
   nenapsal.

První skupina je otázka doplnění řádku, druhá je práce na úrovni funkce.

## Jak si seznam vygenerovat znovu

Skript porovná klíče v objektu `value` v `NexusContext.jsx` s tím, co si
komponenty rozbalují z `useNexus()`, a nechá jen jména, která se v těle
komponenty opravdu používají. Pozor na dvě pasti, na které jsem naletěl:

- výchozí hodnoty typu `() => {}` obsahují složenou závorku, takže
  `[^}]*` rozbalení uřízne — je potřeba párovat závorky;
- `re.findall` s oddělovačem ve vzoru přeskakuje každé druhé jméno,
  protože si oddělovač „sní" — je potřeba pohled dopředu.

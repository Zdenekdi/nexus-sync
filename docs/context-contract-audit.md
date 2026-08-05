# Co komponenty čekají od kontextu a nedostanou

Vzniklo jako vedlejší produkt auditu mocků. Když se schránka v testech
konečně naplnila daty, spadl mobilní běh — a příčina nebyla v testech, ale
v tom, že `NexusContext` nevystavoval `mobileView`/`setMobileView`, na které
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

| | před | po |
|---|---|---|
| kontext vystavuje | 175 jmen | **205** |
| chybí komponentám | 76 | **43** |
| z toho stačí přeposlat | 29 | **4** |

Opraveno 33 výskytů. Zbylé čtyři, které by stačilo přeposlat, jsou
odložené schválně: `hasHydrated` a `isDataLoading` v `App.jsx` (načítací
brána, viz níže) a `isBackgroundLoading`, který rozsvítí načítací kostry
dashboardu — a s nimi zmizí panel týmového chatu. Ověřeno izolovaně: s ním
padá o jeden test víc než na masteru, bez něj sedí množina padajících
přesně. Ty kostry mají smysl, ale nejdřív je potřeba zjistit, proč se při
překreslení ztrácí chat.

## Co je ověřené za běhu

Ne čtením kódu, ale v prohlížeči:

- **Mobilní schránka** — po kliknutí na konverzaci se detail neotevřel.
  `setMobileView('chat')` byla prázdná funkce, `mobileView` zůstal `'list'`
  a podmínka na `InboxView.jsx:534` byla trvale nepravdivá. Opraveno.
- **Kalendář** — klik na „Přidat akci" nezměnil stránku ani neotevřel okno.
  Opraveno, hlídá to spec `calendar_booking`.

Zbytek tabulky je statický nález: jméno chybí a komponenta ho používá.
Neříká, jak moc to v praxi vadí — než se položka prohlásí za chybu, patří
ji ověřit v prohlížeči.

## Co zbývá (43)

| Soubor | Počet | Co je zač |
|---|---|---|
| `Views/CalendarView.jsx` | 12 | check-in/out, úpravy a mazání rezervací, celý bezpečnostní odpočet |
| `Views/InboxView.jsx` | 7 | překladový panel, `startCall` |
| `DashboardHome.jsx` | 4 | oznámení, `isRelayVariant`, `setLinkedSessionId` |
| `Modals/GlobalModalContainer.jsx` | 4 | PIN okno — celá čtveřice včetně příslibu |
| `Views/SettingsView.jsx` | 4 | režim údržby, globální oznámení |
| `UI/SystemBanners.jsx` | 2 | tytéž dvě — banner nemá čím být zapnutý |
| `Views/ProfilesView.jsx` | 2 | `assigningProfile` |
| `Views/AgenciesView.jsx` | 2 | doporučení (referrals) |
| `QAView.jsx`, `Navigation/ViewRouter.jsx` | 2 | `updateClientName`, `isTvMode` |
| `App.jsx` | 2 | `hasHydrated`, `isDataLoading` |

**Žádné z nich nevrací `useNexusData`.** Nejde tedy o zapomenutý řádek, ale
o stav a logiku, které nikdo nenapsal. Doplnit je znamená rozhodnout, jestli
tu funkci chceme — nebo z UI odstranit ovládání, které nic nedělá.

### `App.jsx` je zvláštní případ

`hasHydrated` a `isDataLoading` **by stačilo přeposlat**, ale schválně to
neděláme jedním tahem se zbytkem. Na řádku 203 stojí:

```js
const isSyncing = isLoggedIn && isDataLoading && !hasHydrated;
```

a na 262 `if (isSyncing)` vrací načítací obrazovku. Dnes jsou obě proměnné
`undefined`, takže se brána nikdy nezavře a aplikace se vykreslí okamžitě.
Přeposláním by se zapnula — což je změna chování při startu, ne oprava
vzhledu, a může rozbít přihlašovací pomocník ve zhruba dvaceti specech.
Patří to do samostatného zadání s vlastním ověřením.

## `useUILogic.js` je mrtvý kód

Hook o 156 řádcích, který **nevolá nikdo**. Vrací 45 jmen a na první pohled
vypadá jako chybějící drát — je mezi nimi `startCall`, `activeContextTab`,
překladový panel i `assigningProfile`.

Zapojit ho ale nejde: **15 z těch 45 jmen kontext už poskytuje jinak**
(`mobileView`, `handleSyncAll`, `isTraining`, `syncStatus` …), takže by
vznikly dva zdroje pravdy. Je to duplikát, který nahradil `useNexusData`.
Patří ke smazání, ne k zapojení.

## Jak si seznam vygenerovat znovu

Skript porovná klíče objektu `value` v `NexusContext.jsx` s tím, co si
komponenty rozbalují z `useNexus()`, a nechá jen jména, která se v těle
komponenty opravdu používají.

**Na čtyři pasti jsem při psaní té analýzy naletěl a stály mě chybná čísla,
která jsem musel odvolat:**

1. Výchozí hodnoty typu `() => {}` obsahují složenou závorku, takže
   `[^}]*` rozbalení uřízne — je potřeba párovat závorky.
2. `re.findall` s oddělovačem ve vzoru přeskakuje každé druhé jméno,
   protože si oddělovač „sní" — je potřeba pohled dopředu.
3. Vzor `^\s*(jméno)` bere z každého řádku jen **první** jméno; řádek
   `a, b, c,` se počítá jako jedno. Dělit je nutné čárkou v hloubce 0.
4. Návrat hooku **není** poslední `return {` v souboru — ten je vnořený
   v pomocné funkci. `useNexusData` končí `return useMemo(() => ({`.

A při odstraňování řetězců je potřeba zakázat přeskakování konců řádků
(`[^'\\\n]`), jinak jediný apostrof spolyká stovky řádků kódu.

Kontrola, že analýza funguje: vzorek jmen, která v kontextu **jsou**
(`isMobile`, `selectedChatId`, `profiles`), musí vyjít jako přítomná, a
vzorek těch, která tam **nejsou**, jako chybějící. Bez téhle kontroly se
nedá věřit ničemu, co skript vypíše.

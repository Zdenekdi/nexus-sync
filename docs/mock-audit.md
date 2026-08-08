# Audit mocků proti skutečnému API

Porovnání `tests/helpers/mocks.js` s tím, co server doopravdy vystavuje.

## Proč se nesrovnalosti nedaly poznat

`setupApiMocks` registruje jako první výchozí zachytávač na všechno, co
obsahuje `/api/`, `:5000/` nebo `/auth/`. Vrací `200` a prázdné pole:

```js
body: JSON.stringify([])  // Empty array is safer than object for list-based views
```

Zamýšlené je to rozumně — nemockovaný požadavek nezpůsobí 404 ani zaseknutí.
Důsledek je ale ten, že **zapomenutý endpoint je k nerozeznání od endpointu,
který legitimně nemá co vrátit**. UI vykreslí prázdný stav, test na něm projde.

Zachytávač teď při prvním výskytu vypíše, co se do něj propadlo:

```
⚠️  [Mock API] NEMOCKOVÁNO → vracím []: /api/sip/config
```

Prázdné pole vrací dál — zpřísnění na chybu by rozbilo celou sadu naráz.

## Co se našlo

### Schránka neexistovala (opraveno)

Mock měl rutu `**/chat/conversations`. Takový endpoint **nemá server ani
klient** — nikdo ho nikdy nevolal. Skutečné volání je `GET /api/chats`
(`chatController.getChats`), a to se propadalo do zachytávače.

Schránka byla proto v každém testu prázdná. Všechny tři testy v
`operator_chat.spec.js` byly schované za `if (await chatItem.isVisible())`,
podmínka nikdy neplatila a testy odbavovaly zelenou, aniž by cokoli ověřily.

Když se ruta doplnila ve správném tvaru, jeden z nich okamžitě spadl: čekal
`chat-panic-button` bezpodmínečně, jenže to tlačítko je v `InboxView.jsx`
podmíněné `activeOperator?.isModel`. Nouzové tlačítko patří tomu, kdo je
v terénu, ne vedoucí u počítače. Test byl osm měsíců špatně a nešlo to poznat.

### Tvar zpráv neodpovídal modelu (opraveno)

Mock na `**/messages/**` vracel `{ id, content, sender: 'model', createdAt }`.
Model `Message` má `text`, `direction`, `transport`, `status` a `sender` jako
objekt `{ id, name }`. Ani jedno pole nesedělo. Klient čte `latest.text`,
takže se každá zpráva vykreslila jako „No messages".

### Na telefonu nešlo otevřít konverzaci (OPRAVENO)

Jakmile měla schránka v testech obsah, mobilní běh spadl: po kliknutí na
konverzaci se neobjevilo pole pro psaní.

Příčina je stejného druhu jako u kalendáře. `InboxView` si z kontextu bere
`mobileView` a `setMobileView`, jenže `NexusContext` ani jedno nevystavuje —
stav si drží od začátku pod `_mobileView` (ř. 283) a nikam ho nepředá.
`setMobileView('chat')` na ř. 454 tedy nedělalo nic, `mobileView` zůstal
`'list'` a podmínka na ř. 534 byla trvale nepravdivá. **Detail konverzace se
na telefonu nevykreslil nikdy.**

Opraveno vystavením existujícího stavu do kontextu (včetně doplnění do pole
závislostí `useMemo`, bez kterého by se hodnota nepřepočítala).

Že to nikdo neodhalil, má stejný důvod jako všechno ostatní v tomhle
dokumentu: schránka byla v testech prázdná, takže nebylo na co kliknout.

### Bezpečnostní relace se načte a zahodí (NEOPRAVENO)

`GET /safety/sessions/active` vrací **jeden objekt, nebo `null`** — ne pole.
Mock doplněn, aby tvar odpovídal.

Při ověřování se ale ukázalo něco horšího. `useNexusData` si relaci vyžádá
(`useNexusData.js:404`) a předá ji do `setActiveSafetySession`,
`setIsTimerActive` a `setTimeLeft`. Všechny tři jsou v `NexusContext.jsx`
(ř. 372–374) navázané na `memoizedNoop` — **výsledek se zahodí**.

A UI, které by ho zobrazilo, není dosažitelné. `CalendarView` si z kontextu
bere 28 jmen; 20 z nich kontext nevystavuje, takže platí výchozí hodnoty
(`isTimerActive = false`, obsluhy prázdné funkce):

- **8 jmen `useNexusData` vrací, kontext je jen nepřepošle** —
  `setIsBookingModalOpen`, `handleExportICS`, `setSelectedScheduleEvent`
  a čtveřice kolem synchronizace kalendáře.
- **12 jmen neexistuje nikde** — `handleCheckIn`, `handleCheckOut`,
  `handleEditBooking`, `handleDeleteBooking`, `openBookingMenuId`
  a celý odpočet: `isTimerActive`, `activeTimerEvent`, `timeLeft`,
  `formatSafetyTime`, `isSafetyLoading`, `handleSafetyImOk`.

Ověřeno za běhu, ne jen čtením kódu: po kliknutí na „Přidat akci" se
stránka nezmění a žádné okno se neotevře.

Prakticky to znamená, že panel „Safety Guard Active" i tlačítko „jsem
v pořádku" v kalendáři jsou **mrtvý kód** — vykreslit se nemůžou. Po
znovunačtení stránky během běžící schůzky se odpočet neobnoví.

Není to regrese z tohohle auditu; `NexusContext.jsx` se naposledy měnil
v #73. Oprava je na samostatné zadání: přeposlat 8 jmen je maličkost,
zbylých 12 je potřeba doimplementovat.

## Co zbývá

Z původního seznamu je hotová většina, a **u čtyř z pěti prověřených se za
tím prázdnem něco skrývalo** — takže to nebyla formalita:

| Doplněno | Co se ukázalo |
|---|---|
| `/api/admin/feature-locks` | zámky jsou fail-closed; test hlídá, že při výpadku serveru zůstane sledování polohy zamčené |
| `/api/device/bindings` | relay bez přiřazeného profilu tiše nic nedělá; varovný pruh se nikdy nevykreslil |
| `/api/agency/relay-status` | odznak „Agent online“ svítil zeleně, kdykoli měl kdokoli otevřený dashboard |
| `/api/agency/stats` | dlaždice „Rezervací celkem“ počítala bezpečnostní relace, takže incall schůzky v čísle nebyly |
| `/api/audit-logs`, `/api/blacklist` | logy padaly na bílou obrazovku bez pole `logs`; blacklist byl v testech vždy prázdný |
| `/api/subscriptions/current`, `/history` | jen šum v testech: `[]` je pravdivostně true, takže banner ukazoval „NaN dní“ |
| `/api/clients/stats` | zdroj „NaN CZK“ v CRM |

Zbývá devět, prakticky jen infrastrukturní panel pro vlastníka aplikace:

| Endpoint | Co kvůli tomu v testech nejde ověřit |
|---|---|
| `/api/subscriptions/plans` | ceník v adminu |
| `/api/trackers` | seznam lokátorů — dnes stejně za zámkem `phone-tracking` |
| `/api/sip/config` | VoIP konfigurace |
| `/api/ai/test` | zkouška AI napojení |
| `/api/admin/infra-health` | zdraví infrastruktury |
| `/api/vultr/status`, `/bandwidth`, `/apk-info`, `/agent-downloads` | infrastrukturní panel |
| `/api/hetzner/status`, `/metrics` | infrastrukturní panel |

**Procházet zbytek endpoint po endpointu se ale nevyplatí.** Dva plošné
specy pokryjí všechny stránky pro všech pět rolí najednou a najdou víc:

- `zadna_stranka_nepada.spec.js` — žádná stránka se nerozsype na bílou
  obrazovku (odhalilo Hierarchii a Výplaty)
- `zadne_smeti_v_textu.spec.js` — nikde `NaN`, `Invalid Date`, `undefined`
  ani `[object Object]` (odhalilo „NaN CZK“, „undefined GB“, „NaN %“)

Oběma zbylé infrastrukturní stránky procházejí čistě.

## Tři zásady, které se osvědčily

**Globální mock ať drží nejnudnější možný stav.** Prázdný seznam, vypnutá
funkce, nízký tarif. Jednou jsem do něj dal `plan: 'Professional'` a rozbil
tím čtyři testy nákupu vyššího tarifu. Spec, který potřebuje bohatší data,
si rutu přebije sám — a rovnou tím řekne, na čem stojí.

**Mock musí mít TVAR, jaký vrací server.** Ne jen „něco“. Prázdné pole tam,
kde server posílá `{ entries: [...] }`, je horší než nic: panel se tváří
prázdně a nikdo nepozná rozdíl. Dvě stránky kvůli špatnému tvaru mocku roky
padaly a nikdo si toho nevšiml.

**Ke každému testu patří kontrolní vzorek.** Tvrzení „něco tam není“ platí
i na prázdné stránce, takže bez opačného případu neověřuje nic. U plošných
speců to znamená dočasně vrátit opravu a ověřit, že test spadne — jinak je
to test, který neumí najít nic.

## Jak si seznam ověřit znovu

```bash
npx playwright test --project=chromium --reporter=line 2>&1 \
  | grep NEMOCKOVÁNO | sort -u
```

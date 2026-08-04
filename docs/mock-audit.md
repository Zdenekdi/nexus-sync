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

## Co zbývá

Dalších 15 endpointů se pořád propadá do zachytávače. Server je má všechny,
klient je volá — jen v mocích nejsou:

| Endpoint | Co kvůli tomu v testech nejde ověřit |
|---|---|
| `/api/admin/feature-locks` | zamykání funkcí (`featureLocks.js` je fail-closed) |
| `/api/subscriptions/current`, `/history` | předplatné a jeho historie |
| `/api/safety/sessions/active` | běžící bezpečnostní relace |
| `/api/trackers` | seznam lokátorů |
| `/api/device/bindings` | spárovaná zařízení |
| `/api/sip/config`, `/api/agency/relay-status` | VoIP a stav relaye |
| `/api/agency/stats` | přehled v QA Hubu |
| `/api/vultr/status`, `/bandwidth`, `/apk-info`, `/agent-downloads` | infrastrukturní panel |
| `/api/hetzner/status`, `/metrics` | infrastrukturní panel |

Doplňovat je má smysl vždycky spolu s testem, který na daných datech něco
tvrdí. Samotný mock bez testu jen posune prázdno o úroveň dál.

## Jak si seznam ověřit znovu

```bash
npx playwright test --project=chromium --reporter=line 2>&1 \
  | grep NEMOCKOVÁNO | sort -u
```

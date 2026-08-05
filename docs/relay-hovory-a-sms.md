# Relay: kudy chodí hovory a kudy SMS

Dvě aplikace, dvě role. `nexusFull` (`com.nexushub.app`, „Nexus Hub") je
aplikace pro lidi; `nexusRelay` (`com.nexushub.relay`, „Nexus Relay") je
zařízení se SIM, které nikdo neobsluhuje.

**Hovory jdou přes SIP. SMS přes relay.** Operátorka čte i odpovídá ve webové
aplikaci.

## SMS

### Příchozí (klient → agentura)

Běží **nativně, nezávisle na WebView** — funguje i když je appka zabitá:

1. `NexusSmsReceiver` zachytí `SMS_RECEIVED` / `SMS_DELIVER`, vezme si 30s
   wake lock a `goAsync()`
2. `NexusRelayPlugin.onTransportMessageReceived` pošle HTTP POST na server
   podle uložených předvoleb (baseUrl, deviceId, installationId)
3. Server zprávu uloží a rozešle operátorkám přes Socket.IO (`sms:incoming`)
4. Plná aplikace ji ukáže ve schránce

Aktivuje to příznak `KEY_IS_ACTIVE`, který nastaví `configureRelay`
z obrazovky `RelayApp` / `RelayMode`.

### Odchozí (operátorka → klient)

Push, ne polling:

1. Operátorka odešle ve webu → `messageController` uloží a **hned** vyšle
   přes Socket.IO `relay_command` (typ `send_sms`) — v kódu označené jako
   *„faster than push"*
2. Když relay není připojený, jde FCM push `send_sms`, který
   `NexusFcmService` provede nativně i při zabité aplikaci
   (`sendSmsFromData`)
3. Relay pošle přes `SmsManager.sendTextMessage` (delší přes
   `sendMultipartTextMessage`) z vlastní SIM
4. Výsledek nahlásí `PATCH /api/messages/{id}/status`

`NexusRelayForegroundService` navíc každých 30 s stahuje
`GET /api/messages/outbox?profileId=…&installationId=…`. To je **záchranná
síť** pro zprávy, které minuly socket i push — ne hlavní cesta.

## Hovory

### SIP (to používáme)

`NexusSipPlugin` registruje relay proti Asterisku. Credentials si vyzvedne
z `GET /api/sip/config`, který koncový bod v případě potřeby **rovnou
zřídí** a spustí regeneraci konfigurace.

Serverová strana je hotová: `asteriskConfigGenerator` skládá z databáze
`pjsip.conf` (transporty udp/tcp/ws/wss, koncové body pro relay i
operátorky, registrace trunku, `identify`) a `extensions.conf`, zazálohuje
původní soubory, nasadí je přes SSH a udělá `pjsip reload` +
`dialplan reload`. Ruční spuštění: `POST /api/sip/reload-asterisk`.

Podklady pro server jsou v [docs/asterisk/](asterisk/) — `setup.sh`,
`pjsip.conf`, `extensions.conf`.

### GSM most (výchozí VYPNUTÝ)

`NexusInCallService` umí udělat z telefonu výchozí vytáčeč a přemostit
skutečný GSM hovor do WebRTC (`/api/device/webrtc/offer`, `/ice`,
operátorka odpoví přes `useOperatorWebRTC`).

**Nepoužíváme ho a od 5. 8. 2026 je výchozí vypnutý** (`build.gradle`,
`ENABLE_GSM_CALL_BRIDGE`). Tři důvody:

1. **Soupeří se SIP** o tytéž příchozí hovory.
2. **Chce roli výchozího vytáčeče** — nápadné oprávnění pro funkci, která
   se nepoužije.
3. **Dodá rozbitý hovor.** Bridge je jednosměrný: do WebRTC jde jen
   mikrofon telefonu. Hlas volajícího (downlink) vyžaduje
   `AudioSource.VOICE_CALL` a oprávnění `CAPTURE_AUDIO_OUTPUT`
   (`signature|privileged`), které na běžném telefonu získat nejde.
   Obejít se to dá akustickou smyčkou přes hlasitý odposlech, ale za cenu
   echa a zpětné vazby — proto to zapnuté není.

Zapnout pro pokusy:

```
ENABLE_GSM_CALL_BRIDGE=true
```

v `local.properties` nebo jako proměnnou prostředí. Manifest tím hradlí
**jen** `NexusInCallService`; fantomové hovory (`NexusGhostCallActivity`)
na něm nezávisí, ty jedou přes FCM a full-screen intent.

## Na co si dát pozor

`__APP_VARIANT__` je konstanta dosazená Vitem při buildu — dosazuje se
**holý identifikátor**. Zápis `window.__APP_VARIANT__` Vite nenahradí
a nikdo ho za běhu nenastavuje, takže vyjde vždycky `'full'`. Přesně tohle
se stalo v `NexusSms.js` a relay se kvůli tomu chovala jako plná aplikace:
nevyskakovalo okno příchozí SMS a odpověď z něj šla přes API serveru místo
přes SIM. Správný zápis je `typeof __APP_VARIANT__ !== 'undefined'`.

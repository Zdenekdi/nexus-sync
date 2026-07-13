# VoIP BYOT — nastavení příchozích hovorů (call-forward → operátor)

Jak zprovoznit **obousměrné příchozí hovory** na web operátora, aniž by se řešilo
GSM audio v telefonu (žádný root, žádný GSM hardware). Princip:

```
volající → SIMka modelky → [call forward] → DID providera → váš Asterisk → operátor (WebRTC)
```

SMS zůstávají přes relay aplikaci (nemění se). Přesměruje se jen **hlas**.

Model "bring your own trunk" (BYOT): **každá agentura si konfiguruje vlastního
SIP providera a DID** podle své země a preferencí.

---

## 0) Předpoklady (jednou pro celý systém)

- **Běžící Asterisk**, veřejně dostupný pro providera (veřejná IP/doména, otevřené
  SIP/RTP porty). Config generuje `server/src/services/asteriskConfigGenerator.js`
  a nasazuje se na VPS přes SSH (env `VPS_SSH_HOST`, `ASTERISK_CONF_DIR`, …).
- `SIP_ENCRYPTION_KEY` v env (64-char hex) — šifrování trunk hesel.
- Operátoři už mají fungující WebRTC↔Asterisk (existující relay/operátor endpointy).

## 1) Co si agentura pořídí u providera

Provider je libovolný, musí ale splnit:

| Požadavek | Pozn. |
|-----------|-------|
| **DID (číslo) v cílové zemi** | některé země vyžadují lokální adresu/registraci |
| **SIP trunk** na váš Asterisk | auth **register** (user/heslo) nebo **IP** (ACL) |
| kodeky **ulaw/alaw** (+opus) | DTMF RFC2833 |
| **Diversion header** | rozhoduje, jestli půjde „1 DID pro víc modelek" |
| souběžné kanály / CPS | dle počtu linek |
| **AUP** vůči provozu | pozor na blokaci (viz níže) |

Doporučení: pro test **jedno DID**. Pro produkci spolehlivě **jedno DID na modelku**
(mapuje se přímo, nezávisí na Diversion headeru).

> ⚠️ **Blokace:** koncentrace mnoha SIMek/hovorů je pro operátory fraud vzor
> (SIM-box). Přesměrování je normální funkce, ale objem drž „lidský", SIMky
> případně rotuj. Monitoring třetí stranou: hlasovou nohu nese DID provider.

## 2) Konfigurace trunku v Nexusu (API)

Vše `manager+`, automaticky scopované na agenturu volajícího. Heslo se ukládá
šifrovaně a nikdy se nevrací zpět.

**Vytvořit trunk:**
```bash
curl -X POST https://<api>/api/trunks \
  -H "Authorization: Bearer <manager-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MyProvider CZ",
    "host": "sip.provider.cz",
    "port": 5060,
    "authMode": "register",        # nebo "ip"
    "username": "12345",
    "password": "secret",          # jen u register; uloží se šifrovaně
    "codecs": "ulaw,alaw"
  }'
# → { "id": "<trunkId>", "hasPassword": true, ... }
```

**Namapovat DID na modelku (profil):**
```bash
curl -X POST https://<api>/api/trunks/<trunkId>/dids \
  -H "Authorization: Bearer <manager-jwt>" -H "Content-Type: application/json" \
  -d '{ "number": "+420111222333", "profileId": "<profileId>" }'
```
DID lze mapovat **jen na profil vlastní agentury** (jinak 400).

**Další operace:** `GET /api/trunks` (seznam), `PATCH /api/trunks/:id`,
`DELETE /api/trunks/:id`, `DELETE /api/trunks/:id/dids/:didId`.

Každá změna **automaticky regeneruje a nasadí Asterisk config** (per agentura).

## 3) Nastavení přesměrování na SIMce modelky

Na telefonu s SIMkou nastav přesměrování příchozích hovorů na **DID** z kroku 2:

- **Bezpodmínečné (vše):** vytoč `**21*<DID>#`  (zrušení: `##21#`)
- **Podmíněné (nezvednuto/obsazeno/nedostupné):** `**61*<DID>#`, `**67*<DID>#`, `**62*<DID>#`

> Přesměrovaná noha je odchozí hovor z té SIMky na DID → **platí ji tarif SIMky**.
> Na neomezených minutách ≈ zdarma.

## 4) Test

1. Zavolej na **číslo modelky** (její SIMku) z jiného telefonu.
2. SIMka hovor přesměruje na DID → dorazí na Asterisk → **vyzvání operátory dané
   agentury** ve WebRTC (v UI se ukáže jméno modelky přes hlavičku `X-Model-Name`).
3. Operátor zvedne → **obousměrný zvuk**.

## 5) Troubleshooting

- **Hovor nedorazí na Asterisk:** ověř, že provider dosáhne na váš `host`/IP (firewall,
  NAT, SIP ALG), a že trunk `identify` `match=<host>` odpovídá IP providera.
- **Registrace selhává (register mód):** zkontroluj `username`/`password`/`host`, u
  providera povol registraci z IP Asterisku.
- **„1 DID pro víc modelek" nefunguje:** provider nejspíš nepropouští Diversion
  header → přejdi na **1 DID na modelku** (spolehlivé, mapuje se přímo).
- **Jednosměrné/žádné audio:** typicky NAT/RTP — nastav `external_media_address` /
  `external_signaling_address` v Asterisk transportu, otevři RTP porty.
- **Špatný kodek:** povolené kodeky se filtrují na `ulaw,alaw,g722,g729,opus,gsm`;
  sjednoť s providerem.

## Bezpečnostní poznámky (jak je to postavené)

- Trunky i DIDy jsou **striktně per-agentura**: DID agentury A nikdy nevyzvání
  operátory agentury B (scoping v generátoru dle `agencyId`).
- Hodnoty z DB (host, creds, kodeky, čísla) se před vložením do Asterisk configu
  **sanitizují** proti config/heredoc injection.
- Trunk hesla jsou **AES-256-GCM šifrovaná** (`sipEncryption`), klientovi se vrací
  jen `hasPassword`.

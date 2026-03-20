# Safety Guard (jen modelky) - implementacni priprava

## 1) Scope a role matrix

Cil: Safety Guard, GPS tracking a panic alarm budou aktivni pouze pro roli `Model`.
Operator a Manazer jsou prijemci nouzovych upozorneni od modelek.

### Role permissions (MVP)
- `Model`
  - muze: start safety session (check-in), check-out, panic alarm, sdilet GPS body behem aktivni session
  - nemuze: spravovat cizi session
- `Operator`
  - muze: prijimat emergency alerty od modelek, potvrdit prevzeti alertu, zobrazit detail incidentu
  - nemuze: spoustet safety flow za modelku
- `Manager`
  - muze: prijimat emergency alerty, potvrdit prevzeti, eskalovat dal, uzavrit incident
  - nemuze: spoustet safety flow za modelku

## 2) Produktove pravidla (MVP)

- Safety session lze spustit jen z modelkineho profilu.
- Po `check-in` bezi safety casovac podle rezervace.
- Pokud modelka neudela `check-out` do konce + grace okna, session prejde do `ESCALATED`.
- `panic` vyvola okamzitou eskalaci bez cekani na grace.
- Notifikace o eskalaci jdou na:
  - primarne Operator + Manager (scope podle agentury/profilu)
  - modelce se zobrazi potvrzeni, ze alert byl odeslan.

## 3) Stavovy model session

`PLANNED -> CHECKED_IN -> GRACE -> ESCALATED -> RESOLVED`

- `PLANNED`: session zalozena (booking)
- `CHECKED_IN`: modelka potvrdila start
- `GRACE`: vyprsel planovany konec, ceka se na check-out (napr. 10 min)
- `ESCALATED`: nouzovy stav (po grace nebo panic)
- `RESOLVED`: ukonceno check-outem nebo manualnim uzavrenim managerem

## 4) API kontrakty (backend mimo tento workspace)

MVP endpointy:
- `POST /api/safety/sessions`
- `POST /api/safety/sessions/:id/check-in`
- `POST /api/safety/sessions/:id/check-out`
- `POST /api/safety/sessions/:id/panic`
- `POST /api/safety/sessions/:id/location`
- `POST /api/safety/sessions/:id/heartbeat`
- `GET /api/safety/sessions/:id`

Poznamka: backend slozka v tomto workspace neni dostupna, proto je to priprava kontraktu pro navazujici implementaci.

## 5) Frontend/Android zmeny v tomto repu

### `src/App.jsx`
- Omezit Safety UI (`CHECK-IN`, `CHECK-OUT`, `panic`) jen pro `activeRole === 'Model'`.
- Pro Operator/Manager pridat panel "Emergency Alerts" (read-only + acknowledge).
- Presunout zdroj pravdy casovace ze local state na server state (postupne, feature-flag).

### `src/components/RelayMode.jsx`
- Zadna Safety akce pro non-model role.
- Pripravit jen zobrazeni stavu doruceni emergency upozorneni.

### Android (`android/app/src/main/...`)
- Pridat location permission flow (MVP foreground):
  - `ACCESS_COARSE_LOCATION`
  - `ACCESS_FINE_LOCATION`
- Pripravit kanal pro emergency notifikace s vysokou prioritou.

## 6) Routing upozorneni

Trigger: `panic` nebo timeout bez check-out.

- Vytvorit `EmergencyEvent` s `sessionId`, `modelProfileId`, `agencyId`, `severity`.
- Backend doruci upozorneni:
  - push (Operator, Manager)
  - socket (Operator, Manager dashboard)
- Frontend prijemce:
  - otevre detail incidentu
  - umozni `ACKNOWLEDGED` (kdo prevzal)

## 7) Datovy model (minimum)

- `SafetySession`
  - `id`, `agencyId`, `profileId`, `bookingId`, `state`, `plannedEndAt`, `graceUntil`, `escalatedAt`, `resolvedAt`
- `SafetyLocationPoint`
  - `sessionId`, `lat`, `lng`, `accuracy`, `capturedAt`, `receivedAt`
- `EmergencyEvent`
  - `sessionId`, `type` (`panic|timeout`), `severity`, `createdAt`
- `EmergencyReceipt`
  - `eventId`, `recipientRole`, `recipientId`, `deliveredAt`, `ackAt`
- `AuditEvent`
  - `sessionId`, `eventType`, `actorRole`, `actorId`, `payload`, `createdAt`, `correlationId`

## 8) Edge-cases

- Modelka offline: fronta location/eventu + retry po reconnectu.
- Killnuta app: fallback push + server-side eskalace podle heartbeat timeoutu.
- Permission denied (location): safety session se spusti, ale s warning stavem `LIMITED_TRACKING`.
- Duplicita panic tapu: idempotency key.

## 9) Rollout po fazich

1. `Phase A`: role gating + UI omezeni jen pro modelky.
2. `Phase B`: backend session state + check-in/out + panic endpointy.
3. `Phase C`: GPS foreground tracking.
4. `Phase D`: emergency routing na Operator/Manager + ACK flow.
5. `Phase E`: audit feed + export incident timeline.

## 10) Akceptacni kriterium (MVP)

- Modelka vidi a muze pouzit Safety Guard akce.
- Operator/Manager Safety Guard akce nevidi, ale dostanou emergency alert.
- Panic od modelky dorazi Operatorovi i Managerovi do 10 s.
- Incident ma auditni stopu od triggeru po vyreseni.


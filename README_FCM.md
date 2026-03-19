# FCM Push Integration (Nexus Hub Server)

This server now supports Firebase Cloud Messaging for:

- new inbound chat messages
- incoming calls
- mobile push token registration

## What was added

- `src/services/pushService.js`
  - Firebase Admin initialization
  - push token persistence helpers
  - payload builders (`buildChatPushPayload`, `buildCallPushPayload`)
  - send helpers (`sendChatPush`, `sendCallPush`)
- `POST /api/device/push-token` (authenticated)
- `POST /api/device/push-test` (authenticated)
- automatic push sending in:
  - `deviceController.handleGoIP`
  - `deviceController.handleMobileSms`
  - `deviceController.handleMobileCall`
  - `messageController.simulateInbound`

## Required environment

Set one of the following:

- `FIREBASE_SERVICE_ACCOUNT_JSON` (full service account JSON as string), or
- `GOOGLE_APPLICATION_CREDENTIALS` (path to service-account JSON file)

Also required:

- `JWT_SECRET`
- `DATABASE_URL`

## Database change

A new Prisma model is required: `PushDevice`.

Apply Prisma schema changes:

```bash
cd "/Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/server"
npx prisma generate
npx prisma db push
```

## Quick dry run

This prints generated push payloads without sending anything:

```bash
cd "/Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/server"
node scripts/fcm-dry-run.js
```

## Register push token endpoint

`POST /api/device/push-token`

Headers:

- `Authorization: Bearer <jwt>`
- `Content-Type: application/json`

Body:

```json
{
  "token": "<FCM_TOKEN>",
  "platform": "android",
  "operatorId": "<optional-user-id>"
}
```

Response:

```json
{
  "ok": true
}
```

## Test push endpoint

`POST /api/device/push-test`

Headers:

- `Authorization: Bearer <jwt>`
- `Content-Type: application/json`

Body (chat test):

```json
{
  "type": "chat",
  "messagePreview": "FCM test from backend"
}
```

Body (call test):

```json
{
  "type": "call",
  "callState": "RINGING"
}
```

Superadmin can optionally set a specific `agencyId` in body.
Non-superadmin users are always limited to their own agency.

Response:

```json
{
  "ok": true,
  "type": "chat",
  "agencyId": "<agency-id>",
  "sent": 1,
  "failed": 0,
  "details": null
}
```

Example cURL:

```bash
curl -X POST "http://localhost:3001/api/device/push-test" \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"type":"chat","messagePreview":"FCM test from backend"}'
```

## Notes

- Push send failures do not break webhook/message processing.
- Invalid FCM tokens are automatically deactivated when Firebase reports `registration-token-not-registered`.


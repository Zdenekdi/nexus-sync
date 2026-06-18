## 2026-06-15 - [CRITICAL] Fix Weak Authorization Checks By Validating Secret
**Vulnerability:** Weak authorization check (`secret === process.env.DEVICE_SECRET`) could bypass authentication if `DEVICE_SECRET` is unset, making `process.env.DEVICE_SECRET` undefined...
**Learning:** Checking strict equality `===` against environment variables without checking their existence or validity type is dangerous, especially for authentication...
**Prevention:** Always add a length check and typeof validation (`typeof secret === 'string' && secret.length > 0 && secret === process.env.DEVICE_SECRET`) to ensure...

## 2026-06-13 - [CRITICAL] Prevent Weak PRNG for Sensitive Tokens
**Vulnerability:** Weak pseudo-random number generator `Math.random()` was used for generating SIP passwords and Agency Invite Codes.
**Learning:** Using predictable randomness can allow attackers to predict sensitive security tokens.
**Prevention:** Use cryptographically secure pseudorandom number generator (CSPRNG) like `crypto.randomBytes()` or `crypto.randomInt()` for any sensitive tokens.
## 2024-05-28 - Missing Authentication on Unauthenticated SMS Endpoint
**Vulnerability:** The `/api/device/goip/sms` endpoint (handled by `handleGoIP` in `server/src/controllers/deviceController.js`) allowed incoming SMS messages to be created in the database and broadcast via WebSockets without any authentication or authorization checks.
**Learning:** Even specialized hardware endpoints (like GoIP receivers) need to be authenticated. In a multi-tenant system, unauthenticated endpoints can allow attackers to spoof messages or perform a denial of service.
**Prevention:** Always ensure every API endpoint, especially those that write data, requires and validates a secret key (like `DEVICE_SECRET` or an API token), and that it is consistently applied across all endpoints in the controller.
## 2026-06-18 - [CRITICAL] Missing Authentication on Webhook Endpoints
**Vulnerability:** The `handleGeneric` and `handleAdultWork` endpoints in `webhookController.js` allowed incoming messages to be created without authentication.
**Learning:** Even generic webhooks need authentication to prevent unauthenticated users from writing data or triggering websockets.
**Prevention:** Ensure all webhook endpoints validate a secret key (like `DEVICE_SECRET`) with strict type and length checks.

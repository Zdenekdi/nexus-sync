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
## YYYY-MM-DD - [Timing Attack in Webhook Verification]
**Vulnerability:** Timing attack via strict equality operator (`===`) checking user input against `VERIFY_TOKEN` in WhatsApp webhook validation in `server/src/controllers/webhookController.js`.
**Learning:** Checking tokens with `===` character by character reveals timing differences, making the token vulnerable to brute-force determination.
**Prevention:** Use `secureCompare` (or `crypto.timingSafeEqual`) from `../utils/security` instead of standard equality operators for tokens, passwords, and verification secrets. Ensure strict type checking before comparison to prevent errors.
## 2024-06-25 - [CRITICAL] Webhook Fallback Secret Must Not Be Hardcoded
**Vulnerability:** A fallback token for the WhatsApp webhook verification (`'nexus-whatsapp-verify'`) was hardcoded, allowing an attacker to bypass authentication if the intended environment variable was unconfigured.
**Learning:** Hardcoded fallback values can inadvertently act as universally known backdoors.
**Prevention:** If an environment-provided security token is missing, use an unguessable runtime fallback (e.g., `crypto.randomBytes(32).toString('hex')`) to ensure validation safely fails rather than accepting a known fallback.

## 2024-06-25 - [CRITICAL] Constant-Time Comparison Must Reject Zero-Length Inputs
**Vulnerability:** `crypto.timingSafeEqual` could be bypassed or behave unexpectedly when comparing empty buffers if one or both inputs have zero length.
**Learning:** `timingSafeEqual` alone doesn't handle all edge cases when length matching fails or when comparing empty structures.
**Prevention:** Explicitly enforce a length validation (e.g., `a.length > 0 && b.length > 0`) before continuing with secure comparison.

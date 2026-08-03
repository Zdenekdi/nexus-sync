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

## 2026-06-23 - [MEDIUM] Error Message Information Exposure
**Vulnerability:** API endpoints returned internal error messages (e.g., `res.status(500).json({ error: error.message });`) directly to clients.
**Learning:** Sending raw internal error messages exposes implementation details, potential stack traces, or database structures which attackers can use to gather intelligence about the system.
**Prevention:** Catch blocks should log the detailed error internally using `console.error` or a logging library, and return a safe, generic message like "Internal server error" to the client.
## 2026-06-24 - [CRITICAL] Hardcoded Secret in Client RelayMode
**Vulnerability:** A hardcoded API secret was found in the `client/src/components/RelayMode.jsx` file, being sent in the payload for `/api/device/relay`.
**Learning:** Hardcoded credentials on the client-side expose sensitive access tokens or secrets to anyone who can inspect the frontend code bundle, which can lead to unauthorized access to backend services.
**Prevention:** Always use environment variables injected during the build process (like `import.meta.env.VITE_DEVICE_SECRET`) rather than hardcoding secrets directly into the source code.
## 2026-06-25 - [MEDIUM] Environment Detail Leak via Hardcoded Identifiers
**Vulnerability:** A hardcoded fallback server ID (`"128335266"`) was found in `server/src/routes/hetznerRoutes.js` for API operations (`status`, `start`, `stop`, `restart`, `metrics`) when the environment variable `HETZNER_SERVER_ID` was unset.
**Learning:** Hardcoding server identifiers can lead to unintended actions on specific production or testing infrastructure and leaks internal infrastructure details. If the variable is unset, the application might unintentionally modify or interact with the hardcoded instance.
**Prevention:** If required environment variables are unset, fail securely (e.g., return a `400 Bad Request` or refuse to start) rather than providing arbitrary fallbacks.

## 2024-06-27 - [Fix] Insecure Password Generation
**Vulnerability:** Weak random number generation using `Math.random()` for password generation in client code.
**Learning:** `Math.random()` is not cryptographically secure and predictable, additionally the sort trick `(() => 0.5 - Math.random())` for shuffling creates non-uniform distributions.
**Prevention:** Always use `window.crypto.getRandomValues()` for security-sensitive random number generation in the frontend, and apply a proper Fisher-Yates shuffle instead of `.sort` based shuffling.

## 2026-06-28 - [CRITICAL] Fix Timing Attack in Traccar Gateway Webhook
**Vulnerability:** Timing attack via strict inequality operator (`!==`) checking user input against `TRACCAR_FORWARD_SECRET` in the `traccarForward` method in `server/src/controllers/trackerController.js`.
**Learning:** Checking tokens with `!==` reveals timing differences, making the token vulnerable to brute-force determination. This is particularly dangerous for webhook endpoints which are often unauthenticated except for this shared secret.
**Prevention:** Always use `secureCompare` (or `crypto.timingSafeEqual`) from `../utils/security` instead of standard equality operators for tokens, passwords, and verification secrets. Ensure strict type checking before comparison to prevent errors.

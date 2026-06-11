## 2024-05-18 - [CRITICAL] Remove Hardcoded Fallback Secrets
**Vulnerability:** Hardcoded fallback values were present for `ENCRYPTION_KEY` in `server/src/utils/encryption.js` and `JWT_SECRET` in `server/src/controllers/authController.js`. The `app.js` startup checks did not enforce the presence of `ENCRYPTION_KEY`.
**Learning:** Hardcoded fallback values can compromise the system if the application is started without setting the environment variables properly, as it would silently use known secrets that could be exploited.
**Prevention:** Remove fallback values for secrets in code and enforce their presence and complexity through startup checks in the main application file.

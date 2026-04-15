# Nexus Hub - Role a Oprávnění

Tento dokument definuje hierarchii a přístupová práva pro jednotlivé role v systému Nexus Hub.

## Přehled Rolí

| Role | Úroveň | Popis |
| :--- | :--- | :--- |
| **App Owner** | Globální | Majitel celé platformy. Má přístup ke všem agenturám, statistikám a systémovým nastavením. |
| **Agency Admin** | Agenturní | Administrátor konkrétní agentury. Plná kontrola nad uživateli a profily dané agentury. |
| **Senior Operator** | Agenturní | Vedoucí pracovník agentury (Manager). Má rozšířená práva pro náhled do statistik a správu týmu. |
| **Operator** | Personální | Běžný pracovník. Správa chatů, kalendáře a přiřazených profilů. |
| **Model** | Omezený | Nejnižší úroveň přístupu. Určeno pro koncové uživatele/modely k nahlížení na vlastní zprávy a kalendář. |

---

## Podrobná Oprávnění

### 1. App Owner (`isAppOwner: true`)
- **Dosah:** Všechny agentury v systému.
- **Práva:**
    - Vytváření, editace a mazání jakékoliv agentury.
    - Přidávání administrátorů k jakékoliv agentuře.
    - Globální statistiky (tržby, počty zpráv, počty uživatelů napříč platformou).
    - Správa globálních systémových nastavení.
- **Omezení:** Z důvodu bezpečnosti a soukromí **nemůže** číst obsah chatů a zpráv (endpointy v `chatController` a `messageController` vrací 403).

### 2. Agency Admin (`isManager: true`)
- **Dosah:** Pouze vlastní agentura.
- **Práva:**
    - Správa všech uživatelů v rámci agentury (přidávání, úprava rolí).
    - Správa všech profilů (vytváření, mazání, přiřazování uživatelů k profilům).
    - Úplný přístup k messagingu (pokud není zapnut jiný režim soukromí).
    - Přístup k auditním logům agentury.
    - Úprava nastavení agentury (název, region, měna, alerty).
- **Omezení:** Z důvodu ochrany soukromí a bezpečnosti **nemá** přístup ke Kalendáři/Rezervacím a k fyzickému nastavení zařízení (Device Setup).

### 3. Senior Operator (`isManager: true`)
- **Dosah:** Vlastní agentura.
- **Práva:**
    - Náhled na statistiky agentury (`/api/agency/stats`).
    - Náhled na seznam uživatelů (`/api/agency/users`).
    - Správa chatů a kalendáře.
    - Přiřazování uživatelů k modelům/profilům.
- **Omezení:** Nemá možnost mazat celou agenturu nebo měnit globální parametry systému.

### 4. Operator (`isManager: false`)
- **Dosah:** Vlastní agentura + přiřazené profily.
- **Práva:**
    - Kompletní práce s messagingem (příjem/odesílání SMS, relay).
    - Správa kalendáře u profilů.
    - Nastavení zařízení (Relay device setup).
- **Omezení:** 
    - **Nesmí** vidět finanční statistiky agentury.
    - **Nesmí** vidět seznam ostatních uživatelů agentury.
    - **Nesmí** měnit nastavení agentury.

### 5. Model (`isManager: false`)
- **Dosah:** Pouze přiřazené profily.
- **Práva:**
    - Čtení a odpovídání na zprávy u svých profilů.
    - Náhled do kalendáře.
- **Omezení:** 
    - **Nesmí** spravovat zařízení.
    - **Nesmí** vidět žádné auditní logy.
    - Absolutní zákaz přístupu k jakýmkoliv statistikám či seznamům uživatelů.

---

## Viditelné Dashboardy v UI (Navigace)

Zde je seznam záložek (dashboardů), které jednotlivé role vidí v postranním menu:

### 👑 App Owner
- **Dashboard** (Přehled systému)
- **Agencies** (Správa agentur)
- **Infrastructure** (Stav serverů a služeb)
- **Maintenance** (Údržba a čištění dat)
- **Permissions** (Globální správa rolí)
- **Plans** (Správa předplatných)
- **Features** (Aktivace globálních funkcí)

### 👨‍💼 Agency Admin / Manager
- **Dashboard** (Statistiky agentury)
- **Inbox** (Zprávy - volitelné dle oprávnění)
- **Safety** (Bezpečnostní dohled)
- **Profiles** (Správa modelů/profilů)
- **QA** (Kontrola kvality)
- **Hierarchy** (Správa týmu a uživatelů)
- **Analytics** (Podrobné grafy a tržby)
- **Activity** (Auditní logy)
- **Plans** (Výběr předplatného agentury)
- **Settings** (Nastavení agentury)
- **Referrals** (Doporučení/Provize)

### 🎖️ Senior Operator
- **Dashboard** (Přehled směn)
- **Inbox** (Zprávy a chaty)
- **Schedule** (Plánování směn a kalendář)
- **Safety** (Alerting)
- **Profiles** (Práce s profily)
- **Web Profiles** (Webová prezentace)
- **Device Setup** (Technická správa zařízení)
- **QA** (Kontrola chatů)
- **Analytics** (Náhled na výkon)
- **Hierarchy** (Přiřazování uživatelů)
- **Referrals** (Správa doporučení)

### 🎧 Operator
- **Dashboard** (Osobní přehled)
- **Inbox** (Zprávy a chaty)
- **Schedule** (Kalendář)
- **Safety** (Základní alerty)
- **Profiles** (Práce s přiřazenými profily)
- **Web Profiles** (Náhled webu)
- **Device Setup** (Základní nastavení)
- **Settings** (Osobní nastavení)

### 💃 Model
- **Dashboard** (Osobní statistiky)
- **Inbox** (Pouze vlastní zprávy)
- **Schedule** (Vlastní kalendář)
- **Safety** (Osobní bezpečnostní tlačítko)
- **Referrals** (Vlastní doporučující odkaz)
- **Relay** (Stav propojení s telefonem)

---

## Bezpečnostní Mechanismy (Backend enforcement)

Oprávnění jsou vynucována na několika úrovních:
1. **JWT Payload:** Role a příznaky `isManager`/`isAppOwner` jsou zakódovány v podepsaném tokenu.
2. **Controller Guards:** Ruční kontrola v kódu (např. `if (!req.user.role.isManager) return 403`).
3. **Database Scoping:** Každý SQL dotaz automaticky obsahuje filtr `WHERE agencyId = user.agencyId` (pokud uživatel není App Owner).

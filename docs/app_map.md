# 🛰️ Nexus Hub: Application Map (Obsidian Graph Style)

Tato mapa znázorňuje architekturu systému, tok dat a hierarchii komponent. Uzly jsou logicky propojeny tak, jak spolu interagují v kódu.

## 🗺️ Interaktivní Graf Architektury

```mermaid
graph TD
    %% Public Entry
    Root["🌐 root (/)"] --> Landing["🏠 LandingPage.jsx"]
    Landing --> PublicManual["📖 ManualView (Public)"]
    Landing --> AuthGate["🔐 LoginScreen.jsx"]

    %% State Management
    AuthGate --> Context["🧠 NexusContext.jsx (Global State)"]
    Context --> App["📱 App.jsx (Shell)"]

    %% Core Navigation
    App --> Sidebar["📂 Sidebar.jsx (Menu)"]
    App --> Router["🔀 ViewRouter.jsx (Switcher)"]

    %% Sidebar Links
    Sidebar --> Overview["📊 Overview Section"]
    Sidebar --> Ops["⚙️ Operations Section"]
    Sidebar --> Mgmt["💼 Management Section"]
    Sidebar --> Sys["🛠️ System Section"]

    %% Operations Unit
    Router --> OpsUnit["📦 OperationsUnit.jsx"]
    OpsUnit --> Inbox["💬 InboxView (Messages)"]
    OpsUnit --> Calendar["📅 CalendarView (Bookings)"]
    OpsUnit --> Profiles["👤 ProfilesView"]
    OpsUnit --> Relay["📡 RelayControl (Manager)"]
    OpsUnit --> Safety["🛡️ SafetyView (Guardian)"]

    %% Agency Unit
    Router --> AgencyUnit["🏢 AgencyUnit.jsx"]
    AgencyUnit --> Analytics["📈 AnalyticsView"]
    AgencyUnit --> CRM["👥 CRM (Client Retention)"]
    AgencyUnit --> Hierarchy["🏗️ Hierarchy (Team)"]
    AgencyUnit --> Inventory["📦 Inventory (Stock)"]

    %% Infrastructure (Owner Only)
    Router --> InfraUnit["⚙️ InfrastructureUnit.jsx"]
    InfraUnit --> AdminAgencies["🏢 Agencies Mgmt"]
    InfraUnit --> AdminPlans["💎 Plans & Billing"]
    InfraUnit --> AdminDocs["📄 Tech Docs"]

    %% External Connections
    Relay --- AndroidApp["📱 Nexus Relay (Android APK)"]
    AndroidApp --- SMS["📩 SMS / Calls (SIM)"]
    
    Inbox --- AI["🤖 Nexus AI (Translator/Replies)"]
    AI --- OpenAI["☁️ OpenAI API"]

    %% Backend
    Context --- API["🚀 Node.js Express API"]
    API --- DB[("🗄️ PostgreSQL (Prisma)")]
    API --- Sentry["🐞 Error Tracking (Sentry)"]
```

## 📄 Detailní Popis Uzlů

### 1. Veřejná Zóna (Pre-Login)
- **`LandingPage.jsx`**: Hlavní brána. Nyní obsahuje přepínač na `ManualView`.
- **`ManualView`**: Nově přidaný průvodce, který je přístupný jak veřejně, tak z vnitřního menu.
- **`LoginScreen.jsx`**: Zajišťuje autentizaci a registraci (nová agentura / připojení k týmu).

### 2. Jádro Aplikace (Post-Login)
- **`NexusContext.jsx`**: Mozek aplikace. Drží informace o přihlášeném operátorovi, aktivní agentuře, překladech a synchronizaci dat.
- **`Sidebar.jsx`**: Dynamické menu, které se mění podle role (App Owner vidí vše, Operátorka jen své profily).
- **`ViewRouter.jsx`**: Přepínač, který na základě `activeTab` vykresluje konkrétní moduly.

### 3. Funkční Celky (Units)
- **Operations Unit**: Každodenní práce. Tady se odehrává 90 % interakcí (chat, kalendář, bezpečí modelky).
- **Agency Unit**: Manažerský pohled. Sledování zisků, správa CRM databáze a hierarchie týmu.
- **Infrastructure Unit**: Technické nastavení celého systému, licencování a správa jednotlivých agentur.

### 4. Datový Tok & Hardware
- **Nexus Relay**: Unikátní propojení mezi webovým dashboardem a reálným Android telefonem přes šifrovaný socket.
- **AI Engine**: Integrovaný systém pro automatické překlady a (připravované) inteligentní odpovědi.

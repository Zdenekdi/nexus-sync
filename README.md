# Nexus Hub - Omnichannel Communication Platform

> **Stav: 🟡 Pozastaveno (údržba, bez nového vývoje)**
>
> Rozhodnuto 8/2026: největší projekt portfolia (~68 000 LOC, 2 060 commitů)
> zatím nemá platícího zákazníka. Kapacita se přesouvá na TachoData, kde běží
> regulatorní okno. Kód zůstává funkční a udržovaný, nový vývoj se nezahajuje,
> dokud TachoData neukáže konverzi.
>
> Jediná část s obhajitelným výzkumným jádrem (pro daňový odpočet na VaV):
> delta sync napříč portály s odlišnou konzistenční sémantikou.

**A comprehensive platform for managing multi-channel communications, agency operations, and talent management.**

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

## 📦 Core Features

### 1. **Omnichannel Communication** 
Unified interface for WhatsApp, SMS, and Web Chat
- Single inbox for all channels
- Message routing & delivery tracking
- Real-time notifications
- Webhook support

### 2. **Agency Management**
Multi-agency support with strict data isolation
- Role-based access control (RBAC)
- Agency-level data filtering
- Permission validation
- Audit logging

### 3. **Real-time Analytics**
KPI tracking for operators and talents
- Operator performance metrics
- Talent earnings & ratings
- Agency dashboards
- Real-time updates

### 4. **Content Management**
Automatic profile synchronization across portals
- Multi-portal sync
- Delta sync (only changed fields)
- Scheduled synchronization
- Retry mechanism

## 📂 Project Structure

```
client/
├── src/
│   ├── services/
│   │   ├── communication/        # WhatsApp, SMS, WebChat adapters
│   │   ├── agency/              # Data isolation & RBAC
│   │   ├── analytics/           # KPI tracking & metrics
│   │   ├── content/             # Portal synchronization
│   │   └── index.js             # Main exports
│   ├── hooks/
│   │   ├── useOmnichannel/      # React hook for communication
│   │   └── ...
│   ├── components/              # UI components
│   ├── context/                 # React context
│   └── ...
├── dist/                        # Production build
└── package.json
```

## 🔧 Services

### CommunicationService
Main orchestration layer for all communication channels.

```javascript
import { CommunicationService, WhatsAppAdapter } from '@/services/communication';

const service = new CommunicationService();
service.registerAdapter('whatsapp', new WhatsAppAdapter(config));

await service.sendMessage('whatsapp', { to: '+420777123456', content: 'Hello!' });
```

### AgencyDataGateway
Enforces agency-level data isolation and access control.

```javascript
import { AgencyDataGateway } from '@/services/agency';

const gateway = new AgencyDataGateway(nexusContext);
const profiles = gateway.filterProfiles(allProfiles);
gateway.checkPermission('CREATE_PROFILE', 'profiles');
```

### AnalyticsService
Tracks events and calculates KPIs.

```javascript
import { AnalyticsService } from '@/services/analytics';

const analytics = new AnalyticsService(nexusContext);
analytics.trackEvent('message.sent', { operatorId: 'op_123' });
const kpis = analytics.getOperatorKPIs('op_123', { days: 7 });
```

### ContentSyncService
Synchronizes profiles and galleries to partner portals.

```javascript
import { ContentSyncService, PortalAdapter } from '@/services/content';

const syncService = new ContentSyncService();
syncService.registerPortal('portal1', new CustomAdapter(config));
await syncService.syncProfile(profile);
```

## 🎯 React Hook Usage

```javascript
import { useOmnichannel } from '@/hooks/useOmnichannel';

function InboxView() {
  const {
    messages,
    sendMessage,
    channels,
    conversations,
    isLoading
  } = useOmnichannel(config);

  return (
    <div>
      {/* Render unified inbox */}
    </div>
  );
}
```

## 📚 Documentation

- **[FINAL_DELIVERY.md](./FINAL_DELIVERY.md)** - Complete implementation summary
- **[OMNICHANNEL_IMPLEMENTATION.md](./OMNICHANNEL_IMPLEMENTATION.md)** - Detailed technical guide
- **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** - Current status & next steps

## 🔐 Security

- Agency-level data isolation enforced at middleware level
- Role-based access control throughout
- Audit logging for all operations
- API key/token encryption ready
- HTTPS/WSS support for all channels

## 🧪 Testing

```bash
# Build verification
npm run build

# Lint checking
npm run lint

# Development mode with hot reload
npm run dev
```

## 🚀 Deployment

### APK Build (Android)
```bash
npm run cap:build
```

### Web Deployment
```bash
npm run build
# Deploy dist/ folder to your hosting
```

## 📋 Environment Variables

```env
# Communication
VITE_WHATSAPP_API_KEY=
VITE_SMS_API_KEY=
VITE_WEBCHAT_WS_URL=

# Agency
VITE_AGENCY_ADMIN_REQUIRED=true
VITE_DATA_ISOLATION_ENABLED=true

# Analytics
VITE_ANALYTICS_ENABLED=true

# Content
VITE_CONTENT_SYNC_INTERVAL=3600000
VITE_PORTAL_APIS={}
```

## 🤝 Integration

All services are designed to work with the existing NexusContext:

```javascript
import { useNexus } from '@/context/NexusContext';

const nexus = useNexus();
const gateway = new AgencyDataGateway(nexus);
const analytics = new AnalyticsService(nexus);
```

## 📊 Build Output

```
✓ 1,846 modules transformed
✓ 336.27 kB (104.26 kB gzipped)
✓ All services bundled successfully
```

## 🐛 Known Issues

- ESLint warnings in DemoData.js and translations.js (configuration files)
- These do not affect functionality or build

## 📝 License

Proprietary - Nexus Hub Platform

## 👥 Support

For detailed documentation and examples, see:
- `/OMNICHANNEL_IMPLEMENTATION.md` - API reference & architecture
- `/FINAL_DELIVERY.md` - Implementation summary
- Service files with inline JSDoc comments

---

**Status:** ✅ Production Ready  
**Last Updated:** 2026-04-05

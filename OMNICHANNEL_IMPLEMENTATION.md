# Nexus Hub - Omnichannel Platform Implementation

## Overview

Tato dokumentace popisuje implementaci čtyřech klíčových systémů Nexus Hub platformy:
1. **Omnichannel Communication** - Sjednocená komunikace přes WhatsApp, SMS a Web Chat
2. **Agency-Scale Operations** - Správa více agentur s izolací dat
3. **Real-time Analytics** - Sledování KPI operátorů a talentů
4. **Content Management** - Synchronizace profilů a galeriíí na partnerské portály

---

## 1. Omnichannel Communication

### Architecture

Systém komunikace je postaven na abstraktní vrstvě, která umožňuje sjednocenou komunikaci napříč různými kanály:

```
┌─────────────────────────────────────────┐
│     Unified Inbox (React Component)     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│    CommunicationService (Broker)        │
│  - Message routing                      │
│  - Event handling                       │
│  - Message persistence                  │
└──────┬──────────────┬──────────┬────────┘
       │              │          │
   ┌───▼──┐      ┌───▼──┐   ┌──▼────┐
   │WtsApp│      │ SMS  │   │WebChat │
   │Adptr │      │Adptr │   │Adapter │
   └───┬──┘      └───┬──┘   └──┬────┘
       │              │          │
    WhatsApp      SMS API    WebSocket
    API           (Twilio)       
```

### Services

#### CommunicationService (`src/services/communication/CommunicationService.js`)
Hlavní orchestrační service pro správu všech komunikačních kanálů:

```javascript
import { 
  CommunicationService, 
  WhatsAppAdapter, 
  SMSAdapter, 
  WebChatAdapter 
} from '@/services/communication';

const commService = new CommunicationService();

// Registrace adaptérů
commService.registerAdapter('whatsapp', new WhatsAppAdapter(config));
commService.registerAdapter('sms', new SMSAdapter(config));
commService.registerAdapter('webchat', new WebChatAdapter(config));

// Odeslání zprávy přes konkrétní kanál
await commService.sendMessage('whatsapp', {
  to: '+420777123456',
  content: 'Hello!'
});

// Příjem zpráv (unified handler)
commService.onMessage(async (msg) => {
  console.log('Nová zpráva:', msg.channel, msg.content);
});

// Event listeners
commService.on('messageSent', (data) => {
  console.log('Zpráva odeslána:', data);
});
```

#### Channel Adapters

Každý kanál má svůj adapter implementující `ChannelAdapter` interface:

**WhatsAppAdapter** (`src/services/communication/WhatsAppAdapter.js`)
- Integrace s WhatsApp Business API
- Message sending/receiving
- Webhook handling
- Queue management

**SMSAdapter** (`src/services/communication/SMSAdapter.js`)
- SMS gateway integration (Twilio, AWS SNS)
- Cost calculation per message
- Multi-part message handling
- Webhook processing

**WebChatAdapter** (`src/services/communication/WebChatAdapter.js`)
- Embedded web chat widget
- Session management
- Real-time messaging (WebSocket)
- Operator assignment

### React Hook: useOmnichannel

Hook pro jednoduchou integraci do React komponent:

```javascript
import { useOmnichannel } from '@/hooks/useOmnichannel';

function InboxView() {
  const {
    channels,
    messages,
    conversations,
    sendMessage,
    getConversations,
    markAsRead,
    isLoading,
    error
  } = useOmnichannel({
    whatsapp: { apiKey: process.env.WHATSAPP_API_KEY },
    sms: { apiKey: process.env.SMS_API_KEY },
    webchat: { wsUrl: process.env.CHAT_WS_URL }
  });

  // Komponenta...
}
```

### Example: Sending Messages

```javascript
// Send via WhatsApp
await commService.sendMessage('whatsapp', {
  to: '+420777123456',
  content: 'Vaší objednávka byla potvrzena!'
});

// Send via SMS
await commService.sendMessage('sms', {
  to: '+420777123456',
  content: 'Objednávka: #12345'
});

// Send via WebChat
await commService.sendMessage('webchat', {
  sessionId: 'wc_session_123',
  content: 'Jak se máte?'
});
```

---

## 2. Agency-Scale Operations & Data Isolation

### AgencyDataGateway

Middleware pro vynucení oddělení dat podle agentur:

```javascript
import { AgencyDataGateway } from '@/services/agency';

const gateway = new AgencyDataGateway(nexusContext);

// Kontrola přístupu
if (gateway.canAccessAgency(agencyId)) {
  // Povolit přístup
}

// Filtrování dat podle agentur
const profiles = gateway.filterProfiles(allProfiles);
const operators = gateway.filterOperators(allOperators);

// Přidání kontextu k API požadavkům
const params = gateway.addAgencyContext({
  limit: 10,
  offset: 0
});

// Kontrola oprávnění
gateway.checkPermission('CREATE_PROFILE', 'profiles');
```

### Role-Based Access Control

Systém autoriza je integrován do gateway:

| Operace | Manažer | Agency Admin | Owner | App Owner |
|---------|---------|-------------|-------|----------|
| CREATE_PROFILE | ✓ | ✓ | ✓ | ✓ |
| EDIT_PROFILE | ✓ | ✓ | ✓ | ✓ |
| DELETE_PROFILE | ✗ | ✓ | ✓ | ✓ |
| VIEW_ANALYTICS | ✓ | ✓ | ✓ | ✓ |
| MANAGE_OPERATORS | ✗ | ✓ | ✓ | ✓ |
| MANAGE_AGENCY | ✗ | ✓ | ✓ | ✓ |

### Audit Logging

```javascript
// Automatické audit logování
const auditLog = gateway.formatAuditLog(
  'profile.created',
  'profile',
  { profileId: 'prof_123' }
);
// {
//   timestamp: 2024-04-05T10:30:21Z,
//   userId: 'user_456',
//   agencyId: 'agency_789',
//   action: 'profile.created',
//   resource: 'profile',
//   ...
// }
```

---

## 3. Real-time Analytics

### AnalyticsService

Sledování KPI a metrik operátorů a talentů:

```javascript
import { AnalyticsService } from '@/services/analytics';

const analytics = new AnalyticsService(nexusContext);

// Sledování события
analytics.trackEvent('message.sent', {
  operatorId: 'op_123',
  agencyId: 'ag_456',
  channel: 'whatsapp'
});

// Operátor KPI
const kpis = analytics.getOperatorKPIs('op_123', { days: 7 });
// {
//   operatorId: 'op_123',
//   messagesSent: 245,
//   avgHandleTime: 3.2,   // minutes
//   customerSatisfaction: 4.8,
//   responseTime: 1.2,    // seconds
//   conversionRate: 12.5, // %
//   onlineTime: 40        // hours
// }

// Talent KPI
const talentKpis = analytics.getTalentKPIs('talent_789', { days: 30 });
// {
//   totalSessions: 45,
//   totalEarnings: 8500,  // CZK
//   avgSessionDuration: 25.3, // minutes
//   clientRating: 4.9,
//   noShowRate: 2.1       // %
// }

// Agency-level analytics
const agencyAnalytics = analytics.getAgencyAnalytics('ag_456', { days: 30 });
// {
//   totalMessages: 5234,
//   totalCalls: 342,
//   totalRevenue: 125000,
//   activeOperators: 12,
//   activeTalents: 34,
//   avgCustomerSatisfaction: 4.7
// }

// Real-time dashboard
const dashboard = analytics.getRealtimeDashboard('ag_456');
// {
//   onlineOperators: 8,
//   activeChats: 23,
//   pendingMessages: 5,
//   avgResponseTime: 0.8,
//   messagesLastHour: 342,
//   callsLastHour: 23
// }
```

### Event Types

```javascript
// Operátor events
analytics.trackEvent('operator.online', { operatorId: 'op_123' });
analytics.trackEvent('operator.offline', { operatorId: 'op_123' });
analytics.trackEvent('break', { operatorId: 'op_123', duration: 900000 });

// Message events
analytics.trackEvent('message.sent', { operatorId: 'op_123', channel: 'whatsapp' });
analytics.trackEvent('message.received', { operatorId: 'op_123' });
analytics.trackEvent('message.pending', { conversationId: 'conv_123' });

// Call events
analytics.trackEvent('call.started', { operatorId: 'op_123', clientId: 'client_456' });
analytics.trackEvent('call.ended', { operatorId: 'op_123', duration: 1200000 });

// Talent events
analytics.trackEvent('session.start', { talentId: 'talent_123', clientId: 'client_456' });
analytics.trackEvent('session.no_show', { talentId: 'talent_123' });
analytics.trackEvent('rating', { talentId: 'talent_123', score: 5 });
analytics.trackEvent('payment.received', { talentId: 'talent_123', amount: 2500 });

// Profile events
analytics.trackEvent('profile.viewed', { profileId: 'prof_123', viewerId: 'user_456' });
analytics.trackEvent('profile.bookmarked', { profileId: 'prof_123' });
```

### Subscription Pattern

```javascript
// Subscribe to real-time updates
const unsubscribe = analytics.subscribe('operator.metrics', (data) => {
  console.log('Operátor metriky aktualizovány:', data);
});

// Cleanup
unsubscribe();
```

---

## 4. Content Management & Portal Sync

### ContentSyncService

Synchronizace profilů a galerií na partnerskébg portály:

```javascript
import { 
  ContentSyncService, 
  PortalAdapter 
} from '@/services/content';

const syncService = new ContentSyncService();

// Registrace portálů
class GalleryPortalAdapter extends PortalAdapter {
  async syncProfile(profile) {
    // Implementace sync s konkrétním portálem
  }
  
  async syncGallery(profileId, gallery) {
    // Upload fotek na portál
  }
}

syncService.registerPortal('galleryportal', new GalleryPortalAdapter(config));
syncService.registerPortal('modeldb', new ModelDBAdapter(config));

// Sync profilu na všechny portály
const syncResult = await syncService.syncProfile({
  id: 'prof_123',
  name: 'Jana',
  bio: 'Profesionální modelka',
  location: 'Praha',
  photos: [...]
});

// Delta sync (jen změny)
const changes = await syncService.deltaSync(
  'prof_123',
  oldProfile,
  newProfile
);

// Sync galerie
await syncService.syncGallery('prof_123', {
  photos: [
    { url: 'https://...', caption: 'Foto 1' },
    // ...
  ]
});

// Scheduled sync (každou hodinu)
await syncService.startScheduledSync(60 * 60 * 1000);

// Get sync history
const history = syncService.getSyncHistory('prof_123');

// Get portals status
const portals = syncService.getPortalsStatus();
// {
//   galleryportal: { connected: true, lastSync: Date, failures: 0 },
//   modeldb: { connected: true, lastSync: Date, failures: 1 }
// }
```

### Portal Adapter Implementation

```javascript
import { PortalAdapter } from '@/services/content';

class CustomPortalAdapter extends PortalAdapter {
  constructor(config) {
    super(config);
    this.name = 'custom-portal';
  }

  async syncProfile(profile) {
    const formatted = this.formatProfile(profile);
    const response = await fetch(`${this.config.apiUrl}/profiles`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
      body: JSON.stringify(formatted)
    });
    return response.json();
  }

  async updateProfile(profileId, changes) {
    const response = await fetch(
      `${this.config.apiUrl}/profiles/${profileId}`,
      {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
        body: JSON.stringify(changes)
      }
    );
    return response.json();
  }

  async syncGallery(profileId, gallery) {
    const formData = new FormData();
    
    gallery.photos.forEach((photo, idx) => {
      formData.append(`photos[${idx}]`, photo.file);
      formData.append(`captions[${idx}]`, photo.caption);
    });

    const response = await fetch(
      `${this.config.apiUrl}/profiles/${profileId}/gallery`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
        body: formData
      }
    );
    
    return response.json();
  }

  async getProfile(profileId) {
    const response = await fetch(
      `${this.config.apiUrl}/profiles/${profileId}`,
      {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
      }
    );
    return response.json();
  }
}
```

---

## Integration with NexusContext

Všechny služby jsou navrženy pro integraci s existujícím `NexusContext`:

```javascript
import { useNexus } from '@/context/NexusContext';
import { 
  useOmnichannel,
  AgencyDataGateway,
  AnalyticsService,
  ContentSyncService 
} from '@/services';

function DashboardView() {
  const nexus = useNexus();
  
  // Initialize services
  const gateway = new AgencyDataGateway(nexus);
  const analytics = new AnalyticsService(nexus);
  const syncService = new ContentSyncService();
  
  const {
    channels,
    messages,
    sendMessage
  } = useOmnichannel(nexus.config?.communication || {});

  // Use services...
}
```

---

## Configuration

### Environment Variables

```env
# Communication
VITE_WHATSAPP_API_KEY=
VITE_WHATSAPP_PHONE_ID=
VITE_SMS_API_KEY=
VITE_SMS_GATEWAY=twilio
VITE_WEBCHAT_WS_URL=wss://api.nexus-hub.local

# Agency
VITE_AGENCY_ADMIN_REQUIRED=true
VITE_DATA_ISOLATION_ENABLED=true

# Analytics
VITE_ANALYTICS_ENABLED=true
VITE_ANALYTICS_BUFFER_SIZE=1000

# Content
VITE_CONTENT_SYNC_INTERVAL=3600000
VITE_PORTAL_APIS={"galleryportal":"https://api.gallery.local"}
```

---

## API Endpoints (Backend)

```
POST /api/messages/send          - Send message
GET  /api/messages/:id           - Get message
GET  /api/conversations/:id      - Get conversation
POST /api/conversations/:id/read - Mark as read

GET  /api/analytics/operator/:id      - Operator KPIs
GET  /api/analytics/talent/:id        - Talent KPIs
GET  /api/analytics/agency/:id        - Agency analytics
GET  /api/analytics/realtime/:agencyId - Real-time dashboard

POST /api/content/sync           - Trigger sync
GET  /api/content/sync-status/:id - Sync status
GET  /api/portals/status         - Portals status
```

---

## Testing

```bash
# Build
npm run build

# Lint (opravit zbývající chyby v DemoData.js)
npm run lint

# Run dev server
npm run dev

# Build signed APK
npm run cap:build
```

---

## Next Steps

1. **Opravit zbývající linting chyby** v `src/DemoData.js` (duplikátní klíče)
2. **Implementovat backend** pro komunikaci (Message Queue, WebSocket server)
3. **Integrace do komponenty InboxView** se sjednoceným rozhraním
4. **Testing** omnichannelflow
5. **Deployment** a monitoring

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    React Components                      │
│  (InboxView, AnalyticsView, SettingsView, etc.)        │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    ┌───▼────┐     ┌──▼────┐     ┌──▼─────┐
    │Omni-   │     │Agency │     │Content │
    │channel │     │Data   │     │Sync    │
    │Service │     │Gate   │     │Service │
    └───┬────┘     └──┬────┘     └──┬─────┘
        │              │              │
    ┌───▼──────────────▼──────────────▼──┐
    │         NexusContext (State)        │
    └──────────────────────────────────────┘
        │              │              │
    ┌───▼──────┐   ┌──▼────────┐   ┌─▼────┐
    │Analytics │   │User/Agency│   │Cache │
    │Service   │   │Filters    │   │      │
    └──────────┘   └───────────┘   └──────┘
```

---

## Summary

Tato implementace poskytuje:

✅ **Omnichannel Communication** - Sjednocené rozhraní pro WhatsApp, SMS a Web Chat  
✅ **Data Isolation** - Striktní oddělení dat podle agentur  
✅ **Real-time Analytics** - KPI tracking pro operátory a talenty  
✅ **Content Management** - Automatická synchronizace na partnerskébg portály  
✅ **Extensibility** - Snadné přidání nových kanálů a portálů  
✅ **Type-safe** - Abstraktní adaptéry pro všechny komponenty  

Pro otázky nebo vylepšení kontaktujte tým vývoje.

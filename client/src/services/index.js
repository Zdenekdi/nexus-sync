/**
 * services/index.js - Export all services
 */

// Communication services
export {
  CommunicationService,
  ChannelAdapter,
  WhatsAppAdapter,
  SMSAdapter,
  WebChatAdapter
} from './communication';

// Agency services
export { AgencyDataGateway } from './agency/AgencyDataGateway';

// Analytics services
export { AnalyticsService } from './analytics/AnalyticsService';

// Content services
export { ContentSyncService } from './content/ContentSyncService';
export { PortalAdapter } from './content/PortalAdapter';

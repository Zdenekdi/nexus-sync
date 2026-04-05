/**
 * index.js - Database integration exports
 */

export { DatabaseService, APIClient } from './DatabaseService';
export {
  MessageRepository,
  ConversationRepository,
  AnalyticsRepository,
  ProfileRepository
} from './DatabaseService';
export {
  DatabaseBackedWhatsAppAdapter,
  DatabaseBackedSMSAdapter,
  DatabaseBackedWebChatAdapter
} from './DatabaseAdapters';

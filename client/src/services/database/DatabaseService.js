/**
 * API Configuration & Database Integration Layer
 * Bridges services to production backend
 */

import axios from 'axios';

/**
 * APIClient - Centrální HTTP klient pro všechny API volání
 */
export class APIClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Interceptor pro refresh tokenu
    this.client.interceptors.response.use(
      response => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired - refresh nebo logout
          console.warn('Token expired');
          throw new Error('Auth token expired');
        }
        throw error;
      }
    );
  }

  async get(endpoint) {
    return this.client.get(endpoint);
  }

  async post(endpoint, data) {
    return this.client.post(endpoint, data);
  }

  async put(endpoint, data) {
    return this.client.put(endpoint, data);
  }

  async patch(endpoint, data) {
    return this.client.patch(endpoint, data);
  }

  async delete(endpoint) {
    return this.client.delete(endpoint);
  }
}

/**
 * MessageRepository - Data layer pro zprávy
 */
export class MessageRepository {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async createMessage(message) {
    const { data } = await this.api.post('/messages', {
      channel: message.channel,
      conversationId: message.conversationId,
      from: message.sender,
      to: message.recipient,
      content: message.content,
      metadata: message.metadata || {}
    });
    return data;
  }

  async getMessage(messageId) {
    const { data } = await this.api.get(`/messages/${messageId}`);
    return data;
  }

  async getConversationMessages(conversationId, limit = 50, offset = 0) {
    const { data } = await this.api.get(
      `/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`
    );
    return data;
  }

  async markAsRead(messageId, conversationId) {
    const { data } = await this.api.patch(
      `/messages/${messageId}/read`,
      { conversationId }
    );
    return data;
  }

  async searchMessages(query, filters = {}) {
    const { data } = await this.api.get('/messages/search', {
      params: { q: query, ...filters }
    });
    return data;
  }

  async deleteMessage(messageId) {
    const { data } = await this.api.delete(`/messages/${messageId}`);
    return data;
  }
}

/**
 * ConversationRepository - Data layer pro konverzace
 */
export class ConversationRepository {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async createConversation(participants, metadata = {}) {
    const { data } = await this.api.post('/conversations', {
      participants,
      metadata
    });
    return data;
  }

  async getConversation(conversationId) {
    const { data } = await this.api.get(`/conversations/${conversationId}`);
    return data;
  }

  async getConversations(filter = {}) {
    const { data } = await this.api.get('/conversations', { params: filter });
    return data;
  }

  async updateConversation(conversationId, updates) {
    const { data } = await this.api.patch(`/conversations/${conversationId}`, updates);
    return data;
  }

  async closeConversation(conversationId, reason = '') {
    const { data } = await this.api.post(
      `/conversations/${conversationId}/close`,
      { reason }
    );
    return data;
  }

  async assignOperator(conversationId, operatorId) {
    const { data } = await this.api.post(
      `/conversations/${conversationId}/assign`,
      { operatorId }
    );
    return data;
  }
}

/**
 * AnalyticsRepository - Data layer pro analitiku
 */
export class AnalyticsRepository {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async trackEvent(event) {
    const { data } = await this.api.post('/analytics/events', {
      type: event.type,
      operatorId: event.operatorId,
      talentId: event.talentId,
      agencyId: event.agencyId,
      metadata: event.metadata || {},
      timestamp: new Date()
    });
    return data;
  }

  async getOperatorKPIs(operatorId, dateRange) {
    const { data } = await this.api.get(
      `/analytics/operators/${operatorId}/kpis`,
      { params: { ...dateRange } }
    );
    return data;
  }

  async getTalentKPIs(talentId, dateRange) {
    const { data } = await this.api.get(
      `/analytics/talents/${talentId}/kpis`,
      { params: { ...dateRange } }
    );
    return data;
  }

  async getAgencyAnalytics(agencyId, dateRange) {
    const { data } = await this.api.get(
      `/analytics/agencies/${agencyId}`,
      { params: { ...dateRange } }
    );
    return data;
  }

  async getRealtimeDashboard(agencyId) {
    const { data } = await this.api.get(
      `/analytics/agencies/${agencyId}/realtime`
    );
    return data;
  }
}

/**
 * ProfileRepository - Data layer pro profily
 */
export class ProfileRepository {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async getProfile(profileId) {
    const { data } = await this.api.get(`/profiles/${profileId}`);
    return data;
  }

  async updateProfile(profileId, profile) {
    const { data } = await this.api.patch(`/profiles/${profileId}`, profile);
    return data;
  }

  async getProfileGallery(profileId) {
    const { data } = await this.api.get(`/profiles/${profileId}/gallery`);
    return data;
  }

  async uploadGalleryPhoto(profileId, file, metadata = {}) {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('metadata', JSON.stringify(metadata));

    const { data } = await this.api.client.post(
      `/profiles/${profileId}/gallery`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  }

  async deleteGalleryPhoto(profileId, photoId) {
    const { data } = await this.api.delete(
      `/profiles/${profileId}/gallery/${photoId}`
    );
    return data;
  }

  async getProfileSyncStatus(profileId) {
    const { data } = await this.api.get(
      `/profiles/${profileId}/sync-status`
    );
    return data;
  }
}

/**
 * DatabaseService - Sjednocená vrstva pro přístup k datům
 * Propojuje všechny repositories
 */
export class DatabaseService {
  constructor(apiBaseUrl, token) {
    this.apiClient = new APIClient(apiBaseUrl, token);
    this.messages = new MessageRepository(this.apiClient);
    this.conversations = new ConversationRepository(this.apiClient);
    this.analytics = new AnalyticsRepository(this.apiClient);
    this.profiles = new ProfileRepository(this.apiClient);
  }

  async healthCheck() {
    try {
      const { data } = await this.apiClient.get('/health');
      return data;
    } catch (error) {
      throw new Error('Database connection failed');
    }
  }
}

export default DatabaseService;

/**
 * Analytics Service - Real-time KPI tracking and metrics
 */

export class AnalyticsService {
  constructor(nexusContext = {}) {
    this.nexusContext = nexusContext;
    this.events = [];
    this.metrics = new Map();
    this.subscribers = new Map();
  }

  /**
   * Track event (operator action, call, message, etc.)
   */
  trackEvent(eventType, data) {
    const event = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      timestamp: new Date(),
      operatorId: data.operatorId || this.nexusContext.activeOperator?.id,
      agencyId: data.agencyId || this.nexusContext.activeOperator?.agencyId,
      ...data
    };

    this.events.push(event);

    // Trigger subscribers
    this.notifySubscribers(eventType, event);

    return event;
  }

  /**
   * Calculate operator KPIs
   */
  getOperatorKPIs(operatorId, timeRange = { days: 7 }) {
    const cutoff = new Date(Date.now() - timeRange.days * 24 * 60 * 60 * 1000);
    
    const operatorEvents = this.events.filter(e =>
      e.operatorId === operatorId && new Date(e.timestamp) > cutoff
    );

    const kpis = {
      operatorId,
      period: timeRange,
      totalInteractions: operatorEvents.length,
      messagesSent: operatorEvents.filter(e => e.type === 'message.sent').length,
      messagesReceived: operatorEvents.filter(e => e.type === 'message.received').length,
      callsHandled: operatorEvents.filter(e => e.type === 'call.ended').length,
      avgHandleTime: this.calculateAverageHandleTime(operatorEvents),
      customerSatisfaction: this.calculateSatisfaction(operatorEvents),
      responseTime: this.calculateResponseTime(operatorEvents),
      conversionRate: this.calculateConversionRate(operatorEvents),
      onlineTime: this.calculateOnlineTime(operatorId, cutoff),
      breakTime: this.calculateBreakTime(operatorId, cutoff)
    };

    return kpis;
  }

  /**
   * Get talent KPIs (for models/talents)
   */
  getTalentKPIs(talentId, timeRange = { days: 7 }) {
    const cutoff = new Date(Date.now() - timeRange.days * 24 * 60 * 60 * 1000);
    
    const talentEvents = this.events.filter(e =>
      e.talentId === talentId && new Date(e.timestamp) > cutoff
    );

    const kpis = {
      talentId,
      period: timeRange,
      totalSessions: talentEvents.filter(e => e.type === 'session.start').length,
      totalEarnings: talentEvents
        .filter(e => e.type === 'payment.received')
        .reduce((sum, e) => sum + (e.amount || 0), 0),
      avgSessionDuration: this.calculateAverageSessionDuration(talentEvents),
      clientRating: this.calculateAverageRating(talentEvents),
      noShowRate: this.calculateNoShowRate(talentEvents),
      repeatClientRate: this.calculateRepeatClientRate(talentEvents),
      profileViews: talentEvents.filter(e => e.type === 'profile.viewed').length,
      profileBookmarks: talentEvents.filter(e => e.type === 'profile.bookmarked').length
    };

    return kpis;
  }

  /**
   * Get agency-level analytics
   */
  getAgencyAnalytics(agencyId, timeRange = { days: 30 }) {
    const cutoff = new Date(Date.now() - timeRange.days * 24 * 60 * 60 * 1000);
    
    const agencyEvents = this.events.filter(e =>
      e.agencyId === agencyId && new Date(e.timestamp) > cutoff
    );

    const uniqueOperators = new Set(agencyEvents.map(e => e.operatorId));
    const uniqueTalents = new Set(agencyEvents.map(e => e.talentId));

    const analytics = {
      agencyId,
      period: timeRange,
      totalMessages: agencyEvents.filter(e => e.type.startsWith('message.')).length,
      totalCalls: agencyEvents.filter(e => e.type.startsWith('call.')).length,
      totalSessions: agencyEvents.filter(e => e.type === 'session.start').length,
      totalRevenue: agencyEvents
        .filter(e => e.type === 'payment.received')
        .reduce((sum, e) => sum + (e.amount || 0), 0),
      activeOperators: uniqueOperators.size,
      activeTalents: uniqueTalents.size,
      avgCustomerSatisfaction: this.calculateAverageMetric(
        agencyEvents,
        'customerSatisfaction'
      ),
      conversionRate: this.calculateAverageMetric(agencyEvents, 'conversionRate'),
      topPerformers: this.getTopPerformers(agencyId, 5),
      peakHours: this.calculatePeakHours(agencyEvents),
      channelDistribution: this.getChannelDistribution(agencyEvents)
    };

    return analytics;
  }

  /**
   * Real-time dashboard metrics
   */
  getRealtimeDashboard(agencyId) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentEvents = this.events.filter(e =>
      e.agencyId === agencyId && new Date(e.timestamp) > oneHourAgo
    );

    return {
      timestamp: now,
      agencyId,
      onlineOperators: new Set(
        recentEvents
          .filter(e => e.type === 'operator.online')
          .map(e => e.operatorId)
      ).size,
      activeChats: recentEvents.filter(e =>
        e.type === 'chat.active'
      ).length,
      pendingMessages: recentEvents.filter(e =>
        e.type === 'message.pending'
      ).length,
      avgResponseTime: this.calculateResponseTime(recentEvents),
      messagesLastHour: recentEvents.filter(e =>
        e.type === 'message.sent'
      ).length,
      callsLastHour: recentEvents.filter(e =>
        e.type === 'call.ended'
      ).length
    };
  }

  /**
   * Subscribe to metric updates
   */
  subscribe(metricName, callback) {
    if (!this.subscribers.has(metricName)) {
      this.subscribers.set(metricName, []);
    }
    this.subscribers.get(metricName).push(callback);

    return () => {
      const callbacks = this.subscribers.get(metricName);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify subscribers of updates
   */
  notifySubscribers(metricName, data) {
    const callbacks = this.subscribers.get(metricName) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Subscriber error for ${metricName}:`, error);
      }
    });
  }

  // Helper methods
  calculateAverageHandleTime(events) {
    const callEvents = events.filter(e => e.type === 'call.ended');
    if (callEvents.length === 0) return 0;
    
    const totalTime = callEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
    return totalTime / callEvents.length / 60; // Return in minutes
  }

  calculateSatisfaction(events) {
    const ratings = events
      .filter(e => e.type === 'feedback.received' && e.rating)
      .map(e => e.rating);
    
    if (ratings.length === 0) return 0;
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length * 20).toFixed(1);
  }

  calculateResponseTime(events) {
    const responseEvents = events.filter(e => e.responseTime);
    if (responseEvents.length === 0) return 0;
    
    const avgMs = responseEvents.reduce((sum, e) => sum + e.responseTime, 0) / responseEvents.length;
    return (avgMs / 1000).toFixed(2); // Return in seconds
  }

  calculateConversionRate(events) {
    const totalInteractions = events.length;
    const conversions = events.filter(e => e.type === 'conversion').length;
    
    if (totalInteractions === 0) return 0;
    return ((conversions / totalInteractions) * 100).toFixed(2);
  }

  calculateOnlineTime(operatorId, cutoff) {
    const onlineEvents = this.events.filter(e =>
      e.operatorId === operatorId &&
      new Date(e.timestamp) > cutoff &&
      (e.type === 'operator.online' || e.type === 'operator.offline')
    );

    let totalTime = 0;
    let lastOnlineTime = null;

    onlineEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    onlineEvents.forEach(event => {
      if (event.type === 'operator.online') {
        lastOnlineTime = new Date(event.timestamp);
      } else if (event.type === 'operator.offline' && lastOnlineTime) {
        totalTime += new Date(event.timestamp) - lastOnlineTime;
      }
    });

    return totalTime / (60 * 60 * 1000); // Return in hours
  }

  calculateBreakTime(operatorId, cutoff) {
    const breakEvents = this.events.filter(e =>
      e.operatorId === operatorId &&
      new Date(e.timestamp) > cutoff &&
      e.type === 'break'
    );

    return breakEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / (60 * 1000); // Return in minutes
  }

  calculateAverageSessionDuration(events) {
    const sessionEvents = events.filter(e => e.type === 'session.start' && e.duration);
    if (sessionEvents.length === 0) return 0;
    
    const total = sessionEvents.reduce((sum, e) => sum + e.duration, 0);
    return (total / sessionEvents.length / 60).toFixed(2); // Return in minutes
  }

  calculateAverageRating(events) {
    const ratings = events
      .filter(e => e.type === 'rating' && e.score)
      .map(e => e.score);
    
    if (ratings.length === 0) return 0;
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2);
  }

  calculateNoShowRate(events) {
    const bookings = events.filter(e => e.type === 'booking.created').length;
    const noShows = events.filter(e => e.type === 'session.no_show').length;
    
    if (bookings === 0) return 0;
    return ((noShows / bookings) * 100).toFixed(2);
  }

  calculateRepeatClientRate(events) {
    const clientIds = events
      .filter(e => e.type === 'session.start')
      .map(e => e.clientId);
    
    const repeats = clientIds.filter(
      (id, idx) => clientIds.indexOf(id) !== idx
    ).length;
    
    if (clientIds.length === 0) return 0;
    return ((repeats / clientIds.length) * 100).toFixed(2);
  }

  getTopPerformers(agencyId, limit = 5) {
    const operatorIds = new Set(
      this.events
        .filter(e => e.agencyId === agencyId && e.operatorId)
        .map(e => e.operatorId)
    );

    const performers = Array.from(operatorIds).map(opId => ({
      operatorId: opId,
      score: this.calculatePerformanceScore(opId)
    }));

    return performers.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  calculatePerformanceScore(operatorId) {
    const events = this.events.filter(e => e.operatorId === operatorId);
    const messageCount = events.filter(e => e.type === 'message.sent').length;
    const satisfaction = this.calculateSatisfaction(events);
    
    return (messageCount * 0.7) + (satisfaction * 0.3);
  }

  calculatePeakHours(events) {
    const hourCounts = {};
    
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return hourCounts;
  }

  getChannelDistribution(events) {
    const distribution = {};
    
    events.forEach(event => {
      const channel = event.channel || 'unknown';
      distribution[channel] = (distribution[channel] || 0) + 1;
    });

    return distribution;
  }

  calculateAverageMetric(events, metricName) {
    const values = events
      .filter(e => e[metricName] !== undefined)
      .map(e => parseFloat(e[metricName]));
    
    if (values.length === 0) return 0;
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
  }

  /**
   * Export analytics data
   */
  exportData(format = 'json') {
    if (format === 'csv') {
      return this.eventsToCSV();
    }
    return this.events;
  }

  eventsToCSV() {
    if (this.events.length === 0) return '';
    
    const headers = Object.keys(this.events[0]);
    const csv = [
      headers.join(','),
      ...this.events.map(event =>
        headers.map(header => JSON.stringify(event[header] || '')).join(',')
      )
    ].join('\n');

    return csv;
  }
}

export default AnalyticsService;

/**
 * AgencyDataGateway - Middleware for enforcing agency-level data isolation
 * Ensures users only access data within their agency scope
 */

export class AgencyDataGateway {
  constructor(nexusContext) {
    this.nexusContext = nexusContext;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.cache = new Map();
  }

  /**
   * Get current user's agency ID
   */
  getCurrentAgencyId() {
    const operator = this.nexusContext?.activeOperator;
    if (!operator?.agencyId) {
      throw new Error('User not associated with agency');
    }
    return operator.agencyId;
  }

  /**
   * Get current user's organization ID (for umbrella operations)
   */
  getCurrentOrganizationId() {
    const operator = this.nexusContext?.activeOperator;
    return operator?.organizationId || operator?.appOwnerId;
  }

  /**
   * Check if user can access specific agency
   */
  canAccessAgency(agencyId) {
    const operator = this.nexusContext?.activeOperator;
    const currentAgency = this.getCurrentAgencyId();
    
    if (!operator) return false;

    // App owners and super admins can access all agencies
    if (operator.isAppOwner || operator.role === 'SUPER_ADMIN') {
      return true;
    }

    // Operators can only access their own agency
    return currentAgency === agencyId;
  }

  /**
   * Filter data to only include items for current agency
   */
  filterByAgency(items, agencyIdField = 'agencyId') {
    if (!Array.isArray(items)) return items;
    
    const currentAgency = this.getCurrentAgencyId();
    return items.filter(item => {
      const itemAgency = item[agencyIdField];
      return this.canAccessAgency(itemAgency || currentAgency);
    });
  }

  /**
   * Filter conversations to current agency
   */
  filterConversations(conversations) {
    return this.filterByAgency(conversations, 'agencyId');
  }

  /**
   * Filter profiles to current agency
   */
  filterProfiles(profiles) {
    return this.filterByAgency(profiles, 'agencyId');
  }

  /**
   * Filter operators to current agency
   */
  filterOperators(operators) {
    const operator = this.nexusContext?.activeOperator;
    
    if (operator?.isAppOwner) {
      // App owner can see all operators
      return operators;
    }

    // Managers can see operators in their agency
    const currentAgency = this.getCurrentAgencyId();
    return operators.filter(op => 
      op.agencyId === currentAgency || op.supervisorId === operator?.id
    );
  }

  /**
   * Add agency context to API requests
   */
  addAgencyContext(params = {}) {
    const agencyId = this.getCurrentAgencyId();
    const organizationId = this.getCurrentOrganizationId();
    
    return {
      ...params,
      agencyId,
      organizationId,
      _agencyFilter: true
    };
  }

  /**
   * Validate request has proper agency scope
   */
  validateAgencyScope(request) {
    const agencyId = request.agencyId || request.params?.agencyId;
    
    if (!agencyId) {
      throw new Error('Missing agency context in request');
    }

    if (!this.canAccessAgency(agencyId)) {
      throw new Error('Access denied: Insufficient agency permissions');
    }

    return true;
  }

  /**
   * Build query filter for agency isolation
   */
  buildAgencyFilter() {
    const operator = this.nexusContext?.activeOperator;
    
    if (operator?.isAppOwner) {
      // No filter for app owners
      return { _appOwner: operator.appOwnerId };
    }

    // Regular operators filtered by agency
    const agencyId = this.getCurrentAgencyId();
    return {
      agencyId,
      _agencyFilter: true
    };
  }

  /**
   * Intercept API response and filter by agency
   */
  filterResponse(response, _itemsPath = 'items') {
    if (!Array.isArray(response)) {
      return response;
    }

    return this.filterByAgency(response);
  }

  /**
   * Check operation permission
   */
  checkPermission(operation, _resource) {
    const operator = this.nexusContext?.activeOperator;
    
    if (!operator) {
      throw new Error('User not authenticated');
    }

    const permissions = {
      'CREATE_PROFILE': ['MANAGER', 'AGENCY ADMIN', 'OWNER', 'APP OWNER'],
      'EDIT_PROFILE': ['MANAGER', 'AGENCY ADMIN', 'OWNER', 'APP OWNER'],
      'DELETE_PROFILE': ['AGENCY ADMIN', 'OWNER', 'APP OWNER'],
      'VIEW_ANALYTICS': ['MANAGER', 'AGENCY ADMIN', 'OWNER', 'APP OWNER'],
      'MANAGE_OPERATORS': ['AGENCY ADMIN', 'OWNER', 'APP OWNER'],
      'MANAGE_AGENCY': ['AGENCY ADMIN', 'OWNER', 'APP OWNER']
    };

    const allowedRoles = permissions[operation] || [];
    
    if (!allowedRoles.includes(operator.role)) {
      throw new Error(`Operation '${operation}' not permitted for role: ${operator.role}`);
    }

    return true;
  }

  /**
   * Get cached data or fetch
   */
  async getWithCache(key, fetchFn, ttl = this.cacheTimeout) {
    const cacheEntry = this.cache.get(key);
    
    if (cacheEntry && Date.now() - cacheEntry.timestamp < ttl) {
      return cacheEntry.data;
    }

    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: Date.now() });
    
    return data;
  }

  /**
   * Clear cache for specific key or all
   */
  clearCache(key) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Format data for audit logging
   */
  formatAuditLog(action, resource, details = {}) {
    const operator = this.nexusContext?.activeOperator;
    
    return {
      timestamp: new Date(),
      userId: operator?.id,
      userName: operator?.name,
      agencyId: this.getCurrentAgencyId(),
      action,
      resource,
      details,
      ipAddress: 'unknown', // Should be set by backend
      userAgent: navigator.userAgent
    };
  }
}

export default AgencyDataGateway;

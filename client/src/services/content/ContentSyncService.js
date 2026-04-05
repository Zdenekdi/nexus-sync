/**
 * ContentSyncService - Synchronize profiles and galleries across partner portals
 */

export class ContentSyncService {
  constructor(config = {}) {
    this.config = config;
    this.portals = new Map();
    this.syncQueue = [];
    this.syncHistory = [];
    this.isRunning = false;
  }

  /**
   * Register a partner portal integration
   */
  registerPortal(portalName, adapter) {
    this.portals.set(portalName, adapter);
    return this;
  }

  /**
   * Get portal adapter
   */
  getPortal(portalName) {
    return this.portals.get(portalName);
  }

  /**
   * Sync profile to all registered portals
   */
  async syncProfile(profile, options = {}) {
    const syncId = `sync_${Date.now()}`;
    const sync = {
      id: syncId,
      profileId: profile.id,
      type: 'profile',
      status: 'pending',
      startTime: new Date(),
      results: {}
    };

    this.syncQueue.push(sync);

    for (const [portalName, adapter] of this.portals) {
      try {
        const result = await adapter.syncProfile(profile);
        sync.results[portalName] = {
          success: true,
          data: result
        };
      } catch (error) {
        sync.results[portalName] = {
          success: false,
          error: error.message
        };
      }
    }

    sync.status = 'completed';
    sync.endTime = new Date();
    this.syncHistory.push(sync);

    return sync;
  }

  /**
   * Sync gallery/photos to all portals
   */
  async syncGallery(profileId, gallery, options = {}) {
    const syncId = `sync_${Date.now()}`;
    const sync = {
      id: syncId,
      profileId,
      type: 'gallery',
      photoCount: gallery.photos?.length || 0,
      status: 'pending',
      startTime: new Date(),
      results: {}
    };

    this.syncQueue.push(sync);

    for (const [portalName, adapter] of this.portals) {
      try {
        const result = await adapter.syncGallery(profileId, gallery);
        sync.results[portalName] = {
          success: true,
          uploadedCount: result.uploadedCount,
          data: result
        };
      } catch (error) {
        sync.results[portalName] = {
          success: false,
          error: error.message
        };
      }
    }

    sync.status = 'completed';
    sync.endTime = new Date();
    this.syncHistory.push(sync);

    return sync;
  }

  /**
   * Detect changes in profile and sync only delta
   */
  async deltaSync(profileId, previousProfile, currentProfile) {
    const changes = this.detectChanges(previousProfile, currentProfile);
    
    if (Object.keys(changes).length === 0) {
      return { profileId, changes: {}, synced: false, reason: 'No changes detected' };
    }

    const syncId = `sync_${Date.now()}`;
    const sync = {
      id: syncId,
      profileId,
      type: 'delta',
      changes,
      status: 'pending',
      startTime: new Date(),
      results: {}
    };

    for (const [portalName, adapter] of this.portals) {
      try {
        const result = await adapter.updateProfile(profileId, changes);
        sync.results[portalName] = {
          success: true,
          data: result
        };
      } catch (error) {
        sync.results[portalName] = {
          success: false,
          error: error.message
        };
      }
    }

    sync.status = 'completed';
    sync.endTime = new Date();
    this.syncHistory.push(sync);

    return sync;
  }

  /**
   * Detect what changed between two profile versions
   */
  detectChanges(oldProfile, newProfile) {
    const changes = {};

    const fieldsToCompare = [
      'name', 'bio', 'age', 'location', 'specialties',
      'languages', 'rates', 'availability'
    ];

    fieldsToCompare.forEach(field => {
      const oldValue = oldProfile?.[field];
      const newValue = newProfile?.[field];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[field] = {
          from: oldValue,
          to: newValue
        };
      }
    });

    return changes;
  }

  /**
   * Pull/fetch data from portal (one-way sync)
   */
  async pullFromPortal(portalName, profileId) {
    const adapter = this.getPortal(portalName);
    if (!adapter) {
      throw new Error(`Portal not registered: ${portalName}`);
    }

    try {
      const profile = await adapter.getProfile(profileId);
      return {
        success: true,
        portal: portalName,
        data: profile
      };
    } catch (error) {
      return {
        success: false,
        portal: portalName,
        error: error.message
      };
    }
  }

  /**
   * Scheduled sync (e.g., run every hour)
   */
  async startScheduledSync(interval = 60 * 60 * 1000) {
    if (this.isRunning) {
      console.warn('Sync already running');
      return;
    }

    this.isRunning = true;

    const runSync = async () => {
      try {
        console.log('Running scheduled sync...');
        // Sync all pending profiles
        for (const sync of this.syncQueue.filter(s => s.status === 'pending')) {
          await this.retrySync(sync);
        }
      } catch (error) {
        console.error('Scheduled sync error:', error);
      }
    };

    // Run initial sync
    await runSync();

    // Schedule recurring syncs
    this.syncInterval = setInterval(runSync, interval);
  }

  /**
   * Stop scheduled sync
   */
  stopScheduledSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
  }

  /**
   * Retry failed sync
   */
  async retrySync(sync, maxRetries = 3) {
    let retries = 0;
    
    while (retries < maxRetries && sync.status === 'pending') {
      try {
        // Retry logic here
        retries++;
      } catch (error) {
        console.error(`Sync retry ${retries} failed:`, error);
      }
    }

    return sync;
  }

  /**
   * Get sync history for profile
   */
  getSyncHistory(profileId, limit = 10) {
    return this.syncHistory
      .filter(s => s.profileId === profileId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get sync status
   */
  getSyncStatus(profileId) {
    const lastSync = this.syncHistory
      .filter(s => s.profileId === profileId)
      .pop();

    return {
      profileId,
      lastSync: lastSync?.endTime,
      status: lastSync?.status || 'never',
      nextSync: this.getNextSyncTime()
    };
  }

  /**
   * Get next scheduled sync time
   */
  getNextSyncTime() {
    if (!this.isRunning || !this.syncInterval) {
      return null;
    }
    // Calculate based on interval
    return new Date(Date.now() + 60 * 60 * 1000); // Example: 1 hour
  }

  /**
   * Force immediate sync for profile
   */
  async forceSyncNow(profileId) {
    return {
      profileId,
      queuedAt: new Date(),
      status: 'queued_for_immediate_sync'
    };
  }

  /**
   * Get all portals status
   */
  getPortalsStatus() {
    const status = {};
    
    for (const [portalName, adapter] of this.portals) {
      status[portalName] = {
        connected: adapter.isConnected?.() || false,
        lastSync: this.findLastSyncForPortal(portalName),
        failureCount: this.countFailures(portalName)
      };
    }

    return status;
  }

  /**
   * Find last sync for specific portal
   */
  findLastSyncForPortal(portalName) {
    for (let i = this.syncHistory.length - 1; i >= 0; i--) {
      const sync = this.syncHistory[i];
      if (sync.results[portalName]) {
        return sync.endTime;
      }
    }
    return null;
  }

  /**
   * Count failures for portal
   */
  countFailures(portalName, hours = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return this.syncHistory.filter(sync =>
      new Date(sync.endTime) > cutoff &&
      sync.results[portalName]?.success === false
    ).length;
  }

  /**
   * Export sync report
   */
  generateReport(startDate, endDate) {
    const syncEvents = this.syncHistory.filter(s =>
      new Date(s.startTime) >= startDate &&
      new Date(s.startTime) <= endDate
    );

    const successful = syncEvents.filter(s => s.status === 'completed').length;
    const failed = syncEvents.filter(s => s.status === 'failed').length;

    return {
      period: { start: startDate, end: endDate },
      totalSyncs: syncEvents.length,
      successful,
      failed,
      successRate: ((successful / syncEvents.length) * 100).toFixed(2),
      portalsStatus: this.getPortalsStatus(),
      details: syncEvents
    };
  }
}

export default ContentSyncService;

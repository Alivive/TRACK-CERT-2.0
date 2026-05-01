// Offline Manager for CerTrack PWA
import { offlineStorage } from './offlineStorage';
import { apiClient } from './apiClient';

class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.listeners = new Set();
    this.init();
  }

  init() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('[OFFLINE] Back online - starting sync...');
      this.isOnline = true;
      this.notifyListeners('online');
      this.syncPendingActions();
    });

    window.addEventListener('offline', () => {
      console.log('[OFFLINE] Gone offline - enabling offline mode...');
      this.isOnline = false;
      this.notifyListeners('offline');
    });

    // Sync on page load if online
    if (this.isOnline) {
      setTimeout(() => this.syncPendingActions(), 1000);
    }

    // Periodic sync every 30 seconds when online
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncPendingActions();
      }
    }, 30000);
  }

  // Add listener for online/offline events
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event) {
    this.listeners.forEach(callback => callback(event, this.isOnline));
  }

  // Add certification offline
  async addCertificationOffline(certData) {
    try {
      // Store in IndexedDB
      const id = await offlineStorage.addOfflineCertification(certData);
      
      // Add to pending actions for sync
      await offlineStorage.addPendingAction('ADD_CERTIFICATION', {
        ...certData,
        offlineId: id
      });

      console.log('[OFFLINE] Certification saved offline:', certData.name);
      return { success: true, id, offline: true };
    } catch (error) {
      console.error('[OFFLINE] Failed to save certification offline:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all certifications (online + offline)
  async getAllCertifications() {
    try {
      let certifications = [];

      // Get cached online certifications
      const cachedCerts = await offlineStorage.getCachedData('certifications');
      if (cachedCerts) {
        certifications = [...cachedCerts];
      }

      // Get offline certifications
      const offlineCerts = await offlineStorage.getOfflineCertifications();
      
      // Merge and mark offline ones
      const allCerts = [
        ...certifications,
        ...offlineCerts.map(cert => ({
          ...cert,
          offline: !cert.synced,
          pending: !cert.synced
        }))
      ];

      // Sort by date (newest first)
      return allCerts.sort((a, b) => new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp));
    } catch (error) {
      console.error('[OFFLINE] Failed to get certifications:', error);
      return [];
    }
  }

  // Cache data for offline viewing
  async cacheForOffline(key, data) {
    try {
      await offlineStorage.cacheData(key, data);
      console.log(`[OFFLINE] Cached ${key} for offline viewing`);
    } catch (error) {
      console.error(`[OFFLINE] Failed to cache ${key}:`, error);
    }
  }

  // Get cached data
  async getCachedData(key) {
    try {
      return await offlineStorage.getCachedData(key);
    } catch (error) {
      console.error(`[OFFLINE] Failed to get cached ${key}:`, error);
      return null;
    }
  }

  // Sync all pending actions
  async syncPendingActions() {
    if (!this.isOnline || this.syncInProgress) return;

    this.syncInProgress = true;
    console.log('[OFFLINE] Starting sync of pending actions...');

    try {
      const pendingActions = await offlineStorage.getPendingActions();
      console.log(`[OFFLINE] Found ${pendingActions.length} pending actions`);

      for (const action of pendingActions) {
        try {
          await this.syncAction(action);
          await offlineStorage.removePendingAction(action.id);
          console.log(`[OFFLINE] Synced action: ${action.type}`);
        } catch (error) {
          console.error(`[OFFLINE] Failed to sync action ${action.type}:`, error);
          // TODO: Implement retry logic with exponential backoff
        }
      }

      // Refresh cached data after sync
      await this.refreshCachedData();
      
      console.log('[OFFLINE] Sync completed successfully');
      this.notifyListeners('sync-complete');
      
    } catch (error) {
      console.error('[OFFLINE] Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync individual action
  async syncAction(action) {
    switch (action.type) {
      case 'ADD_CERTIFICATION':
        return await this.syncAddCertification(action);
      case 'UPDATE_PROFILE':
        return await this.syncUpdateProfile(action);
      case 'ADD_INTERN':
        return await this.syncAddIntern(action);
      default:
        console.warn(`[OFFLINE] Unknown action type: ${action.type}`);
    }
  }

  // Sync add certification
  async syncAddCertification(action) {
    const response = await apiClient.addCertification(action.data);
    
    if (response.success) {
      // Mark offline certification as synced
      if (action.data.offlineId) {
        await offlineStorage.markCertificationSynced(action.data.offlineId);
      }
    }
    
    return response;
  }

  // Sync update profile
  async syncUpdateProfile(action) {
    return await apiClient.updateUser(action.data.userId, action.data.updates);
  }

  // Sync add intern
  async syncAddIntern(action) {
    return await apiClient.addIntern(action.data);
  }

  // Refresh cached data from server
  async refreshCachedData() {
    if (!this.isOnline) return;

    try {
      // Cache certifications
      const certsResponse = await apiClient.getCertifications();
      if (certsResponse.success) {
        await this.cacheForOffline('certifications', certsResponse.data);
      }

      // Cache interns
      const internsResponse = await apiClient.getInterns();
      if (internsResponse.success) {
        await this.cacheForOffline('interns', internsResponse.data);
      }

      // Cache users (admin only)
      try {
        const usersResponse = await apiClient.getUsers();
        if (usersResponse.success) {
          await this.cacheForOffline('users', usersResponse.data);
        }
      } catch (error) {
        // Ignore if not admin
      }

    } catch (error) {
      console.error('[OFFLINE] Failed to refresh cached data:', error);
    }
  }

  // Get sync status
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress
    };
  }

  // Force sync (manual trigger)
  async forceSync() {
    if (this.isOnline) {
      await this.syncPendingActions();
    }
  }
}

// Create singleton instance
export const offlineManager = new OfflineManager();
export default offlineManager;
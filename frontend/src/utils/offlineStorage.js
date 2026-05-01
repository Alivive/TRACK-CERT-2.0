// Offline Storage Manager for CerTrack PWA
class OfflineStorage {
  constructor() {
    this.dbName = 'CerTrackDB';
    this.version = 1;
    this.db = null;
    this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Store for cached data
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Store for offline actions (pending sync)
        if (!db.objectStoreNames.contains('pendingActions')) {
          const actionsStore = db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
          actionsStore.createIndex('type', 'type', { unique: false });
          actionsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Store for offline certifications
        if (!db.objectStoreNames.contains('offlineCertifications')) {
          const certsStore = db.createObjectStore('offlineCertifications', { keyPath: 'id', autoIncrement: true });
          certsStore.createIndex('timestamp', 'timestamp', { unique: false });
          certsStore.createIndex('synced', 'synced', { unique: false });
        }
      };
    });
  }

  // Cache data for offline viewing
  async cacheData(key, data) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    
    await store.put({
      key,
      data,
      timestamp: Date.now()
    });
  }

  // Get cached data
  async getCachedData(key) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Store offline certification
  async addOfflineCertification(certData) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['offlineCertifications'], 'readwrite');
    const store = transaction.objectStore('offlineCertifications');
    
    const offlineCert = {
      ...certData,
      timestamp: Date.now(),
      synced: false,
      offline: true
    };
    
    return new Promise((resolve, reject) => {
      const request = store.add(offlineCert);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all offline certifications
  async getOfflineCertifications() {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['offlineCertifications'], 'readonly');
    const store = transaction.objectStore('offlineCertifications');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Mark certification as synced
  async markCertificationSynced(id) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['offlineCertifications'], 'readwrite');
    const store = transaction.objectStore('offlineCertifications');
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const cert = getRequest.result;
        if (cert) {
          cert.synced = true;
          const putRequest = store.put(cert);
          putRequest.onsuccess = () => resolve(true);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(false);
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Add pending action for background sync
  async addPendingAction(type, data) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');
    
    const action = {
      type,
      data,
      timestamp: Date.now(),
      retries: 0
    };
    
    return new Promise((resolve, reject) => {
      const request = store.add(action);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all pending actions
  async getPendingActions() {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['pendingActions'], 'readonly');
    const store = transaction.objectStore('pendingActions');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Remove pending action after successful sync
  async removePendingAction(id) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear old cached data (older than 7 days)
  async clearOldCache() {
    if (!this.db) await this.init();
    
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    const index = store.index('timestamp');
    
    const range = IDBKeyRange.upperBound(sevenDaysAgo);
    const request = index.openCursor(range);
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }
}

// Create singleton instance
export const offlineStorage = new OfflineStorage();
export default offlineStorage;
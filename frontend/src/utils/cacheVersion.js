// Automatic Cache Version Manager
// Uses build timestamp - no manual version updates needed!
// Cache automatically clears when a new build is deployed

// This value is automatically set during build time
export const CACHE_VERSION = import.meta.env.VITE_BUILD_TIME || Date.now().toString();

export const checkAndClearOldCache = async () => {
  const STORAGE_KEY = 'certrack_cache_version';
  const currentVersion = localStorage.getItem(STORAGE_KEY);
  
  if (currentVersion !== CACHE_VERSION) {
    console.log(`[CACHE] New build detected. Clearing old cache...`);
    console.log(`[CACHE] Old: ${currentVersion}, New: ${CACHE_VERSION}`);
    
    try {
      // Clear localStorage (except version)
      const versionBackup = CACHE_VERSION;
      localStorage.clear();
      localStorage.setItem(STORAGE_KEY, versionBackup);
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear IndexedDB
      const { offlineStorage } = await import('./offlineStorage');
      await offlineStorage.clearAllCache();
      
      console.log('[CACHE] Old cache cleared successfully.');
      
      // Set flag for notification
      sessionStorage.setItem('cache_just_cleared', 'true');
      
      return true;
    } catch (error) {
      console.error('[CACHE] Failed to clear old cache:', error);
      return false;
    }
  } else {
    console.log('[CACHE] Cache is current. No clearing needed.');
    return false;
  }
};

// Automatic Cache Version Manager
// Uses build timestamp - no manual version updates needed!
// Cache automatically clears when a new build is deployed

// This value is automatically set during build time
export const CACHE_VERSION = import.meta.env.VITE_BUILD_TIME || Date.now().toString();

// Check for updates every 30 seconds
export const UPDATE_CHECK_INTERVAL = 30000;

// Keys to preserve during cache clear (authentication and critical user data)
const PRESERVE_KEYS = [
  'sb-', // Supabase auth tokens (all keys starting with 'sb-')
  'supabase.auth.token', // Legacy Supabase auth
  'certrack_cache_version', // Our version tracker
  'theme', // User theme preference
  'user_preferences' // Any user preferences
];

export const checkAndClearOldCache = async () => {
  const STORAGE_KEY = 'certrack_cache_version';
  const currentVersion = localStorage.getItem(STORAGE_KEY);
  
  if (currentVersion !== CACHE_VERSION) {
    console.log(`[CACHE] New build detected. Clearing old cache...`);
    console.log(`[CACHE] Old: ${currentVersion}, New: ${CACHE_VERSION}`);
    
    try {
      // PRESERVE CRITICAL DATA - Backup keys that should survive updates
      const dataBackup = {};
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Check if key matches any preserve pattern
        const shouldPreserve = PRESERVE_KEYS.some(pattern => 
          key.startsWith(pattern) || key === pattern
        );
        
        if (shouldPreserve) {
          dataBackup[key] = localStorage.getItem(key);
          console.log(`[CACHE] Preserving: ${key}`);
        }
      }
      
      // Clear localStorage
      localStorage.clear();
      
      // Restore preserved data
      Object.keys(dataBackup).forEach(key => {
        localStorage.setItem(key, dataBackup[key]);
      });
      
      // Set new version
      localStorage.setItem(STORAGE_KEY, CACHE_VERSION);
      
      // Clear sessionStorage (doesn't contain auth data)
      sessionStorage.clear();
      
      // Clear IndexedDB (offline data cache only, not auth)
      try {
        const { offlineStorage } = await import('./offlineStorage');
        await offlineStorage.clearAllCache();
      } catch (error) {
        console.warn('[CACHE] Could not clear IndexedDB:', error);
      }
      
      console.log('[CACHE] ✅ Cache cleared. Auth & preferences preserved.');
      
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

// Force reload if new version is detected
export const forceUpdateIfNeeded = async () => {
  const STORAGE_KEY = 'certrack_cache_version';
  const currentVersion = localStorage.getItem(STORAGE_KEY);
  
  if (currentVersion && currentVersion !== CACHE_VERSION) {
    console.log('[UPDATE] New version detected, forcing reload...');
    await checkAndClearOldCache();
    window.location.reload(true);
  }
};

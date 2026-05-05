// Force Vite Cache Clear - Auto Version
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Automatic version based on build time (no manual updates needed!)
const APP_VERSION = import.meta.env.VITE_BUILD_TIME || Date.now().toString();
const STORED_VERSION = localStorage.getItem('app_version');

// Only clear cache if version actually changed AND we haven't just cleared it
const LAST_CLEAR_TIME = localStorage.getItem('last_cache_clear');
const NOW = Date.now();
const CLEAR_COOLDOWN = 10000; // 10 seconds cooldown to prevent loops

if (STORED_VERSION !== APP_VERSION && (!LAST_CLEAR_TIME || (NOW - parseInt(LAST_CLEAR_TIME)) > CLEAR_COOLDOWN)) {
  console.log(`[APP] New build detected - clearing caches (preserving auth)`);
  
  // Save auth data before clearing
  const authKeys = Object.keys(localStorage).filter(key => 
    key.startsWith('sb-') || // Supabase auth
    key.includes('supabase') ||
    key === 'app_version' ||
    key === 'last_cache_clear'
  );
  const savedAuth = {};
  authKeys.forEach(key => {
    savedAuth[key] = localStorage.getItem(key);
  });
  
  // Update version FIRST to prevent loops
  localStorage.setItem('app_version', APP_VERSION);
  localStorage.setItem('last_cache_clear', NOW.toString());
  
  // Clear service worker caches only (not localStorage)
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        // Only clear app caches, not auth-related ones
        if (!name.includes('auth')) {
          caches.delete(name);
        }
      });
    });
  }
  
  // Clear IndexedDB (except Supabase auth)
  if ('indexedDB' in window) {
    indexedDB.databases().then(dbs => {
      dbs.forEach(db => {
        if (db.name && db.name.includes('certrack') && !db.name.includes('supabase')) {
          indexedDB.deleteDatabase(db.name);
        }
      });
    }).catch(() => {
      // Fallback - only clear app-specific databases
      ['certrack-offline', 'certrack-cache'].forEach(name => {
        indexedDB.deleteDatabase(name);
      });
    });
  }
  
  // Clear non-auth localStorage
  Object.keys(localStorage).forEach(key => {
    if (!key.startsWith('sb-') && 
        !key.includes('supabase') && 
        key !== 'app_version' && 
        key !== 'last_cache_clear') {
      localStorage.removeItem(key);
    }
  });
  
  console.log('[APP] Cache cleared - you will stay logged in');
  
  // Reload without clearing auth
  setTimeout(() => {
    window.location.reload();
  }, 500);
} else if (STORED_VERSION !== APP_VERSION) {
  // Version changed but we're in cooldown - just update version
  localStorage.setItem('app_version', APP_VERSION);
}

createRoot(document.getElementById('root')).render(
  <App />
)

// Force Vite Cache Clear - Auto Version
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Automatic version based on build time (no manual updates needed!)
const APP_VERSION = import.meta.env.VITE_BUILD_TIME || Date.now().toString();
const STORED_VERSION = localStorage.getItem('app_version');

if (STORED_VERSION !== APP_VERSION) {
  console.log(`[APP] New build detected (${new Date(parseInt(APP_VERSION)).toLocaleString()}) - clearing caches`);
  
  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
  
  // Clear IndexedDB
  if ('indexedDB' in window) {
    indexedDB.databases().then(dbs => {
      dbs.forEach(db => {
        if (db.name && db.name.includes('certrack')) {
          indexedDB.deleteDatabase(db.name);
        }
      });
    }).catch(() => {
      // Fallback for browsers that don't support databases()
      ['certrack-offline', 'certrack-cache'].forEach(name => {
        indexedDB.deleteDatabase(name);
      });
    });
  }
  
  // Clear localStorage except version
  const keysToKeep = ['app_version'];
  Object.keys(localStorage).forEach(key => {
    if (!keysToKeep.includes(key)) {
      localStorage.removeItem(key);
    }
  });
  
  // Update stored version
  localStorage.setItem('app_version', APP_VERSION);
  
  console.log('[APP] Cache cleared - reloading with fresh data');
  
  // Force reload to get fresh data
  setTimeout(() => {
    window.location.reload(true);
  }, 500);
}

createRoot(document.getElementById('root')).render(
  <App />
)

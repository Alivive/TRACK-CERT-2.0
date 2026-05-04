import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DatabaseProvider } from './context/DatabaseContext';
import { ThemeProvider } from './context/ThemeContext';
import { CategoriesProvider } from './context/CategoriesContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InternProfiles from './pages/InternProfiles';
import Categories from './pages/Categories';
import AddCertification from './pages/AddCertification';
import ImportData from './pages/ImportData';
import Reports from './pages/Reports';
import AdminPanel from './pages/AdminPanel';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';
import OfflineStatus from './components/OfflineStatus';
import { checkAndClearOldCache } from './utils/cacheVersion';
import CacheUpdateNotification from './components/CacheUpdateNotification';

const AppContent = () => {
  const { user, profile, loading } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [showLoader, setShowLoader] = useState(true);

  // AUTOMATIC CACHE CLEARING: Check version and clear old cache on app load
  useEffect(() => {
    const initializeApp = async () => {
      const cacheCleared = await checkAndClearOldCache();
      if (cacheCleared) {
        console.log('[APP] Old cache cleared due to version update');
        // Set flag to show notification
        sessionStorage.setItem('cache_just_cleared', 'true');
      }
    };
    
    initializeApp();
  }, []);

  // Auto-hide loader after 3 seconds max to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, 3000);
    
    // Hide loader when auth resolves
    if (!loading) {
      setShowLoader(false);
      clearTimeout(timer);
    }
    
    return () => clearTimeout(timer);
  }, [loading]);

  // Show original fancy loader ONLY for initial auth check (max 3 seconds)
  if (showLoader && loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A', color: '#fff' }}>
        <div className="svg-frame">
          <svg style={{"--i": 0, "--j": 0}} viewBox="0 0 344 344">
            <circle id="out2" cx="172" cy="172" r="160" strokeWidth="4" />
          </svg>
          <svg style={{"--i": 1, "--j": 1}} viewBox="0 0 344 344">
            <circle id="out3" cx="172" cy="172" r="140" strokeWidth="3" />
          </svg>
          <svg style={{"--i": 2, "--j": 2}} viewBox="0 0 344 344">
            <circle id="inner1" cx="172" cy="172" r="100" strokeWidth="2" strokeDasharray="10 10" />
          </svg>
          <svg style={{"--i": 3, "--j": 3}} viewBox="0 0 344 344">
            <circle id="inner3" cx="172" cy="172" r="80" strokeWidth="2" strokeDasharray="5 5" />
          </svg>
          <svg style={{"--i": 4, "--j": 4}} viewBox="0 0 344 344">
            <circle id="center1" cx="172" cy="172" r="20" />
          </svg>
        </div>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '32px', letterSpacing: '3px', marginBottom: '10px' }}>Cer<span style={{ color: 'var(--red-light)' }}>Track</span></div>
          <div style={{ fontSize: '10px', color: '#888', letterSpacing: '4px', textTransform: 'uppercase' }}>System Initializing</div>
        </div>
      </div>
    );
  }

  // No loading screens - instant app experience
  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard onPageChange={setActivePage} />;
      case 'interns': return <InternProfiles />;
      case 'my_profile': return <InternProfiles />;
      case 'categories': return <Categories />;
      case 'add_cert': return <AddCertification />;
      case 'import': return <ImportData />;
      case 'reports': return <Reports />;
      case 'admin': return <AdminPanel />;
      default: return <Dashboard onPageChange={setActivePage} />;
    }
  };

  return (
    <Layout activePage={activePage} onPageChange={setActivePage}>
      {renderPage()}
      <PWAInstallPrompt />
    </Layout>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DatabaseProvider>
          <CategoriesProvider>
            <PWAUpdatePrompt />
            <OfflineStatus />
            <CacheUpdateNotification />
            <AppContent />
          </CategoriesProvider>
        </DatabaseProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

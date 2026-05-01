import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DatabaseProvider } from './context/DatabaseContext';
import { ThemeProvider } from './context/ThemeContext';
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

const AppContent = () => {
  const { user, profile, loading } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');

  // No loading screens - instant app experience
  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'interns': return <InternProfiles />;
      case 'my_profile': return <InternProfiles />;
      case 'categories': return <Categories />;
      case 'add_cert': return <AddCertification />;
      case 'import': return <ImportData />;
      case 'reports': return <Reports />;
      case 'admin': return <AdminPanel />;
      default: return <Dashboard />;
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
          <PWAUpdatePrompt />
          <AppContent />
        </DatabaseProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

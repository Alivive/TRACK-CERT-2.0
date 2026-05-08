import { Plus, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const Topbar = ({ title, onPageChange, toggleSidebar }) => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div className="menu-toggle" onClick={toggleSidebar}>
          <Menu size={20} />
        </div>
        <div className="page-title">{title}</div>
      </div>
      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <NotificationBell />
        
        {isAdmin && (
          <button 
            className="btn btn-primary" 
            id="topAddBtn" 
            onClick={() => onPageChange('add_cert')}
          >
            <Plus size={14} /> <span className="btn-text">ADD CERT</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Topbar;
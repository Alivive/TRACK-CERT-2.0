import React from 'react';
import { Search, Plus, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
      <div className="topbar-actions">
        <div className="search-bar">
          <Search size={14} color="var(--gray2)" />
          <input type="text" placeholder="Search..." id="globalSearch" />
        </div>
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

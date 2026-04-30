import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, LayoutDashboard, User, Layers, PlusCircle, Upload, FileText, Settings } from 'lucide-react';

const Sidebar = ({ activePage, onPageChange, isOpen }) => {
  const { profile, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const isAdmin = profile?.role === 'admin';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} />, section: 'OVERVIEW' },
    { id: isAdmin ? 'interns' : 'my_profile', label: isAdmin ? 'Intern Profiles' : 'My Profile', icon: <User size={16} />, section: 'OVERVIEW' },
    { id: 'categories', label: 'Categories', icon: <Layers size={16} />, section: 'OVERVIEW' },
    { id: 'add_cert', label: 'Add Certification', icon: <PlusCircle size={16} />, section: 'DATA' },
    { id: 'import', label: 'Import Data', icon: <Upload size={16} />, section: 'DATA', adminOnly: true },
    { id: 'reports', label: 'Reports & PDF', icon: <FileText size={16} />, section: 'DATA' },
    { id: 'admin', label: 'Admin Panel', icon: <Settings size={16} />, section: 'ADMIN', adminOnly: true },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <img src="/logo.png" alt="Logo" style={{ width: '32px', height: '32px', marginBottom: '10px', display: 'block', borderRadius: '50%' }} />
          <div className="logo-mark">Cer<span>Track</span></div>
          <div className="logo-sub">AFRICA · INTERN SYSTEM</div>
        </div>
        <button 
          onClick={toggleTheme}
          style={{ 
            background: 'var(--black3)', 
            border: '1px solid var(--border2)', 
            borderRadius: '6px', 
            padding: '8px', 
            color: 'var(--white)', 
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
      
      <nav className="nav">
        {navItems.map((item, index) => {
          if (item.adminOnly && !isAdmin) return null;
          
          const showLabel = index === 0 || (navItems[index - 1]?.section !== item.section);
          
          return (
            <React.Fragment key={item.id}>
              {showLabel && <div className="nav-section-label">{item.section}</div>}
              <div 
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => onPageChange(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </div>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="user-avatar">{(profile?.full_name || 'U')[0].toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{profile?.full_name || profile?.email || 'User'}</div>
            <div className="user-role-badge">{(profile?.role || 'intern').toUpperCase()}</div>
          </div>
        </div>
        <button className="btn-signout" onClick={signOut}>SIGN OUT</button>
      </div>
    </aside>
  );
};

export default Sidebar;

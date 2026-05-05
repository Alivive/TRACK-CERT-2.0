import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, LayoutDashboard, User, Layers, PlusCircle, Upload, FileText, Settings, BookOpen, ChevronDown } from 'lucide-react';

const Sidebar = ({ activePage, onPageChange, isOpen }) => {
  const { profile, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const isAdmin = profile?.role === 'admin';
  const [expandedMenu, setExpandedMenu] = useState(null);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} />, section: 'OVERVIEW' },
    { id: isAdmin ? 'interns' : 'my_profile', label: isAdmin ? 'Intern Profiles' : 'My Profile', icon: <User size={16} />, section: 'OVERVIEW' },
    { id: 'categories', label: 'Categories', icon: <Layers size={16} />, section: 'OVERVIEW' },
    { id: 'add_cert', label: 'Add Certification', icon: <PlusCircle size={16} />, section: 'DATA' },
    { 
      id: 'data_entry', 
      label: 'Data Entry', 
      icon: <Upload size={16} />, 
      section: 'DATA',
      submenu: [
        { id: 'import', label: 'Import Data', icon: <Upload size={16} /> },
        { id: 'bulk_attach', label: 'Attach Files', icon: <Upload size={16} /> }
      ]
    },
    { id: 'reports', label: 'Reports & PDF', icon: <FileText size={16} />, section: 'DATA' },
    { id: 'reading', label: 'Reading List', icon: <BookOpen size={16} />, section: 'LEARNING' },
    { id: 'admin', label: 'Admin Panel', icon: <Settings size={16} />, section: 'ADMIN', adminOnly: true },
  ];

  const handleMenuClick = (item) => {
    if (item.submenu) {
      setExpandedMenu(expandedMenu === item.id ? null : item.id);
    } else {
      onPageChange(item.id);
      setExpandedMenu(null);
    }
  };

  const handleSubMenuClick = (subItem) => {
    onPageChange(subItem.id);
    setExpandedMenu(null);
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <img src="/logo.jpg" alt="Logo" style={{ width: '32px', height: '32px', marginBottom: '10px', display: 'block', borderRadius: '50%' }} />
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
          const isActive = activePage === item.id || (item.submenu && item.submenu.some(sub => activePage === sub.id));
          const isExpanded = expandedMenu === item.id;
          
          return (
            <React.Fragment key={item.id}>
              {showLabel && <div className="nav-section-label">{item.section}</div>}
              
              {/* Main menu item */}
              <div 
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleMenuClick(item)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </div>
                {item.submenu && (
                  <ChevronDown 
                    size={14} 
                    style={{ 
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                      marginRight: '4px'
                    }} 
                  />
                )}
              </div>

              {/* Submenu items */}
              {item.submenu && isExpanded && (
                <div style={{ paddingLeft: '24px' }}>
                  {item.submenu.map(subItem => (
                    <div
                      key={subItem.id}
                      className={`nav-item ${activePage === subItem.id ? 'active' : ''}`}
                      onClick={() => handleSubMenuClick(subItem)}
                      style={{
                        fontSize: '13px',
                        paddingLeft: '12px',
                        borderLeft: '2px solid var(--border2)',
                        marginLeft: '8px',
                        marginTop: '4px',
                        marginBottom: '4px'
                      }}
                    >
                      <span className="nav-icon">{subItem.icon}</span>
                      {subItem.label}
                    </div>
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="user-avatar">{(profile?.full_name || 'U')[0].toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{profile?.full_name || profile?.email || 'User'}</div>
            {profile?.role === 'admin' && (
              <div className="user-role-badge">ADMIN</div>
            )}
          </div>
        </div>
        <button className="btn-signout" onClick={signOut}>SIGN OUT</button>
      </div>
    </aside>
  );
};

export default Sidebar;

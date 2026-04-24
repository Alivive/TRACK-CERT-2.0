import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout = ({ children, activePage, onPageChange }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const titles = {
    dashboard: 'DASHBOARD',
    interns: 'INTERN PROFILES',
    my_profile: 'MY PROFILE',
    categories: 'CATEGORIES',
    add_cert: 'ADD CERTIFICATION',
    import: 'IMPORT DATA',
    reports: 'REPORTS',
    admin: 'ADMIN PANEL'
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const handlePageChange = (page) => {
    onPageChange(page);
    closeSidebar();
  };

  return (
    <div className="app">
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={closeSidebar}></div>
      <Sidebar activePage={activePage} onPageChange={handlePageChange} isOpen={isSidebarOpen} />
      <div className="main">
        <Topbar 
          title={titles[activePage] || activePage.toUpperCase()} 
          onPageChange={handlePageChange} 
          toggleSidebar={toggleSidebar}
        />
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;

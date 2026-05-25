import { useState, useEffect } from 'react';
import AddCertification from './AddCertification';
import ImportData from './ImportData';
import { useCohorts } from '../context/CohortContext';

const CertificationManagement = ({ initialTab = 'single' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { activeCohort } = useCohorts();

  // Sync tab if the prop changes (e.g. clicking sidebar while already on this page)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const tabStyle = (tab) => ({
    background: 'none',
    border: 'none',
    padding: '12px 24px',
    color: activeTab === tab ? 'var(--red-light)' : '#888',
    borderBottom: activeTab === tab ? '2px solid var(--red-light)' : '2px solid transparent',
    cursor: 'pointer',
    fontWeight: activeTab === tab ? 'bold' : 'normal',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontSize: '12px',
    transition: 'all 0.3s ease'
  });

  return (
    <div className="certification-mgmt">
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        padding: '15px 20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #222'
      }}>
        <span style={{ color: '#888', fontSize: '12px' }}>MANAGING FOR:</span>
        <h3 style={{ margin: '5px 0 0 0', color: 'var(--red-light)' }}>{activeCohort.name}</h3>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        borderBottom: '1px solid #222', 
        marginBottom: '25px',
        paddingLeft: '5px'
      }}>
        <button 
          style={tabStyle('single')} 
          onClick={() => setActiveTab('single')}
        >
          Single Certification
        </button>
        <button 
          style={tabStyle('bulk')} 
          onClick={() => setActiveTab('bulk')}
        >
          Bulk Import (CSV/Excel)
        </button>
      </div>

      <div className="mgmt-content">
        {activeTab === 'single' ? <AddCertification /> : <ImportData />}
      </div>
    </div>
  );
};

export default CertificationManagement;
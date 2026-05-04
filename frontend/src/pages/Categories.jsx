import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../utils/useDatabase';
import { CATS, CAT_BADGE } from '../utils/mockData';
import { Trash2 } from 'lucide-react';

const Categories = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { internDict, certifications, loading, deleteCertification } = useDatabase();
  const [filter, setFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');

  // Category groups for filtering
  const categoryGroups = {
    'all': ['AI', 'FE', 'BE', 'API', 'CYBER', 'CLOUD', 'SOFT'],
    'web-dev': ['FE', 'BE', 'API'],
    'security-cloud': ['CYBER', 'CLOUD'],
    'ai-apis': ['AI', 'API']
  };

  const handleDeleteCert = async (certId) => {
    if (window.confirm('Are you sure you want to delete this certification?')) {
      await deleteCertification(certId);
    }
  };

  const getInit = (first, last) => ((first?.[0] || '?') + (last?.[0] || '')).toUpperCase();
  const getTH = (cl) => cl.reduce((s, c) => s + (c.hours || 0), 0);

  const filteredCerts = useMemo(() => (
    filter === 'all' ? certifications : certifications.filter(c => c.category === filter)
  ), [filter, certifications]);

  // Calculate stats per category
  const categoryStats = useMemo(() => {
    const filteredCategories = groupFilter === 'all' 
      ? Object.keys(CATS) 
      : categoryGroups[groupFilter];
    
    return filteredCategories.map(key => {
      const catCerts = certifications.filter(c => c.category === key);
      const hours = getTH(catCerts);
      const activeInterns = new Set(catCerts.map(c => c.intern_id)).size;
      return {
        key,
        name: CATS[key].name,
        icon: CATS[key].icon,
        count: catCerts.length,
        hours,
        activeInterns,
        badge: CAT_BADGE[key]
      };
    });
  }, [certifications, groupFilter]);

  if (loading) return <div style={{ color: 'var(--white)', padding: '40px' }}>Loading Track Data...</div>;

  return (
    <div id="page-categories" className="page active">
      <div className="section-header">
        <span className="section-title">CATEGORY OVERVIEW</span>
      </div>

      {/* Filter Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '30px',
        flexWrap: 'wrap'
      }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'web-dev', label: 'Web dev' },
          { key: 'security-cloud', label: 'Security & cloud' },
          { key: 'ai-apis', label: 'AI & APIs' }
        ].map(group => (
          <button
            key={group.key}
            onClick={() => setGroupFilter(group.key)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: groupFilter === group.key ? '1px solid var(--white)' : '1px solid var(--border2)',
              background: groupFilter === group.key ? 'var(--black3)' : 'transparent',
              color: groupFilter === group.key ? 'var(--white)' : 'var(--gray)',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (groupFilter !== group.key) {
                e.target.style.borderColor = 'var(--gray)';
              }
            }}
            onMouseLeave={(e) => {
              if (groupFilter !== group.key) {
                e.target.style.borderColor = 'var(--border2)';
              }
            }}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* Category Cards Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        {categoryStats.map(cat => {
          const borderColors = {
            'badge-ai': '#e74c3c',
            'badge-fe': '#3498db',
            'badge-be': '#2ecc71',
            'badge-api': '#f39c12',
            'badge-cyber': '#9b59b6',
            'badge-cloud': '#1abc9c',
            'badge-soft': '#e67e22'
          };
          
          return (
            <div 
              key={cat.key}
              className="card"
              style={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                border: filter === cat.key 
                  ? `2px solid ${borderColors[cat.badge] || 'var(--red-light)'}` 
                  : `1px solid ${borderColors[cat.badge] || 'var(--border)'}`,
                position: 'relative',
                overflow: 'hidden'
              }}
              onClick={() => setFilter(cat.key)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 8px 24px ${borderColors[cat.badge]}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Top colored bar */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: borderColors[cat.badge] || 'var(--red-light)'
              }}></div>

              <div className="card-body" style={{ paddingTop: '20px' }}>
                {cat.count === 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    fontSize: '11px',
                    color: borderColors[cat.badge] || 'var(--gray)',
                    fontWeight: '500'
                  }}>
                    No certs yet
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span 
                    className={`badge ${cat.badge}`} 
                    style={{ 
                      fontSize: '24px', 
                      padding: '12px',
                      background: `${borderColors[cat.badge]}20`
                    }}
                  >
                    {cat.icon}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--white)', marginBottom: '4px' }}>
                      {cat.name}
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--white)' }}>
                      {cat.count}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', paddingTop: '12px', borderTop: '1px solid var(--border2)' }}>
                  <span style={{ color: 'var(--gray2)' }}>Hours logged</span>
                  <span style={{ color: borderColors[cat.badge] || 'var(--white)', fontWeight: '600' }}>{cat.hours}h</span>
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px' }}>
                    <span style={{ color: 'var(--gray2)' }}>Active interns</span>
                    <span style={{ color: 'var(--white)', fontWeight: '600' }}>{cat.activeInterns}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="section-header">
        <span className="section-title">CERTIFICATIONS BY CATEGORY</span>
        <select className="form-input" style={{ width: '200px' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {Object.keys(CATS).map(key => (
            <option key={key} value={key}>{CATS[key].name}</option>
          ))}
        </select>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            {filter === 'all' ? 'ALL CERTIFICATIONS' : CATS[filter].name.toUpperCase()}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--gray2)' }}>
            {filteredCerts.length} total · {getTH(filteredCerts)}h total
          </span>
        </div>
        <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ minWidth: '600px' }}>
            <thead>
              <tr>
                <th>INTERN</th>
                <th>CERTIFICATION</th>
                <th>CATEGORY</th>
                <th>PROVIDER</th>
                <th>HRS</th>
                <th>DATE</th>
                {(isAdmin || profile?.role === 'intern') && <th>ACTIONS</th>}
              </tr>
            </thead>
            <tbody>
              {filteredCerts.map(c => {
                const intern = internDict[c.intern_id];
                const canDelete = isAdmin || profile?.intern_id === c.intern_id;
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="intern-name-cell">
                        <div className="avatar">{intern ? getInit(intern.first_name, intern.last_name) : '??'}</div>
                        <div className="intern-name">{intern ? `${intern.first_name} ${intern.last_name}` : 'Unknown'}</div>
                      </div>
                    </td>
                    <td style={{ fontSize: '12px' }}>{c.name}</td>
                    <td><span className={`badge ${CAT_BADGE[c.category]}`}>{CATS[c.category]?.name || c.category}</span></td>
                    <td style={{ fontSize: '12px', color: 'var(--gray)' }}>{c.provider}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{c.hours}h</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--gray)' }}>{c.date}</td>
                    {(isAdmin || profile?.role === 'intern') && (
                      <td>
                        {canDelete && (
                          <button 
                            className="btn btn-ghost" 
                            style={{ padding: '5px', color: 'var(--red-light)' }}
                            onClick={() => handleDeleteCert(c.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredCerts.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--gray)' }}>No certifications found in this category.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Categories;

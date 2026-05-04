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
    return Object.keys(CATS).map(key => {
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
  }, [certifications]);

  if (loading) return <div style={{ color: 'var(--white)', padding: '40px' }}>Loading Track Data...</div>;

  return (
    <div id="page-categories" className="page active">
      <div className="section-header">
        <span className="section-title">CATEGORY OVERVIEW</span>
      </div>

      {/* Category Cards Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        {categoryStats.map(cat => (
          <div 
            key={cat.key}
            className="card"
            style={{ 
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              border: filter === cat.key ? '2px solid var(--red-light)' : '1px solid var(--border)'
            }}
            onClick={() => setFilter(cat.key)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span className={`badge ${cat.badge}`} style={{ fontSize: '18px', padding: '8px' }}>
                  {cat.icon}
                </span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--white)' }}>
                    {cat.name}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--white)', marginTop: '4px' }}>
                    {cat.count}
                  </div>
                </div>
              </div>
              
              <div style={{ 
                height: '4px', 
                background: 'var(--black4)', 
                borderRadius: '2px',
                marginBottom: '12px'
              }}>
                <div 
                  className={cat.badge}
                  style={{ 
                    height: '100%', 
                    width: `${(cat.count / Math.max(certifications.length, 1)) * 100}%`,
                    borderRadius: '2px'
                  }}
                ></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: 'var(--gray2)' }}>Hours</span>
                <span style={{ color: 'var(--white)', fontWeight: '600' }}>{cat.hours}h</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px' }}>
                <span style={{ color: 'var(--gray2)' }}>Active interns</span>
                <span style={{ color: 'var(--white)', fontWeight: '600' }}>{cat.activeInterns}</span>
              </div>
            </div>
          </div>
        ))}
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

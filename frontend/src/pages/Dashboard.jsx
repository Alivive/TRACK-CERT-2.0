import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../utils/useDatabase';
import { CATS, CAT_BADGE } from '../utils/mockData';
import { Users, Award, Clock, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const { user, profile } = useAuth();
  const { interns, certifications, loading } = useDatabase();

  const getTH = (cl) => cl.reduce((s, c) => s + (c.hours || 0), 0);
  
  const stats = [
    { label: 'TOTAL INTERNS', value: interns.length, delta: '+ 3 this intake', icon: <Users size={20} color="var(--red-light)" /> },
    { label: 'TOTAL CERTS', value: certifications.length, delta: '+ 100+ this month', icon: <Award size={20} color="var(--red-light)" /> },
    { label: 'TOTAL HOURS', value: getTH(certifications), delta: 'Across all tracks', icon: <Clock size={20} color="var(--red-light)" /> },
    { label: 'AVG PER INTERN', value: (certifications.length / Math.max(interns.length, 1)).toFixed(1), delta: 'Certifications', icon: <TrendingUp size={20} color="var(--red-light)" /> }
  ];

  if (loading) return <div style={{ color: 'var(--white)', padding: '40px' }}>Loading Live Data...</div>;

  return (
    <div id="page-dashboard" className="page active">
      <div className="section-header" style={{ marginBottom: '10px' }}>
        <span className="section-title">OVERVIEW</span>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '5px' }}>
          Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
        </h1>
        <p style={{ color: 'var(--gray)', fontSize: '13px' }}>
          You are logged in as a system <span style={{ color: 'var(--red-light)', fontWeight: '600' }}>{(profile?.role || 'intern').toUpperCase()}</span>
        </p>
      </div>
      
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-header">
              <div className="stat-label">{s.label}</div>
              {s.icon}
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-delta">{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">RECENT CERTIFICATIONS</span>
            <button className="btn btn-ghost" style={{ fontSize: '10px', padding: '4px 9px' }}>VIEW ALL</button>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ minWidth: '500px' }}>
              <thead>
                <tr>
                  <th>INTERN</th>
                  <th>CERTIFICATION</th>
                  <th>CATEGORY</th>
                  <th>HOURS</th>
                </tr>
              </thead>
              <tbody>
                {certifications.slice(0, 5).map(c => {
                  const intern = interns.find(i => i.id === c.intern_id);
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="intern-name-cell">
                          <div className="avatar">{(intern?.first_name?.[0] || '?') + (intern?.last_name?.[0] || '')}</div>
                          <div className="intern-name">{intern ? `${intern.first_name} ${intern.last_name}` : 'Unknown'}</div>
                        </div>
                      </td>
                      <td style={{ fontSize: '12px' }}>{c.name}</td>
                      <td><span className={`badge ${CAT_BADGE[c.category]}`}>{CATS[c.category]?.name || c.category}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{c.hours}h</td>
                    </tr>
                  );
                })}
                {certifications.length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'var(--gray)' }}>No live certifications found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">BY CATEGORY</span></div>
          <div className="card-body">
            {Object.keys(CATS).map(key => {
              const count = certifications.filter(c => c.category === key).length;
              const percent = (count / Math.max(certifications.length, 1)) * 100;
              return (
                <div key={key} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--gray2)', letterSpacing: '1px' }}>{CATS[key].name}</span>
                    <span style={{ color: 'var(--white)', fontWeight: 600 }}>{count}</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--black4)', borderRadius: '2px' }}>
                    <div style={{ height: '100%', background: 'var(--red-light)', width: `${percent}%`, borderRadius: '2px' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

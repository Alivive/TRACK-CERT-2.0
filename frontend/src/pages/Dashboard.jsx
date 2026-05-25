import { useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../utils/useDatabase';
import { useCategories } from '../context/CategoriesContext';
import { Users, Award, Clock, TrendingUp, Trophy, Target, BarChart3 } from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const chartColors = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'
];

const Dashboard = ({ onPageChange }) => {
  const { user, profile, loading: profileLoading } = useAuth();
  const effectiveProfile = profile || {
    id: user?.id,
    full_name: user?.user_metadata?.full_name || user?.email || 'User',
    role: user?.user_metadata?.role || 'intern',
    intern_id: user?.user_metadata?.intern_id || user?.id,
  };
  const isAdmin = effectiveProfile?.role === 'admin';
  const { getCategoryObject, getCategoryBadges } = useCategories();
  
  // Use dynamic categories
  const CATS = getCategoryObject();
  const CAT_BADGE = getCategoryBadges();
  
  // Defensive destructuring: default to empty values if DB is still "waking up"
  const { 
    interns = [], 
    certifications = [],
    loading
  } = useDatabase();

  // Filter certifications based on role
  const displayCertifications = useMemo(() => {
    if (isAdmin) {
      return certifications;
    }
    // For interns, show only their own certifications
    return certifications.filter(c => c.intern_id === effectiveProfile?.intern_id);
  }, [certifications, effectiveProfile?.intern_id, isAdmin]);

  const getTH = useCallback((cl) => cl.reduce((s, c) => s + (c.hours || 0), 0), []);
  
  // Analytics calculations
  const analytics = useMemo(() => {
    if (!certifications.length) return { internStats: [], categoryStats: [], topPerformers: [] };

    // Per-intern statistics
    const internStats = interns.map(intern => {
      const internCerts = certifications.filter(c => c.intern_id === intern.id);
      const categoryBreakdown = {};
      
      internCerts.forEach(cert => {
        categoryBreakdown[cert.category] = (categoryBreakdown[cert.category] || 0) + 1;
      });

      const topCategory = Object.entries(categoryBreakdown)
        .sort(([,a], [,b]) => b - a)[0];

      return {
        intern,
        totalCerts: internCerts.length,
        totalHours: getTH(internCerts),
        categoryBreakdown,
        topCategory: topCategory ? {
          category: topCategory[0],
          count: topCategory[1],
          name: CATS[topCategory[0]]?.name || topCategory[0]
        } : null
      };
    }).sort((a, b) => b.totalCerts - a.totalCerts);

    // Overall category statistics
    const categoryStats = Object.keys(CATS).map(categoryId => {
      const categoryName = CATS[categoryId]?.name || categoryId;
      const count = certifications.filter(c => c.category === categoryId).length;
      const hours = getTH(certifications.filter(c => c.category === categoryId));
      
      return {
        categoryId,
        categoryName,
        count,
        hours,
        percentage: (count / Math.max(certifications.length, 1)) * 100
      };
    }).sort((a, b) => b.count - a.count);

    // Top performers
    const topPerformers = internStats.slice(0, 5);

    return { internStats, categoryStats, topPerformers };
  }, [certifications, interns, CATS, getTH]);

  // Chart data for overall category distribution
  const overallChartData = useMemo(() => {
    // Count certifications by category, including those with missing/invalid categories
    const categoryCounts = {};
    let uncategorizedCount = 0;
    
    certifications.forEach(cert => {
      if (cert.category && CATS[cert.category]) {
        categoryCounts[cert.category] = (categoryCounts[cert.category] || 0) + 1;
      } else {
        uncategorizedCount++;
      }
    });
    
    const validCategories = Object.keys(categoryCounts)
      .map(catId => ({
        id: catId,
        name: CATS[catId]?.name || catId,
        count: categoryCounts[catId]
      }))
      .sort((a, b) => b.count - a.count);
    
    // Add uncategorized if any exist
    if (uncategorizedCount > 0) {
      validCategories.push({
        id: 'uncategorized',
        name: 'Uncategorized',
        count: uncategorizedCount
      });
    }
    
    return {
      labels: validCategories.map(cat => cat.name),
      datasets: [{
        data: validCategories.map(cat => cat.count),
        backgroundColor: chartColors.slice(0, validCategories.length),
        borderColor: '#1a1a1a',
        borderWidth: 2,
      }]
    };
  }, [certifications, CATS]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#e5e5e5',
          font: { size: 11 },
          padding: 15,
          usePointStyle: true,
        }
      },
      tooltip: {
        backgroundColor: '#1a1a1a',
        titleColor: '#e5e5e5',
        bodyColor: '#e5e5e5',
        borderColor: '#333',
        borderWidth: 1,
      }
    }
  };

  const stats = useMemo(() => {
    if (isAdmin) {
      return [
        { label: 'TOTAL INTERNS', value: interns.length, delta: '+ 3 this intake', icon: <Users size={20} color="var(--red-light)" /> },
        { label: 'TOTAL CERTS', value: certifications.length, delta: '+ 100+ this month', icon: <Award size={20} color="var(--red-light)" /> },
        { label: 'TOTAL HOURS', value: getTH(certifications), delta: 'Across all tracks', icon: <Clock size={20} color="var(--red-light)" /> },
        { label: 'AVG PER INTERN', value: (certifications.length / Math.max(interns.length, 1)).toFixed(1), delta: 'Certifications', icon: <TrendingUp size={20} color="var(--red-light)" /> }
      ];
    }
    // Intern stats - show only their own data
    return [
      { label: 'MY CERTIFICATIONS', value: displayCertifications.length, delta: 'Total earned', icon: <Award size={20} color="var(--red-light)" /> },
      { label: 'TOTAL HOURS', value: getTH(displayCertifications), delta: 'Learning time', icon: <Clock size={20} color="var(--red-light)" /> },
    ];
  }, [isAdmin, interns.length, certifications, displayCertifications, getTH]);

  // Don't render dashboard data until auth is loaded. Keep this after hooks so
  // React sees a stable hook order while auth/profile state resolves.
  if (profileLoading) {
    return (
      <div id="page-dashboard" className="page active">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--border2)',
            borderTop: '3px solid var(--red-light)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ color: 'var(--gray)', fontSize: '14px' }}>
            Loading your profile...
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ color: 'var(--white)', padding: '40px' }}>Loading Live Data...</div>;

  return (
    <div id="page-dashboard" className="page active">
      <div className="section-header" style={{ marginBottom: '10px' }}>
        <span className="section-title">ANALYTICS DASHBOARD</span>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '5px' }}>
          Welcome back, {effectiveProfile?.full_name?.split(' ')[0] || 'User'}!
        </h1>
        <p style={{ color: 'var(--gray)', fontSize: '13px' }}>
          You are logged in as a system <span style={{ color: 'var(--red-light)', fontWeight: '600' }}>
            {effectiveProfile?.role ? effectiveProfile.role.toUpperCase() : 'USER'}
          </span>
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

      {isAdmin ? (
        // Admin view with comprehensive analytics
        <>
          {/* Overall Analytics Section */}
          <div className="grid-2" style={{ marginBottom: '30px' }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <BarChart3 size={16} style={{ marginRight: '8px' }} />
                  CERTIFICATION DISTRIBUTION
                </span>
                <span style={{ fontSize: '11px', color: 'var(--gray)', fontWeight: 'normal' }}>
                  Total: {certifications.length} Certifications
                </span>
              </div>
              <div className="card-body" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {analytics.categoryStats.some(cat => cat.count > 0) ? (
                  <Pie data={overallChartData} options={chartOptions} />
                ) : (
                  <div style={{ color: 'var(--gray)', textAlign: 'center' }}>
                    <Award size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                    <div>No certifications yet</div>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <Trophy size={16} style={{ marginRight: '8px' }} />
                  TOP PERFORMERS
                </span>
              </div>
              <div className="card-body" style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '10px' }}>
                {analytics.topPerformers.map((performer, index) => (
                  <div key={performer.intern.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: index < analytics.topPerformers.length - 1 ? '1px solid var(--border2)' : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'var(--red-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#000'
                      }}>
                        {index + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600' }}>
                          {performer.intern.first_name} {performer.intern.last_name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--gray)' }}>
                          {performer.topCategory?.name || 'No category'}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--red-light)' }}>
                        {performer.totalCerts}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--gray)' }}>
                        {performer.totalHours}h
                      </div>
                    </div>
                  </div>
                ))}
                {analytics.topPerformers.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>
                    <Trophy size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <div>No performance data yet</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Individual Intern Charts */}
          <div className="card" style={{ marginBottom: '30px' }}>
            <div className="card-header">
              <span className="card-title">
                <Target size={16} style={{ marginRight: '8px' }} />
                INDIVIDUAL PERFORMANCE
              </span>
            </div>
            <div className="card-body">
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '24px' 
              }}>
                {analytics.internStats.filter(stat => stat.totalCerts > 0).map(stat => {
                  const chartData = {
                    labels: Object.keys(stat.categoryBreakdown).map(catId => CATS[catId]?.name || catId),
                    datasets: [{
                      data: Object.values(stat.categoryBreakdown),
                      backgroundColor: chartColors.slice(0, Object.keys(stat.categoryBreakdown).length),
                      borderColor: '#1a1a1a',
                      borderWidth: 2,
                    }]
                  };

                  return (
                    <div key={stat.intern.id} style={{
                      background: 'var(--black3)',
                      borderRadius: '12px',
                      padding: '20px',
                      border: '1px solid var(--border2)'
                    }}>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          marginBottom: '8px'
                        }}>
                          <h3 style={{ fontSize: '14px', fontWeight: '600' }}>
                            {stat.intern.first_name} {stat.intern.last_name}
                          </h3>
                          <div style={{ fontSize: '12px', color: 'var(--gray)' }}>
                            {stat.totalCerts} certs • {stat.totalHours}h
                          </div>
                        </div>
                        {stat.topCategory && (
                          <div style={{ fontSize: '11px', color: 'var(--red-light)' }}>
                            Top: {stat.topCategory.name} ({stat.topCategory.count})
                          </div>
                        )}
                      </div>
                      <div style={{ height: '200px' }}>
                        <Pie data={chartData} options={{
                          ...chartOptions,
                          plugins: {
                            ...chartOptions.plugins,
                            legend: {
                              ...chartOptions.plugins.legend,
                              labels: {
                                ...chartOptions.plugins.legend.labels,
                                font: { size: 9 }
                              }
                            }
                          }
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {analytics.internStats.filter(stat => stat.totalCerts > 0).length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>
                  <Target size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <div>No individual performance data available</div>
                </div>
              )}
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">CATEGORY BREAKDOWN</span>
            </div>
            <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>CATEGORY</th>
                    <th>CERTIFICATIONS</th>
                    <th>TOTAL HOURS</th>
                    <th>PERCENTAGE</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.categoryStats.map(cat => (
                    <tr key={cat.categoryId}>
                      <td>
                        <span className={`badge ${CAT_BADGE[cat.categoryId]}`}>
                          {cat.categoryName}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {cat.count}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {cat.hours}h
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ 
                            flex: 1, 
                            height: '4px', 
                            background: 'var(--black4)', 
                            borderRadius: '2px' 
                          }}>
                            <div style={{ 
                              height: '100%', 
                              background: 'var(--red-light)', 
                              width: `${cat.percentage}%`, 
                              borderRadius: '2px' 
                            }}></div>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--gray)', minWidth: '40px' }}>
                            {cat.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        // Intern view - personal analytics
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <span className="card-title">MY CERTIFICATIONS</span>
              <button 
                className="btn btn-ghost" 
                style={{ fontSize: '10px', padding: '4px 9px' }}
                onClick={() => onPageChange?.('add-certification')}
              >
                ADD NEW
              </button>
            </div>
            <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ minWidth: '400px' }}>
                <thead>
                  <tr>
                    <th>CERTIFICATION</th>
                    <th>CATEGORY</th>
                    <th>HOURS</th>
                  </tr>
                </thead>
                <tbody>
                  {displayCertifications.slice(0, 5).map(c => (
                    <tr key={c.id}>
                      <td style={{ fontSize: '12px' }}>{c.name}</td>
                      <td><span className={`badge ${CAT_BADGE[c.category]}`}>{CATS[c.category]?.name || c.category}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{c.hours}h</td>
                    </tr>
                  ))}
                  {displayCertifications.length === 0 && (
                    <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: 'var(--gray)' }}>No certifications found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">BY CATEGORY</span></div>
            <div className="card-body">
              {Object.keys(CATS).map(key => {
                const count = displayCertifications.filter(c => c.category === key).length;
                const percent = (count / Math.max(displayCertifications.length, 1)) * 100;
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
      )}
    </div>
  );
};

export default Dashboard;

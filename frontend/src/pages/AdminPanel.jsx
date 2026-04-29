import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useDatabase } from '../utils/useDatabase';
import { Settings, Shield, Key, CheckCircle, Users, Search, UserCheck, UserMinus, ShieldCheck } from 'lucide-react';

const AdminPanel = () => {
  const { allProfiles, updateProfileRole } = useDatabase();
  const [activeTab, setActiveTab] = useState('config');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [settings, setSettings] = useState({
    admin_code: '',
    intern_code: '',
    project_name: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('admin_settings').select('*').limit(1);
        if (data && data.length > 0) {
          setSettings(data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch admin settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    const { error } = await supabase
      .from('admin_settings')
      .upsert({ ...settings, id: 1 });

    if (!error) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      alert('Error saving settings: ' + error.message);
    }
    setSaving(false);
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'intern' : 'admin';
    if (window.confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`)) {
      const { error } = await updateProfileRole(userId, newRole);
      if (error) alert('Failed to update role: ' + error.message);
    }
  };

  const filteredUsers = allProfiles.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div style={{ color: 'var(--white)', padding: '40px', textAlign: 'center' }}>
      <div className="loader" style={{ margin: '0 auto 20px' }}></div>
      <div style={{ letterSpacing: '2px', fontSize: '12px' }}>INITIALIZING COMMAND CENTER...</div>
    </div>
  );

  return (
    <div id="page-admin" className="page active">
      <div className="section-header">
        <span className="section-title">ADMIN COMMAND CENTER</span>
        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <Settings size={14} /> CONFIGURATION
          </button>
          <button 
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={14} /> USER MANAGEMENT
          </button>
        </div>
      </div>
      
      {activeTab === 'config' ? (
        <div className="card animate-in" style={{ maxWidth: '600px' }}>
          <div className="card-header">
            <Settings size={18} style={{ marginRight: '10px', color: 'var(--red-light)' }} />
            <span className="card-title">SYSTEM CONFIGURATION</span>
          </div>
          <div className="card-body">
            {success && (
              <div className="success-banner">
                <CheckCircle size={18} /> Settings saved successfully!
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Project Identity</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. CerTrack Africa"
                  value={settings.project_name}
                  onChange={(e) => setSettings({...settings, project_name: e.target.value})}
                />
              </div>

              <div className="grid-2" style={{ gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Admin Access Code</label>
                  <div style={{ position: 'relative' }}>
                    <Shield size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--red-light)' }} />
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ paddingLeft: '35px' }} 
                      value={settings.admin_code}
                      onChange={(e) => setSettings({...settings, admin_code: e.target.value})}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Intern Access Code</label>
                  <div style={{ position: 'relative' }}>
                    <Key size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: '#5DADE2' }} />
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ paddingLeft: '35px' }} 
                      value={settings.intern_code}
                      onChange={(e) => setSettings({...settings, intern_code: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border2)', paddingTop: '20px' }}>
                <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
                  {saving ? 'SAVING...' : 'COMMIT CHANGES →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="card animate-in">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Users size={18} style={{ marginRight: '10px', color: 'var(--red-light)' }} />
              <span className="card-title">REGISTERED PROFILES</span>
            </div>
            <div className="search-bar" style={{ width: '300px' }}>
              <Search size={14} style={{ marginRight: '8px', color: 'var(--gray)' }} />
              <input 
                type="text" 
                placeholder="Search by name or ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ background: 'none', border: 'none', color: 'var(--white)', outline: 'none', fontSize: '13px', width: '100%' }}
              />
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>USER IDENTITY</th>
                    <th>UNIQUE ID (UID)</th>
                    <th>ROLE</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? filteredUsers.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                            {(p.full_name || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600 }}>{p.full_name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--gray)' }}>Active Session</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--gray2)' }}>
                        {p.id}
                      </td>
                      <td>
                        <span className={`role-badge ${p.role === 'admin' ? 'admin' : 'intern'}`}>
                          {p.role === 'admin' ? <ShieldCheck size={10} /> : <UserCheck size={10} />}
                          {p.role?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-ghost" 
                          style={{ fontSize: '11px', color: p.role === 'admin' ? 'var(--gray)' : 'var(--red-light)' }}
                          onClick={() => handleToggleRole(p.id, p.role)}
                        >
                          {p.role === 'admin' ? (
                            <><UserMinus size={14} /> DEMOTE</>
                          ) : (
                            <><Shield size={14} /> PROMOTE TO ADMIN</>
                          )}
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>
                        No profiles found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

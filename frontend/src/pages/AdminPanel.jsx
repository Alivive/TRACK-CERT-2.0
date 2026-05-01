import { useState, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';
import { useDatabase } from '../utils/useDatabase';
import { useAuth } from '../context/AuthContext';
import { Settings, Shield, Key, CheckCircle, Users, Search, UserCheck, UserMinus, ShieldCheck, UserPlus, Plus, Edit2, Save, X } from 'lucide-react';

// TODO: Replace supabase calls with your backend API

const AdminPanel = () => {
  const { allProfiles, updateProfileRole, addIntern, interns, updateProfile } = useDatabase();
  const { refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('config');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [settings, setSettings] = useState({
    admin_code: '',
    intern_code: '',
    project_name: ''
  });

  // Add Intern form state
  const [internForm, setInternForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    start_date: new Date().toISOString().split('T')[0]
  });
  const [internSaving, setInternSaving] = useState(false);
  const [internSuccess, setInternSuccess] = useState(false);
  const [internError, setInternError] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await apiClient.getAdminSettings();
        if (response.success && response.data) {
          setSettings({
            project_name: response.data.project_name || '',
            admin_code: response.data.admin_code || '',
            intern_code: response.data.intern_code || ''
          });
        }
      } catch (error) {
        console.error('[ADMIN] Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    
    try {
      const response = await apiClient.updateAdminSettings(settings);
      if (response.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      alert('Error saving settings: ' + error.message);
    }
    
    setSaving(false);
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'intern' : 'admin';
    if (window.confirm(`Change this user's role to ${newRole.toUpperCase()}?`)) {
      const { error } = await updateProfileRole(userId, newRole);
      if (error) alert('Failed to update role: ' + error.message);
    }
  };

  const startEdit = (profile) => {
    setEditingId(profile.id);
    setEditForm({
      full_name: profile.full_name || '',
      email: profile.email || '',
      role: profile.role || 'intern'
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (userId) => {
    setSaving(true);
    const { error } = await updateProfile(userId, editForm);
    if (error) {
      alert('Failed to update profile: ' + error.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setEditingId(null);
      setEditForm({});
      // Refresh the current user's profile if they edited their own profile
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleAddIntern = async (e) => {
    e.preventDefault();
    setInternSaving(true);
    setInternError('');
    setInternSuccess(false);

    // Check for duplicate email
    const duplicate = interns.find(i => i.email.toLowerCase() === internForm.email.toLowerCase());
    if (duplicate) {
      setInternError(`An intern with email "${internForm.email}" already exists.`);
      setInternSaving(false);
      return;
    }

    const { error } = await addIntern(internForm);
    if (error) {
      setInternError(error.message);
    } else {
      setInternSuccess(true);
      setInternForm({
        first_name: '',
        last_name: '',
        email: '',
        start_date: new Date().toISOString().split('T')[0]
      });
      setTimeout(() => setInternSuccess(false), 3000);
    }
    setInternSaving(false);
  };

  const filteredUsers = (allProfiles || []).filter(p =>
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Remove loading screen - show content immediately

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
          <button
            className={`admin-tab ${activeTab === 'add_intern' ? 'active' : ''}`}
            onClick={() => setActiveTab('add_intern')}
          >
            <UserPlus size={14} /> ADD INTERN
          </button>
        </div>
      </div>

      {/* ── CONFIGURATION TAB ── */}
      {activeTab === 'config' && (
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
                  onChange={(e) => setSettings({ ...settings, project_name: e.target.value })}
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
                      onChange={(e) => setSettings({ ...settings, admin_code: e.target.value })}
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
                      onChange={(e) => setSettings({ ...settings, intern_code: e.target.value })}
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
      )}

      {/* ── USER MANAGEMENT TAB ── */}
      {activeTab === 'users' && (
        <div className="card animate-in">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Users size={18} style={{ marginRight: '10px', color: 'var(--red-light)' }} />
              <span className="card-title">REGISTERED PROFILES</span>
              <span style={{ marginLeft: '12px', fontSize: '11px', color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>
                {allProfiles.length} total
              </span>
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
            {success && (
              <div className="success-banner" style={{ margin: '16px' }}>
                <CheckCircle size={18} /> Profile updated successfully!
              </div>
            )}
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>USER IDENTITY</th>
                    <th>EMAIL</th>
                    <th>UNIQUE ID (UID)</th>
                    <th>ROLE</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? filteredUsers.map(p => (
                    <tr key={p.id} style={{ background: editingId === p.id ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                      <td>
                        {editingId === p.id ? (
                          <input
                            type="text"
                            className="form-input"
                            style={{ fontSize: '14px', padding: '8px 12px', width: '100%' }}
                            value={editForm.full_name}
                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                            placeholder="Full name"
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                              {(p.full_name || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 600 }}>{p.full_name || '—'}</div>
                              <div style={{ fontSize: '11px', color: 'var(--gray)' }}>Registered user</div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        {editingId === p.id ? (
                          <input
                            type="email"
                            className="form-input"
                            style={{ fontSize: '13px', padding: '8px 12px', width: '100%' }}
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            placeholder="Email address"
                          />
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--gray2)' }}>
                            {p.email || '—'}
                          </div>
                        )}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--gray2)' }}>
                        {p.id}
                      </td>
                      <td>
                        {editingId === p.id ? (
                          <select
                            className="form-input"
                            style={{ fontSize: '13px', padding: '6px 10px', width: '120px' }}
                            value={editForm.role}
                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          >
                            <option value="intern">INTERN</option>
                            <option value="admin">ADMIN</option>
                          </select>
                        ) : (
                          <span className={`role-badge ${p.role === 'admin' ? 'admin' : 'intern'}`}>
                            {p.role === 'admin' ? <ShieldCheck size={10} /> : <UserCheck size={10} />}
                            {(p.role || 'intern').toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td>
                        {editingId === p.id ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn btn-ghost"
                              style={{ fontSize: '11px', color: 'var(--green)', padding: '6px 12px' }}
                              onClick={() => saveEdit(p.id)}
                              disabled={saving}
                            >
                              <Save size={14} /> {saving ? 'SAVING...' : 'SAVE'}
                            </button>
                            <button
                              className="btn btn-ghost"
                              style={{ fontSize: '11px', color: 'var(--gray)', padding: '6px 12px' }}
                              onClick={cancelEdit}
                              disabled={saving}
                            >
                              <X size={14} /> CANCEL
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: '11px', color: 'var(--blue)' }}
                            onClick={() => startEdit(p)}
                          >
                            <Edit2 size={14} /> EDIT
                          </button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>
                        {allProfiles.length === 0
                          ? 'No registered profiles yet.'
                          : 'No profiles match your search.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD INTERN TAB ── */}
      {activeTab === 'add_intern' && (
        <div className="card animate-in" style={{ maxWidth: '600px' }}>
          <div className="card-header">
            <UserPlus size={18} style={{ marginRight: '10px', color: 'var(--red-light)' }} />
            <span className="card-title">ADD NEW INTERN</span>
          </div>
          <div className="card-body">
            <p style={{ color: 'var(--gray)', fontSize: '13px', marginBottom: '24px', lineHeight: 1.6 }}>
              Manually register an intern record. They can sign up later and their account will be automatically linked to this record via email.
            </p>

            {internSuccess && (
              <div className="success-banner">
                <CheckCircle size={18} /> Intern added successfully!
              </div>
            )}

            {internError && (
              <div style={{ background: 'rgba(192,57,43,0.1)', color: 'var(--red-light)', padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', fontSize: '13px', border: '1px solid var(--border)' }}>
                {internError}
              </div>
            )}

            <form onSubmit={handleAddIntern}>
              <div className="grid-2" style={{ gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Amara"
                    required
                    value={internForm.first_name}
                    onChange={e => setInternForm({ ...internForm, first_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Osei"
                    required
                    value={internForm.last_name}
                    onChange={e => setInternForm({ ...internForm, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="intern@company.com"
                  required
                  value={internForm.email}
                  onChange={e => setInternForm({ ...internForm, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  required
                  value={internForm.start_date}
                  onChange={e => setInternForm({ ...internForm, start_date: e.target.value })}
                />
              </div>
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border2)', paddingTop: '20px' }}>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={internSaving}
                  style={{ width: '100%', justifyContent: 'center', height: '44px' }}
                >
                  <Plus size={16} /> {internSaving ? 'SAVING...' : 'ADD INTERN TO SYSTEM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

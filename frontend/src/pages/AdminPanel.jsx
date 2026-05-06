import { useState, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';
import { useDatabase } from '../utils/useDatabase';
import { useAuth } from '../context/AuthContext';
import { providerLinksClient } from '../utils/providerLinksClient';
import * as XLSX from 'xlsx';
import { Settings, Shield, Key, CheckCircle, Users, Search, UserCheck, UserMinus, ShieldCheck, UserPlus, Plus, Edit2, Save, X, Trash2, Link } from 'lucide-react';

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

  // Provider Links state
  const [providerLinks, setProviderLinks] = useState([]);
  const [providerLinksLoading, setProviderLinksLoading] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState(null);
  const [linkForm, setLinkForm] = useState({ provider_name: '', base_url: '', description: '' });
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);

  const [settings, setSettings] = useState({
    admin_code: '',
    intern_code: '',
    project_name: ''
  });

  // Adding  Intern form section setups
  const [internForm, setInternForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    start_date: new Date().toISOString().split('T')[0]
  });
  const [internSaving, setInternSaving] = useState(false);
  const [internSuccess, setInternSuccess] = useState(false);
  const [internError, setInternError] = useState('');

  // Sync functionality
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

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

  // Load provider links when tab is opened
  useEffect(() => {
    if (activeTab === 'provider_links' && providerLinks.length === 0) {
      const loadProviderLinks = async () => {
        setProviderLinksLoading(true);
        const result = await providerLinksClient.getProviderLinks();
        if (result.success) {
          setProviderLinks(result.data || []);
        }
        setProviderLinksLoading(false);
      };
      loadProviderLinks();
    }
  }, [activeTab]);

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
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleSyncInterns = async () => {
    if (!window.confirm('This will create intern records for all registered users with intern role who don\'t have them yet. Continue?')) {
      return;
    }
    
    setSyncing(true);
    setSyncResult(null);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/sync-interns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSyncResult(result.data);
        // Refresh data
        window.location.reload();
      } else {
        alert('Sync failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleAddIntern = async (e) => {
    e.preventDefault();
    setInternSaving(true);
    setInternError('');
    setInternSuccess(false);

    // Check for duplicate email within the system
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

  // Show loading skeleton while data is being fetched
  if (loading && activeTab === 'config') {
    return (
      <div id="page-admin" className="page active">
        <div className="section-header">
          <span className="section-title">ADMIN COMMAND CENTER</span>
        </div>
        <div className="card" style={{ maxWidth: '600px' }}>
          <div className="card-body" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--gray)', marginBottom: '10px' }}>Loading configuration...</div>
            <div style={{ width: '40px', height: '40px', border: '3px solid var(--border2)', borderTop: '3px solid var(--red-light)', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }}></div>
          </div>
        </div>
      </div>
    );
  }

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
          <button
            className={`admin-tab ${activeTab === 'provider_links' ? 'active' : ''}`}
            onClick={() => setActiveTab('provider_links')}
          >
            <Key size={14} /> PROVIDER LINKS
          </button>
        </div>
      </div>

      {/* ── CONFIGURATION TAB ESTABLISHMENT── */}
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

      {/* ── USER MANAGEMENT TAB ESTABLISHMENT── */}
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
            
            {syncResult && (
              <div className="success-banner" style={{ margin: '16px' }}>
                <CheckCircle size={18} /> Sync completed! Created {syncResult.created} intern records, skipped {syncResult.skipped} existing.
              </div>
            )}
            
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border2)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--white)', marginBottom: '4px' }}>Intern Record Sync</div>
                  <div style={{ fontSize: '11px', color: 'var(--gray)' }}>Create intern records for registered users who don't have them</div>
                </div>
                <button
                  className="btn btn-outline"
                  onClick={handleSyncInterns}
                  disabled={syncing}
                  style={{ fontSize: '11px', padding: '8px 16px' }}
                >
                  <UserPlus size={14} /> {syncing ? 'SYNCING...' : 'SYNC INTERNS'}
                </button>
              </div>
            </div>
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
                  {allProfiles.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ color: 'var(--gray)', marginBottom: '10px' }}>Loading profiles...</div>
                        <div style={{ width: '30px', height: '30px', border: '2px solid var(--border2)', borderTop: '2px solid var(--red-light)', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }}></div>
                      </td>
                    </tr>
                  ) : filteredUsers.length > 0 ? filteredUsers.map(p => (
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

      {/* ── ADDING AN INTERN  INTO THE SYSTEM  TAB SETUP── */}
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

      {/* ── PROVIDER LINKS TAB ── */}
      {activeTab === 'provider_links' && (
        <div className="card animate-in">
          <div className="card-header">
            <Link size={18} style={{ marginRight: '10px', color: 'var(--red-light)' }} />
            <span className="card-title">PROVIDER LINKS MANAGEMENT</span>
            <button 
              className="btn btn-primary"
              style={{ marginLeft: 'auto', padding: '8px 16px', fontSize: '12px' }}
              onClick={() => {
                setShowAddLinkForm(!showAddLinkForm);
                setLinkForm({ provider_name: '', base_url: '', description: '' });
              }}
            >
              <Plus size={14} /> ADD PROVIDER
            </button>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '13px', color: 'var(--gray)', marginBottom: '20px' }}>
              Manage provider certificate links. When users add certifications, the system will auto-fill the certificate URL based on the provider.
            </p>

            {/* Bulk Import Section */}
            <div style={{ background: 'var(--black3)', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <h4 style={{ fontSize: '13px', color: 'var(--white)', marginBottom: '5px' }}>📥 Bulk Import from CSV/XLSX</h4>
                  <p style={{ fontSize: '12px', color: 'var(--gray2)', margin: 0 }}>
                    Upload a CSV or Excel file with columns: <code style={{ background: 'var(--black4)', padding: '2px 6px', borderRadius: '3px' }}>Provider, Official Link, Category</code>
                  </p>
                </div>
                <button
                  className="btn btn-outline"
                  style={{ fontSize: '11px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                  onClick={async () => {
                    if (!window.confirm('This will update ALL existing certifications with matching provider links. Continue?')) {
                      return;
                    }
                    
                    setBackfilling(true);
                    setBackfillResult(null);
                    
                    try {
                      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/provider-links/backfill`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      });
                      
                      const result = await response.json();
                      
                      if (result.success) {
                        setBackfillResult(result.data);
                        alert(`Backfill complete!\n✓ ${result.data.updated} certifications updated\n⊘ ${result.data.skipped} skipped (no matching provider)\n${result.data.errors > 0 ? `✗ ${result.data.errors} errors` : ''}`);
                      } else {
                        alert('Backfill failed: ' + (result.error || 'Unknown error'));
                      }
                    } catch (error) {
                      alert('Backfill failed: ' + error.message);
                    } finally {
                      setBackfilling(false);
                    }
                  }}
                  disabled={backfilling}
                >
                  <Link size={14} /> {backfilling ? 'UPDATING...' : 'UPDATE EXISTING CERTS'}
                </button>
              </div>
              
              {backfillResult && (
                <div style={{ background: 'var(--black4)', padding: '10px', borderRadius: '6px', marginTop: '10px', fontSize: '12px', color: 'var(--gray2)' }}>
                  <div>✓ Updated: {backfillResult.updated} certifications</div>
                  <div>⊘ Skipped: {backfillResult.skipped} (no matching provider)</div>
                  {backfillResult.errors > 0 && <div style={{ color: 'var(--red-light)' }}>✗ Errors: {backfillResult.errors}</div>}
                </div>
              )}
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;

                  try {
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      try {
                        let rows = [];

                        if (file.name.endsWith('.csv')) {
                          // Parse CSV
                          const text = event.target.result;
                          const lines = text.split('\n').filter(line => line.trim());
                          rows = lines.slice(1).map(line => {
                            const [provider_name, base_url, description] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
                            return { provider_name, base_url, description };
                          });
                        } else {
                          // Parse XLSX
                          const data = new Uint8Array(event.target.result);
                          const workbook = XLSX.read(data, { type: 'array' });
                          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: false });
                          
                          console.log('=== EXCEL IMPORT DEBUG ===');
                          console.log('Total rows:', jsonData.length);
                          console.log('First row keys:', jsonData[0] ? Object.keys(jsonData[0]) : 'No data');
                          console.log('First row data:', jsonData[0]);
                          console.log('Second row data:', jsonData[1]);
                          
                          rows = jsonData.map((row, index) => {
                            // Get all keys from the row to help debug
                            const keys = Object.keys(row);
                            
                            // Try multiple possible column names (case-insensitive)
                            let provider_name = null;
                            let base_url = null;
                            let description = null;
                            
                            // Find provider name column
                            for (const key of keys) {
                              const lowerKey = key.toLowerCase().trim();
                              if (!provider_name && (
                                lowerKey === 'provider' || 
                                lowerKey === 'provider name' || 
                                lowerKey === 'provider_name' ||
                                lowerKey.includes('certification provider') ||
                                lowerKey.includes('certifier')
                              )) {
                                provider_name = row[key];
                              }
                              
                              if (!base_url && (
                                lowerKey === 'official link' || 
                                lowerKey === 'base url' || 
                                lowerKey === 'base_url' ||
                                lowerKey === 'url' ||
                                lowerKey === 'link' ||
                                lowerKey.includes('official')
                              )) {
                                base_url = row[key];
                              }
                              
                              if (!description && (
                                lowerKey === 'category' || 
                                lowerKey === 'description' ||
                                lowerKey === 'desc' ||
                                lowerKey === 'type'
                              )) {
                                description = row[key];
                              }
                            }
                            
                            console.log(`Row ${index + 1}:`, { provider_name, base_url, description });
                            
                            return { 
                              provider_name: provider_name ? String(provider_name).trim() : null, 
                              base_url: base_url ? String(base_url).trim() : null, 
                              description: description ? String(description).trim() : '' 
                            };
                          }).filter(row => {
                            const isValid = row.provider_name && row.base_url;
                            if (!isValid) {
                              console.log('Filtered out invalid row:', row);
                            }
                            return isValid;
                          });
                          
                          console.log('Valid rows after filtering:', rows.length);
                          console.log('=== END DEBUG ===');
                        }

                        console.log('Parsed rows:', rows);

                        if (rows.length === 0) {
                          alert('No valid rows found in file!\n\nPlease check:\n1. File has columns named "Provider" and "Official Link" (or similar)\n2. Rows contain actual data\n3. Check browser console (F12) for detailed debug info');
                          e.target.value = '';
                          return;
                        }

                        let successCount = 0;
                        let failCount = 0;
                        const errors = [];

                        for (const row of rows) {
                          if (row.provider_name && row.base_url) {
                            console.log('Attempting to add:', row);
                            const result = await providerLinksClient.addProviderLink({
                              provider_name: row.provider_name.trim(),
                              base_url: row.base_url.trim(),
                              description: row.description ? row.description.trim() : ''
                            });
                            
                            console.log('Result:', result);
                            
                            if (result.success) {
                              successCount++;
                              setProviderLinks(prev => [...prev, result.data]);
                            } else {
                              failCount++;
                              const errorMsg = result.error?.message || result.error || result.message || 'Unknown error';
                              console.error('Failed to add provider:', row.provider_name, errorMsg);
                              errors.push(`${row.provider_name}: ${errorMsg}`);
                            }
                          }
                        }

                        if (successCount > 0) {
                          alert(`Import complete!\n✓ ${successCount} providers added${failCount > 0 ? `\n✗ ${failCount} failed (duplicates or errors)\n\nFailed:\n${errors.join('\n')}` : ''}`);
                        } else {
                          alert(`Import failed!\n✗ 0 providers added\n✗ ${failCount} failed\n\nErrors:\n${errors.join('\n')}\n\nCheck browser console (F12) for details.`);
                        }
                        e.target.value = ''; // Reset file input
                      } catch (error) {
                        console.error('Parse error:', error);
                        alert('Failed to parse file: ' + error.message);
                      }
                    };

                    if (file.name.endsWith('.csv')) {
                      reader.readAsText(file);
                    } else {
                      reader.readAsArrayBuffer(file);
                    }
                  } catch (error) {
                    alert('Failed to read file: ' + error.message);
                  }
                }}
                style={{ fontSize: '12px' }}
              />
            </div>

            {/* Add Provider Form */}
            {showAddLinkForm && (
              <div style={{ background: 'var(--black3)', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border2)' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '15px', color: 'var(--white)' }}>Add New Provider Link</h4>
                <div className="form-group">
                  <label className="form-label">Provider Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Coursera, Udemy, AWS"
                    value={linkForm.provider_name}
                    onChange={(e) => setLinkForm({ ...linkForm, provider_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Base URL</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="e.g., https://www.coursera.org/account/accomplishments/verify/"
                    value={linkForm.base_url}
                    onChange={(e) => setLinkForm({ ...linkForm, base_url: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Coursera certificate verification"
                    value={linkForm.description}
                    onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={async () => {
                      if (!linkForm.provider_name || !linkForm.base_url) {
                        alert('Provider name and base URL are required');
                        return;
                      }
                      const result = await providerLinksClient.addProviderLink(linkForm);
                      if (result.success) {
                        setProviderLinks([...providerLinks, result.data]);
                        setShowAddLinkForm(false);
                        setLinkForm({ provider_name: '', base_url: '', description: '' });
                      } else {
                        alert('Failed to add provider link');
                      }
                    }}
                  >
                    <Save size={14} /> SAVE
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setShowAddLinkForm(false);
                      setLinkForm({ provider_name: '', base_url: '', description: '' });
                    }}
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}

            {/* Provider Links List */}
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>PROVIDER</th>
                    <th>BASE URL</th>
                    <th>DESCRIPTION</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {providerLinks.map(link => (
                    <tr key={link.id}>
                      <td style={{ fontWeight: '600' }}>{link.provider_name}</td>
                      <td style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--blue)' }}>
                        {link.base_url}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--gray)' }}>
                        {link.description || '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '5px', color: 'var(--red-light)' }}
                            onClick={async () => {
                              if (window.confirm(`Delete ${link.provider_name}?`)) {
                                const result = await providerLinksClient.deleteProviderLink(link.id);
                                if (result.success) {
                                  setProviderLinks(providerLinks.filter(l => l.id !== link.id));
                                }
                              }
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

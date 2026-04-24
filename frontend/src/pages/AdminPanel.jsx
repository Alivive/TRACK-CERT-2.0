import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Settings, Shield, Key, CheckCircle } from 'lucide-react';

const AdminPanel = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState({
    admin_code: '',
    intern_code: '',
    project_name: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      // Use select().limit(1) instead of .single() to avoid errors if table is empty
      const { data, error } = await supabase.from('admin_settings').select('*').limit(1);
      if (data && data.length > 0) {
        setSettings(data[0]);
      } else if (error) {
        console.warn('Settings not found:', error.message);
      }
      setLoading(false);
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

  if (loading) return <div style={{ color: 'var(--white)', padding: '40px' }}>Loading Admin Settings...</div>;

  return (
    <div id="page-admin" className="page active">
      <div className="section-header"><span className="section-title">ADMIN PANEL</span></div>
      
      <div className="card" style={{ maxWidth: '600px' }}>
        <div className="card-header">
          <Settings size={18} style={{ marginRight: '10px' }} />
          <span className="card-title">SYSTEM CONFIGURATION</span>
        </div>
        <div className="card-body">
          {success && (
            <div style={{ background: 'rgba(39, 174, 96, 0.1)', color: '#27ae60', padding: '15px', borderRadius: '4px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={18} /> Settings saved successfully!
            </div>
          )}

          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={settings.project_name}
                onChange={(e) => setSettings({...settings, project_name: e.target.value})}
              />
            </div>

            <div className="grid-2" style={{ gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Admin Access Code</label>
                <div style={{ position: 'relative' }}>
                  <Shield size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--gray)' }} />
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
                  <Key size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--gray)' }} />
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
                {saving ? 'SAVING...' : 'SAVE CONFIGURATION'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;

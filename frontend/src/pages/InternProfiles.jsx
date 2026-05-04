import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../utils/useDatabase';
import { supabase } from '../utils/supabaseClient';
import { CATS } from '../utils/mockData';
import { ArrowLeft, Download, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { generateInternReport } from '../utils/pdfGenerator';

const InternProfiles = () => {
  const { profile: authProfile } = useAuth();
  const isAdmin = authProfile?.role === 'admin';
  const { 
    interns = [], 
    certifications = [], 
    loading, 
    deleteCertification, 
    addIntern,
    updateIntern
  } = useDatabase();
  
  const [selectedInternId, setSelectedInternId] = useState(isAdmin ? null : authProfile?.intern_id);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInternId, setEditingInternId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newIntern, setNewIntern] = useState({ 
    first_name: '', 
    last_name: '', 
    email: '', 
    start_date: new Date().toISOString().split('T')[0] 
  });

  // O(1) memoized lookup: group certs by intern_id once, not on every render
  const certsByIntern = useMemo(() => {
    return certifications.reduce((map, c) => {
      if (!map[c.intern_id]) map[c.intern_id] = [];
      map[c.intern_id].push(c);
      return map;
    }, {});
  }, [certifications]);

  const getIC = (id) => certsByIntern[id] || [];
  const getTH = (cl) => cl.reduce((s, c) => s + (c.hours || 0), 0);
  const getInit = (first, last) => ((first?.[0] || '?') + (last?.[0] || '')).toUpperCase();

  const [isSaving, setIsSaving] = useState(false);

  const startEditIntern = (intern) => {
    setEditingInternId(intern.id);
    setEditForm({
      first_name: intern.first_name,
      last_name: intern.last_name,
      email: intern.email,
      start_date: intern.start_date
    });
  };

  const cancelEditIntern = () => {
    setEditingInternId(null);
    setEditForm({});
  };

  const saveEditIntern = async (internId) => {
    setIsSaving(true);
    try {
      const { error } = await updateIntern(internId, editForm);

      if (error) {
        alert('Failed to update intern: ' + error.message);
      } else {
        setEditingInternId(null);
        setEditForm({});
      }
    } catch (err) {
      alert('Error updating intern: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddIntern = async (e) => {
    e.preventDefault();
    console.log('[DEBUG] Starting Intern Save...');
    setIsSaving(true);
    
    // Safety Timeout: 10 seconds
    const timeout = setTimeout(() => {
      if (isSaving) {
        setIsSaving(false);
        alert('The database is taking too long to respond. It might be sleeping. Please refresh and try again.');
      }
    }, 10000);

    try {
      const { data, error } = await addIntern(newIntern);
      clearTimeout(timeout);
      console.log('[DEBUG] DB Response:', { data, error });
      
      if (error) {
        alert('Database Error: ' + error.message);
      } else {
        setShowAddModal(false);
        setNewIntern({ 
          first_name: '', 
          last_name: '', 
          email: '', 
          start_date: new Date().toISOString().split('T')[0] 
        });
      }
    } catch (err) {
      clearTimeout(timeout);
      console.error('[DEBUG] Save Crash:', err);
      alert('System Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCert = async (certId) => {
    if (window.confirm('Are you sure you want to delete this certification?')) {
      await deleteCertification(certId);
    }
  };

  const handleDownloadPDF = async (intern, ic) => {
    try {
      const mappedIntern = {
        first: intern.first_name,
        last: intern.last_name,
        email: intern.email
      };
      const mappedCerts = ic.map(c => ({ ...c, cat: c.category }));
      await generateInternReport(mappedIntern, mappedCerts);
    } catch (error) {
      console.error('PDF Generation failed:', error);
    }
  };

  if (loading) return <div style={{ color: 'var(--white)', padding: '40px' }}>Loading Profiles...</div>;

  const selectedIntern = interns.find(i => i.id === selectedInternId);
  const internCerts = selectedIntern ? getIC(selectedIntern.id) : [];

  if (selectedIntern) {
    return (
      <div className="page active">
        {isAdmin && (
          <button className="btn btn-ghost" onClick={() => setSelectedInternId(null)} style={{ marginBottom: '20px' }}>
            <ArrowLeft size={16} /> BACK TO LIST
          </button>
        )}

        <div className="intern-profile">
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div className="avatar" style={{ width: '80px', height: '80px', fontSize: '28px', margin: '0 auto 20px' }}>
                {getInit(selectedIntern.first_name, selectedIntern.last_name)}
              </div>
              <h2 style={{ fontSize: '24px', marginBottom: '5px' }}>{selectedIntern.first_name} {selectedIntern.last_name}</h2>
              <p style={{ color: 'var(--gray)', fontSize: '14px', marginBottom: '20px' }}>{selectedIntern.email}</p>
              
              <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="stat-card" style={{ padding: '15px' }}>
                  <div className="stat-value" style={{ fontSize: '20px' }}>{internCerts.length}</div>
                  <div className="stat-label" style={{ fontSize: '9px' }}>CERTS</div>
                </div>
                <div className="stat-card" style={{ padding: '15px' }}>
                  <div className="stat-value" style={{ fontSize: '20px' }}>{getTH(internCerts)}h</div>
                  <div className="stat-label" style={{ fontSize: '9px' }}>HOURS</div>
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => handleDownloadPDF(selectedIntern, internCerts)}
                >
                  <Download size={14} /> PDF REPORT
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">CERTIFICATION TRACK</span></div>
            <div className="card-body">
              {Object.keys(CATS).map(key => {
                const catCerts = internCerts.filter(c => c.category === key);
                return (
                  <div key={key} style={{ marginBottom: '25px', borderBottom: '1px solid var(--border2)', paddingBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '1px' }}>{CATS[key].name}</h4>
                      <span style={{ fontSize: '12px', color: 'var(--gray2)' }}>{catCerts.length} certs</span>
                    </div>
                    {catCerts.length > 0 ? catCerts.map(c => (
                      <div key={c.id} className="cert-item">
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--gray)' }}>{c.provider} · {c.date}</div>
                        </div>
                        <div className="cert-hours">
                          <div>{c.hours}</div>
                          <div className="cert-hours-label">hrs</div>
                        </div>
                        {isAdmin && (
                          <button 
                            className="btn btn-ghost" 
                            style={{ padding: '5px', marginLeft: '10px', color: 'var(--red-light)' }}
                            onClick={() => handleDeleteCert(c.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )) : (
                      <div style={{ color: 'var(--gray)', fontSize: '13px', padding: '16px 0' }}>No certifications yet.</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="page-interns" className="page active">
      <div className="section-header">
        <span className="section-title">INTERN PROFILES</span>
        <div style={{ display: 'flex', gap: '10px' }}>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> ADD INTERN
            </button>
          )}
          <div className="search-bar">
            <input type="text" placeholder="Search interns..." />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '18px' }}>
        <div className="card-body" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: '900px' }}>
              <thead>
                <tr>
                  <th>INTERN</th>
                  <th>EMAIL</th>
                  <th>CERTS</th>
                  <th>HOURS</th>
                  <th>JOINED</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {interns.map(i => (
                  <tr key={i.id}>
                    <td>
                      {editingInternId === i.id ? (
                        <input
                          type="text"
                          className="form-input"
                          style={{ fontSize: '13px', padding: '6px 10px', width: '100%' }}
                          value={editForm.first_name}
                          onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                          placeholder="First name"
                        />
                      ) : (
                        <div className="intern-name-cell">
                          <div className="avatar">{getInit(i.first_name, i.last_name)}</div>
                          <div className="intern-name">{i.first_name} {i.last_name}</div>
                        </div>
                      )}
                    </td>
                    <td>
                      {editingInternId === i.id ? (
                        <input
                          type="email"
                          className="form-input"
                          style={{ fontSize: '13px', padding: '6px 10px', width: '100%' }}
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          placeholder="Email"
                        />
                      ) : (
                        i.email
                      )}
                    </td>
                    <td>{getIC(i.id).length}</td>
                    <td>{getTH(getIC(i.id))}h</td>
                    <td>
                      {editingInternId === i.id ? (
                        <input
                          type="date"
                          className="form-input"
                          style={{ fontSize: '13px', padding: '6px 10px', width: '100%' }}
                          value={editForm.start_date}
                          onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                        />
                      ) : (
                        i.start_date
                      )}
                    </td>
                    <td>
                      {editingInternId === i.id ? (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: '11px', color: 'var(--green)', padding: '4px 8px' }}
                            onClick={() => saveEditIntern(i.id)}
                            disabled={isSaving}
                          >
                            <Save size={12} /> SAVE
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: '11px', color: 'var(--gray)', padding: '4px 8px' }}
                            onClick={cancelEditIntern}
                            disabled={isSaving}
                          >
                            <X size={12} /> CANCEL
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: '11px', color: 'var(--blue)' }}
                            onClick={() => startEditIntern(i)}
                          >
                            <Edit2 size={12} /> EDIT
                          </button>
                          <button
                            className="btn btn-ghost"
                            onClick={() => setSelectedInternId(i.id)}
                          >
                            VIEW PROFILE
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <div className="card-header"><span className="card-title">ADD NEW INTERN</span></div>
            <div className="card-body">
              <form onSubmit={handleAddIntern}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">First Name</label>
                    <input type="text" className="form-input" required value={newIntern.first_name} onChange={e => setNewIntern({...newIntern, first_name: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Last Name</label>
                    <input type="text" className="form-input" required value={newIntern.last_name} onChange={e => setNewIntern({...newIntern, last_name: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" required value={newIntern.email} onChange={e => setNewIntern({...newIntern, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input type="date" className="form-input" required value={newIntern.start_date} onChange={e => setNewIntern({...newIntern, start_date: e.target.value})} />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowAddModal(false)}>CANCEL</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={isSaving}>
                    {isSaving ? 'SAVING...' : 'SAVE INTERN'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternProfiles;

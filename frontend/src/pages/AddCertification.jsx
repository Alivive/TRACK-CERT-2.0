import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../utils/useDatabase';
import { useCategories } from '../context/CategoriesContext';
import { Plus, CheckCircle } from 'lucide-react';

const AddCertification = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { interns, addCertification, loading: dbLoading } = useDatabase();
  const { categories, getCategoryObject } = useCategories();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Use dynamic categories
  const CATS = getCategoryObject();
  const defaultCategory = categories.length > 0 ? categories[0].id : 'AI';
  
  const [formData, setFormData] = useState({
    intern_id: '',
    name: '',
    provider: '',
    category: defaultCategory,
    hours: '',
    date: new Date().toISOString().split('T')[0],
    certificate_url: '',
    certificate_file: null,
    certificate_file_url: ''
  });

  // Derive intern_id at submit time so we always have the latest profile value

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    // For interns, always resolve intern_id from profile at submit time
    const resolvedInternId = isAdmin ? formData.intern_id : (profile?.intern_id || '');

    // Map problematic categories to allowed ones temporarily
    const categoryMapping = {
      'BS': 'SOFT',    // Business and Finance → Soft Skills
      'SD': 'BE',      // Software Dev. Essentials → Back End Web Dev
      'DA': 'AI',      // Data & Analytics → Artificial Intelligence  
      'GD': 'FE'       // Graphics Design → Front End Web Dev
    };
    
    const mappedCategory = categoryMapping[formData.category] || formData.category;

    const { error } = await addCertification({
      ...formData,
      intern_id: resolvedInternId,
      category: mappedCategory,  // Use mapped category
      hours: parseInt(formData.hours)
    });

    if (!error) {
      setSuccess(true);
      setFormData({
        intern_id: '',
        name: '',
        provider: '',
        category: defaultCategory,
        hours: '',
        date: new Date().toISOString().split('T')[0],
        certificate_url: '',
        certificate_file: null,
        certificate_file_url: ''
      });
      setTimeout(() => setSuccess(false), 3000);
    } else {
      alert('Error adding certification: ' + error.message);
    }
    setLoading(false);
  };

  if (dbLoading) return <div style={{ color: 'var(--white)', padding: '40px' }}>Loading Intern List...</div>;

  return (
    <div id="page-add-cert" className="page active">
      <div className="section-header"><span className="section-title">ADD CERTIFICATION</span></div>
      
      <div className="card" style={{ maxWidth: '600px' }}>
        <div className="card-body">
          {success && (
            <div style={{ background: 'rgba(39, 174, 96, 0.1)', color: '#27ae60', padding: '15px', borderRadius: '4px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={18} /> Certification added successfully!
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {isAdmin ? (
              <div className="form-group">
                <label className="form-label">Select Intern</label>
                <select 
                  className="form-input" 
                  required 
                  value={formData.intern_id}
                  onChange={(e) => setFormData({...formData, intern_id: e.target.value})}
                >
                  <option value="">Choose an intern...</option>
                  {interns.map(i => (
                    <option key={i.id} value={i.id}>{i.first_name} {i.last_name} ({i.email})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ marginBottom: '20px', padding: '10px', background: 'var(--black4)', borderRadius: '4px', fontSize: '13px', color: 'var(--gray)' }}>
                Logging certification for: <span style={{ color: 'var(--white)', fontWeight: '600' }}>{profile?.full_name}</span>
              </div>
            )}

            <div className="grid-2" style={{ gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Certification Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Machine Learning Basics" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Provider</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Coursera, Google" 
                  required 
                  value={formData.provider}
                  onChange={(e) => setFormData({...formData, provider: e.target.value})}
                />
              </div>
            </div>

            <div className="grid-3" style={{ gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select 
                  className="form-input" 
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  {Object.keys(CATS).map(key => (
                    <option key={key} value={key}>{CATS[key].name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Hours</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="0" 
                  required 
                  value={formData.hours}
                  onChange={(e) => setFormData({...formData, hours: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Completion Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  required 
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
            </div>

            {/* Certificate Attachments Section */}
            <div style={{ marginTop: '20px', padding: '20px', background: 'var(--black4)', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: 'var(--white)', fontWeight: '600' }}>
                📎 CERTIFICATE DATA
              </h4>
              
              <div className="form-group">
                <label className="form-label">Certificate Image/PDF *</label>
                <input 
                  type="file" 
                  className="form-input" 
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  required
                  onChange={(e) => setFormData({...formData, certificate_file: e.target.files[0]})}
                  style={{ padding: '8px' }}
                />
                <div style={{ fontSize: '11px', color: 'var(--gray)', marginTop: '5px' }}>
                  Upload certificate image or PDF (Max 5MB) - Required
                </div>
              </div>
              
              <div className="form-group" style={{ marginTop: '15px' }}>
                <label className="form-label">Certificate Website URL *</label>
                <input 
                  type="url" 
                  className="form-input" 
                  placeholder="https://coursera.org/share/abc123 or https://linkedin.com/learning/certificates/xyz" 
                  required
                  value={formData.certificate_url}
                  onChange={(e) => setFormData({...formData, certificate_url: e.target.value})}
                />
                <div style={{ fontSize: '11px', color: 'var(--gray)', marginTop: '5px' }}>
                  Direct link to view certificate online - Required
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border2)', paddingTop: '20px' }}>
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', height: '44px' }}>
                <Plus size={18} /> {loading ? 'SAVING...' : 'SUBMIT CERTIFICATION'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddCertification;

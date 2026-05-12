import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../utils/useDatabase';
import { useCategories } from '../context/CategoriesContext';
import { Plus, CheckCircle, WifiOff } from 'lucide-react';

const AddCertification = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { interns, certifications, addCertification, loading: dbLoading } = useDatabase();
  const { categories } = useCategories();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Listen for online/offline changes
  useState(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const [formData, setFormData] = useState({
    intern_id: '',
    name: '',
    provider: '',
    category: '',
    hours: '',
    date: new Date().toISOString().split('T')[0],
    certificate_file: null,
    certificate_file_url: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    // Check if file upload is attempted while offline
    if (!isOnline && formData.certificate_file) {
      alert('⚠️ OFFLINE MODE\n\nFile uploads require an internet connection. You can:\n• Wait until you\'re back online, OR\n• Provide a URL instead of uploading a file');
      setLoading(false);
      return;
    }

    // Validate that at least one certificate option is provided
    if (!formData.certificate_file && !formData.certificate_file_url) {
      alert('⚠️ CERTIFICATE REQUIRED\n\nPlease provide either:\n• Upload a certificate file, OR\n• Provide a URL to an existing certificate');
      setLoading(false);
      return;
    }

    // Validate hours
    const hours = parseFloat(formData.hours);
    if (isNaN(hours) || hours <= 0) {
      alert('⚠️ INVALID HOURS\n\nHours must be greater than 0. Decimals like 0.5 are allowed.');
      setLoading(false);
      return;
    }

    // For interns, always resolve intern_id from profile at submit time
    const resolvedInternId = isAdmin ? formData.intern_id : (profile?.intern_id || '');

    // Check for duplicates (same name AND same provider for same intern)
    const duplicate = certifications.find(c => 
      c.intern_id === resolvedInternId &&
      c.name.toLowerCase().trim() === formData.name.toLowerCase().trim() &&
      c.provider.toLowerCase().trim() === formData.provider.toLowerCase().trim()
    );

    if (duplicate) {
      alert(`⚠️ DUPLICATE DETECTED\n\nThis certification already exists:\n• ${duplicate.name}\n• Provider: ${duplicate.provider}\n• Added on: ${duplicate.date}\n\nYou cannot add the same certification twice.`);
      setLoading(false);
      return;
    }

    const { error } = await addCertification({
      ...formData,
      intern_id: resolvedInternId,
      hours: parseFloat(formData.hours)
    });

    if (!error) {
      setSuccess(true);
      
      // Show different message for offline vs online
      if (!isOnline) {
        alert('✅ SAVED OFFLINE\n\nYour certification has been saved locally and will sync automatically when you\'re back online.');
      }
      
      setFormData({
        intern_id: '',
        name: '',
        provider: '',
        category: '',
        hours: '',
        date: new Date().toISOString().split('T')[0],
        certificate_file: null,
        certificate_file_url: ''
      });
      setTimeout(() => setSuccess(false), 3000);
    } else {
      // Handle duplicate error from backend
      if (error.message && error.message.startsWith('DUPLICATE:')) {
        const duplicateMessage = error.message.replace('DUPLICATE: ', '');
        alert(`⚠️ DUPLICATE CERTIFICATION\n\n${duplicateMessage}\n\nThis certification cannot be added because it already exists in the system.`);
      } else {
        alert('Error adding certification: ' + error.message);
      }
    }
    setLoading(false);
  };

  if (dbLoading) return <div style={{ color: 'var(--white)', padding: '40px' }}>Loading Intern List...</div>;

  return (
    <div id="page-add-cert" className="page active">
      <div className="section-header">
        <span className="section-title">ADD CERTIFICATION</span>
        {!isOnline && (
          <span style={{
            fontSize: '11px',
            padding: '4px 10px',
            borderRadius: '12px',
            background: 'rgba(230, 126, 34, 0.2)',
            color: '#e67e22',
            fontWeight: '600',
            border: '1px solid rgba(230, 126, 34, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <WifiOff size={12} /> OFFLINE MODE
          </span>
        )}
      </div>
      
      {!isOnline && (
        <div style={{
          background: 'rgba(230, 126, 34, 0.1)',
          border: '1px solid rgba(230, 126, 34, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: '12px',
          color: '#e67e22'
        }}>
          <strong>Offline Mode:</strong> You can add certifications without internet. They'll sync automatically when you're back online. Note: File uploads require internet connection.
        </div>
      )}
      
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
                  <option value="">Select category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Hours</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="0.5" 
                  required 
                  min="0.1"
                  step="any"
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
                <label className="form-label">Certificate Image/PDF</label>
                <p style={{ fontSize: '12px', color: 'var(--gray2)', marginBottom: '10px' }}>
                  Choose one option: Upload a file OR provide a URL to an existing certificate
                </p>
                
                {/* File Upload Option */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--gray)', marginBottom: '5px', display: 'block' }}>
                    Option 1: Upload File
                  </label>
                  <input 
                    type="file" 
                    className="form-input" 
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.svg,image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        // Check file size (5MB limit)
                        if (file.size > 5 * 1024 * 1024) {
                          alert('File size must be less than 5MB');
                          e.target.value = '';
                          return;
                        }
                        // Check file type
                        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml', 'application/pdf'];
                        if (!validTypes.includes(file.type)) {
                          alert('Please upload a valid image (JPG, PNG, WEBP, GIF, BMP, TIFF, SVG) or PDF file');
                          e.target.value = '';
                          return;
                        }
                        setFormData({...formData, certificate_file: file, certificate_file_url: ''});
                      }
                    }}
                    style={{ padding: '8px' }}
                    disabled={formData.certificate_file_url}
                  />
                  {formData.certificate_file && (
                    <div style={{ fontSize: '11px', color: 'var(--green)', marginTop: '5px' }}>
                      ✓ {formData.certificate_file.name} ({(formData.certificate_file.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>

                {/* URL Option */}
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--gray)', marginBottom: '5px', display: 'block' }}>
                    Option 2: Provide URL
                  </label>
                  <input 
                    type="url" 
                    className="form-input" 
                    placeholder="https://example.com/certificate.pdf or image URL"
                    value={formData.certificate_file_url || ''}
                    onChange={(e) => {
                      setFormData({...formData, certificate_file_url: e.target.value, certificate_file: null});
                      // Clear file input if URL is provided
                      const fileInput = document.querySelector('input[type="file"]');
                      if (fileInput) fileInput.value = '';
                    }}
                    disabled={formData.certificate_file}
                    style={{ padding: '10px' }}
                  />
                  {formData.certificate_file_url && (
                    <div style={{ fontSize: '11px', color: 'var(--green)', marginTop: '5px' }}>
                      ✓ URL provided
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '11px', color: 'var(--gray)', marginTop: '10px', padding: '8px', background: 'var(--black3)', borderRadius: '4px' }}>
                  💡 Tip: You must provide either a file upload OR a URL (at least one is required)
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

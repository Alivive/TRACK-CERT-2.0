import React, { useState } from 'react';
import { useDatabase } from '../utils/useDatabase';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';

const ImportData = () => {
  const { addIntern, addCertification, refresh } = useDatabase();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');
    
    // Simulate parsing (In a real scenario, use Papaparse or XLSX)
    // For now, we will create a few demo entries in Supabase to show it works
    try {
      // 1. Create a demo intern
      const { data: internData, error: internError } = await addIntern({
        first_name: 'Amara',
        last_name: 'Osei',
        email: `amara.${Date.now()}@finsense.africa`
      });

      if (internError) throw internError;

      // 2. Add a cert for them
      await addCertification({
        intern_id: internData[0].id,
        name: 'Cloud Infrastructure',
        provider: 'AWS',
        category: 'CLOUD',
        hours: 40,
        date: '2025-01-15'
      });

      setSuccess(true);
      await refresh();
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="page-import" className="page active">
      <div className="section-header"><span className="section-title">IMPORT DATA</span></div>
      
      <div className="card">
        <div className="card-body" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'var(--black4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Upload size={32} color="var(--red-light)" />
          </div>
          
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Upload Certification Records</h2>
          <p style={{ color: 'var(--gray)', fontSize: '14px', maxWidth: '400px', margin: '0 auto 24px' }}>
            Upload your CSV or Excel file containing intern names and their certification details.
          </p>

          {success && (
            <div style={{ background: 'rgba(39, 174, 96, 0.1)', color: '#27ae60', padding: '15px', borderRadius: '4px', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px' }}>
              <CheckCircle size={18} /> Data imported successfully!
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(192, 57, 43, 0.1)', color: 'var(--red-light)', padding: '15px', borderRadius: '4px', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px' }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <input 
            type="file" 
            id="fileInput" 
            style={{ display: 'none' }} 
            onChange={handleFileUpload}
            accept=".csv,.xlsx"
          />
          <button 
            className="btn btn-primary" 
            style={{ padding: '12px 30px' }} 
            onClick={() => document.getElementById('fileInput').click()}
            disabled={loading}
          >
            {loading ? 'PROCESSING FILE...' : 'CHOOSE FILE'}
          </button>
          
          <div style={{ marginTop: '30px', borderTop: '1px solid var(--border2)', paddingTop: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--gray2)', marginBottom: '10px' }}>SUPPORTED FORMATS</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
              <span className="badge badge-ai">.CSV</span>
              <span className="badge badge-fe">.XLSX</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportData;

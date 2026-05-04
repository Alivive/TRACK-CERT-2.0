import { useState } from 'react';
import { useDatabase } from '../utils/useDatabase';
import { Upload, CheckCircle, AlertCircle, Download, FileText } from 'lucide-react';

const ImportData = () => {
  const { interns, addCertification, refreshData } = useDatabase();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setResults(null);
    
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      let successCount = 0;
      let failCount = 0;
      const errors = [];

      for (const row of rows) {
        try {
          // Find intern by name
          const internName = row['Intern Name'] || row['Employee Name'];
          if (!internName) {
            errors.push(`Row skipped: Missing intern name`);
            failCount++;
            continue;
          }

          const intern = interns.find(i => 
            `${i.first_name} ${i.last_name}`.toLowerCase() === internName.toLowerCase()
          );

          if (!intern) {
            errors.push(`Intern not found: ${internName}`);
            failCount++;
            continue;
          }

          // Map category names to keys
          const categoryMap = {
            'Artificial Intelligence': 'AI',
            'Front End Web Dev': 'FE',
            'Back End Web Dev': 'BE',
            'API Functionalities': 'API',
            'Cybersecurity': 'CYBER',
            'Cloud Computing': 'CLOUD',
            'Soft Skills': 'SOFT'
          };

          const categoryKey = categoryMap[row['Category']] || row['Category'];

          await addCertification({
            intern_id: intern.id,
            name: row['Certification Name'],
            provider: row['Provider'],
            category: categoryKey,
            hours: parseInt(row['Hours']) || 0,
            date: row['Completion Date']
          });

          successCount++;
        } catch (err) {
          errors.push(`Error: ${err.message}`);
          failCount++;
        }
      }

      setResults({ successCount, failCount, errors });
      setSuccess(true);
      await refreshData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="page-import" className="page active">
      <div className="section-header"><span className="section-title">BULK IMPORT CERTIFICATIONS</span></div>
      
      <div className="grid-2" style={{ marginBottom: '20px' }}>
        <div className="card">
          <div className="card-header"><span className="card-title">DOWNLOAD TEMPLATE</span></div>
          <div className="card-body">
            <p style={{ color: 'var(--gray)', fontSize: '13px', marginBottom: '20px' }}>
              Download the CSV template with the correct format for bulk certification uploads.
            </p>
            <a 
              href="/CerTrack-Bulk-Upload-Template.csv" 
              download
              className="btn btn-outline"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Download size={14} /> DOWNLOAD TEMPLATE
            </a>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">TEMPLATE FORMAT</span></div>
          <div className="card-body">
            <div style={{ fontSize: '11px', color: 'var(--gray2)', marginBottom: '10px' }}>REQUIRED COLUMNS:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span className="badge badge-ai">Intern Name</span>
              <span className="badge badge-fe">Certification Name</span>
              <span className="badge badge-be">Provider</span>
              <span className="badge badge-api">Category</span>
              <span className="badge badge-cyber">Hours</span>
              <span className="badge badge-cloud">Completion Date</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'var(--black4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Upload size={32} color="var(--red-light)" />
          </div>
          
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Upload Certification Records</h2>
          <p style={{ color: 'var(--gray)', fontSize: '14px', maxWidth: '500px', margin: '0 auto 24px' }}>
            Upload your CSV file with certification data. Make sure intern names match exactly with existing records.
          </p>

          {results && (
            <div style={{ background: 'var(--black3)', padding: '20px', borderRadius: '8px', marginBottom: '20px', maxWidth: '500px', margin: '0 auto 20px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div>
                  <div style={{ color: '#27ae60', fontSize: '24px', fontWeight: '700' }}>{results.successCount}</div>
                  <div style={{ color: 'var(--gray2)', fontSize: '11px' }}>IMPORTED</div>
                </div>
                <div>
                  <div style={{ color: 'var(--red-light)', fontSize: '24px', fontWeight: '700' }}>{results.failCount}</div>
                  <div style={{ color: 'var(--gray2)', fontSize: '11px' }}>FAILED</div>
                </div>
              </div>
              {results.errors.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border2)', paddingTop: '15px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--gray2)', marginBottom: '8px' }}>ERRORS:</div>
                  <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {results.errors.map((err, i) => (
                      <div key={i} style={{ fontSize: '12px', color: 'var(--red-light)', marginBottom: '4px' }}>
                        • {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(192, 57, 43, 0.1)', color: 'var(--red-light)', padding: '15px', borderRadius: '4px', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <input 
            type="file" 
            id="fileInput" 
            style={{ display: 'none' }} 
            onChange={handleFileUpload}
            accept=".csv"
          />
          <button 
            className="btn btn-primary" 
            style={{ padding: '12px 30px' }} 
            onClick={() => document.getElementById('fileInput').click()}
            disabled={loading}
          >
            {loading ? 'PROCESSING FILE...' : 'CHOOSE CSV FILE'}
          </button>
          
          <div style={{ marginTop: '30px', borderTop: '1px solid var(--border2)', paddingTop: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--gray2)', marginBottom: '10px' }}>SUPPORTED FORMAT</div>
            <span className="badge badge-ai">.CSV</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportData;

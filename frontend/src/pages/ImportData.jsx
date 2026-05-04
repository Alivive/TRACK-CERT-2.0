import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../utils/useDatabase';
import { Upload, CheckCircle, AlertCircle, Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

const ImportData = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { interns, addCertification, refreshData } = useDatabase();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const parseFile = async (file) => {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === 'csv') {
      // Parse CSV
      const text = await file.text();
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
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Parse Excel
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      return XLSX.utils.sheet_to_json(firstSheet);
    } else {
      throw new Error('Unsupported file format. Please use CSV or Excel (.xlsx, .xls)');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setResults(null);
    
    try {
      const rows = await parseFile(file);
      
      let successCount = 0;
      let failCount = 0;
      const errors = [];

      for (const row of rows) {
        try {
          let intern;
          
          if (isAdmin) {
            // Admin must specify intern name
            const internName = row['Intern Name'] || row['Employee Name'];
            if (!internName) {
              errors.push(`Row skipped: Missing intern name`);
              failCount++;
              continue;
            }
            
            intern = interns.find(i => 
              `${i.first_name} ${i.last_name}`.toLowerCase() === internName.toLowerCase()
            );
            
            if (!intern) {
              errors.push(`Intern not found: ${internName}`);
              failCount++;
              continue;
            }
          } else {
            // Intern: automatically use their own profile
            intern = interns.find(i => i.id === profile?.intern_id);
            
            if (!intern) {
              errors.push(`Your intern profile not found. Please contact administrator.`);
              failCount++;
              continue;
            }
            
            // Optional: Verify intern name if provided
            const internName = row['Intern Name'] || row['Employee Name'];
            if (internName && `${intern.first_name} ${intern.last_name}`.toLowerCase() !== internName.toLowerCase()) {
              errors.push(`Row skipped: You can only upload certifications for yourself (${intern.first_name} ${intern.last_name})`);
              failCount++;
              continue;
            }
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
              style={{ width: '100%', justifyContent: 'center', marginBottom: '10px' }}
            >
              <Download size={14} /> DOWNLOAD CSV TEMPLATE
            </a>
            <div style={{ fontSize: '11px', color: 'var(--gray2)', textAlign: 'center' }}>
              CSV format works with Excel, Google Sheets, and all spreadsheet apps
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">TEMPLATE FORMAT</span></div>
          <div className="card-body">
            <div style={{ fontSize: '11px', color: 'var(--gray2)', marginBottom: '10px' }}>REQUIRED COLUMNS:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {isAdmin && <span className="badge badge-red">Intern Name</span>}
              <span className="badge badge-teal">Certification Name</span>
              <span className="badge badge-blue">Provider</span>
              <span className="badge badge-amber">Category</span>
              <span className="badge badge-purple">Hours</span>
              <span className="badge badge-green">Completion Date</span>
            </div>
            {!isAdmin && (
              <div style={{ marginTop: '12px', padding: '10px', background: 'var(--black4)', borderRadius: '4px', fontSize: '12px', color: 'var(--gray)' }}>
                <strong>Note:</strong> You don't need to include "Intern Name" - all certifications will be automatically added to your profile.
              </div>
            )}
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
            {isAdmin 
              ? 'Upload CSV file with certification data for any intern. Make sure intern names match exactly with existing records.'
              : 'Upload CSV file with your certification data. All rows must have your name as the intern.'}
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
            accept=".csv,.xlsx,.xls"
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
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <span className="badge badge-ai">.CSV</span>
              <span className="badge badge-fe">.XLSX</span>
              <span className="badge badge-be">.XLS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportData;

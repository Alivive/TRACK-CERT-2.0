import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../utils/useDatabase';
import { useCategories } from '../context/CategoriesContext';
import { Upload, CheckCircle, AlertCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const ImportData = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { interns, addCertification, refreshData } = useDatabase();
  const { categories } = useCategories();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const parseFile = async (file) => {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === 'csv') {
     
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
    setSuccess(false);
    
    try {
      const rows = await parseFile(file);
      
      let successCount = 0;
      let failCount = 0;
      const errors = [];
      const newCertifications = [];

      for (const row of rows) {
        try {
          let intern;
          
          if (isAdmin) {
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
            // For regular users, always use their own profile - ignore "Intern Name" column
            intern = interns.find(i => i.id === profile?.intern_id);
            
            if (!intern) {
              errors.push(`Your intern profile not found. Please contact administrator.`);
              failCount++;
              break; // Stop processing if profile not found
            }
          }

          // Map category name to code
          let categoryCode = row['Category'] || '';
          
          // Try to match by name or by ID
          const matchedCategory = categories.find(cat => 
            cat.name.toLowerCase() === categoryCode.toLowerCase() || 
            cat.id.toLowerCase() === categoryCode.toLowerCase()
          );
          
          if (matchedCategory) {
            categoryCode = matchedCategory.id;
          }
          // If no match, use as-is (for custom categories)

          // Validate hours
          const hours = parseFloat(row['Hours']) || 0;
          if (hours <= 0) {
            errors.push(`Invalid hours "${row['Hours']}" for "${row['Certification Name']}". Hours must be greater than 0.`);
            failCount++;
            continue;
          }

          const certData = {
            intern_id: intern.id,
            name: row['Certification Name'],
            provider: row['Provider'],
            category: categoryCode,
            hours: hours,
            date: row['Completion Date'],
            certificate_file_url: row['Certificate File URL'] || row['Certificate URL'] || row['Certificate File'] || ''
          };

          const result = await addCertification(certData);
          
          if (result.data) {
            newCertifications.push(result.data);
            successCount++;
          } else {
            errors.push(`Failed to add "${row['Certification Name']}": ${result.error?.message || 'Unknown error'}`);
            failCount++;
          }
        } catch (err) {
          errors.push(`Error adding "${row['Certification Name']}": ${err.message}`);
          failCount++;
        }
      }

      setResults({ successCount, failCount, errors });
      setSuccess(true);
      
      // Force refresh data after import
      await refreshData();
      
      // Show success for 5 seconds then allow new upload
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      // Reset file input
      e.target.value = '';
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {isAdmin && <span className="badge badge-red">Intern Name</span>}
              <span className="badge badge-teal">Certification Name</span>
              <span className="badge badge-blue">Provider</span>
              <span className="badge badge-amber">Category</span>
              <span className="badge badge-purple">Hours</span>
              <span className="badge badge-green">Completion Date</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--gray2)', marginBottom: '10px' }}>OPTIONAL COLUMN:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span className="badge badge-cloud">Certificate File URL</span>
            </div>
            {!isAdmin && (
              <div style={{ marginTop: '12px', padding: '10px', background: 'var(--black4)', borderRadius: '4px', fontSize: '12px', color: 'var(--gray)' }}>
                <strong>Note:</strong> You don't need to include "Intern Name" - all certifications will be automatically added to your profile.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NEW: Simplified Workflow Info */}
      <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
        <div className="card-body" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
            <div style={{ fontSize: '32px' }}>✨</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--green)', marginBottom: '8px' }}>
                SIMPLIFIED WORKFLOW - ONE UPLOAD DOES IT ALL!
              </h3>
              <div style={{ fontSize: '11px' }}>
                <div style={{ padding: '10px', background: 'var(--black4)', borderRadius: '6px', border: '1px solid var(--border2)' }}>
                  <div style={{ color: 'var(--white)', fontWeight: '600', marginBottom: '4px' }}>📎 Certificate File URL</div>
                  <div style={{ color: 'var(--gray2)' }}>Direct link to your certificate PDF/image (Google Drive, Dropbox, Coursera share link, etc.)</div>
                </div>
              </div>
              <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '4px', fontSize: '11px', color: 'var(--green)', fontWeight: '600' }}>
                ✓ This column is optional - leave blank if you don't have a certificate URL yet
              </div>
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
            {isAdmin 
              ? 'Upload CSV/Excel file with certification data including certificate URLs. Include "Intern Name" column to specify which intern each certification belongs to.'
              : 'Upload CSV/Excel file with your certification data. No need to include your name - all certifications will be automatically added to your profile!'}
          </p>

          {results && (
            <div style={{ 
              background: results.successCount > 0 ? 'linear-gradient(135deg, rgba(39, 174, 96, 0.1) 0%, rgba(39, 174, 96, 0.05) 100%)' : 'var(--black3)', 
              padding: '30px', 
              borderRadius: '12px', 
              marginBottom: '20px', 
              maxWidth: '600px', 
              margin: '0 auto 30px', 
              textAlign: 'left',
              border: results.successCount > 0 ? '2px solid rgba(39, 174, 96, 0.3)' : '1px solid var(--border2)',
              boxShadow: results.successCount > 0 ? '0 8px 32px rgba(39, 174, 96, 0.2)' : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <CheckCircle size={32} color="#27ae60" />
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--white)', marginBottom: '4px' }}>
                    Import Complete!
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--gray)' }}>
                    {results.successCount} certification{results.successCount !== 1 ? 's' : ''} successfully imported
                  </div>
                </div>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '15px', 
                marginBottom: results.errors.length > 0 ? '20px' : '0' 
              }}>
                <div style={{ 
                  background: 'rgba(39, 174, 96, 0.15)', 
                  padding: '20px', 
                  borderRadius: '8px',
                  border: '1px solid rgba(39, 174, 96, 0.3)'
                }}>
                  <div style={{ color: '#27ae60', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>
                    {results.successCount}
                  </div>
                  <div style={{ color: '#27ae60', fontSize: '12px', fontWeight: '600', letterSpacing: '1px' }}>
                    ✓ IMPORTED
                  </div>
                </div>
                <div style={{ 
                  background: results.failCount > 0 ? 'rgba(192, 57, 43, 0.15)' : 'var(--black4)', 
                  padding: '20px', 
                  borderRadius: '8px',
                  border: results.failCount > 0 ? '1px solid rgba(192, 57, 43, 0.3)' : '1px solid var(--border2)'
                }}>
                  <div style={{ 
                    color: results.failCount > 0 ? 'var(--red-light)' : 'var(--gray)', 
                    fontSize: '32px', 
                    fontWeight: '700', 
                    marginBottom: '4px' 
                  }}>
                    {results.failCount}
                  </div>
                  <div style={{ 
                    color: results.failCount > 0 ? 'var(--red-light)' : 'var(--gray2)', 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    letterSpacing: '1px' 
                  }}>
                    {results.failCount > 0 ? '✗ FAILED' : '✓ NO ERRORS'}
                  </div>
                </div>
              </div>
              
              {results.errors.length > 0 && (
                <div style={{ 
                  borderTop: '1px solid var(--border2)', 
                  paddingTop: '20px',
                  background: 'var(--black4)',
                  padding: '15px',
                  borderRadius: '8px'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--red-light)', 
                    marginBottom: '12px',
                    fontWeight: '600',
                    letterSpacing: '1px'
                  }}>
                    ⚠️ ERRORS ENCOUNTERED:
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {results.errors.map((err, i) => (
                      <div key={i} style={{ 
                        fontSize: '12px', 
                        color: 'var(--gray)', 
                        marginBottom: '8px',
                        paddingLeft: '12px',
                        borderLeft: '2px solid var(--red-light)'
                      }}>
                        {err}
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

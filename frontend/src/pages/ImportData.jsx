import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../utils/useDatabase';
import { useCategories } from '../context/CategoriesContext';
import { useNotifications } from '../context/NotificationsContext';
import { Upload, CheckCircle, AlertCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const ImportData = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { interns, addCertification, refreshData } = useDatabase();
  const { categories } = useCategories();
  const { showToast } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const parseFile = async (file) => {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === 'csv') {
      // Remove BOM if present
      const cleanText = (await file.text()).replace(/^\uFEFF/, '');
      const lines = cleanText.split('\n').filter(line => line.trim());
      
      // Parse CSV with proper handling of quoted values containing commas
      const parseCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        
        // Add the last field
        result.push(current.trim());
        return result;
      };
      
      const headers = parseCSVLine(lines[0]);
      
      return lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const row = {};
        // Add original and lowercase keys for robustness
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
          if (header) {
            row[header.trim().toLowerCase()] = values[index] || '';
          }
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
    setProgress({ current: 0, total: 0, percent: 0 });
    
    try {
      const rows = await parseFile(file);
      
      let successCount = 0;
      let failCount = 0;
      const errors = [];
      const newCertifications = [];
      const totalRows = rows.length;
      setProgress({ current: 0, total: totalRows, percent: 0 });

      // Progress tracking
      let processedCount = 0;

      for (const row of rows) {
        try {
          // Update progress
          processedCount++;
          const progressPercent = Math.round((processedCount / totalRows) * 100);
          setProgress({ current: processedCount, total: totalRows, percent: progressPercent });

          let intern;
          
          if (isAdmin) {
            const internName = row['intern name'] || row['employee name'] || row['Intern Name'] || row['Employee Name'];
            if (!internName) {
              errors.push(`Row ${processedCount}: Missing intern name`);
              failCount++;
              continue;
            }
            
            // Trim space to avoid mismatch
            const cleanInternName = internName.trim().toLowerCase();
            intern = interns.find(i => 
              `${i.first_name} ${i.last_name}`.toLowerCase() === cleanInternName ||
              `${i.first_name} ${i.last_name}`.trim().toLowerCase() === cleanInternName
            );
            
            if (!intern) {
              errors.push(`Row ${processedCount}: Intern not found: ${internName}`);
              failCount++;
              continue;
            }
          } else {
            // For regular users, always use their own profile - ignore "Intern Name" column
            intern = interns.find(i => i.id === profile?.intern_id);
            
            if (!intern) {
              errors.push(`Row ${processedCount}: Your intern profile not found. Please contact administrator.`);
              failCount++;
              break; // Stop processing if profile not found
            }
          }

          // Map category name to code - ENHANCED MATCHING
          let categoryCode = row['category'] || row['Category'] || '';
          
          // Try to match by name or by ID (case-insensitive and flexible)
          const matchedCategory = categories.find(cat => {
            const userCategory = categoryCode.toLowerCase().trim();
            const catName = cat.name.toLowerCase().trim();
            const catId = cat.id.toLowerCase().trim();
            
            // Exact matches
            if (userCategory === catName || userCategory === catId) {
              return true;
            }
            
            // Partial matches for common variations
            if (userCategory === 'softskills' && catId === 'soft') return true;
            if (userCategory === 'soft skills' && catId === 'soft') return true;
            if (userCategory === 'ai' && catId === 'ai') return true;
            if (userCategory === 'artificial intelligence' && catId === 'ai') return true;
            if (userCategory === 'frontend' && catId === 'fe') return true;
            if (userCategory === 'front end' && catId === 'fe') return true;
            if (userCategory === 'front-end' && catId === 'fe') return true;
            if (userCategory === 'backend' && catId === 'be') return true;
            if (userCategory === 'back end' && catId === 'be') return true;
            if (userCategory === 'back-end' && catId === 'be') return true;
            if (userCategory === 'cybersecurity' && catId === 'cyber') return true;
            if (userCategory === 'cyber security' && catId === 'cyber') return true;
            if (userCategory === 'cloud' && catId === 'cloud') return true;
            if (userCategory === 'cloud computing' && catId === 'cloud') return true;
            if (userCategory === 'data analytics' && catId === 'da') return true;
            if (userCategory === 'data & analytics' && catId === 'da') return true;
            if (userCategory === 'graphics design' && catId === 'gd') return true;
            if (userCategory === 'graphic design' && catId === 'gd') return true;
            if (userCategory === 'design' && catId === 'gd') return true;
            if (userCategory === 'business' && catId === 'bs') return true;
            if (userCategory === 'business and finance' && catId === 'bs') return true;
            if (userCategory === 'software development' && catId === 'sd') return true;
            if (userCategory === 'software dev' && catId === 'sd') return true;
            if (userCategory === 'tech' && catId === 'sd') return true;
            if (userCategory === 'api' && catId === 'api') return true;
            if (userCategory === 'api functionalities' && catId === 'api') return true;
            
            return false;
          });
          
          if (matchedCategory) {
            categoryCode = matchedCategory.id; // Use the correct system category ID
            console.log(`[IMPORT] Mapped "${row['Category']}" → "${matchedCategory.id}" (${matchedCategory.name})`);
          } else {
            // If no match found, log warning but continue with user input
            console.warn(`[IMPORT] No category match found for "${row['Category']}", using as-is`);
          }

          // Parse and validate date - handle both DD/MM/YYYY and YYYY-MM-DD formats
          let completionDate = row['completion date'] || row['Completion Date'] || '';
          if (completionDate) {
            // Check if date is in DD/MM/YYYY format
            if (completionDate.includes('/')) {
              const parts = completionDate.split('/');
              if (parts.length === 3) {
                // Convert DD/MM/YYYY to YYYY-MM-DD
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                completionDate = `${year}-${month}-${day}`;
              }
            }
          }

          // Get certification name
          const certName = (row['certification name'] || row['Certification Name'] || '').trim();
          
          // Validate required fields
          if (!certName) {
            errors.push(`Row ${processedCount}: Missing certification name`);
            failCount++;
            continue;
          }

          // Validate hours - ENHANCED VALIDATION
          let hours = parseFloat(row['hours'] || row['Hours']) || 0;
          if (hours <= 0) {
            errors.push(`Row ${processedCount}: Invalid hours "${row['Hours']}" for "${certName}". Hours must be greater than 0.`);
            failCount++;
            continue;
          }

          const providerName = row['provider'] || row['Provider'] || '';
          if (!providerName.trim()) {
            errors.push(`Row ${processedCount}: Missing provider for "${certName}"`);
            failCount++;
            continue;
          }

          if (!categoryCode) {
            errors.push(`Row ${processedCount}: Missing category for "${certName}"`);
            failCount++;
            continue;
          }

          const certData = {
            intern_id: intern.id,
            name: certName,
            provider: providerName.trim(),
            category: categoryCode,
            hours: hours,
            date: completionDate,
            certificate_file_url: row['certificate file url'] || row['Certificate File URL'] || row['certificate url'] || row['certificate file'] || row['links'] || row['link'] || ''
          };

          console.log(`[IMPORT] Processing certification ${processedCount}/${totalRows}:`, {
            certName,
            provider: row['Provider'],
            category: row['Category'],
            categoryCode,
            hours: row['Hours'],
            parsedHours: hours,
            date: completionDate,
            rawRow: row
          });

          const result = await addCertification(certData);
          
          if (result.data) {
            newCertifications.push(result.data);
            successCount++;
            console.log(`[IMPORT] ✅ Success: "${certName}"`);
          } else {
            const errorMsg = result.error?.message || result.error || 'Unknown error';
            
            // Handle duplicate errors specifically
            if (errorMsg.includes('DUPLICATE:') || errorMsg.includes('already exists')) {
              errors.push(`Row ${processedCount}: DUPLICATE - "${certName}" from "${certData.provider}" already exists for this intern`);
              console.warn(`[IMPORT] ⚠️ Duplicate: "${certName}"`);
            } else {
              errors.push(`Row ${processedCount}: Failed to add "${certName}": ${errorMsg}`);
              console.error(`[IMPORT] ❌ Failed: "${certName}":`, errorMsg);
            }
            failCount++;
          }

          // Small delay to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (err) {
          console.error(`[IMPORT] Exception processing row ${processedCount}:`, err);
          errors.push(`Row ${processedCount}: Error adding "${row['Certification Name']}": ${err.message}`);
          failCount++;
        }
      }

      setResults({ successCount, failCount, errors });
      setSuccess(true);
      
      // Force refresh data after import
      await refreshData();
      
      if (successCount > 0) {
        showToast('Import Complete', `Successfully imported ${successCount} certification(s)`, 'success');
      }
      if (failCount > 0) {
        showToast('Import Finished with Errors', `${failCount} row(s) failed to import. Check the error log.`, 'error');
      }
      
      // Show success for 5 seconds then allow new upload
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
      
    } catch (err) {
      console.error('[IMPORT] File processing error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0, percent: 0 });
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

          {loading && progress.total > 0 && (
            <div style={{ 
              background: 'var(--black3)', 
              padding: '20px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              border: '1px solid var(--border2)'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '10px' 
              }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--white)' }}>
                  Processing Certifications...
                </span>
                <span style={{ fontSize: '12px', color: 'var(--gray)' }}>
                  {progress.current} / {progress.total} ({progress.percent}%)
                </span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '8px', 
                background: 'var(--black4)', 
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  width: `${progress.percent}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, var(--red-light), var(--red))',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}

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
            id="import-button"
          >
            {loading 
              ? progress.total > 0 
                ? `PROCESSING... ${progress.percent}%` 
                : 'READING FILE...'
              : 'CHOOSE FILE'
            }
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

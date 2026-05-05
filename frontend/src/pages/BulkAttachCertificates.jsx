import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../utils/useDatabase';
import { Upload, CheckCircle, X, Paperclip, RefreshCw, Zap } from 'lucide-react';

const BulkAttachCertificates = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { certifications, refreshData, interns } = useDatabase();
  
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [matchedPairs, setMatchedPairs] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState(null);
  const [filterIntern, setFilterIntern] = useState('all');
  const [autoMatch, setAutoMatch] = useState(true);
  const [uploadSpeed, setUploadSpeed] = useState('normal');
  const [dataLoading, setDataLoading] = useState(true);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setDataLoading(true);
      try {
        await refreshData();
      } catch (error) {
        console.error('[BULK ATTACH] Error loading data:', error);
      } finally {
        setDataLoading(false);
      }
    };
    
    loadData();
  }, [refreshData]);

  // Get unique interns with their names for filter
  const internsForFilter = useMemo(() => {
    if (!isAdmin) return [];
    
    // Get unique intern IDs from certifications
    const certInternIds = new Set();
    certifications.forEach(c => {
      if (c.intern_id) {
        certInternIds.add(c.intern_id);
      }
    });
    
    // Map to intern objects with names
    return Array.from(certInternIds).map(internId => {
      const internData = interns.find(i => i.id === internId);
      return {
        id: internId,
        name: internData?.full_name || internData?.name || internId
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [certifications, interns, isAdmin]);

  // Filter certifications without attachments
  const certsWithoutFiles = useMemo(() => {
    return certifications.filter(c => {
      // For regular users: show all their certifications (with or without files)
      // For admins: show based on filter (all or specific intern)
      const matchesIntern = isAdmin 
        ? (filterIntern === 'all' || c.intern_id === filterIntern)
        : c.intern_id === profile?.id;
      
      const matchesSearch = !searchTerm || 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.provider.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesIntern && matchesSearch;
    });
  }, [certifications, filterIntern, searchTerm, isAdmin, profile?.id]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    
    // Auto-match if enabled
    if (autoMatch) {
      const newMatches = {};
      files.forEach((file, idx) => {
        const suggestedId = suggestMatch(file.name);
        if (suggestedId) {
          newMatches[selectedFiles.length + idx] = suggestedId;
        }
      });
      setMatchedPairs(prev => ({ ...prev, ...newMatches }));
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setMatchedPairs(prev => {
      const newPairs = { ...prev };
      delete newPairs[index];
      return newPairs;
    });
  };

  const matchFileToCert = (fileIndex, certId) => {
    setMatchedPairs(prev => ({
      ...prev,
      [fileIndex]: certId
    }));
  };

  const suggestMatch = useCallback((fileName) => {
    const cleanName = fileName.replace(/\.[^/.]+$/, '').toLowerCase();
    
    const match = certsWithoutFiles.find(c => {
      const certName = c.name.toLowerCase();
      const provider = c.provider.toLowerCase();
      return cleanName.includes(certName) || 
             cleanName.includes(provider) ||
             certName.includes(cleanName) ||
             provider.includes(cleanName);
    });
    
    return match?.id;
  }, [certsWithoutFiles]);

  // Auto-match all files
  const handleAutoMatchAll = () => {
    const newMatches = {};
    selectedFiles.forEach((file, idx) => {
      const suggestedId = suggestMatch(file.name);
      if (suggestedId) {
        newMatches[idx] = suggestedId;
      }
    });
    setMatchedPairs(newMatches);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }

    const unmatchedFiles = selectedFiles.filter((_, i) => !matchedPairs[i]);
    if (unmatchedFiles.length > 0) {
      alert(`Please match all files to certifications. ${unmatchedFiles.length} file(s) unmatched.`);
      return;
    }

    setLoading(true);
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    // Determine concurrent uploads based on speed setting
    const concurrency = uploadSpeed === 'fast' ? 5 : uploadSpeed === 'slow' ? 2 : 3;
    
    // Process files in batches
    for (let i = 0; i < selectedFiles.length; i += concurrency) {
      const batch = selectedFiles.slice(i, i + concurrency);
      const uploadPromises = batch.map(async (file, batchIdx) => {
        const fileIndex = i + batchIdx;
        const certId = matchedPairs[fileIndex];

        if (!certId) return;

        try {
          setUploadProgress(prev => ({
            ...prev,
            [fileIndex]: 'uploading'
          }));

          const formData = new FormData();
          formData.append('certificate_file', file);

          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/certifications/${certId}`, {
            method: 'PUT',
            body: formData
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          if (data.success) {
            setUploadProgress(prev => ({
              ...prev,
              [fileIndex]: 'success'
            }));
            successCount++;
          } else {
            throw new Error(data.error || 'Upload failed');
          }
        } catch (error) {
          setUploadProgress(prev => ({
            ...prev,
            [fileIndex]: 'error'
          }));
          errors.push(`${file.name}: ${error.message}`);
          failCount++;
        }
      });

      await Promise.all(uploadPromises);
    }

    setResults({ successCount, failCount, errors });
    setLoading(false);

    // Auto-sync data after successful uploads
    if (successCount > 0) {
      setSyncing(true);
      try {
        await refreshData();
        console.log('[BULK ATTACH] Data synced successfully');
      } catch (syncError) {
        console.error('[BULK ATTACH] Sync error:', syncError);
      } finally {
        setSyncing(false);
      }

      setTimeout(() => {
        setSelectedFiles([]);
        setMatchedPairs({});
        setUploadProgress({});
      }, 2000);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await refreshData();
      alert('Data synced successfully!');
    } catch (error) {
      alert('Sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const matchedCount = Object.keys(matchedPairs).length;
  const estimatedTime = Math.ceil((selectedFiles.length / (uploadSpeed === 'fast' ? 5 : uploadSpeed === 'slow' ? 2 : 3)) * 0.5);

  return (
    <div id="page-bulk-attach" className="page active">
      <div className="section-header">
        <span className="section-title">BULK ATTACH CERTIFICATE FILES</span>
        <button 
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '12px' }}
          onClick={handleManualSync}
          disabled={syncing}
        >
          <RefreshCw size={14} /> {syncing ? 'SYNCING...' : 'SYNC DATA'}
        </button>
      </div>

      {/* Show whose files are being uploaded */}
      {!isAdmin && (
        <div className="card" style={{ marginBottom: '20px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <div className="card-body" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--blue)', fontWeight: '600' }}>
              📋 Uploading certificates for: <strong>{profile?.name || 'Your Profile'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Admin intern selector */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: '20px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
          <div className="card-header"><span className="card-title">SELECT INTERN</span></div>
          <div className="card-body">
            <select
              className="form-input"
              value={filterIntern}
              onChange={(e) => setFilterIntern(e.target.value)}
              style={{ fontSize: '13px' }}
            >
              <option value="all">All Interns</option>
              {internsForFilter.map(intern => (
                <option key={intern.id} value={intern.id}>
                  {intern.name}
                </option>
              ))}
            </select>
            <div style={{ fontSize: '11px', color: 'var(--gray2)', marginTop: '8px' }}>
              📋 Uploading certificates for: <strong>
                {filterIntern === 'all' 
                  ? 'All Interns' 
                  : internsForFilter.find(i => i.id === filterIntern)?.name || filterIntern
                }
              </strong>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: '20px' }}>
        <div className="card">
          <div className="card-header"><span className="card-title">⚡ OPTIMIZED FOR BULK</span></div>
          <div className="card-body">
            <div style={{ fontSize: '13px', color: 'var(--gray)', lineHeight: '1.8' }}>
              <p style={{ marginBottom: '12px' }}>
                <strong>Designed for 100+ certificates per user</strong>
              </p>
              <ul style={{ paddingLeft: '20px', margin: '0' }}>
                <li>Auto-match files to certs</li>
                <li>Parallel uploads (3-5 concurrent)</li>
                <li>Batch processing</li>
                <li>Auto-sync after upload</li>
                <li>Real-time progress</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">STATISTICS</span></div>
          <div className="card-body">
            {dataLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray)' }}>
                <div style={{ fontSize: '14px', marginBottom: '10px' }}>Loading your certifications...</div>
                <div style={{ fontSize: '12px', color: 'var(--gray2)' }}>Please wait...</div>
              </div>
            ) : certifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray)' }}>
                <div style={{ fontSize: '14px', marginBottom: '10px' }}>No certifications found</div>
                <div style={{ fontSize: '12px', color: 'var(--gray2)' }}>
                  Go to "Add Certification" to create one first
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--blue)', marginBottom: '4px' }}>
                    {certsWithoutFiles.length}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--gray2)', textTransform: 'uppercase', fontWeight: '600' }}>
                    Total Certifications
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--green)', marginBottom: '4px' }}>
                    {selectedFiles.length}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--gray2)', textTransform: 'uppercase', fontWeight: '600' }}>
                    Files selected
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Settings */}
      {selectedFiles.length === 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header"><span className="card-title">UPLOAD SETTINGS</span></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--gray2)', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  AUTO-MATCH FILES
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={autoMatch}
                    onChange={(e) => setAutoMatch(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--gray)' }}>
                    Auto-match files to certifications
                  </span>
                </label>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--gray2)', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  UPLOAD SPEED
                </label>
                <select
                  className="form-input"
                  value={uploadSpeed}
                  onChange={(e) => setUploadSpeed(e.target.value)}
                  style={{ fontSize: '12px' }}
                >
                  <option value="slow">Slow (2 concurrent)</option>
                  <option value="normal">Normal (3 concurrent)</option>
                  <option value="fast">Fast (5 concurrent)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Selection */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header"><span className="card-title">STEP 1: SELECT FILES</span></div>
        <div className="card-body" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'var(--black4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Zap size={32} color="var(--blue)" />
          </div>
          
          <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Select Certificate Files</h3>
          <p style={{ color: 'var(--gray)', fontSize: '13px', marginBottom: '20px' }}>
            Select multiple PDF or image files to attach to existing certifications (100+ files supported)
          </p>

          <input 
            type="file" 
            id="fileInput" 
            style={{ display: 'none' }} 
            onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            multiple
          />
          <button 
            className="btn btn-primary" 
            style={{ padding: '12px 30px' }} 
            onClick={() => document.getElementById('fileInput').click()}
            disabled={loading}
          >
            <Upload size={16} /> CHOOSE FILES
          </button>
          
          <div style={{ marginTop: '20px', fontSize: '11px', color: 'var(--gray2)' }}>
            Supported: PDF, JPG, PNG, WEBP (Max 5MB each) • Optimized for 100+ files
          </div>
        </div>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <span className="card-title">STEP 2: MATCH FILES ({matchedCount}/{selectedFiles.length})</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-outline"
                style={{ fontSize: '11px', padding: '6px 12px' }}
                onClick={handleAutoMatchAll}
              >
                AUTO-MATCH ALL
              </button>
              <span style={{ fontSize: '12px', color: 'var(--gray2)' }}>
                {estimatedTime}min to upload
              </span>
            </div>
          </div>
          <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {selectedFiles.map((file, fileIndex) => {
              const suggestedCertId = suggestMatch(file.name);
              const selectedCertId = matchedPairs[fileIndex] || suggestedCertId;
              const selectedCert = certifications.find(c => c.id === selectedCertId);

              return (
                <div key={fileIndex} style={{ 
                  padding: '12px', 
                  marginBottom: '8px', 
                  background: 'var(--black4)', 
                  borderRadius: '6px',
                  border: '1px solid var(--border2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Paperclip size={12} color="var(--gray)" />
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </div>
                    </div>

                    <select
                      className="form-input"
                      style={{ fontSize: '11px', padding: '6px', width: '100%' }}
                      value={selectedCertId || ''}
                      onChange={(e) => matchFileToCert(fileIndex, e.target.value)}
                    >
                      <option value="">-- Select Cert --</option>
                      {certsWithoutFiles.map(cert => (
                        <option key={cert.id} value={cert.id}>
                          {cert.name} ({cert.provider})
                        </option>
                      ))}
                    </select>

                    {selectedCert && (
                      <div style={{ 
                        marginTop: '4px', 
                        padding: '4px 6px', 
                        background: 'rgba(16, 185, 129, 0.1)', 
                        borderRadius: '3px',
                        fontSize: '10px',
                        color: 'var(--green)'
                      }}>
                        ✓ {selectedCert.name}
                      </div>
                    )}
                  </div>

                  <button
                    className="btn btn-ghost"
                    style={{ padding: '4px', color: 'var(--red-light)', flexShrink: 0 }}
                    onClick={() => removeFile(fileIndex)}
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div style={{ 
          background: results.successCount > 0 ? 'linear-gradient(135deg, rgba(39, 174, 96, 0.1) 0%, rgba(39, 174, 96, 0.05) 100%)' : 'var(--black3)', 
          padding: '30px', 
          borderRadius: '12px', 
          marginBottom: '20px',
          border: results.successCount > 0 ? '2px solid rgba(39, 174, 96, 0.3)' : '1px solid var(--border2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <CheckCircle size={32} color={results.successCount > 0 ? '#27ae60' : '#e74c3c'} />
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--white)', marginBottom: '4px' }}>
                {syncing ? 'Syncing Data...' : 'Upload Complete!'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gray)' }}>
                {results.successCount} file(s) successfully attached
                {syncing && ' - updating your records...'}
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
              border: '1px solid rgba(39, 174, 96, 0.3)',
              textAlign: 'center'
            }}>
              <div style={{ color: '#27ae60', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>
                {results.successCount}
              </div>
              <div style={{ color: '#27ae60', fontSize: '12px', fontWeight: '600', letterSpacing: '1px' }}>
                ✓ UPLOADED
              </div>
            </div>
            <div style={{ 
              background: results.failCount > 0 ? 'rgba(192, 57, 43, 0.15)' : 'var(--black4)', 
              padding: '20px', 
              borderRadius: '8px',
              border: results.failCount > 0 ? '1px solid rgba(192, 57, 43, 0.3)' : '1px solid var(--border2)',
              textAlign: 'center'
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
              borderRadius: '8px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              <div style={{ 
                fontSize: '12px', 
                color: 'var(--red-light)', 
                marginBottom: '12px',
                fontWeight: '600',
                letterSpacing: '1px'
              }}>
                ⚠️ ERRORS ({results.errors.length}):
              </div>
              {results.errors.map((err, i) => (
                <div key={i} style={{ 
                  fontSize: '11px', 
                  color: 'var(--gray)', 
                  marginBottom: '6px',
                  paddingLeft: '12px',
                  borderLeft: '2px solid var(--red-light)'
                }}>
                  {err}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Button */}
      {selectedFiles.length > 0 && !results && (
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button
            className="btn btn-primary"
            style={{ padding: '14px 40px', fontSize: '14px' }}
            onClick={handleUpload}
            disabled={loading || matchedCount !== selectedFiles.length}
          >
            {loading ? `UPLOADING... (${Object.values(uploadProgress).filter(s => s === 'success').length}/${selectedFiles.length})` : `UPLOAD ${selectedFiles.length} FILE(S)`}
          </button>
          <div style={{ fontSize: '12px', color: 'var(--gray2)', marginTop: '10px' }}>
            {matchedCount === selectedFiles.length 
              ? `Ready to upload • Est. ${estimatedTime} min`
              : `${selectedFiles.length - matchedCount} file(s) need to be matched`
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkAttachCertificates;

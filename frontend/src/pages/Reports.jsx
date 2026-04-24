import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../utils/useDatabase';
import { Download } from 'lucide-react';
import { generateInternReport, generateSummaryReport } from '../utils/pdfGenerator';

const Reports = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { interns, certifications, loading } = useDatabase();
  const [reportTitle, setReportTitle] = useState('Quarterly Certification Summary');
  const [selectedInternId, setSelectedInternId] = useState(isAdmin ? '' : (profile?.id || ''));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummaryGenerating, setIsSummaryGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    const targetId = isAdmin ? selectedInternId : profile?.id;
    if (!targetId) return alert('Please select an intern.');
    
    setIsGenerating(true);
    const intern = interns.find(i => i.id === targetId);
    const ic = certifications.filter(c => c.intern_id === targetId);
    
    try {
      const mappedIntern = {
        first: intern?.first_name || 'Intern',
        last: intern?.last_name || '',
        email: intern?.email || ''
      };
      const mappedCerts = ic.map(c => ({ ...c, cat: c.category }));
      await generateInternReport(mappedIntern, mappedCerts);
    } catch (error) {
      console.error('PDF Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadSummary = async () => {
    if (!isAdmin) return;
    setIsSummaryGenerating(true);
    try {
      const mappedInterns = interns.map(i => ({ ...i, first: i.first_name, last: i.last_name }));
      const mappedCerts = certifications.map(c => ({ ...c, cat: c.category }));
      await generateSummaryReport(mappedInterns, mappedCerts);
    } catch (error) {
      console.error('Summary PDF Generation failed:', error);
    } finally {
      setIsSummaryGenerating(false);
    }
  };

  if (loading) return <div style={{ color: 'var(--white)', padding: '40px' }}>Loading Reports...</div>;

  return (
    <div id="page-reports" className="page active">
      <div className="section-header">
        <span className="section-title">{isAdmin ? 'ADMIN REPORTS' : 'MY PERFORMANCE REPORT'}</span>
      </div>
      
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">{isAdmin ? 'INDIVIDUAL INTERN REPORT' : 'DOWNLOAD MY REPORT'}</span></div>
          <div className="card-body">
            <p style={{ color: 'var(--gray)', fontSize: '13px', marginBottom: '20px' }}>
              {isAdmin 
                ? 'Select an intern to generate their detailed certification report.' 
                : 'Download your official certification progress report as a high-fidelity PDF.'}
            </p>
            
            {isAdmin && (
              <div className="form-group">
                <label className="form-label">Select Intern</label>
                <select 
                  className="form-input" 
                  value={selectedInternId}
                  onChange={(e) => setSelectedInternId(e.target.value)}
                >
                  <option value="">Choose an intern...</option>
                  {interns.map(i => (
                    <option key={i.id} value={i.id}>{i.first_name} {i.last_name}</option>
                  ))}
                </select>
              </div>
            )}

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleDownloadPDF}
              disabled={isGenerating || (isAdmin && !selectedInternId)}
            >
              <Download size={14} /> {isGenerating ? 'GENERATING...' : isAdmin ? 'INTERN PDF DOWNLOAD' : 'DOWNLOAD MY PDF'}
            </button>
          </div>
        </div>

        {isAdmin && (
          <div className="card">
            <div className="card-header"><span className="card-title">PROGRAM SUMMARY REPORT</span></div>
            <div className="card-body">
              <p style={{ color: 'var(--gray)', fontSize: '13px', marginBottom: '20px' }}>
                Generate a full program-wide overview including all metrics and category breakdowns.
              </p>
              <div className="form-group">
                <label className="form-label">Report Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                />
              </div>
              <button 
                className="btn btn-outline" 
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleDownloadSummary}
                disabled={isSummaryGenerating}
              >
                <Download size={14} /> {isSummaryGenerating ? 'GENERATING...' : 'GENERATE SUMMARY PDF'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;

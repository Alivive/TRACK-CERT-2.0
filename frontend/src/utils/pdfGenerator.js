import html2pdf from 'html2pdf.js';
import { booksClient } from './booksClient';

export const generateInternReport = async (intern, certifications, categories = {}) => {
  console.log('[PDF] Generating report for:', intern);
  console.log('[PDF] Certifications:', certifications.length);
  console.log('[PDF] Categories:', Object.keys(categories));
  
  const getTH = (cl) => cl.reduce((s, c) => s + (c.hours || 0), 0);
  
  // Fetch book assignments for this intern
  let bookAssignments = [];
  try {
    const result = await booksClient.getAssignments(intern.intern_id || intern.id);
    if (result.success) {
      bookAssignments = result.data || [];
    }
  } catch (error) {
    console.warn('[PDF] Could not load book assignments:', error);
  }
  
  const completedBooks = bookAssignments.filter(b => b.status === 'completed').length;
  const inProgressBooks = bookAssignments.filter(b => b.status === 'in-progress').length;
  const totalHours = getTH(certifications);
  
  // Use provided categories or fallback to empty object
  const CATS = categories || {};
  console.log('[PDF] Using categories:', CATS);
  
  // If no categories provided, create a fallback structure
  if (Object.keys(CATS).length === 0) {
    console.warn('[PDF] No categories provided, using fallback');
    // Create categories from existing certifications
    const uniqueCategories = [...new Set(certifications.map(c => c.cat || c.category))];
    uniqueCategories.forEach(cat => {
      if (cat) {
        CATS[cat] = { name: cat };
      }
    });
  }
  
  // Group certifications by category
  const certsByCategory = {};
  Object.keys(CATS).forEach(key => {
    certsByCategory[key] = certifications.filter(c => (c.cat || c.category) === key);
  });
  
  // Category colors matching the PDF
  const categoryColors = {
    'API': '#6366f1',
    'AI': '#8b5cf6',
    'BE': '#06b6d4',
    'BS': '#8b5cf6',
    'CLOUD': '#06b6d4',
    'CYBER': '#ef4444',
    'DA': '#f97316',
    'FE': '#10b981',
    'GD': '#f97316',
    'SOFT': '#ec4899',
    'SD': '#06b6d4'
  };
  
  const getInitials = (first, last) => {
    return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase();
  };
  
  const element = document.createElement('div');
  element.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; padding: 0; }
    </style>
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: #ffffff; line-height: 1.5;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff; padding: 32px 48px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">FinSense Africa</h1>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #94a3b8; font-weight: 500;">Intern Certification Tracker · Confidential</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">INTERN REPORT</h2>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #94a3b8; font-weight: 500;">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      <div style="padding: 48px;">
        
        <!-- Profile Header -->
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 16px; padding: 32px; margin-bottom: 40px; border: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center; gap: 24px; margin-bottom: 24px;">
            <div style="width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: white; flex-shrink: 0;">
              ${getInitials(intern.first, intern.last)}
            </div>
            <div style="flex: 1;">
              <h3 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #0f172a;">${intern.first} ${intern.last}</h3>
              <p style="margin: 0; font-size: 15px; color: #64748b;">${intern.email}</p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">● INTERN</p>
            </div>
          </div>
          
          <!-- Stats Cards -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
            <div style="background: white; border-radius: 12px; padding: 20px; border-left: 4px solid #6366f1; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-size: 32px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">${certifications.length}</div>
              <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">TOTAL CERTIFICATIONS</div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">All categories</div>
            </div>
            <div style="background: white; border-radius: 12px; padding: 20px; border-left: 4px solid #10b981; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-size: 32px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">${totalHours}h</div>
              <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">TOTAL LEARNING HOURS</div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Across all certs</div>
            </div>
            <div style="background: white; border-radius: 12px; padding: 20px; border-left: 4px solid #f97316; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-size: 32px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">${completedBooks}</div>
              <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">BOOKS COMPLETED</div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">${inProgressBooks} in progress</div>
            </div>
          </div>
        </div>

        <!-- Reading Progress -->
        ${bookAssignments.length > 0 ? `
        <div style="margin-bottom: 40px;">
          <div style="background: #0f172a; color: white; padding: 12px 20px; border-radius: 8px 8px 0 0; margin-bottom: 0;">
            <h3 style="margin: 0; font-size: 15px; font-weight: 700; letter-spacing: 0.5px;">■ Reading Progress</h3>
          </div>
          <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
              <div style="background: white; border-radius: 8px; padding: 20px; text-align: center; border: 1px solid #e2e8f0;">
                <div style="font-size: 36px; font-weight: 800; color: #10b981; margin-bottom: 8px;">${completedBooks}</div>
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">● COMPLETED</div>
              </div>
              <div style="background: white; border-radius: 8px; padding: 20px; text-align: center; border: 1px solid #e2e8f0;">
                <div style="font-size: 36px; font-weight: 800; color: #f97316; margin-bottom: 8px;">${inProgressBooks}</div>
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">● IN PROGRESS</div>
              </div>
              <div style="background: white; border-radius: 8px; padding: 20px; text-align: center; border: 1px solid #e2e8f0;">
                <div style="font-size: 36px; font-weight: 800; color: #6366f1; margin-bottom: 8px;">${bookAssignments.length}</div>
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">● TOTAL ASSIGNED</div>
              </div>
            </div>
            ${bookAssignments.map(book => {
              const statusColor = book.status === 'completed' ? '#10b981' : book.status === 'in-progress' ? '#f97316' : '#6366f1';
              const statusBg = book.status === 'completed' ? '#d1fae5' : book.status === 'in-progress' ? '#fed7aa' : '#e0e7ff';
              return `
              <div style="background: white; padding: 16px; margin-bottom: 12px; border-radius: 8px; border-left: 4px solid ${statusColor}; display: flex; align-items: center; justify-content: space-between;">
                <div style="flex: 1;">
                  <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">■ ${book.book_title}</div>
                  <div style="font-size: 12px; color: #64748b;">${book.book_author}${book.book_pages ? ` · ${book.book_pages} pages` : ''}</div>
                </div>
                <div style="background: ${statusBg}; color: ${statusColor}; padding: 6px 14px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">
                  ${book.status.replace('-', ' ')}
                </div>
              </div>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Certification Overview -->
        <div style="margin-bottom: 40px;">
          <div style="background: #0f172a; color: white; padding: 12px 20px; border-radius: 8px 8px 0 0;">
            <h3 style="margin: 0; font-size: 15px; font-weight: 700; letter-spacing: 0.5px;">■ Certification Overview by Category</h3>
          </div>
          <div style="background: #f8fafc; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
            <div style="display: flex; gap: 40px; align-items: center;">
              <div style="position: relative; width: 180px; height: 180px; flex-shrink: 0;">
                <svg width="180" height="180" viewBox="0 0 180 180">
                  <circle cx="90" cy="90" r="70" fill="none" stroke="#e2e8f0" stroke-width="20"/>
                  ${(() => {
                    let offset = 0;
                    const total = certifications.length;
                    const circumference = 2 * Math.PI * 70;
                    return Object.keys(CATS).map(key => {
                      const count = certsByCategory[key].length;
                      if (count === 0) return '';
                      const percentage = count / total;
                      const dashLength = circumference * percentage;
                      const dashOffset = -offset;
                      offset += dashLength;
                      return `<circle cx="90" cy="90" r="70" fill="none" stroke="${categoryColors[key] || '#6366f1'}" stroke-width="20" stroke-dasharray="${dashLength} ${circumference}" stroke-dashoffset="${dashOffset}" transform="rotate(-90 90 90)"/>`;
                    }).join('');
                  })()}
                </svg>
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                  <div style="font-size: 42px; font-weight: 800; color: #0f172a;">${certifications.length}</div>
                  <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">TOTAL</div>
                </div>
              </div>
              <div style="flex: 1;">
                ${Object.keys(CATS).map(key => {
                  const count = certsByCategory[key].length;
                  return `
                  <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div style="width: 12px; height: 12px; border-radius: 2px; background: ${categoryColors[key] || '#6366f1'}; flex-shrink: 0;"></div>
                      <span style="font-size: 14px; color: #475569; font-weight: 500;">${CATS[key].name}</span>
                    </div>
                    <span style="font-size: 16px; font-weight: 700; color: #0f172a;">${count}</span>
                  </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Full Certification List -->
        <div style="margin-bottom: 40px;">
          <div style="background: #0f172a; color: white; padding: 12px 20px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; font-size: 15px; font-weight: 700; letter-spacing: 0.5px;">■ Full Certification List</h3>
            <span style="font-size: 13px; color: #94a3b8;">${certifications.length} total certifications</span>
          </div>
          <div style="background: white; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
            ${Object.keys(CATS).map(key => {
              const catCerts = certsByCategory[key];
              const catHours = getTH(catCerts);
              return `
              <div style="padding: 24px 32px; border-bottom: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${categoryColors[key] || '#6366f1'};"></div>
                    <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a;">${CATS[key].name}</h4>
                  </div>
                  <div style="background: ${categoryColors[key] || '#6366f1'}; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700;">
                    ${catCerts.length} certs · ${catHours}h
                  </div>
                </div>
                ${catCerts.length > 0 ? `
                  <div style="margin-left: 24px;">
                    ${catCerts.map(c => `
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                        <div style="flex: 1;">
                          <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 2px;">${c.name}</div>
                          <div style="font-size: 12px; color: #6366f1; font-weight: 500; margin-bottom: 4px;">${c.provider}</div>
                          ${c.certificate_url ? `
                            <div style="font-size: 10px; margin-bottom: 2px;">
                              <span style="color: #64748b;">🔗 </span>
                              <a href="${c.certificate_url}" style="color: #2563eb; text-decoration: none; font-weight: 600;">View Certificate</a>
                            </div>
                          ` : ''}
                          ${c.certificate_file_url ? `
                            <div style="font-size: 10px;">
                              <span style="color: #64748b;">📎 </span>
                              <a href="${c.certificate_file_url}" style="color: #059669; text-decoration: none; font-weight: 600;">View File</a>
                            </div>
                          ` : ''}
                        </div>
                        <div style="display: flex; align-items: center; gap: 16px;">
                          <div style="background: #f1f5f9; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; color: #0f172a;">${c.hours}h</div>
                          <div style="font-size: 12px; color: #64748b; min-width: 90px; text-align: right;">${c.date}</div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : `
                  <p style="margin: 0; font-size: 13px; color: #94a3b8; font-style: italic; margin-left: 24px;">No certifications in this category yet.</p>
                `}
              </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 32px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 11px; color: #94a3b8;">FinSense Africa · Intern Certification Tracker · Confidential</p>
        </div>

      </div>
    </div>
  `;

  const opt = {
    margin: 0,
    filename: `Intern-Report-${intern.first}-${intern.last}.pdf`,
    image: { type: 'jpeg', quality: 1.0 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  return html2pdf().from(element).set(opt).save();
};

export const generateSummaryReport = async (interns, certifications, categories = {}) => {
  const getTH = (cl) => cl.reduce((s, c) => s + (c.hours || 0), 0);
  const totalCerts = certifications.length;
  const totalHours = getTH(certifications);
  const avgCerts = (totalCerts / Math.max(interns.length, 1)).toFixed(1);
  
  // Fetch all book assignments
  let allBookAssignments = [];
  try {
    const result = await booksClient.getAssignments();
    if (result.success) {
      allBookAssignments = result.data || [];
    }
  } catch (error) {
    console.warn('[PDF] Could not load book assignments:', error);
  }
  
  const totalBooksCompleted = allBookAssignments.filter(b => b.status === 'completed').length;
  
  // Use provided categories or fallback to empty object
  const CATS = categories;
  const categoryKeys = Object.keys(CATS);

  // Category colors matching the design
  const categoryColors = {
    'API': '#6366f1',
    'AI': '#8b5cf6', 
    'BE': '#06b6d4',
    'BS': '#8b5cf6',
    'CLOUD': '#06b6d4',
    'CYBER': '#ef4444',
    'DA': '#f97316',
    'FE': '#10b981',
    'GD': '#f97316',
    'SOFT': '#ec4899',
    'SD': '#06b6d4'
  };

  // Find insights
  const categoryStats = Object.keys(CATS).map(key => {
    const catCerts = certifications.filter(c => c.cat === key);
    const catHours = getTH(catCerts);
    return {
      key,
      name: CATS[key].name,
      count: catCerts.length,
      hours: catHours,
      avgHours: catCerts.length > 0 ? (catHours / catCerts.length) : 0
    };
  }).filter(c => c.count > 0);

  const topCategory = categoryStats.reduce((max, cat) => cat.count > max.count ? cat : max, { count: 0, name: 'None' });
  const mostHours = categoryStats.reduce((max, cat) => cat.hours > max.hours ? cat : max, { hours: 0, name: 'None' });
  const highestAvg = categoryStats.reduce((max, cat) => cat.avgHours > max.avgHours ? cat : max, { avgHours: 0, name: 'None' });

  // Get most common provider
  const providers = {};
  certifications.forEach(c => {
    providers[c.provider] = (providers[c.provider] || 0) + 1;
  });
  const topProvider = Object.keys(providers).reduce((max, p) => providers[p] > (providers[max] || 0) ? p : max, 'None');

  const element = document.createElement('div');
  element.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; padding: 0; }
    </style>
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: #ffffff; line-height: 1.5;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff; padding: 24px 32px; position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">FinSense Africa</h1>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: #94a3b8; font-weight: 500;">Intern Certification Tracker</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">SUMMARY REPORT</h2>
            <div style="background: #10b981; color: #ffffff; padding: 6px 12px; border-radius: 16px; font-size: 11px; font-weight: 700; margin-top: 8px; display: inline-block;">
              ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      <div style="padding: 20px;">
        
        <!-- Colorful Progress Bar -->
        <div style="height: 4px; background: linear-gradient(90deg, #6366f1 0%, #10b981 25%, #f97316 50%, #ec4899 75%, #06b6d4 100%); border-radius: 2px; margin-bottom: 16px;"></div>

        <!-- Summary Stats Cards -->
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px;">
          ${[
            { val: interns.length, lbl: 'TOTAL INTERNS', color: '#a5b4fc', bg: '#eef2ff' },
            { val: totalCerts, lbl: 'TOTAL CERTIFICATIONS', color: '#86efac', bg: '#f0fdf4' },
            { val: totalHours + 'h', lbl: 'TOTAL HOURS', color: '#fed7aa', bg: '#fff7ed' },
            { val: totalBooksCompleted, lbl: 'BOOKS COMPLETED', color: '#fbb6ce', bg: '#fdf2f8' },
            { val: avgCerts, lbl: 'AVG CERTS PER INTERN', color: '#a7f3d0', bg: '#ecfdf5' }
          ].map(s => `
            <div style="background: ${s.bg}; border-radius: 8px; padding: 12px 10px; text-align: center; border: 1px solid ${s.color};">
              <div style="font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">${s.val}</div>
              <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; line-height: 1.2;">${s.lbl}</div>
            </div>
          `).join('')}
        </div>

        <!-- All Interns Table -->
        <div style="margin-bottom: 20px;">
          <div style="background: #0f172a; color: white; padding: 10px 16px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; font-size: 13px; font-weight: 700; letter-spacing: 0.5px;">■ All Interns — Certification Summary</h3>
            <span style="font-size: 10px; color: #94a3b8;">${interns.length} active interns · ${totalCerts} total certifications</span>
          </div>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            ${interns.map((i, idx) => {
              const ic = certifications.filter(c => c.intern_id === i.id);
              const internBooks = allBookAssignments.filter(b => b.intern_id === i.id);
              const completedBooks = internBooks.filter(b => b.status === 'completed').length;
              const catCnt = {};
              ic.forEach(c => catCnt[c.cat] = (catCnt[c.cat] || 0) + 1);
              const totalHours = getTH(ic);
              
              return `
                <div style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; ${idx > 0 && idx % 15 === 0 ? 'page-break-before: always;' : ''}">
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <div style="width: 22px; height: 22px; border-radius: 50%; background: #6366f1; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0;">
                      ${idx + 1}
                    </div>
                    <div style="flex: 1;">
                      <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 1px;">${i.first} ${i.last}</div>
                      <div style="font-size: 9px; color: #64748b;">${i.email}</div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <div style="text-align: center;">
                        <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${ic.length}</div>
                        <div style="font-size: 7px; color: #64748b; text-transform: uppercase;">TOTAL</div>
                      </div>
                      <div style="text-align: center;">
                        <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${totalHours}h</div>
                        <div style="font-size: 7px; color: #64748b; text-transform: uppercase;">HOURS</div>
                      </div>
                      <div style="text-align: center;">
                        <div style="font-size: 13px; font-weight: 800; color: #10b981;">${completedBooks}</div>
                        <div style="font-size: 7px; color: #64748b; text-transform: uppercase;">BOOKS</div>
                      </div>
                    </div>
                  </div>
                  <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-left: 34px;">
                    ${categoryKeys.map(k => {
                      const count = catCnt[k] || 0;
                      const color = categoryColors[k] || '#6366f1';
                      return `
                        <div style="background: ${count > 0 ? color : '#f1f5f9'}; color: ${count > 0 ? 'white' : '#94a3b8'}; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; min-width: 20px; text-align: center;">
                          ${count}
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Category Breakdown -->
        <div style="margin-bottom: 20px;">
          <div style="background: #0f172a; color: white; padding: 10px 16px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; font-size: 13px; font-weight: 700; letter-spacing: 0.5px;">■ Category Breakdown</h3>
            <span style="font-size: 10px; color: #94a3b8;">${categoryKeys.length} categories · ${totalHours} total hours</span>
          </div>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; padding: 16px;">
            ${Object.keys(CATS).map(key => {
              const catCerts = certifications.filter(c => c.cat === key);
              const catHours = getTH(catCerts);
              const avgHours = catCerts.length > 0 ? (catHours / catCerts.length).toFixed(1) : '—';
              const percentage = totalCerts > 0 ? (catCerts.length / totalCerts) * 100 : 0;
              const color = categoryColors[key] || '#6366f1';
              
              return `
                <div style="display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                  <div style="display: flex; align-items: center; gap: 8px; width: 140px; flex-shrink: 0;">
                    <div style="width: 10px; height: 10px; border-radius: 2px; background: ${color}; flex-shrink: 0;"></div>
                    <span style="font-size: 11px; font-weight: 600; color: #0f172a;">${CATS[key].name}</span>
                  </div>
                  <div style="flex: 1; margin: 0 12px; max-width: 150px;">
                    <div style="background: #f1f5f9; height: 4px; border-radius: 2px; overflow: hidden;">
                      <div style="background: ${color}; height: 100%; width: ${Math.min(percentage, 100)}%; border-radius: 2px;"></div>
                    </div>
                  </div>
                  <div style="display: flex; gap: 12px; align-items: center; width: 120px; justify-content: flex-end;">
                    <div style="background: ${color}; color: white; padding: 2px 8px; border-radius: 8px; font-size: 9px; font-weight: 700;">
                      ${catCerts.length}
                    </div>
                    <div style="font-size: 10px; font-weight: 600; color: #0f172a; width: 25px; text-align: right;">
                      ${catHours}h
                    </div>
                    <div style="font-size: 10px; color: #64748b; width: 25px; text-align: right;">
                      ${avgHours}${catCerts.length > 0 ? 'h' : ''}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Quick Insights -->
        <div style="margin-bottom: 16px;">
          <div style="background: #0f172a; color: white; padding: 10px 16px; border-radius: 8px 8px 0 0;">
            <h3 style="margin: 0; font-size: 13px; font-weight: 700; letter-spacing: 0.5px;">■ Quick Insights</h3>
          </div>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; padding: 16px;">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
              <div>
                <div style="font-size: 9px; color: #ec4899; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">TOP CATEGORY</div>
                <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 1px;">${topCategory.name}</div>
                <div style="font-size: 9px; color: #64748b;">${topCategory.count} certifications</div>
              </div>
              <div>
                <div style="font-size: 9px; color: #06b6d4; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">MOST HOURS</div>
                <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 1px;">${mostHours.name}</div>
                <div style="font-size: 9px; color: #64748b;">${mostHours.hours}h total</div>
              </div>
              <div>
                <div style="font-size: 9px; color: #f97316; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">TOP PROVIDER</div>
                <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 1px;">${topProvider}</div>
                <div style="font-size: 9px; color: #64748b;">${providers[topProvider] || 0} certifications</div>
              </div>
              <div>
                <div style="font-size: 9px; color: #10b981; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">HIGHEST AVG</div>
                <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 1px;">${highestAvg.name}</div>
                <div style="font-size: 9px; color: #64748b;">${highestAvg.avgHours.toFixed(1)}h per cert</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 10px; color: #94a3b8;">FinSense Africa · Intern Certification Tracker · Confidential</p>
        </div>

      </div>
    </div>
  `;

  const opt = {
    margin: 0,
    filename: `Summary_Report_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 1.0 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  return html2pdf().from(element).set(opt).save();
};

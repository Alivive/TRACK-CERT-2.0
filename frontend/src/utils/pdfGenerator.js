import html2pdf from 'html2pdf.js';
import { booksClient } from './booksClient';

// Helper function to create SVG pie chart
const createPieChartSVG = (data, colors, size = 200) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return '';
  
  let currentAngle = 0;
  const radius = size / 2 - 10;
  const centerX = size / 2;
  const centerY = size / 2;
  
  const paths = data.map((item, index) => {
    const percentage = item.value / total;
    const angle = percentage * 2 * Math.PI;
    
    const startX = centerX + radius * Math.cos(currentAngle - Math.PI / 2);
    const startY = centerY + radius * Math.sin(currentAngle - Math.PI / 2);
    
    currentAngle += angle;
    
    const endX = centerX + radius * Math.cos(currentAngle - Math.PI / 2);
    const endY = centerY + radius * Math.sin(currentAngle - Math.PI / 2);
    
    const largeArcFlag = angle > Math.PI ? 1 : 0;
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${startX} ${startY}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      'Z'
    ].join(' ');
    
    return `<path d="${pathData}" fill="${colors[index % colors.length]}" stroke="#ffffff" stroke-width="2"/>`;
  }).join('');
  
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display: block;">
      ${paths}
    </svg>
  `;
};

// Helper function to create SVG bar chart
const createBarChartSVG = (data, colors, width = 300, height = 200) => {
  if (!data.length) return '';
  
  const maxValue = Math.max(...data.map(item => item.value));
  const barWidth = (width - 80) / data.length; // Increased margin for longer labels
  const chartHeight = height - 100; // Increased bottom margin for multi-line text
  
  const bars = data.map((item, index) => {
    const barHeight = (item.value / maxValue) * chartHeight;
    const x = 50 + index * barWidth + barWidth * 0.1; // Increased left margin
    const y = height - 80 - barHeight; // Adjusted for new margins
    const barActualWidth = barWidth * 0.8;
    
    // More aggressive text wrapping for category names
    const maxCharsPerLine = Math.max(6, Math.floor(barWidth / 7)); // Minimum 6 chars per line
    const label = item.label;
    let lines = [];
    
    // Split by spaces first
    const words = label.split(' ');
    let currentLine = '';
    
    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Word is too long, split it
          if (word.length > maxCharsPerLine) {
            lines.push(word.substring(0, maxCharsPerLine - 1) + '-');
            currentLine = word.substring(maxCharsPerLine - 1);
          } else {
            currentLine = word;
          }
        }
      }
    });
    
    if (currentLine) lines.push(currentLine);
    
    // Limit to 3 lines max for better readability
    if (lines.length > 3) {
      lines = [lines[0], lines[1], lines[2].substring(0, maxCharsPerLine - 3) + '...'];
    }
    
    const labelY = height - 65; // Base Y position for labels
    const labelElements = lines.map((line, lineIndex) => 
      `<text x="${x + barActualWidth/2}" y="${labelY + (lineIndex * 11)}" 
             text-anchor="middle" font-size="8" fill="#64748b" font-weight="500">${line}</text>`
    ).join('');
    
    return `
      <rect x="${x}" y="${y}" width="${barActualWidth}" height="${barHeight}" 
            fill="${colors[index % colors.length]}" rx="2"/>
      ${labelElements}
      <text x="${x + barActualWidth/2}" y="${y - 5}" 
            text-anchor="middle" font-size="12" font-weight="bold" fill="#0f172a">${item.value}</text>
    `;
  }).join('');
  
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display: block;">
      ${bars}
    </svg>
  `;
};

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
  
  // Prepare data for pie chart
  const pieChartData = Object.keys(CATS)
    .map(key => ({
      label: CATS[key].name,
      value: certsByCategory[key].length
    }))
    .filter(item => item.value > 0);

  const pieColors = Object.keys(CATS)
    .filter(key => certsByCategory[key].length > 0)
    .map(key => categoryColors[key] || '#6366f1');

  // Create pie chart SVG
  const pieChartSVG = createPieChartSVG(pieChartData, pieColors, 180);

  // Prepare data for category bar chart
  const barChartData = Object.keys(CATS)
    .map(key => ({
      label: CATS[key].name, // Remove substring clamping
      value: certsByCategory[key].length
    }))
    .filter(item => item.value > 0)
    .slice(0, 6); // Limit to top 6 categories for space

  const barColors = Object.keys(CATS)
    .filter(key => certsByCategory[key].length > 0)
    .slice(0, 6)
    .map(key => categoryColors[key] || '#6366f1');

  // Create bar chart SVG
  const barChartSVG = createBarChartSVG(barChartData, barColors, 350, 220);
  
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
      <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff; padding: 16px 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">FinSense Africa</h1>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8; font-weight: 500;">Intern Certification Tracker · Confidential</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 14px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">INTERN REPORT</h2>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8; font-weight: 500;">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      <div style="padding: 20px 24px;">
        
        <!-- Profile Header -->
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: white; flex-shrink: 0;">
              ${getInitials(intern.first, intern.last)}
            </div>
            <div style="flex: 1;">
              <h3 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 700; color: #0f172a;">${intern.first} ${intern.last}</h3>
              <p style="margin: 0; font-size: 12px; color: #64748b;">${intern.email}</p>
              <p style="margin: 2px 0 0 0; font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">● INTERN</p>
            </div>
          </div>
          
          <!-- Stats Cards -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <div style="background: white; border-radius: 8px; padding: 12px; border-left: 3px solid #6366f1; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">${certifications.length}</div>
              <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">TOTAL CERTIFICATIONS</div>
            </div>
            <div style="background: white; border-radius: 8px; padding: 12px; border-left: 3px solid #10b981; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">${totalHours}h</div>
              <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">TOTAL LEARNING HOURS</div>
            </div>
            <div style="background: white; border-radius: 8px; padding: 12px; border-left: 3px solid #f97316; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">${completedBooks}</div>
              <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">BOOKS COMPLETED</div>
            </div>
          </div>
        </div>

        <!-- Visual Analytics Section -->
        ${pieChartData.length > 0 ? `
        <div style="margin-bottom: 20px; page-break-inside: avoid;">
          <div style="background: #0f172a; color: white; padding: 8px 12px; border-radius: 6px 6px 0 0;">
            <h3 style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">📊 CERTIFICATION DISTRIBUTION</h3>
          </div>
          <div style="background: #f8fafc; padding: 16px; border-radius: 0 0 6px 6px; border: 1px solid #e2e8f0; border-top: none;">
            <div style="display: flex; align-items: center; gap: 20px;">
              <div style="flex-shrink: 0;">
                <div style="display: flex; justify-content: center; align-items: center; margin: 16px 0;">
                  ${pieChartSVG}
                </div>
              </div>
              <div style="flex: 1;">
                <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 12px;">
                  ${pieChartData.map((item, index) => `
                    <div style="display: flex; align-items: center; gap: 4px; font-size: 9px; background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
                      <div style="width: 12px; height: 12px; border-radius: 2px; background: ${pieColors[index]};"></div>
                      <span style="color: #475569; font-weight: 600;">${item.label}</span>
                      <span style="color: #0f172a; font-weight: 700;">${item.value}</span>
                    </div>
                  `).join('')}
                </div>
                <div style="margin-top: 16px; padding: 12px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                  <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">TOP CATEGORY</div>
                  ${pieChartData.length > 0 ? `
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div style="width: 12px; height: 12px; border-radius: 2px; background: ${pieColors[0]};"></div>
                      <span style="font-size: 12px; font-weight: 700; color: #0f172a;">${pieChartData[0].label}</span>
                      <span style="font-size: 11px; color: #64748b;">(${pieChartData[0].value} certs)</span>
                    </div>
                  ` : '<span style="font-size: 11px; color: #94a3b8;">No certifications yet</span>'}
                </div>
              </div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Category Performance Chart -->
        ${barChartData.length > 0 ? `
        <div style="margin-bottom: 20px; page-break-inside: avoid;">
          <div style="background: #0f172a; color: white; padding: 8px 12px; border-radius: 6px 6px 0 0;">
            <h3 style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">📈 CATEGORY PERFORMANCE</h3>
          </div>
          <div style="background: #f8fafc; padding: 16px; border-radius: 0 0 6px 6px; border: 1px solid #e2e8f0; border-top: none;">
            <div style="display: flex; justify-content: center; align-items: center; margin: 16px 0;">
              ${barChartSVG}
            </div>
            <div style="margin-top: 12px; text-align: center;">
              <div style="font-size: 10px; color: #64748b;">Certifications by category (showing top ${barChartData.length} categories)</div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Reading Progress -->
        ${bookAssignments.length > 0 ? `
        <div style="margin-bottom: 20px; page-break-inside: avoid;">
          <div style="background: #0f172a; color: white; padding: 8px 12px; border-radius: 6px 6px 0 0;">
            <h3 style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">■ Reading Progress</h3>
          </div>
          <div style="background: #f8fafc; padding: 12px; border-radius: 0 0 6px 6px; border: 1px solid #e2e8f0; border-top: none;">
            ${bookAssignments.slice(0, 5).map(book => {
              const statusColor = book.status === 'completed' ? '#10b981' : book.status === 'in-progress' ? '#f97316' : '#6366f1';
              const statusBg = book.status === 'completed' ? '#d1fae5' : book.status === 'in-progress' ? '#fed7aa' : '#e0e7ff';
              return `
              <div style="background: white; padding: 8px; margin-bottom: 6px; border-radius: 4px; border-left: 3px solid ${statusColor}; display: flex; align-items: center; justify-content: space-between;">
                <div style="flex: 1;">
                  <div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">■ ${book.book_title}</div>
                  <div style="font-size: 9px; color: #64748b;">${book.book_author}</div>
                </div>
                <div style="background: ${statusBg}; color: ${statusColor}; padding: 3px 8px; border-radius: 4px; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">
                  ${book.status.replace('-', ' ')}
                </div>
              </div>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Certification Overview -->
        <div style="margin-bottom: 20px; page-break-inside: avoid;">
          <div style="background: #0f172a; color: white; padding: 8px 12px; border-radius: 6px 6px 0 0;">
            <h3 style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">■ Certification Overview by Category</h3>
          </div>
          <div style="background: #f8fafc; padding: 12px; border-radius: 0 0 6px 6px; border: 1px solid #e2e8f0; border-top: none;">
            <div style="display: flex; gap: 16px; align-items: center;">
              <div style="flex: 1;">
                ${Object.keys(CATS).map(key => {
                  const count = certsByCategory[key].length;
                  return `
                  <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div style="width: 8px; height: 8px; border-radius: 2px; background: ${categoryColors[key] || '#6366f1'}; flex-shrink: 0;"></div>
                      <span style="font-size: 11px; color: #475569; font-weight: 500;">${CATS[key].name}</span>
                    </div>
                    <span style="font-size: 12px; font-weight: 700; color: #0f172a;">${count}</span>
                  </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Full Certification List -->
        <div style="margin-bottom: 20px;">
          <div style="background: #0f172a; color: white; padding: 8px 12px; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">■ Full Certification List</h3>
            <span style="font-size: 10px; color: #94a3b8;">${certifications.length} total certifications</span>
          </div>
          <div style="background: white; border-radius: 0 0 6px 6px; border: 1px solid #e2e8f0; border-top: none;">
            ${Object.keys(CATS).filter(key => certsByCategory[key].length > 0).map(key => {
              const catCerts = certsByCategory[key];
              const catHours = getTH(catCerts);
              return `
              <div style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; page-break-inside: avoid;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: ${categoryColors[key] || '#6366f1'};"></div>
                    <h4 style="margin: 0; font-size: 12px; font-weight: 700; color: #0f172a;">${CATS[key].name}</h4>
                  </div>
                  <div style="background: ${categoryColors[key] || '#6366f1'}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 9px; font-weight: 700;">
                    ${catCerts.length} certs · ${catHours}h
                  </div>
                </div>
                <div style="margin-left: 16px;">
                  ${catCerts.map(c => {
                    // Show "View Certificate" if user provided any URL or uploaded file
                    const isUserProvidedUrl = c.certificate_file_url;
                    
                    return `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid #f1f5f9; page-break-inside: avoid;">
                      <div style="flex: 1;">
                        <div style="font-size: 11px; font-weight: 600; color: #1e293b; margin-bottom: 1px;">${c.name}</div>
                        <div style="font-size: 10px; color: #6366f1; font-weight: 500; margin-bottom: 2px;">${c.provider}</div>
                        ${isUserProvidedUrl ? `
                          <div style="font-size: 8px;">
                            <span style="color: #64748b;">📎 </span>
                            <a href="${c.certificate_file_url}" style="color: #059669; text-decoration: none; font-weight: 600;">View Certificate</a>
                          </div>
                        ` : ''}
                      </div>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="background: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; color: #0f172a;">${c.hours}h</div>
                        <div style="font-size: 9px; color: #64748b; min-width: 70px; text-align: right;">${c.date}</div>
                      </div>
                    </div>
                  `;
                  }).join('')}
                </div>
              </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 12px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 9px; color: #94a3b8;">FinSense Africa · Intern Certification Tracker · Confidential</p>
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
  console.log('[PDF] === SUMMARY REPORT GENERATION STARTED === v2');
  console.log('[PDF] Total interns:', interns.length);
  console.log('[PDF] Total certifications:', certifications.length);
  
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

  // DEBUG: Log ALL interns and their cert counts - MOVED HERE AFTER CATS IS DEFINED
  console.log('[PDF DEBUG] CATS object keys:', Object.keys(CATS));
  console.log('[PDF DEBUG] CATS object:', CATS);
  console.log('[PDF DEBUG] Sample certification categories:', certifications.slice(0, 5).map(c => ({ name: c.name, cat: c.cat, category: c.category })));
  
  interns.forEach(intern => {
    const internCerts = certifications.filter(c => c.intern_id === intern.id);
    console.log(`[PDF] ${intern.first_name} ${intern.last_name}: ${internCerts.length} certs`);
    if (intern.first_name?.toLowerCase().includes('suleimani') || intern.last_name?.toLowerCase().includes('mwambeni')) {
      console.log('[PDF DEBUG] *** FOUND SULEIMANI ***');
      console.log('[PDF DEBUG] Suleimani ID:', intern.id);
      console.log('[PDF DEBUG] Suleimani certs:', internCerts.length);
      if (internCerts.length > 0) {
        console.log('[PDF DEBUG] First cert:', internCerts[0]);
        console.log('[PDF DEBUG] First cert intern_id:', internCerts[0].intern_id);
        console.log('[PDF DEBUG] All categories:', internCerts.map(c => c.cat || c.category));
        
        // Test the category counting logic
        const categoryCount = {};
        internCerts.forEach(cert => {
          const cat = cert.cat || cert.category;
          console.log('[PDF DEBUG] Processing cert with cat:', cat, 'CATS has it?', !!CATS[cat]);
          if (cat) {
            categoryCount[cat] = (categoryCount[cat] || 0) + 1;
          }
        });
        console.log('[PDF DEBUG] Category count result:', categoryCount);
      }
    }
  });

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
      avgHours: catCerts.length > 0 ? (catHours / catCerts.length) : 0,
      percentage: totalCerts > 0 ? ((catCerts.length / totalCerts) * 100).toFixed(1) : 0
    };
  }).filter(c => c.count > 0).sort((a, b) => b.count - a.count);

  const topCategory = categoryStats.reduce((max, cat) => cat.count > max.count ? cat : max, { count: 0, name: 'None' });
  const mostHours = categoryStats.reduce((max, cat) => cat.hours > max.hours ? cat : max, { hours: 0, name: 'None' });

  // Get most common provider
  const providers = {};
  certifications.forEach(c => {
    providers[c.provider] = (providers[c.provider] || 0) + 1;
  });
  const topProvider = Object.keys(providers).reduce((max, p) => providers[p] > (providers[max] || 0) ? p : max, 'None');

  // Prepare data for overall pie chart with enhanced statistics
  const overallPieData = categoryStats.map(stat => ({
    label: stat.name,
    value: stat.count,
    hours: stat.hours,
    percentage: stat.percentage
  }));

  const overallPieColors = categoryStats.map(stat => categoryColors[stat.key] || '#6366f1');

  // Create compact horizontal bar chart for category distribution - FIXED HEIGHT
  const createEnhancedPieChartSVG = (data, colors) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return '';
    
    // Sort data by value descending
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    
    const width = 480;
    const leftMargin = 120;
    const rightMargin = 60;
    const topMargin = 35;
    const barHeight = 22;
    const barSpacing = 8;
    const bottomMargin = 10;
    
    // FIXED HEIGHT to fit in page
    const height = 380;
    const chartWidth = width - leftMargin - rightMargin;
    
    // Find max value for scaling
    const maxValue = Math.max(...sortedData.map(item => item.value));
    
    const bars = [];
    
    sortedData.forEach((item, index) => {
      const percentage = (item.value / total * 100).toFixed(1);
      const barWidth = (item.value / maxValue) * chartWidth;
      const y = topMargin + (index * (barHeight + barSpacing));
      const color = colors[data.indexOf(item) % colors.length];
      
      // Category label on left
      bars.push(`
        <text x="${leftMargin - 8}" y="${y + barHeight / 2 + 4}" text-anchor="end" font-size="10" font-weight="600" fill="#1e293b">
          ${item.label}
        </text>
      `);
      
      // Bar
      bars.push(`
        <rect x="${leftMargin}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="2"/>
      `);
      
      // Value and percentage inside or next to bar
      const textX = barWidth > 45 ? leftMargin + barWidth - 6 : leftMargin + barWidth + 6;
      const textAnchor = barWidth > 45 ? 'end' : 'start';
      const textColor = barWidth > 45 ? '#ffffff' : '#0f172a';
      
      bars.push(`
        <text x="${textX}" y="${y + barHeight / 2 + 4}" text-anchor="${textAnchor}" font-size="9" font-weight="700" fill="${textColor}">
          ${item.value} (${percentage}%)
        </text>
      `);
    });
    
    // Title
    const title = `
      <text x="${width / 2}" y="20" text-anchor="middle" font-size="12" font-weight="700" fill="#0f172a">
        Total: ${total} Certifications
      </text>
    `;
    
    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        ${title}
        ${bars.join('')}
      </svg>
    `;
  };

  const enhancedPieChartSVG = createEnhancedPieChartSVG(overallPieData, overallPieColors);

  const element = document.createElement('div');
  element.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; padding: 0; }
    </style>
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: #ffffff; line-height: 1.4; width: 100%; height: 100vh;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff; padding: 16px 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">FinSense Africa</h1>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #94a3b8; font-weight: 500;">Intern Certification Tracker · Admin Summary</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 14px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">EXECUTIVE SUMMARY</h2>
            <div style="background: #10b981; color: #ffffff; padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; margin-top: 6px; display: inline-block;">
              ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content - Single Landscape Layout -->
      <div style="padding: 10px 20px; display: flex; flex-direction: column;">
        
        <!-- Top Stats Bar -->
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 10px;">
          ${[
            { val: interns.length, lbl: 'ACTIVE INTERNS', color: '#6366f1', bg: '#eef2ff' },
            { val: totalCerts, lbl: 'TOTAL CERTIFICATIONS', color: '#10b981', bg: '#f0fdf4' },
            { val: totalHours + 'h', lbl: 'LEARNING HOURS', color: '#f97316', bg: '#fff7ed' },
            { val: avgCerts, lbl: 'AVG PER INTERN', color: '#06b6d4', bg: '#ecfeff' },
            { val: categoryStats.length, lbl: 'ACTIVE CATEGORIES', color: '#8b5cf6', bg: '#f3e8ff' }
          ].map(s => `
            <div style="background: ${s.bg}; border-radius: 6px; padding: 6px; text-align: center; border: 2px solid ${s.color};">
              <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">${s.val}</div>
              <div style="font-size: 8px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; line-height: 1.1;">${s.lbl}</div>
            </div>
          `).join('')}
        </div>

        <!-- Main Analytics Section - Bar Chart and Interns Side by Side -->
        <div style="display: grid; grid-template-columns: 45% 55%; gap: 10px; margin-bottom: 10px;">
          
          <!-- Left: Bar Chart -->
          <div style="background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; height: 380px; overflow: hidden;">
            <div style="background: #0f172a; color: white; padding: 6px 10px; border-radius: 8px 8px 0 0;">
              <h3 style="margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">📊 CERTIFICATION DISTRIBUTION</h3>
            </div>
            <div style="padding: 8px; flex: 1; overflow: hidden; display: flex; align-items: flex-start; justify-content: center;">
              ${enhancedPieChartSVG}
            </div>
          </div>

          <!-- Right: All Interns with Scroll -->
          <div style="background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; height: 380px; overflow: visible;">
            <div style="background: #0f172a; color: white; padding: 6px 10px; border-radius: 8px 8px 0 0;">
              <h3 style="margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">🏆 TOP INTERNS</h3>
            </div>
            <div style="padding: 4px; flex: 1; display: flex; flex-direction: column; gap: 3px; overflow: visible;">
              ${interns
                .map(intern => {
                  const internCerts = certifications.filter(c => c.intern_id === intern.id);
                  const internHours = getTH(internCerts);
                  
                  // Count certifications by category for this intern - COMPLETELY ROBUST
                  const categoryCount = {};
                  internCerts.forEach(cert => {
                    const cat = cert.cat || cert.category;
                    if (cat) {
                      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
                    }
                  });
                  
                  // Find the top category - GUARANTEED to find one if certs exist
                  let topCategoryKey = null;
                  let topCategoryCount = 0;
                  Object.keys(categoryCount).forEach(key => {
                    if (categoryCount[key] > topCategoryCount) {
                      topCategoryKey = key;
                      topCategoryCount = categoryCount[key];
                    }
                  });
                  
                  // Build the data object with GUARANTEED non-empty values
                  let topCategory = 'Various';
                  let topCount = 0;
                  let topPercentage = '0.0';
                  let topColor = '#94a3b8';
                  
                  if (internCerts.length > 0) {
                    if (topCategoryKey && topCategoryCount > 0) {
                      // We found a valid top category
                      topCategory = CATS[topCategoryKey] ? CATS[topCategoryKey].name : topCategoryKey;
                      topCount = topCategoryCount;
                      topPercentage = ((topCategoryCount / internCerts.length) * 100).toFixed(1);
                      topColor = categoryColors[topCategoryKey] || '#6366f1';
                    } else {
                      // Fallback: use first cert's category
                      const firstCat = internCerts[0].cat || internCerts[0].category;
                      topCategory = CATS[firstCat] ? CATS[firstCat].name : (firstCat || 'Various');
                      topCount = internCerts.length;
                      topPercentage = '100.0';
                      topColor = categoryColors[firstCat] || '#6366f1';
                    }
                  }
                  
                  return {
                    intern,
                    certCount: internCerts.length,
                    hours: internHours,
                    topCategory: topCategory,
                    topCategoryCount: topCount,
                    topCategoryPercentage: topPercentage,
                    topCategoryColor: topColor,
                    showTopLine: internCerts.length > 0
                  };
                })
                .sort((a, b) => {
                  // Primary sort: by cert count (descending)
                  if (b.certCount !== a.certCount) {
                    return b.certCount - a.certCount;
                  }
                  // First tiebreaker: alphabetically by first name (A-Z)
                  const nameCompare = a.intern.first_name.localeCompare(b.intern.first_name);
                  if (nameCompare !== 0) {
                    return nameCompare;
                  }
                  // Second tiebreaker: by total hours (descending)
                  return b.hours - a.hours;
                })
                .map((data, index) => {
                  // DEBUG: Log ALL interns' data to see what's happening
                  console.log(`[PDF DEBUG] Intern #${index + 1}: ${data.intern.first_name} ${data.intern.last_name}`, {
                    certCount: data.certCount,
                    topCategory: data.topCategory,
                    topCategoryCount: data.topCategoryCount,
                    topCategoryPercentage: data.topCategoryPercentage,
                    topCategoryColor: data.topCategoryColor,
                    showTopLine: data.showTopLine
                  });
                  
                  // SPECIAL: Log Suleimani's complete data object
                  if (data.intern.first_name?.toLowerCase().includes('suleimani') || data.intern.last_name?.toLowerCase().includes('mwambeni')) {
                    console.log('[PDF DEBUG] !!!!! SULEIMANI COMPLETE DATA OBJECT:', JSON.stringify(data, null, 2));
                  }
                  
                  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                  
                  const htmlOutput = `
                    <div style="background: white; padding: 4px 5px; border-radius: 4px; border: 1px solid #e2e8f0; flex-shrink: 0;">
                      <div style="display: flex; align-items: center; gap: 5px;">
                        <div style="font-size: 10px; font-weight: 700; min-width: 20px;">${medal}</div>
                        <div style="flex: 1; min-width: 0;">
                          <div style="font-size: 9px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.intern.first_name} ${data.intern.last_name}</div>
                          <div style="font-size: 7px; color: #64748b;">${data.certCount} certs • ${data.hours}h</div>
                        </div>
                        <div style="background: #eef2ff; color: #6366f1; padding: 2px 5px; border-radius: 4px; font-size: 8px; font-weight: 700;">
                          ${data.certCount}
                        </div>
                      </div>
                      <div style="display: flex; align-items: flex-start; gap: 3px; padding-left: 25px; margin-top: 1px; padding-top: 1px; border-top: 1px solid #f1f5f9; max-height: 20px; overflow: hidden;">
                        <div style="font-size: 6px; color: #94a3b8; text-transform: uppercase; font-weight: 600; flex-shrink: 0;">TOP:</div>
                        <div style="width: 5px; height: 5px; border-radius: 1px; background: ${data.topCategoryColor || '#6366f1'}; flex-shrink: 0; margin-top: 2px;"></div>
                        <div style="font-size: 6.5px; color: #64748b; line-height: 1.3; flex: 1; min-width: 0;">
                          <strong style="color: #0f172a;">${data.topCategory || 'Various'}</strong>: ${data.topCategoryCount || 0} (${data.topCategoryPercentage || '0.0'}%)
                        </div>
                      </div>
                    </div>
                  `;
                  
                  // DEBUG: Log Suleimani's generated HTML
                  if (data.intern.first_name?.toLowerCase().includes('suleimani') || data.intern.last_name?.toLowerCase().includes('mwambeni')) {
                    console.log('[PDF DEBUG] !!!!! SULEIMANI GENERATED HTML:', htmlOutput);
                  }
                  
                  return htmlOutput;
                }).join('')}
            </div>
          </div>
        </div>

        <!-- Quick Insights - Below Main Content -->
        <div style="background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; padding: 8px; margin-bottom: 10px;">
          <div style="background: #0f172a; color: white; padding: 5px 8px; border-radius: 4px; margin-bottom: 6px;">
            <h3 style="margin: 0; font-size: 10px; font-weight: 700; letter-spacing: 0.5px;">📊 QUICK INSIGHTS</h3>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
            <div style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <div style="font-size: 8px; color: #ec4899; font-weight: 700; text-transform: uppercase; margin-bottom: 3px;">TOP CATEGORY</div>
              <div style="font-size: 11px; font-weight: 700; color: #0f172a; line-height: 1.2;">${topCategory.name}</div>
              <div style="font-size: 8px; color: #64748b;">${topCategory.count} certs</div>
            </div>
            <div style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <div style="font-size: 8px; color: #06b6d4; font-weight: 700; text-transform: uppercase; margin-bottom: 3px;">MOST HOURS</div>
              <div style="font-size: 11px; font-weight: 700; color: #0f172a; line-height: 1.2;">${mostHours.name}</div>
              <div style="font-size: 8px; color: #64748b;">${mostHours.hours}h total</div>
            </div>
            <div style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <div style="font-size: 8px; color: #f97316; font-weight: 700; text-transform: uppercase; margin-bottom: 3px;">TOP PROVIDER</div>
              <div style="font-size: 11px; font-weight: 700; color: #0f172a; line-height: 1.2;">${topProvider}</div>
              <div style="font-size: 8px; color: #64748b;">${providers[topProvider] || 0} certs</div>
            </div>
            <div style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <div style="font-size: 8px; color: #10b981; font-weight: 700; text-transform: uppercase; margin-bottom: 3px;">HIGHEST AVG</div>
              <div style="font-size: 11px; font-weight: 700; color: #0f172a; line-height: 1.2;">${categoryStats.reduce((max, cat) => cat.avgHours > max.avgHours ? cat : max, { name: 'None', avgHours: 0 }).name}</div>
              <div style="font-size: 8px; color: #64748b;">${categoryStats.reduce((max, cat) => cat.avgHours > max.avgHours ? cat : max, { avgHours: 0 }).avgHours.toFixed(1)}h/cert</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 6px; border-top: 1px solid #e2e8f0; margin-top: 6px;">
          <p style="margin: 0; font-size: 8px; color: #94a3b8;">FinSense Africa · Intern Certification Tracker · Executive Summary · Confidential</p>
        </div>

      </div>
    </div>
  `;

  const opt = {
    margin: 0,
    filename: `Executive_Summary_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 1.0 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
  };

  return html2pdf().from(element).set(opt).save();
};

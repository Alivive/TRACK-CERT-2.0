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

  // Prepare data for overall pie chart
  const overallPieData = Object.keys(CATS)
    .map(key => ({
      label: CATS[key].name,
      value: certifications.filter(c => c.cat === key).length
    }))
    .filter(item => item.value > 0);

  const overallPieColors = Object.keys(CATS)
    .filter(key => certifications.filter(c => c.cat === key).length > 0)
    .map(key => categoryColors[key] || '#6366f1');

  // Create overall pie chart SVG
  const overallPieChartSVG = createPieChartSVG(overallPieData, overallPieColors, 200);

  // Prepare top performers data for bar chart
  const topPerformersData = interns
    .map(intern => ({
      label: `${intern.first} ${intern.last}`, // Remove substring clamping
      value: certifications.filter(c => c.intern_id === intern.id).length
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 performers

  const performerColors = topPerformersData.map((_, index) => 
    index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#6366f1'
  );

  // Create top performers bar chart SVG
  const topPerformersChartSVG = createBarChartSVG(topPerformersData, performerColors, 420, 220);

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

        <!-- Visual Analytics Section -->
        ${overallPieData.length > 0 ? `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
          <!-- Overall Distribution Pie Chart -->
          <div style="page-break-inside: avoid;">
            <div style="background: #0f172a; color: white; padding: 8px 12px; border-radius: 6px 6px 0 0;">
              <h3 style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">📊 OVERALL DISTRIBUTION</h3>
            </div>
            <div style="background: #f8fafc; padding: 16px; border-radius: 0 0 6px 6px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
              <div style="display: flex; justify-content: center; align-items: center; margin: 16px 0;">
                ${overallPieChartSVG}
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 12px;">
                ${overallPieData.map((item, index) => `
                  <div style="display: flex; align-items: center; gap: 4px; font-size: 8px; background: white; padding: 3px 6px; border-radius: 3px; border: 1px solid #e2e8f0;">
                    <div style="width: 10px; height: 10px; border-radius: 2px; background: ${overallPieColors[index]};"></div>
                    <span style="color: #475569; font-weight: 600;">${item.label}</span>
                    <span style="color: #0f172a; font-weight: 700;">${item.value}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Top Performers Bar Chart -->
          ${topPerformersData.length > 0 ? `
          <div style="page-break-inside: avoid;">
            <div style="background: #0f172a; color: white; padding: 8px 12px; border-radius: 6px 6px 0 0;">
              <h3 style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">🏆 TOP PERFORMERS</h3>
            </div>
            <div style="background: #f8fafc; padding: 16px; border-radius: 0 0 6px 6px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
              <div style="display: flex; justify-content: center; align-items: center; margin: 16px 0;">
                ${topPerformersChartSVG}
              </div>
              <div style="margin-top: 12px; text-align: center;">
                <div style="font-size: 10px; color: #64748b;">Top ${topPerformersData.length} performers by certification count</div>
              </div>
            </div>
          </div>
          ` : ''}
        </div>
        ` : ''}

        <!-- All Interns Table -->
        <div style="margin-bottom: 20px; page-break-inside: avoid;">
          <div style="background: #0f172a; color: white; padding: 10px 16px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; font-size: 13px; font-weight: 700; letter-spacing: 0.5px;">■ All Interns — Certification Summary</h3>
            <span style="font-size: 10px; color: #94a3b8;">${interns.length} active interns · ${totalCerts} total certifications</span>
          </div>
          
          <!-- Category Legend -->
          <div style="background: #f8fafc; padding: 12px 16px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; page-break-inside: avoid;">
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">📊 CATEGORY REFERENCE (Left to Right Order):</div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 6px;">
              ${categoryKeys.map((k, index) => {
                const color = categoryColors[k] || '#6366f1';
                return `
                  <div style="display: flex; align-items: center; gap: 6px; background: white; padding: 6px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
                    <div style="width: 14px; height: 14px; background: ${color}; border-radius: 2px; flex-shrink: 0;"></div>
                    <div style="font-size: 9px; color: #0f172a; font-weight: 600; line-height: 1.2;">${CATS[k].name}</div>
                  </div>
                `;
              }).join('')}
            </div>
            <div style="margin-top: 8px; font-size: 8px; color: #64748b; font-style: italic;">
              💡 Tip: Each intern's colored boxes follow this exact order from left to right
            </div>
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
                <div style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; page-break-inside: avoid; min-height: 60px;">
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
                  <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-left: 34px; margin-bottom: 16px;">
                    ${categoryKeys.map(k => {
                      const count = catCnt[k] || 0;
                      const color = categoryColors[k] || '#6366f1';
                      const categoryName = CATS[k]?.name || k;
                      const abbreviation = categoryName.length > 8 ? 
                        categoryName.split(' ').map(word => word[0]).join('').substring(0, 3).toUpperCase() :
                        categoryName.substring(0, 3).toUpperCase();
                      
                      return `
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                          <div style="background: ${count > 0 ? color : '#f1f5f9'}; color: ${count > 0 ? 'white' : '#94a3b8'}; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; min-width: 20px; text-align: center;">
                            ${count}
                          </div>
                          <div style="font-size: 6px; color: #64748b; font-weight: 600; text-align: center;">
                            ${abbreviation}
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
                    <div style="background: #f1f5f9; height: 6px; border-radius: 3px; overflow: hidden;">
                      <div style="background: ${color}; height: 100%; width: ${Math.min(percentage, 100)}%; border-radius: 3px;"></div>
                    </div>
                    <div style="font-size: 8px; color: #64748b; margin-top: 2px; text-align: center;">${percentage.toFixed(1)}%</div>
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

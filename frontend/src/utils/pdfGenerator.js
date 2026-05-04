import html2pdf from 'html2pdf.js';

export const generateInternReport = (intern, certifications, categories = {}) => {
  const getTH = (cl) => cl.reduce((s, c) => s + (c.hours || 0), 0);
  
  // Use provided categories or fallback to empty object
  const CATS = categories;
  
  const element = document.createElement('div');
  element.innerHTML = `
    <div style="font-family: 'Inter', sans-serif; color: #1a1a1a; background: #ffffff;">
      <!-- Header -->
      <div style="background: #1a1a1a; color: #ffffff; padding: 30px 40px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">FinSense Africa</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #888; font-weight: 400;">Intern Certification Tracker</p>
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 600;">Intern Report</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #888;">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div style="padding: 40px;">
        <!-- Profile Card -->
        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
          <div>
            <h3 style="margin: 0; font-size: 24px; font-weight: 700;">${intern.first} ${intern.last}</h3>
            <p style="margin: 10px 0 5px 0; font-size: 14px; color: #555;">Email: ${intern.email}</p>
            <p style="margin: 0; font-size: 14px; color: #555;">Role: intern</p>
          </div>
          <div style="display: flex; gap: 40px; text-align: center;">
            <div>
              <div style="font-size: 24px; font-weight: 700;">${certifications.length}</div>
              <div style="font-size: 12px; color: #888; text-transform: uppercase; margin-top: 5px;">Total Certs</div>
            </div>
            <div>
              <div style="font-size: 24px; font-weight: 700;">${getTH(certifications)}h</div>
              <div style="font-size: 12px; color: #888; text-transform: uppercase; margin-top: 5px;">Total Hours</div>
            </div>
          </div>
        </div>

        <!-- Categories -->
        ${Object.keys(CATS).map(key => {
          const catCerts = certifications.filter(c => c.cat === key);
          const catHours = getTH(catCerts);
          return `
            <div style="margin-bottom: 25px; border-bottom: 1px solid #eee; padding-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="margin: 0; font-size: 18px; font-weight: 700;">${CATS[key].name}</h4>
                <div style="font-size: 13px; color: #888;">${catCerts.length} certs • ${catHours}h</div>
              </div>
              ${catCerts.length > 0 ? `
                <div style="margin-top: 10px;">
                  ${catCerts.map(c => `
                    <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px;">
                      <span>${c.name} (${c.provider}) — <b>${c.hours}h</b></span>
                      <span style="color: #888;">${c.date}</span>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <p style="margin: 0; font-size: 13px; color: #aaa; font-style: italic;">No certifications in this category yet.</p>
              `}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  const opt = {
    margin: 0,
    filename: `Report_${intern.first}_${intern.last}.pdf`,
    image: { type: 'jpeg', quality: 1.0 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  return html2pdf().from(element).set(opt).save();
};

export const generateSummaryReport = (interns, certifications, categories = {}) => {
  const getTH = (cl) => cl.reduce((s, c) => s + (c.hours || 0), 0);
  const totalCerts = certifications.length;
  const totalHours = getTH(certifications);
  const avgCerts = (totalCerts / Math.max(interns.length, 1)).toFixed(1);
  const avgHours = (totalHours / Math.max(interns.length, 1)).toFixed(1);
  
  // Use provided categories or fallback to empty object
  const CATS = categories;
  const categoryKeys = Object.keys(CATS);

  const element = document.createElement('div');
  element.innerHTML = `
    <div style="font-family: 'Inter', sans-serif !important; color: #000000 !important; background: #ffffff !important;">
      <!-- Header -->
      <div style="background: #1a1a1a !important; color: #ffffff !important; padding: 30px 40px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; color: #ffffff !important;">FinSense Africa</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #aaaaaa !important; font-weight: 400;">Intern Certification Tracker</p>
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #ffffff !important;">Summary Report</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #aaaaaa !important;">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div style="padding: 40px; background: #ffffff !important;">
        <!-- Summary Stats Grid -->
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 40px;">
          ${[
            { val: interns.length, lbl: 'Total Interns' },
            { val: totalCerts, lbl: 'Total Certifications' },
            { val: totalHours + 'h', lbl: 'Total Hours' },
            { val: avgCerts, lbl: 'Avg Certs / Intern' },
            { val: avgHours + 'h', lbl: 'Avg Hours / Intern' }
          ].map(s => `
            <div style="background: #f0f2f5 !important; border-radius: 8px; padding: 20px 10px; text-align: center;">
              <div style="font-size: 20px; font-weight: 700; margin-bottom: 5px; color: #000000 !important;">${s.val}</div>
              <div style="font-size: 10px; color: #666666 !important; text-transform: uppercase;">${s.lbl}</div>
            </div>
          `).join('')}
        </div>

        <!-- All Interns Table -->
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 15px; color: #000000 !important;">All Interns — Certification Summary</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 11px; background: #ffffff !important;">
          <thead>
            <tr style="background: #1a1a1a !important; color: #ffffff !important;">
              <th style="padding: 10px; border: 1px solid #333; color: #ffffff !important;">#</th>
              <th style="padding: 10px; border: 1px solid #333; text-align: left; color: #ffffff !important;">Name</th>
              <th style="padding: 10px; border: 1px solid #333; text-align: left; color: #ffffff !important;">Email</th>
              <th style="padding: 10px; border: 1px solid #333; color: #ffffff !important;">Role</th>
              ${categoryKeys.map(k => `<th style="padding: 10px; border: 1px solid #333; color: #ffffff !important;">${k}</th>`).join('')}
              <th style="padding: 10px; border: 1px solid #333; color: #ffffff !important;">Total</th>
              <th style="padding: 10px; border: 1px solid #333; color: #ffffff !important;">Hours</th>
            </tr>
          </thead>
          <tbody>
            ${interns.map((i, idx) => {
              const ic = certifications.filter(c => c.intern_id === i.id);
              const catCnt = {};
              ic.forEach(c => catCnt[c.cat] = (catCnt[c.cat] || 0) + 1);
              return `
                <tr style="background: #ffffff !important;">
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #000000 !important;">${idx + 1}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; color: #000000 !important;">${i.first} ${i.last}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; color: #000000 !important;">${i.email}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #000000 !important;">intern</td>
                  ${categoryKeys.map(k => `<td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #000000 !important;">${catCnt[k] || 0}</td>`).join('')}
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: 700; color: #000000 !important;">${ic.length}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: 700; color: #000000 !important;">${getTH(ic)}h</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- Category Breakdown -->
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 15px; color: #000000 !important;">Category Breakdown</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; background: #ffffff !important;">
          <thead>
            <tr style="background: #1a1a1a !important; color: #ffffff !important;">
              <th style="padding: 12px; border: 1px solid #333; text-align: left; color: #ffffff !important;">Category</th>
              <th style="padding: 12px; border: 1px solid #333; text-align: center; color: #ffffff !important;">Certifications</th>
              <th style="padding: 12px; border: 1px solid #333; text-align: center; color: #ffffff !important;">Total Hours</th>
              <th style="padding: 12px; border: 1px solid #333; text-align: center; color: #ffffff !important;">Avg Hours / Cert</th>
            </tr>
          </thead>
          <tbody>
            ${Object.keys(CATS).map(key => {
              const catCerts = certifications.filter(c => c.cat === key);
              const catHours = getTH(catCerts);
              const avgHours = catCerts.length > 0 ? (catHours / catCerts.length).toFixed(1) : '—';
              return `
                <tr style="background: #ffffff !important;">
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600; color: #000000 !important;">${CATS[key].name}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #000000 !important;">${catCerts.length}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #000000 !important;">${catHours}h</td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #000000 !important;">${avgHours}${catCerts.length > 0 ? 'h' : ''}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const opt = {
    margin: 0,
    filename: `Summary_Report_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 1.0 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  return html2pdf().from(element).set(opt).save();
};

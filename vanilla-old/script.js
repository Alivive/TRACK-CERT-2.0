
const CATS={
  AI:{name:'Artificial Intelligence',fillClass:'',icon:'◈'},
  FE:{name:'Front End Web Dev',fillClass:'teal',icon:'⧈'},
  BE:{name:'Back End Web Dev',fillClass:'blue',icon:'⊞'},
  API:{name:'API Functionalities',fillClass:'amber',icon:'⇌'},
  CYBER:{name:'Cybersecurity',fillClass:'purple',icon:'⊘'},
  CLOUD:{name:'Cloud Computing',fillClass:'green',icon:'◯'},
  SOFT:{name:'Soft Skills',fillClass:'orange',icon:'◎'},
};
const CAT_BADGE={AI:'badge-red',FE:'badge-teal',BE:'badge-blue',API:'badge-amber',CYBER:'badge-purple',CLOUD:'badge-green',SOFT:'badge-orange'};

let ADMIN_PASS = 'ADMIN2026';
let INTERN_CODE = 'INTERNS2026';

let currentUser = null;

let interns = [
];

let certs = [
];

let nextCertId=1, nextInternId=1;
let currentInternDetail=null, editingCertId=null, importBuffer=[], agentHistory=[];

const getName=i=>i.first+' '+i.last;
const getInit=i=>(i.first[0]+i.last[0]).toUpperCase();
const getIC=id=>certs.filter(c=>c.internId===id);
const getTH=cl=>cl.reduce((s,c)=>s+(c.hours||0),0);

let selectedRole='admin';

function selectRole(r){
  selectedRole=r;
  document.getElementById('roleAdmin').classList.toggle('selected',r==='admin');
  document.getElementById('roleIntern').classList.toggle('selected',r==='intern');
  document.getElementById('adminFields').style.display=r==='admin'?'block':'none';
  document.getElementById('internFields').style.display=r==='intern'?'block':'none';
  if(r==='intern') populateInternSelect();
}

function populateInternSelect(){
  const sel=document.getElementById('internSelect');
  sel.innerHTML=interns.map(i=>`<option value="${i.id}">${getName(i)}</option>`).join('');
}

function doLogin(){
  const err=document.getElementById('authErr');
  err.style.display='none';
  if(selectedRole==='admin'){
    const u=document.getElementById('authUser').value.trim();
    const p=document.getElementById('authPass').value;
    if(u==='admin'&&p===ADMIN_PASS){
      currentUser={role:'admin',name:'Administrator',initials:'AD'};
      launchApp();
    } else {
      err.textContent='Invalid username or password.';
      err.style.display='block';
    }
  } else {
    const id=parseInt(document.getElementById('internSelect').value);
    const code=document.getElementById('internCode').value;
    if(code===INTERN_CODE&&id){
      const intern=interns.find(i=>i.id===id);
      currentUser={role:'intern',internId:id,name:getName(intern),initials:getInit(intern)};
      launchApp();
    } else {
      err.textContent='Invalid access code. Ask your administrator.';
      err.style.display='block';
    }
  }
}

function launchApp(){
  document.getElementById('authScreen').style.display='none';
  document.getElementById('appScreen').style.display='block';
  document.getElementById('sideUserAvatar').textContent=currentUser.initials;
  document.getElementById('sideUserName').textContent=currentUser.name;
  document.getElementById('sideUserRole').textContent=currentUser.role.toUpperCase();
  buildNav();
  refreshInternSelects();
  renderDashboard();
  if(currentUser.role==='intern'){
    showPage('my_profile');
  } else {
    showPage('dashboard');
  }
}

function buildNav(){
  const isAdmin=currentUser.role==='admin';
  const nav=document.getElementById('sideNav');
  nav.innerHTML=`
    <div class="nav-section-label">OVERVIEW</div>
    <div class="nav-item" onclick="showPage('dashboard')"><span class="nav-icon">▦</span> Dashboard</div>
    ${isAdmin?`<div class="nav-item" onclick="showPage('interns')"><span class="nav-icon">◎</span> Intern Profiles</div>`
    :`<div class="nav-item" onclick="showPage('my_profile')"><span class="nav-icon">◎</span> My Profile</div>`}
    <div class="nav-item" onclick="showPage('categories')"><span class="nav-icon">◈</span> Categories</div>
    <div class="nav-section-label">DATA</div>
    <div class="nav-item" onclick="showPage('add_cert')"><span class="nav-icon">+</span> Add Certification</div>
    ${isAdmin?`<div class="nav-item" onclick="showPage('import')"><span class="nav-icon">↑</span> Import Data</div>`:''}
    <div class="nav-item" onclick="showPage('reports')"><span class="nav-icon">⊟</span> Reports & PDF</div>
    ${isAdmin?`<div class="nav-section-label">ADMIN</div><div class="nav-item" onclick="showPage('admin')"><span class="nav-icon">⚙</span> Admin Panel</div>`:''}
  `;
  document.getElementById('topAddBtn').style.display=isAdmin?'inline-flex':'none';
}

function signOut(){
  currentUser=null;
  agentHistory=[];
  document.getElementById('appScreen').style.display='none';
  document.getElementById('authScreen').style.display='flex';
  document.getElementById('authPass').value='';
  document.getElementById('internCode').value='';
  document.getElementById('authErr').style.display='none';
  selectRole('admin');
}

function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>{ if(n.textContent.trim().toLowerCase().includes(id.replace(/_/g,' ').replace('my_profile','my'))) n.classList.add('active'); });
  const titles={dashboard:'DASHBOARD',interns:'INTERN PROFILES',my_profile:'MY PROFILE',categories:'CATEGORIES',add_cert:'ADD CERTIFICATION',import:'IMPORT DATA',reports:'REPORTS',agent:'AI AGENT',admin:'ADMIN PANEL'};
  document.getElementById('pageTitle').textContent=titles[id]||id.toUpperCase();
  if(id==='dashboard') renderDashboard();
  if(id==='interns') renderInternsTable();
  if(id==='my_profile') renderMyProfile();
  if(id==='categories') renderCatOverview();
  if(id==='reports') refreshInternSelects();
  if(id==='admin'){ if(currentUser?.role!=='admin'){showNotif('Admin access required.');showPage('dashboard');return;} renderAdminPage(); }
  if(id==='add_cert') setupAddCertPage();
  if(id==='agent') renderAgentStats();
}

function setupAddCertPage(){
  const isAdmin=currentUser?.role==='admin';
  document.getElementById('internSelectWrap').style.display=isAdmin?'block':'none';
  document.getElementById('newInternWrap').style.display=isAdmin?'block':'none';
  if(!isAdmin&&currentUser?.internId){
    document.getElementById('certInternSel').value=currentUser.internId;
  }
  refreshInternSelects();
}

function renderMyProfile(){
  if(!currentUser?.internId) return;
  const intern=interns.find(i=>i.id===currentUser.internId);
  if(!intern) return;
  const ic=getIC(intern.id);
  document.getElementById('myProfileContent').innerHTML=`
    <div>
      <div class="profile-sidebar-card">
        <div class="profile-avatar-lg">${getInit(intern)}</div>
        <div class="profile-name">${getName(intern)}</div>
        <div class="profile-dept">${intern.dept} TRACK</div>
        <div class="profile-stats">
          <div><div class="profile-stat-label">Certs</div><div class="profile-stat-val">${ic.length}</div></div>
          <div><div class="profile-stat-label">Hours</div><div class="profile-stat-val">${getTH(ic)}h</div></div>
        </div>
      </div>
      <div style="margin-top:14px">
        <button class="btn btn-primary" style="width:100%;justify-content:center;margin-bottom:8px" onclick="generateMyPDF()">⬇ MY PDF REPORT</button>
        <button class="btn btn-ghost" style="width:100%;justify-content:center" onclick="showPage('add_cert')">+ ADD CERTIFICATION</button>
      </div>
    </div>
    <div>
      <div class="card" style="margin-bottom:14px">
        <div class="card-header"><span class="card-title">MY CERTIFICATIONS</span></div>
        <div class="card-body">
          <div class="cert-grid">
            ${ic.length?ic.map(c=>`<div class="cert-item">
              <div class="cert-icon"><span style="font-size:13px">${CATS[c.cat]?.icon||'◎'}</span></div>
              <div class="cert-info"><div class="cert-name">${c.name}</div><div class="cert-meta">${c.provider} · ${c.date} <span class="badge ${CAT_BADGE[c.cat]}" style="margin-left:5px">${c.cat}</span></div></div>
              <div class="cert-hours"><div>${c.hours}</div><div class="cert-hours-label">hrs</div></div>
            </div>`).join(''):'<div style="color:var(--gray);font-size:13px;padding:16px 0">No certifications yet. Add one!</div>'}
          </div>
        </div>
      </div>
    </div>`;
}

function generateMyPDF(){
  if(!currentUser?.internId) return;
  generateInternPDFById(currentUser.internId);
}

function renderDashboard(){
  const total=certs.length;
  const totalH=getTH(certs);
  document.getElementById('dashTotalCerts').textContent=total;
  document.getElementById('dashTotalHours').textContent=totalH.toLocaleString();
  document.getElementById('dashAvg').textContent=(total/Math.max(interns.length,1)).toFixed(1);

  const recent=[...certs].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,7);
  document.getElementById('recentCertsTable').innerHTML=recent.map(c=>{
    const intern=interns.find(i=>i.id===c.internId);
    if(!intern) return '';
    return `<tr><td><div class="intern-name-cell"><div class="avatar">${getInit(intern)}</div><div class="intern-name">${getName(intern)}</div></div></td><td style="font-size:12px">${c.name}</td><td><span class="badge ${CAT_BADGE[c.cat]}">${c.cat}</span></td><td style="font-family:var(--font-mono);font-size:12px">${c.hours}h</td><td style="font-family:var(--font-mono);font-size:11px;color:var(--gray)">${c.date}</td></tr>`;
  }).join('');

  const maxCat=Math.max(...Object.keys(CATS).map(k=>certs.filter(c=>c.cat===k).length),1);
  document.getElementById('dashCategoryBars').innerHTML=Object.keys(CATS).map(k=>{
    const cnt=certs.filter(c=>c.cat===k).length;
    const pct=Math.round(cnt/maxCat*100);
    return `<div class="cat-bar-item"><div class="cat-bar-label"><span>${CATS[k].name}</span><span class="cat-bar-count">${cnt}</span></div><div class="cat-bar-track"><div class="cat-bar-fill ${CATS[k].fillClass}" style="width:${pct}%"></div></div></div>`;
  }).join('');

  const sorted=[...interns].map(i=>({intern:i,ic:getIC(i.id)})).sort((a,b)=>b.ic.length-a.ic.length).slice(0,5);
  document.getElementById('topInternsTable').innerHTML=sorted.map(row=>{
    const catCnt={};row.ic.forEach(c=>catCnt[c.cat]=(catCnt[c.cat]||0)+1);
    const topCat=Object.keys(catCnt).sort((a,b)=>catCnt[b]-catCnt[a])[0]||'-';
    return `<tr><td><div class="intern-name-cell"><div class="avatar">${getInit(row.intern)}</div><div class="intern-name">${getName(row.intern)}</div></div></td><td style="font-family:var(--font-mono);font-weight:600;color:var(--white)">${row.ic.length}</td><td style="font-family:var(--font-mono);font-size:12px">${getTH(row.ic)}h</td><td>${topCat!=='-'?`<span class="badge ${CAT_BADGE[topCat]}">${topCat}</span>`:'-'}</td></tr>`;
  }).join('');

  const maxH=Math.max(...Object.keys(CATS).map(k=>getTH(certs.filter(c=>c.cat===k))),1);
  document.getElementById('hoursTrackBars').innerHTML=Object.keys(CATS).map(k=>{
    const h=getTH(certs.filter(c=>c.cat===k));
    return `<div class="cat-bar-item"><div class="cat-bar-label"><span style="font-size:11px">${CATS[k].name}</span><span class="cat-bar-count">${h}h</span></div><div class="cat-bar-track"><div class="cat-bar-fill ${CATS[k].fillClass}" style="width:${Math.round(h/maxH*100)}%"></div></div></div>`;
  }).join('');
}

function renderInternsTable(){
  document.getElementById('internsFullTable').innerHTML=interns.map(intern=>{
    const ic=getIC(intern.id);
    const catCnt={};ic.forEach(c=>catCnt[c.cat]=(catCnt[c.cat]||0)+1);
    return `<tr onclick="showInternDetail(${intern.id})" style="cursor:pointer">
      <td><div class="intern-name-cell"><div class="avatar">${getInit(intern)}</div><div><div class="intern-name">${getName(intern)}</div><div class="intern-dept">${intern.email||''}</div></div></div></td>
      <td><span class="badge ${CAT_BADGE[intern.dept]||'badge-gray'}">${intern.dept}</span></td>
      ${['AI','FE','BE','API','CYBER','CLOUD','SOFT'].map(k=>`<td style="font-family:var(--font-mono);font-size:12px;text-align:center">${catCnt[k]||'-'}</td>`).join('')}
      <td style="font-family:var(--font-mono);font-weight:600;color:var(--white)">${ic.length}</td>
      <td style="font-family:var(--font-mono);font-size:12px">${getTH(ic)}h</td>
      <td><div style="display:flex;gap:5px">
        <button class="btn btn-ghost" style="font-size:10px;padding:3px 7px" onclick="event.stopPropagation();showEditInternModal(${intern.id})">EDIT</button>
        <button class="btn" style="font-size:10px;padding:3px 7px;background:rgba(192,57,43,0.1);color:var(--red-light);border:1px solid var(--border)" onclick="event.stopPropagation();removeIntern(${intern.id})">✕</button>
      </div></td>
    </tr>`;
  }).join('');
}

function showInternDetail(id){
  currentInternDetail=id;
  const intern=interns.find(i=>i.id===id);if(!intern)return;
  const ic=getIC(id);
  document.getElementById('internDetailView').style.display='block';
  document.querySelector('#page-interns .card').style.display='none';
  document.querySelector('#page-interns .section-header').style.display='none';
  document.getElementById('detailAvatar').textContent=getInit(intern);
  document.getElementById('detailName').textContent=getName(intern);
  document.getElementById('detailDept').textContent=intern.dept;
  document.getElementById('detailTotalCerts').textContent=ic.length;
  document.getElementById('detailTotalHours').textContent=getTH(ic)+'h';
  document.getElementById('detailCertList').innerHTML=ic.length?ic.map(c=>
    `<div class="cert-item">
      <div class="cert-icon"><span style="font-size:13px">${CATS[c.cat]?.icon||'◎'}</span></div>
      <div class="cert-info"><div class="cert-name">${c.name}</div><div class="cert-meta">${c.provider} · ${c.date} <span class="badge ${CAT_BADGE[c.cat]}" style="margin-left:5px">${c.cat}</span></div></div>
      <div class="cert-hours"><div>${c.hours}</div><div class="cert-hours-label">hrs</div></div>
      <button class="btn btn-ghost" style="font-size:10px;padding:3px 7px" onclick="openEditCert(${c.id})">EDIT</button>
      <button class="btn" style="font-size:10px;padding:3px 7px;background:rgba(192,57,43,0.1);color:var(--red-light);border:1px solid var(--border)" onclick="deleteCert(${c.id})">✕</button>
    </div>`).join(''):'<div style="color:var(--gray);font-size:13px;padding:16px 0">No certifications yet.</div>';
}

function hideInternDetail(){
  currentInternDetail=null;
  document.getElementById('internDetailView').style.display='none';
  document.querySelector('#page-interns .card').style.display='';
  document.querySelector('#page-interns .section-header').style.display='';
}

function renderCatOverview(){
  document.getElementById('catOverviewGrid').innerHTML=Object.keys(CATS).map(k=>{
    const cnt=certs.filter(c=>c.cat===k).length;
    const h=getTH(certs.filter(c=>c.cat===k));
    const ai=[...new Set(certs.filter(c=>c.cat===k).map(c=>c.internId))].length;
    return `<div class="cat-card" onclick="filterCatTable('${k}')">
      <div class="cat-card-header"><div class="cat-card-icon"><span style="font-size:13px">${CATS[k].icon}</span></div><div class="cat-card-name">${CATS[k].name}</div><div class="cat-count">${cnt}</div></div>
      <div class="cat-card-body">
        <div class="cat-bar-track" style="margin-bottom:8px"><div class="cat-bar-fill ${CATS[k].fillClass}" style="width:${Math.min(100,Math.round(cnt/certs.length*100*7))}%"></div></div>
        <div class="cat-card-stat"><span class="cat-card-stat-label">Hours</span><span class="cat-card-stat-val">${h}h</span></div>
        <div class="cat-card-stat"><span class="cat-card-stat-label">Active interns</span><span class="cat-card-stat-val">${ai}</span></div>
      </div>
    </div>`;
  }).join('');
  renderCatTable();
}

function filterCatTable(cat){document.getElementById('catFilter').value=cat;renderCatTable();}
function renderCatTable(){
  const f=document.getElementById('catFilter').value;
  const data=f==='all'?certs:certs.filter(c=>c.cat===f);
  document.getElementById('catDetailTable').innerHTML=data.map(c=>{
    const intern=interns.find(i=>i.id===c.internId);if(!intern)return '';
    return `<tr><td><div class="intern-name-cell"><div class="avatar">${getInit(intern)}</div><div class="intern-name">${getName(intern)}</div></div></td><td style="font-size:12px">${c.name}</td><td><span class="badge ${CAT_BADGE[c.cat]}">${CATS[c.cat]?.name}</span></td><td style="font-size:12px;color:var(--gray)">${c.provider}</td><td style="font-family:var(--font-mono);font-size:12px">${c.hours}h</td><td style="font-family:var(--font-mono);font-size:11px;color:var(--gray)">${c.date}</td></tr>`;
  }).join('');
}

function refreshInternSelects(){
  const opts='<option value="">— Select Intern —</option>'+interns.map(i=>`<option value="${i.id}">${getName(i)}</option>`).join('');
  ['certInternSel','reportInternSel'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=opts;});
}

function submitCert(){
  const isAdmin=currentUser?.role==='admin';
  const internId=isAdmin?parseInt(document.getElementById('certInternSel').value):currentUser?.internId;
  const newName=isAdmin?document.getElementById('certNewIntern').value.trim():'';
  const name=document.getElementById('certName').value.trim();
  const cat=document.getElementById('certCategory').value;
  const provider=document.getElementById('certProvider').value.trim();
  const hours=parseInt(document.getElementById('certHours').value)||0;
  const date=document.getElementById('certDate').value;
  if(!name||!cat){showNotif('Please fill certification name and category.');return;}
  let targetId=internId;
  if(!targetId&&newName&&isAdmin){
    const parts=newName.split(' ');
    const ni={id:nextInternId++,first:parts[0]||newName,last:parts.slice(1).join(' ')||'',dept:cat,email:''};
    interns.push(ni);targetId=ni.id;
  }
  if(!targetId){showNotif('Please select an intern.');return;}
  certs.push({id:nextCertId++,internId:targetId,name,cat,provider,hours,date:date||new Date().toISOString().split('T')[0]});
  clearCertForm();
  showNotif('Certification added!');
  if(!isAdmin) renderMyProfile();
}

function clearCertForm(){['certName','certProvider','certHours','certDate','certNotes','certNewIntern'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});const c=document.getElementById('certCategory');if(c)c.value='';}

function openEditCert(id){
  if(currentUser?.role!=='admin'){showNotif('Edit access requires admin privileges.');return;}
  const cert=certs.find(c=>c.id===id);if(!cert)return;
  editingCertId=id;
  document.getElementById('editCertName').value=cert.name;
  document.getElementById('editCertCat').value=cert.cat;
  document.getElementById('editCertHours').value=cert.hours;
  document.getElementById('editCertProvider').value=cert.provider||'';
  document.getElementById('editCertDate').value=cert.date;
  openModal('editCertModal');
}

function saveEditCert(){
  const cert=certs.find(c=>c.id===editingCertId);if(!cert)return;
  cert.name=document.getElementById('editCertName').value;
  cert.cat=document.getElementById('editCertCat').value;
  cert.hours=parseInt(document.getElementById('editCertHours').value)||0;
  cert.provider=document.getElementById('editCertProvider').value;
  cert.date=document.getElementById('editCertDate').value;
  closeModal('editCertModal');
  if(currentInternDetail)showInternDetail(currentInternDetail);
  showNotif('Certification updated!');
}

function deleteCert(id){
  if(currentUser?.role!=='admin'){showNotif('Delete access requires admin privileges.');return;}
  if(!confirm('Delete this certification?'))return;
  certs=certs.filter(c=>c.id!==id);
  if(currentInternDetail)showInternDetail(currentInternDetail);
  showNotif('Certification removed.');
}

function showAddCertForIntern(){showPage('add_cert');setTimeout(()=>{const s=document.getElementById('certInternSel');if(s&&currentInternDetail)s.value=currentInternDetail;},80);}

function openAddInternModal(){if(currentUser?.role!=='admin'){showNotif('Admin only.');return;}document.getElementById('newInternFirst').value='';document.getElementById('newInternLast').value='';document.getElementById('newInternEmail').value='';openModal('addInternModal');}
function showEditInternModal(id){const intern=interns.find(i=>i.id===id);if(!intern)return;document.getElementById('newInternFirst').value=intern.first;document.getElementById('newInternLast').value=intern.last;document.getElementById('newInternEmail').value=intern.email||'';openModal('addInternModal');}

function addIntern(){
  const first=document.getElementById('newInternFirst').value.trim();
  const last=document.getElementById('newInternLast').value.trim();
  const dept=document.getElementById('newInternDept').value;
  const email=document.getElementById('newInternEmail').value.trim();
  if(!first||!last){showNotif('Enter first and last name.');return;}
  interns.push({id:nextInternId++,first,last,dept,email});
  closeModal('addInternModal');
  renderInternsTable();renderAdminPage();
  showNotif('Intern added!');
}

function removeIntern(id){
  if(!confirm('Remove intern and all their certifications?'))return;
  interns=interns.filter(i=>i.id!==id);
  certs=certs.filter(c=>c.internId!==id);
  renderInternsTable();showNotif('Intern removed.');
}

function renderAdminPage(){
  document.getElementById('adminInternsTable').innerHTML=interns.map(i=>
    `<tr><td><div class="intern-name-cell"><div class="avatar" style="font-size:10px">${getInit(i)}</div><span class="intern-name">${getName(i)}</span></div></td>
    <td><span class="badge ${CAT_BADGE[i.dept]||'badge-gray'}" style="font-size:10px">${i.dept}</span></td>
    <td><div style="display:flex;gap:5px">
      <button class="btn btn-ghost" style="font-size:10px;padding:3px 7px" onclick="showEditInternModal(${i.id})">EDIT</button>
      <button class="btn" style="font-size:10px;padding:3px 7px;background:rgba(192,57,43,0.1);color:var(--red-light);border:1px solid var(--border)" onclick="removeIntern(${i.id})">✕</button>
    </div></td></tr>`).join('');
}

function saveSettings(){
  const np=document.getElementById('newAdminPass').value;
  if(np.trim()){ADMIN_PASS=np.trim();document.getElementById('newAdminPass').value='';showNotif('Admin password updated!');}
  else{showNotif('Settings saved!');}
}

function saveInternCode(){
  const nc=document.getElementById('newInternCode').value.trim();
  if(!nc){showNotif('Enter a new access code.');return;}
  INTERN_CODE=nc;document.getElementById('newInternCode').value='';
  showNotif('Intern access code updated!');
}

function generateInternPDF(){generateInternPDFById(currentInternDetail);}
function generateInternPDFFromReport(){generateInternPDFById(parseInt(document.getElementById('reportInternSel').value));}

function generateInternPDFById(id){
  if(!id){showNotif('Please select an intern.');return;}
  const intern=interns.find(i=>i.id===id);if(!intern)return;
  const ic=getIC(id);const totalHours=getTH(ic);
  const catCnt={};ic.forEach(c=>catCnt[c.cat]=(catCnt[c.cat]||0)+1);

  // Dark preview (dashboard)
  const preview=document.getElementById('reportPreviewArea');
  preview.innerHTML = `
    <div style="background:var(--black);border:1px solid var(--border);border-radius:6px;padding:28px;font-family:var(--font-body)">
      <div style="border-bottom:3px solid var(--red);padding-bottom:14px;margin-bottom:20px">
        <div style="font-family:var(--font-display);font-size:26px;letter-spacing:3px">FINSENSE<span style="color:var(--red)">AFRICA</span></div>
        <div style="font-size:9px;color:var(--gray);letter-spacing:3px;font-family:var(--font-mono)">INTERN CERTIFICATION REPORT</div>
      </div>
      <!-- rest of your dark preview HTML -->
    </div>
  `;

  // White-background PDF content
  const pdfContent = `
    <div style="background:#fff;padding:28px;font-family:Arial,sans-serif;color:#000">
      <h2 style="color:#000">FinSense Africa Intern Certification Report</h2>
      <p><strong>Intern:</strong> ${getName(intern)}</p>
      <p><strong>Department:</strong> 
        <span style="background:#d00;color:#fff;padding:2px 6px;border-radius:4px">${intern.dept} TRACK</span>
      </p>
      <p><strong>Total Certifications:</strong> ${ic.length}</p>
      <p><strong>Total Hours:</strong> ${totalHours}</p>

      <h3 style="color:#d00;margin-top:20px">By Category</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:#f0f0f0;color:#000">
          <th style="border:1px solid #ccc;padding:6px">Category</th>
          <th style="border:1px solid #ccc;padding:6px">Certs</th>
          <th style="border:1px solid #ccc;padding:6px">Hours</th>
        </tr></thead>
        <tbody>
          ${Object.keys(CATS).map(k=>{
            const cnt=catCnt[k]||0;
            const hrs=getTH(ic.filter(c=>c.cat===k));
            return cnt?`<tr style="background:${cnt%2===0?'#fff':'#f9f9f9'}">
              <td style="border:1px solid #ccc;padding:6px">${CATS[k].name}</td>
              <td style="border:1px solid #ccc;padding:6px">${cnt}</td>
              <td style="border:1px solid #ccc;padding:6px">${hrs}h</td>
            </tr>`:'';
          }).join('')}
        </tbody>
      </table>

      <h3 style="color:#d00;margin-top:20px">Certification Details</h3>
      ${ic.map(c=>`<div style="margin-bottom:8px">
        <strong>${c.name}</strong><br>
        ${c.provider} · ${c.date} · ${c.hours}h
      </div>`).join('')}

      <p style="margin-top:20px;font-size:10px;color:#666">
        Generated: ${new Date().toLocaleDateString('en-GB',{year:'numeric',month:'long',day:'2-digit'})}
      </p>
    </div>
  `;

  const element = document.createElement('div');
  element.innerHTML = pdfContent;

  html2pdf().set({
    margin: 0.5,
    filename: `Intern_Report_${getName(intern)}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  }).from(element).save();

  showNotif('Intern report generated and downloaded as PDF!');
  showPage('reports');
}

function generateSummaryPDF(){
  const title=document.getElementById('summaryReportTitle').value||'Certification Summary Report';

  // Dark preview (dashboard)
  const preview=document.getElementById('reportPreviewArea');
  preview.innerHTML = `
    <div style="background:var(--black);border:1px solid var(--border);border-radius:6px;padding:28px;font-family:var(--font-body)">
      <div style="border-bottom:3px solid var(--red);padding-bottom:14px;margin-bottom:20px">
        <div style="font-family:var(--font-display);font-size:26px;letter-spacing:3px">FINSENSE<span style="color:var(--red)">AFRICA</span></div>
        <div style="font-size:9px;color:var(--gray);letter-spacing:3px;font-family:var(--font-mono)">${title.toUpperCase()}</div>
      </div>
      <!-- your dark summary preview content here -->
    </div>
  `;

  // White-background PDF content
  const pdfContent = `
    <div style="background:#fff;padding:28px;font-family:Arial,sans-serif;color:#000">
      <h2 style="color:#000">${title}</h2>
      <p><strong>Total Interns:</strong> ${interns.length}</p>
      <p><strong>Total Certifications:</strong> ${certs.length}</p>
      <p><strong>Total Hours:</strong> ${getTH(certs)}h</p>
      <p><strong>Tracks:</strong> 7</p>

      <h3 style="color:#d00;margin-top:20px">Category Summary</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#f0f0f0;color:#000">
            <th style="border:1px solid #ccc;padding:6px">Category</th>
            <th style="border:1px solid #ccc;padding:6px">Certs</th>
            <th style="border:1px solid #ccc;padding:6px">Hours</th>
            <th style="border:1px solid #ccc;padding:6px">Interns</th>
          </tr>
        </thead>
        <tbody>
          ${Object.keys(CATS).map(k=>{
            const cnt=certs.filter(c=>c.cat===k).length;
            const h=getTH(certs.filter(c=>c.cat===k));
            const ai=[...new Set(certs.filter(c=>c.cat===k).map(c=>c.internId))].length;
            return `<tr style="background:${cnt%2===0?'#fff':'#f9f9f9'}">
              <td style="border:1px solid #ccc;padding:6px">${CATS[k].name}</td>
              <td style="border:1px solid #ccc;padding:6px">${cnt}</td>
              <td style="border:1px solid #ccc;padding:6px">${h}h</td>
              <td style="border:1px solid #ccc;padding:6px">${ai}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>

      <h3 style="color:#d00;margin-top:20px">All Interns</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#f0f0f0;color:#000">
            <th style="border:1px solid #ccc;padding:6px">Intern</th>
            <th style="border:1px solid #ccc;padding:6px">Dept</th>
            ${Object.keys(CATS).map(k=>`<th style="border:1px solid #ccc;padding:6px">${k}</th>`).join('')}
            <th style="border:1px solid #ccc;padding:6px">Total</th>
            <th style="border:1px solid #ccc;padding:6px">Hours</th>
          </tr>
        </thead>
        <tbody>
          ${interns.map(i=>{
            const ic=getIC(i.id);
            const catCnt={};
            ic.forEach(c=>catCnt[c.cat]=(catCnt[c.cat]||0)+1);
            return `<tr style="background:${ic.length%2===0?'#fff':'#f9f9f9'}">
              <td style="border:1px solid #ccc;padding:6px">${getName(i)}</td>
              <td style="border:1px solid #ccc;padding:6px">
                <span style="background:#d00;color:#fff;padding:2px 6px;border-radius:4px">${i.dept}</span>
              </td>
              ${Object.keys(CATS).map(k=>`<td style="border:1px solid #ccc;padding:6px;text-align:center">${catCnt[k]||'-'}</td>`).join('')}
              <td style="border:1px solid #ccc;padding:6px;text-align:center">${ic.length}</td>
              <td style="border:1px solid #ccc;padding:6px;text-align:center">${getTH(ic)}h</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>

      <p style="margin-top:20px;font-size:10px;color:#666">
        Generated: ${new Date().toLocaleDateString('en-GB',{year:'numeric',month:'long',day:'2-digit'})}
      </p>
    </div>
  `;

  const element = document.createElement('div');
  element.innerHTML = pdfContent;

  html2pdf().set({
    margin: 0.5,
    filename: `Summary_Report.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  }).from(element).save();

  showNotif('Summary report generated and downloaded as PDF!');
  showPage('reports');
}




function handleFileUpload(e){
  const file=e.target.files[0];if(!file)return;
  showNotif('Parsing: '+file.name);
  const preview=[{intern:'New Intern A',cert:'Cybersecurity Essentials',cat:'CYBER',hours:30,date:'2025-04-01'},{intern:'New Intern B',cert:'Vue.js Advanced',cat:'FE',hours:20,date:'2025-04-02'},{intern:'Amara Osei',cert:'AutoML with Vertex AI',cat:'AI',hours:22,date:'2025-04-03'}];
  importBuffer=preview;
  document.getElementById('importCount').textContent=preview.length+' RECORDS';
  document.getElementById('importPreviewTable').innerHTML=preview.map(r=>`<tr><td>${r.intern}</td><td style="font-size:12px">${r.cert}</td><td><span class="badge ${CAT_BADGE[r.cat]}">${r.cat}</span></td><td style="font-family:var(--font-mono);font-size:12px">${r.hours}h</td><td style="font-family:var(--font-mono);font-size:11px;color:var(--gray)">${r.date}</td></tr>`).join('');
  document.getElementById('importPreview').style.display='block';
}

function confirmImport(){
  importBuffer.forEach(r=>{
    let intern=interns.find(i=>getName(i)===r.intern);
    if(!intern){const parts=r.intern.split(' ');intern={id:nextInternId++,first:parts[0]||r.intern,last:parts.slice(1).join(' ')||'',dept:r.cat,email:''};interns.push(intern);}
    certs.push({id:nextCertId++,internId:intern.id,name:r.cert,cat:r.cat,provider:'Imported',hours:r.hours,date:r.date});
  });
  importBuffer=[];document.getElementById('importPreview').style.display='none';
  showNotif('Import complete!');
}

function cancelImport(){importBuffer=[];document.getElementById('importPreview').style.display='none';}

function downloadTemplate(){
  const csv='intern_name,department,cert_name,category,provider,hours,date_earned\nJane Smith,FE,React Certification,FE,Udemy,25,2025-01-15\n';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='finsense_cert_template.csv';a.click();
  showNotif('Template downloaded!');
}

function renderAgentStats(){
  document.getElementById('agentQuickStats').innerHTML=`<div style="display:flex;flex-direction:column;gap:9px">${[['Interns',interns.length],['Total Certs',certs.length],['Total Hours',getTH(certs)+'h'],['Tracks',7]].map(([l,v])=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border2)"><span style="font-size:12px;color:var(--gray)">${l}</span><span style="font-family:var(--font-mono);font-size:14px;color:var(--white)">${v}</span></div>`).join('')}</div>`;
}

function buildDataContext(){
  const sums=interns.map(i=>{const ic=getIC(i.id);const cc={};ic.forEach(c=>cc[c.cat]=(cc[c.cat]||0)+1);return `${getName(i)} (${i.dept}): ${ic.length} certs, ${getTH(ic)}h, [${Object.keys(cc).map(k=>k+':'+cc[k]).join(', ')}]`;}).join('\n');
  const cats=Object.keys(CATS).map(k=>`${CATS[k].name} (${k}): ${certs.filter(c=>c.cat===k).length} certs, ${getTH(certs.filter(c=>c.cat===k))}h`).join('\n');
  return `FinSense Africa Intern Certification Data:\nTotal interns: ${interns.length}\nTotal certs: ${certs.length}\nTotal hours: ${getTH(certs)}\n\nInterns:\n${sums}\n\nCategories:\n${cats}`;
}

function appendMsg(role,text){
  const msgs=document.getElementById('agentMessages');
  const d=document.createElement('div');d.className='msg '+(role==='user'?'user':'agent');
  const userInit=currentUser?currentUser.initials:'U';
  d.innerHTML=`<div class="msg-avatar">${role==='user'?userInit:'FA'}</div><div><div class="msg-bubble">${text}</div><span class="msg-time">${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div>`;
  msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;
}

function appendTyping(){
  const msgs=document.getElementById('agentMessages');
  const d=document.createElement('div');d.className='msg agent';d.id='typingIndicator';
  d.innerHTML=`<div class="msg-avatar">FA</div><div><div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>`;
  msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;
}

async function sendAgentMsg(){
  const input=document.getElementById('agentInput');
  const text=input.value.trim();if(!text)return;
  input.value='';
  appendMsg('user',text);
  agentHistory.push({role:'user',content:text});
  appendTyping();
  try{
    const role=currentUser?.role==='admin'?'Administrator':'Intern ('+currentUser?.name+')';
    const sys=`You are the FinSense Africa Intern Certification Agent. Current user: ${role}. Here is the live data:\n\n${buildDataContext()}\n\nBe concise, data-driven, and helpful. Categories: AI, FE (Front End), BE (Back End), API, CYBER (Cybersecurity), CLOUD, SOFT (Soft Skills).`;
    const resp=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:sys,messages:agentHistory.slice(-10)})});
    const data=await resp.json();
    const reply=data.content?.find(b=>b.type==='text')?.text||'Unable to respond right now.';
    document.getElementById('typingIndicator')?.remove();
    appendMsg('agent',reply.replace(/\n/g,'<br>'));
    agentHistory.push({role:'assistant',content:reply});
  }catch(e){
    document.getElementById('typingIndicator')?.remove();
    appendMsg('agent','Error connecting to AI service. Check your connection.');
  }
}

function sendQuick(text){document.getElementById('agentInput').value=text;sendAgentMsg();}
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
function showNotif(msg){const n=document.getElementById('notif');n.textContent=msg;n.style.display='block';setTimeout(()=>n.style.display='none',3000);}

populateInternSelect();

(() => {
  const $ = s => document.querySelector(s);
  const loginScreen = $('#loginScreen');
  const adminApp = $('#adminApp');
  const loginForm = $('#loginForm');
  const loginStatus = $('#loginStatus');
  const config = window.HC_CONFIG || {};
  const showAdmin = () => { loginScreen.hidden = true; adminApp.hidden = false; };
  const showLogin = () => { loginScreen.hidden = false; adminApp.hidden = true; };
  const savedSession = sessionStorage.getItem('hc-admin-session');
  if (savedSession) showAdmin(); else showLogin();
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const adminToken = $('#adminToken').value.trim();
    if (!config.apiUrl) { loginStatus.textContent = 'Apps Script API URL is not configured.'; return; }
    loginStatus.textContent = 'Verifying token…';
    const button = loginForm.querySelector('button[type="submit"]'); button.disabled = true;
    try {
      const response = await fetch(config.apiUrl, {method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'adminLoginToken',adminToken})});
      const data = await response.json();
      if (!data.ok || !data.token) throw new Error(data.error || 'Login failed.');
      sessionStorage.setItem('hc-admin-session', data.token);
      sessionStorage.setItem('hc-admin-expires', String(data.expiresAt || ''));
      $('#adminToken').value = '';
      loginStatus.textContent = '';
      showAdmin();
    } catch (err) { loginStatus.textContent = err.message || 'Unable to connect to Apps Script. Check deployment and token.'; }
    finally { button.disabled = false; }
  });
  $('#logoutBtn').addEventListener('click', () => { sessionStorage.removeItem('hc-admin-session'); sessionStorage.removeItem('hc-admin-expires'); showLogin(); });
  const status = $('#projectStatus');
  const form = $('#projectForm');
  function localDraft(publish=false) {
    const fd = new FormData(form), obj = {};
    for (const [k,v] of fd.entries()) {
      if (v instanceof File) { if (v.name) (obj[k] ||= []).push({name:v.name,size:v.size,type:v.type}); }
      else obj[k]=v;
    }
    obj.status = publish ? 'published' : 'draft';
    obj.visibility = fd.get('visibility') || 'private';
    const saved = JSON.parse(localStorage.getItem('hc-project-drafts') || '[]');
    saved.push({...obj, localSavedAt:new Date().toISOString()});
    localStorage.setItem('hc-project-drafts', JSON.stringify(saved));
    status.textContent = publish
      ? 'ড্রাফটের তথ্য এই ব্রাউজারে সংরক্ষিত হয়েছে। এটি লাইভ ওয়েবসাইটে প্রকাশ হয়নি—backend সংযোগ ও publish পরীক্ষা প্রয়োজন।'
      : 'ড্রাফটের তথ্য এই ব্রাউজারে সংরক্ষিত হয়েছে। Google Sheets/Drive-এ পাঠানো হয়নি।';
  }
  $('#saveDraft').addEventListener('click', () => { if (form.reportValidity()) localDraft(false); });
  $('#publish').addEventListener('click', () => { if (form.reportValidity()) {
    if ($('#projectForm [name="visibility"]').value !== 'public') {
      status.textContent='Visibility Private/Internal রাখা আছে। Public করতে Visibility বদলান; তবুও backend সংযোগ না হওয়া পর্যন্ত লাইভ হবে না.'; return;
    }
    localDraft(true);
  }});
  form.addEventListener('submit', e => { e.preventDefault(); if(form.reportValidity()) localDraft(false); });
  $('#contentForm').addEventListener('submit', e => {
    e.preventDefault();
    $('#contentStatus').textContent='CMS পরিবর্তনের ফর্ম প্রস্তুত, কিন্তু লাইভ সাইট/Google Sheets-এ সেভ করার backend সংযোগ এখনো সম্পূর্ণ নয়।';
  });
})();
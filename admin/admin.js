(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const loginScreen = $('#loginScreen'), adminApp = $('#adminApp'), loginForm = $('#loginForm');
  const loginStatus = $('#loginStatus'), config = window.HC_CONFIG || {};
  const sessionToken = () => sessionStorage.getItem('hc-admin-session') || '';
  const showAdmin = () => { loginScreen.hidden = true; adminApp.hidden = false; navigate(location.hash.slice(1) || 'home'); };
  const showLogin = () => { loginScreen.hidden = false; adminApp.hidden = true; };
  function navigate(view) {
    const valid = ['home','bms','finance','crm','internal-projects','website','projects','volunteers','contacts','content','media'];
    if (!valid.includes(view)) view = 'home';
    $$('.view').forEach(el => el.classList.toggle('active-view', el.dataset.panel === view));
    $$('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.view === view));
    const titles = {home:['ADMINISTRATION PORTAL','Overview'],bms:['01 · PRIVATE MANAGEMENT','BMS / CRM'],finance:['PRIVATE · BMS','Finance & budgets'],crm:['PRIVATE · CRM','People & internal records'],'internal-projects':['PRIVATE · BMS','Internal projects'],website:['02 · PUBLIC WEBSITE','Website maintenance'],projects:['PUBLIC WEBSITE','Projects & publishing'],volunteers:['PUBLIC WEBSITE','Volunteers'],contacts:['PUBLIC WEBSITE','Contacts & messages'],content:['PUBLIC WEBSITE','Pages & content'],media:['PUBLIC WEBSITE','Media library']};
    $('#pageEyebrow').textContent = titles[view][0]; $('#pageTitle').textContent = titles[view][1];
    if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view);
    $('.sidebar').classList.remove('mobile-open');
  }
  async function api(action, data = {}, authenticated = true) {
    if (!config.apiUrl) throw new Error('Apps Script API URL is not configured in config.js.');
    const payload = { action, ...data };
    if (authenticated) {
      if (!sessionToken()) throw new Error('Your session has expired. Please sign in again.');
      payload.token = sessionToken();
    }
    const response = await fetch(config.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
    let result;
    try { result = await response.json(); } catch (_) { throw new Error('Apps Script returned an unreadable response. Check deployment and permissions.'); }
    if (!response.ok || !result.ok) throw new Error(result.error || 'Request failed. Please try again.');
    return result;
  }
  if (sessionToken()) showAdmin(); else showLogin();
  loginForm.addEventListener('submit', async e => {
    e.preventDefault(); const token = $('#adminToken').value.trim();
    if (!config.apiUrl) { loginStatus.textContent = 'Apps Script API URL is not configured.'; return; }
    loginStatus.textContent = 'Verifying token…'; const button = $('button[type="submit"]', loginForm); button.disabled = true;
    try {
      const result = await api('adminLoginToken', { adminToken: token }, false);
      sessionStorage.setItem('hc-admin-session', result.token); sessionStorage.setItem('hc-admin-expires', String(result.expiresAt || ''));
      $('#adminToken').value = ''; loginStatus.textContent = ''; showAdmin(); loadProjects().catch(() => {}); loadContent().catch(() => {});
    } catch (err) { loginStatus.textContent = err.message || 'Unable to connect to Apps Script.'; }
    finally { button.disabled = false; }
  });
  $('#logoutBtn').addEventListener('click', () => { sessionStorage.removeItem('hc-admin-session'); sessionStorage.removeItem('hc-admin-expires'); showLogin(); });
  $$('.nav-link').forEach(a => a.addEventListener('click', e => { e.preventDefault(); navigate(a.dataset.view); }));
  $$('[data-go]').forEach(el => el.addEventListener('click', () => navigate(el.dataset.go)));
  $('#mobileMenu').addEventListener('click', () => $('.sidebar').classList.toggle('mobile-open'));
  window.addEventListener('hashchange', () => navigate(location.hash.slice(1)));

  const projectForm = $('#projectForm'), projectStatus = $('#projectStatus');
  async function loadProjects() {
    const target = $('#projectsList'); target.innerHTML = '<p class="muted">Loading projects…</p>';
    try {
      const result = await api('adminProjects'); const projects = result.projects || [];
      $('#projectCount').textContent = projects.length;
      if (!projects.length) { target.innerHTML = '<p class="muted">No projects found yet. Create your first project above.</p>'; return; }
      target.replaceChildren();
      projects.forEach(p => {
        const item = document.createElement('article'); item.className = 'record-item';
        const details = document.createElement('div'); details.className = 'record-details';
        const title = document.createElement('b'); title.textContent = p.title || 'Untitled project';
        const desc = document.createElement('p'); desc.textContent = [p.category, p.location, p.status].filter(Boolean).join(' · ');
        details.append(title, desc); const badge = document.createElement('span'); badge.className = 'status-pill ' + (p.status === 'published' ? 'published' : 'pending'); badge.textContent = p.status || 'draft'; item.append(details, badge); target.append(item);
      });
    } catch (err) { target.innerHTML = ''; const p = document.createElement('p'); p.className = 'status error'; p.textContent = err.message; target.append(p); }
  }
  $('#refreshProjects').addEventListener('click', loadProjects);
  projectForm.addEventListener('submit', async e => {
    e.preventDefault(); if (!projectForm.reportValidity()) return;
    const button = $('button[type="submit"]', projectForm); button.disabled = true; projectStatus.className = 'status'; projectStatus.textContent = 'Saving project to Google Sheets…';
    const fd = new FormData(projectForm); const data = Object.fromEntries(fd.entries());
    try {
      const result = await api('createProject', data);
      projectStatus.className = 'status success'; projectStatus.textContent = 'Project saved successfully to the backend. Status: ' + ((result.project && result.project.status) || data.status || 'draft') + '.';
      projectForm.reset(); await loadProjects();
    } catch (err) { projectStatus.className = 'status error'; projectStatus.textContent = 'Save failed: ' + err.message; }
    finally { button.disabled = false; }
  });

  const contentForm = $('#contentForm'), contentStatus = $('#contentStatus');
  function fillContent(content = {}) {
    ['heroTitle','contactEmail','aboutText','missionText','visionText','heroCopy'].forEach(key => {
      const field = contentForm.elements.namedItem(key); if (field && content[key] !== undefined) field.value = content[key];
    });
  }
  async function loadContent() {
    contentStatus.className = 'status'; contentStatus.textContent = 'Loading saved content…';
    try { const result = await api('getContent'); fillContent(result.content || {}); contentStatus.textContent = 'Saved content loaded.'; }
    catch (err) { contentStatus.className = 'status error'; contentStatus.textContent = 'Could not load content: ' + err.message; }
  }
  $('#loadContent').addEventListener('click', loadContent);
  contentForm.addEventListener('submit', async e => {
    e.preventDefault(); if (!contentForm.reportValidity()) return;
    const button = $('button[type="submit"]', contentForm); button.disabled = true; contentStatus.className = 'status'; contentStatus.textContent = 'Saving changes to Google Sheets…';
    const content = {};
    ['heroTitle','contactEmail','aboutText','missionText','visionText','heroCopy'].forEach(key => content[key] = contentForm.elements.namedItem(key).value.trim());
    try { const result = await api('saveContent', { content }); fillContent(result.content || content); contentStatus.className = 'status success'; contentStatus.textContent = 'CMS changes saved successfully.'; }
    catch (err) { contentStatus.className = 'status error'; contentStatus.textContent = 'Save failed: ' + err.message; }
    finally { button.disabled = false; }
  });
})();

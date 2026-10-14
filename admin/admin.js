(function () {
  "use strict";

  const endpoint = window.HopeCareConfig &&
    window.HopeCareConfig.backend &&
    window.HopeCareConfig.backend.appsScriptEndpoint;
  const $ = (id) => document.getElementById(id);
  const CONTENT_KEYS = [
    "heroTitle", "heroCopy", "aboutText", "missionText", "visionText",
    "valuesText", "activitiesIntro", "projectsIntro", "contactEmail",
    "logoUrl", "bannerUrl"
  ];
  let token = sessionStorage.getItem("hc-admin-token") || "";
  let projects = [];

  function showStatus(id, message, success) {
    const el = $(id);
    if (!el) return;
    el.textContent = message;
    el.classList.remove("hidden");
    el.style.background = success ? "#e5f5e9" : "#fff0e9";
    el.style.color = success ? "#176b48" : "#7d3b20";
  }
  function hideStatus(id) {
    const el = $(id);
    if (el) el.classList.add("hidden");
  }
  async function api(action, data, isLogin) {
    if (!endpoint) throw new Error("Apps Script URL is missing in assets/js/config.js.");
    const payload = Object.assign({ action: action }, data || {});
    if (!isLogin && token) payload.token = token;
    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        redirect: "follow"
      });
    } catch (err) {
      throw new Error("Could not connect to Apps Script. Check the deployed Web App URL and browser CORS/redirect error.");
    }
    if (!response.ok) throw new Error("Apps Script HTTP error (" + response.status + ").");
    let result;
    try { result = await response.json(); }
    catch (err) { throw new Error("Apps Script did not return JSON. Deploy the latest Code.gs as a Web App accessible to the website."); }
    // This backend uses {ok:true}, not {success:true}.
    if (!result || !(result.ok === true || result.success === true)) {
      throw new Error(result && (result.error || result.message) || "The backend rejected this request.");
    }
    return result;
  }

  function showLogin() {
    $("loginPanel").classList.remove("hidden");
    $("dashboard").classList.add("hidden");
  }
  function showDashboard() {
    $("loginPanel").classList.add("hidden");
    $("dashboard").classList.remove("hidden");
    loadContent();
    loadProjects();
  }
  function switchView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("hidden", v.id !== viewId));
    document.querySelectorAll("[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === viewId));
    $("pageTitle").textContent = viewId === "projectsView" ? "Projects" : (viewId === "pagesView" ? "All page content" : "Website content");
  }

  $("loginForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    hideStatus("loginStatus");
    const button = $("loginButton");
    const adminToken = $("adminToken").value;
    button.disabled = true;
    button.textContent = "Signing in…";
    try {
      // Exact action and field expected by this project's Code.gs.
      const result = await api("adminLoginToken", { adminToken: adminToken }, true);
      if (!result.token) throw new Error("Login response did not contain a session token. Check Apps Script deployment version.");
      token = result.token;
      sessionStorage.setItem("hc-admin-token", token);
      $("adminToken").value = "";
      showDashboard();
    } catch (err) {
      showStatus("loginStatus", err.message, false);
    } finally {
      button.disabled = false;
      button.textContent = "Sign In";
    }
  });

  $("logoutBtn").addEventListener("click", function () {
    token = "";
    sessionStorage.removeItem("hc-admin-token");
    showLogin();
  });

  document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  async function loadContent() {
    hideStatus("contentStatus");
    try {
      const result = await api("getContent");
      const content = result.content || {};
      CONTENT_KEYS.forEach(key => { $(key).value = content[key] || ""; });
    } catch (err) {
      if (/session expired|session missing|unauthorized/i.test(err.message)) expireSession(err.message);
      else showStatus("contentStatus", "Could not load website content: " + err.message, false);
    }
  }

  $("contentForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    hideStatus("contentStatus");
    const content = {};
    CONTENT_KEYS.forEach(key => { content[key] = $(key).value.trim(); });
    try {
      await api("saveContent", { content: content });
      showStatus("contentStatus", "Website content saved successfully.", true);
    } catch (err) {
      if (/session expired|session missing|unauthorized/i.test(err.message)) expireSession(err.message);
      else showStatus("contentStatus", "Save failed: " + err.message, false);
    }
  });
  $("reloadContent").addEventListener("click", loadContent);

  function clearProject() {
    $("projectForm").reset();
    $("projectId").value = "";
    $("projectStatus").value = "draft";
    $("projectFeatured").checked = false;
    $("projectImageFile").value = "";
    $("projectImagePreview").classList.add("hidden");
    $("projectFormTitle").textContent = "Add project";
    hideStatus("projectStatusMessage");
  }
  $("clearProject").addEventListener("click", clearProject);

  function updateProjectImagePreview() {
    const url = $("projectImage").value.trim();
    const preview = $("projectImagePreview");
    if (url && /^https:\/\//i.test(url)) { preview.src = url; preview.classList.remove("hidden"); }
    else { preview.removeAttribute("src"); preview.classList.add("hidden"); }
  }
  $("projectImage").addEventListener("input", updateProjectImagePreview);
  $("projectImageFile").addEventListener("change", async function () {
    const file = this.files && this.files[0];
    if (!file) return;
    const status = "projectImageUploadStatus";
    hideStatus(status);
    if (!/^image\/(png|jpeg|webp|gif)$/i.test(file.type)) {
      showStatus(status, "Choose a PNG, JPEG, WebP or GIF image.", false); this.value = ""; return;
    }
    if (file.size > 4 * 1024 * 1024) {
      showStatus(status, "Image must be 4 MB or smaller.", false); this.value = ""; return;
    }
    showStatus(status, "Uploading image to GitHub…", true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "")); reader.onerror = () => reject(new Error("Could not read image file.")); reader.readAsDataURL(file);
      });
      const base64 = dataUrl.split(",")[1];
      const result = await api("uploadProjectImage", { fileName: file.name, mimeType: file.type, base64: base64 });
      if (!result.url) throw new Error("GitHub upload response did not include an image URL.");
      $("projectImage").value = result.url;
      updateProjectImagePreview();
      showStatus(status, "Image uploaded to GitHub successfully.", true);
    } catch (err) {
      showStatus(status, "Image upload failed: " + err.message, false);
    }
  });

  $("projectForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    hideStatus("projectStatusMessage");
    const id = $("projectId").value.trim();
    const payload = {
      id: id,
      title: $("projectTitle").value.trim(),
      category: $("projectCategory").value.trim(),
      location: $("projectLocation").value.trim(),
      status: $("projectStatus").value,
      description: $("projectDescription").value.trim(),
      imageUrl: $("projectImage").value.trim(),
      featured: $("projectFeatured").checked
    };
    try {
      await api(id ? "updateProject" : "createProject", payload);
      showStatus("projectStatusMessage", id ? "Project updated." : "Project created.", true);
      clearProject();
      await loadProjects();
    } catch (err) {
      if (/session expired|session missing|unauthorized/i.test(err.message)) expireSession(err.message);
      else showStatus("projectStatusMessage", "Could not save project: " + err.message, false);
    }
  });

  async function loadProjects() {
    $("projectsList").textContent = "Loading projects…";
    try {
      const result = await api("adminProjects");
      projects = Array.isArray(result.projects) ? result.projects : [];
      renderProjects();
    } catch (err) {
      $("projectsList").textContent = "Could not load projects: " + err.message;
      if (/session expired|session missing|unauthorized/i.test(err.message)) expireSession(err.message);
    }
  }
  function renderProjects() {
    const root = $("projectsList");
    root.replaceChildren();
    if (!projects.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "No projects found.";
      root.appendChild(p);
      return;
    }
    projects.forEach(project => {
      const row = document.createElement("div");
      row.className = "project-row";
      const info = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = project.title || "(Untitled project)";
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = project.status || "draft";
      const desc = document.createElement("p");
      desc.textContent = [project.category, project.location, project.description].filter(Boolean).join(" · ");
      info.append(title, document.createTextNode(" "), badge, desc);
      const actions = document.createElement("div");
      actions.className = "actions";
      actions.style.marginTop = "0";
      const edit = document.createElement("button");
      edit.className = "secondary";
      edit.type = "button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => {
        $("projectId").value = project.id || "";
        $("projectTitle").value = project.title || "";
        $("projectCategory").value = project.category || "";
        $("projectLocation").value = project.location || "";
        $("projectStatus").value = project.status || "draft";
        $("projectDescription").value = project.description || "";
        $("projectImage").value = project.imageUrl || "";
        $("projectFeatured").checked = project.featured === true || String(project.featured) === "true";
        updateProjectImagePreview();
        $("projectFormTitle").textContent = "Edit project";
        switchView("projectsView");
        $("projectForm").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      const del = document.createElement("button");
      del.className = "danger";
      del.type = "button";
      del.textContent = "Delete";
      del.addEventListener("click", async () => {
        if (!window.confirm('Delete project "' + (project.title || "Untitled project") + '"? This cannot be undone.')) return;
        try {
          await api("deleteProject", { id: project.id });
          await loadProjects();
          showStatus("globalStatus", "Project deleted.", true);
        } catch (err) {
          showStatus("globalStatus", "Delete failed: " + err.message, false);
          if (/session expired|session missing|unauthorized/i.test(err.message)) expireSession(err.message);
        }
      });
      actions.append(edit, del);
      row.append(info, actions);
      root.appendChild(row);
    });
  }
  $("reloadProjects").addEventListener("click", loadProjects);


  const CMS_PAGES = ["index.html","about.html","programs.html","projects.html","impact.html","gallery.html","news.html","contact.html","donate.html","reports.html","team.html","volunteer.html","privacy.html"];
  let pageFields = [];
  function pageTargetList(doc) {
    return Array.from(doc.querySelectorAll("main h1,main h2,main h3,main h4,main p,main li,main button")).filter(el => !el.querySelector("*"));
  }
  function fieldLabel(el, index) {
    const text = (el.getAttribute("data-en") || el.textContent || "").trim().replace(/\s+/g, " ");
    return (el.tagName.toLowerCase() + " · " + (text.slice(0, 72) || ("Item " + (index + 1))));
  }
  async function loadCmsPage() {
    hideStatus("pageContentStatus");
    const page = $("cmsPageSelect").value;
    const root = $("pageContentFields"); root.replaceChildren(); pageFields = [];
    try {
      const response = await fetch("../" + page, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load " + page + " (HTTP " + response.status + ").");
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const targets = pageTargetList(doc);
      if (!targets.length) throw new Error("No editable main content was found on this page.");
      targets.forEach((el, i) => {
        const multilingual = el.hasAttribute("data-en") || el.hasAttribute("data-bn");
        const values = multilingual ? [
          { key: "page:" + page + ":en:" + i, label: fieldLabel(el, i) + " — English", value: el.getAttribute("data-en") || el.textContent.trim() },
          { key: "page:" + page + ":bn:" + i, label: fieldLabel(el, i) + " — বাংলা", value: el.getAttribute("data-bn") || "" }
        ] : [{ key: "page:" + page + ":text:" + i, label: fieldLabel(el, i), value: el.textContent.trim() }];
        values.forEach(item => {
          const wrap = document.createElement("div"); wrap.className = "field";
          const label = document.createElement("label"); label.textContent = item.label; label.htmlFor = "cms-" + pageFields.length;
          const input = item.value.length > 100 || item.value.includes("\n") ? document.createElement("textarea") : document.createElement("input");
          input.id = label.htmlFor; input.value = item.value; input.maxLength = 3000; input.dataset.cmsKey = item.key;
          wrap.append(label, input); root.appendChild(wrap); pageFields.push(input);
        });
      });
      showStatus("pageContentStatus", "Loaded " + targets.length + " editable items from " + page + ".", true);
    } catch (err) { showStatus("pageContentStatus", err.message, false); }
  }
  $("loadCmsPage").addEventListener("click", loadCmsPage);
  $("pageContentForm").addEventListener("submit", async function (event) {
    event.preventDefault(); hideStatus("pageContentStatus");
    const content = {}; pageFields.forEach(input => { content[input.dataset.cmsKey] = input.value.trim(); });
    try { await api("saveContent", { content }); showStatus("pageContentStatus", "Page content saved to Google Sheets. Refresh the public page to see changes.", true); }
    catch (err) { showStatus("pageContentStatus", "Could not save page content: " + err.message, false); if (/session expired|session missing|unauthorized/i.test(err.message)) expireSession(err.message); }
  });

  function expireSession(message) {
    token = "";
    sessionStorage.removeItem("hc-admin-token");
    showLogin();
    showStatus("loginStatus", message || "Your admin session expired. Please sign in again.", false);
  }

  // Do not trust a token merely because it exists in sessionStorage. First protected
  // request verifies it server-side; invalid/expired tokens return the user to login.
  if (token) showDashboard();
  else showLogin();
})();
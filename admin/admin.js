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
    $("pageTitle").textContent = viewId === "projectsView" ? "Projects" : "Website content";
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
      const sessionToken = result.sessionToken || result.token;
      if (!sessionToken) throw new Error("Login response did not contain a session token.");
      token = sessionToken;
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
    $("projectFormTitle").textContent = "Add project";
    hideStatus("projectStatusMessage");
  }
  $("clearProject").addEventListener("click", clearProject);

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
      imageUrl: $("projectImage").value.trim()
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
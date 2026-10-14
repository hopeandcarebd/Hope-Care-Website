(function () {
  "use strict";
  const config = window.HopeCareConfig;
  const endpoint = config && config.backend && config.backend.appsScriptEndpoint;
  const isProjectsPage = (location.pathname.split("/").pop() || "index.html").toLowerCase() === "projects.html";
  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const hasImage = (url) => /^https:\/\//i.test(String(url || ""));
  function card(project, index, featured) {
    const image = hasImage(project.imageUrl) ? '<img class="live-project-image" loading="lazy" src="' + esc(project.imageUrl) + '" alt="' + esc(project.title) + '" onerror="this.hidden=true">' : '<div class="live-project-image live-project-no-image" aria-hidden="true">H+C</div>';
    const meta = [project.category, project.location].filter(Boolean).map(esc).join(" · ");
    return '<article class="' + (featured ? 'live-project-card' : 'hc-project-card') + '">' + image + '<div class="' + (featured ? 'live-project-card-body' : 'hc-project-card-body') + '"><span class="eyebrow">' + esc(meta || (project.status === "completed" ? "Completed project" : "Project")) + '</span><h3>' + esc(project.title) + '</h3><p>' + esc(project.description) + '</p>' + (project.status === "completed" ? '<span class="live-project-status">Completed</span>' : '') + '</div></article>';
  }
  async function load() {
    const projectGrid = document.getElementById("live-project-grid");
    const homeGrid = document.getElementById("home-featured-projects");
    const homeSection = document.getElementById("live-featured-section");
    if ((!projectGrid && !homeGrid) || !endpoint) return;
    try {
      const response = await fetch(endpoint + "?action=projects", { method: "GET", cache: "no-store", redirect: "follow" });
      if (!response.ok) throw new Error("API HTTP " + response.status);
      const data = await response.json();
      if (!(data.ok === true || data.success === true) || !Array.isArray(data.projects)) throw new Error(data.error || "Invalid projects response");
      const published = data.projects.filter(p => ["published", "completed"].includes(String(p.status || "").toLowerCase()));
      if (projectGrid) {
        projectGrid.innerHTML = published.length ? published.map((p, i) => card(p, i, false)).join("") : '<p class="hc-content-note">No projects have been published yet. Please check back soon.</p>';
        const note = document.getElementById("project-load-note"); if (note) note.textContent = published.length ? "Showing " + published.length + " published project" + (published.length === 1 ? "." : "s.") : "Published projects managed from the admin panel appear here.";
      }
      if (homeGrid && homeSection) {
        const featured = published.filter(p => p.featured === true || String(p.featured).toLowerCase() === "true").slice(0, 3);
        if (featured.length) { homeGrid.innerHTML = featured.map((p, i) => card(p, i, true)).join(""); homeSection.classList.remove("hidden"); }
        else { homeGrid.replaceChildren(); homeSection.classList.add("hidden"); }
      }
    } catch (error) {
      console.warn("Published project feed unavailable; using page fallback.", error);
      if (projectGrid) projectGrid.innerHTML = '<p class="hc-content-note">Projects could not be loaded right now. Please refresh the page later.</p>';
      if (homeSection) homeSection.classList.add("hidden");
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load); else load();
})();

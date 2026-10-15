(function () {
  "use strict";
  const config = window.HopeCareConfig;
  const endpoint = config && config.backend && config.backend.appsScriptEndpoint;
  const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const lang = () => (window.HopeCareLanguage && window.HopeCareLanguage.getLanguage()) || document.documentElement.lang || "en";
  const text = (p, enKey, bnKey, fallbackKey) => {
    const language = lang();
    return language === "bn" ? (p[bnKey] || p[enKey] || p[fallbackKey] || "") : (p[enKey] || p[fallbackKey] || p[bnKey] || "");
  };
  const imagesOf = p => {
    let urls = Array.isArray(p.imageUrls) ? p.imageUrls.slice() : [];
    if (p.imageUrl) urls.unshift(p.imageUrl);
    return urls.filter((u, i, a) => /^https:\/\//i.test(String(u || "")) && a.indexOf(u) === i);
  };
  function card(p) {
    const title = text(p, "titleEn", "titleBn", "title") || "Project";
    const desc = text(p, "descriptionEn", "descriptionBn", "description");
    const imgs = imagesOf(p);
    const gallery = imgs.length ? '<div class="hc-project-images">' + imgs.map((url,i) => '<img src="' + esc(url) + '" loading="lazy" alt="' + esc(title) + ' — ' + (i+1) + '" onerror="this.remove()">').join("") + '</div>' : "";
    const category = text(p, "categoryEn", "categoryBn", "category") || (lang() === "bn" ? "প্রকল্প" : "Project");
    const location = text(p, "locationEn", "locationBn", "location");
    const status = String(p.status || "").toLowerCase();
    const statusLabel = status === "completed" ? (lang() === "bn" ? "সম্পন্ন" : "Completed") : (lang() === "bn" ? "চলমান প্রকল্প" : "Project");
    return '<article class="hc-project-card live-project-full-card">' + gallery + '<div class="hc-project-card-body"><span class="eyebrow">' + esc(category) + (location ? ' · ' + esc(location) : '') + '</span><h3>' + esc(title) + '</h3><div class="hc-project-full-description">' + esc(desc).replace(/\r?\n/g,"<br>") + '</div><span class="live-project-status">' + statusLabel + '</span></div></article>';
  }
  async function load() {
    const projectGrid = document.getElementById("live-project-grid");
    const homeGrid = document.getElementById("home-featured-projects");
    const homeSection = document.getElementById("live-featured-section");
    if ((!projectGrid && !homeGrid) || !endpoint) return;
    try {
      const response = await fetch(endpoint + "?action=projects", {cache:"no-store", redirect:"follow"});
      if (!response.ok) throw new Error("API HTTP " + response.status);
      const data = await response.json();
      if (!(data.ok === true || data.success === true) || !Array.isArray(data.projects)) throw new Error(data.error || "Invalid projects response");
      const published = data.projects.filter(p => ["published","completed"].includes(String(p.status || "").toLowerCase()));
      const featured = published.filter(p => p.featured === true || String(p.featured).toLowerCase() === "true");
      const render = () => {
        if (projectGrid) {
          projectGrid.innerHTML = published.length ? published.map(card).join("") : '<p class="hc-content-note" data-en="No projects have been published yet. Please check back soon." data-bn="এখনও কোনো প্রকল্প প্রকাশ করা হয়নি। পরে আবার দেখুন।">' + (lang()==="bn"?"এখনও কোনো প্রকল্প প্রকাশ করা হয়নি। পরে আবার দেখুন।":"No projects have been published yet. Please check back soon.") + '</p>';
          const note = document.getElementById("project-load-note");
          if (note) note.textContent = lang()==="bn" ? "অ্যাডমিন প্যানেল থেকে প্রকাশিত " + published.length + "টি প্রকল্প দেখানো হচ্ছে।" : "Showing " + published.length + " published project" + (published.length===1?".":"s.");
        }
        if (homeGrid && homeSection) {
          homeGrid.innerHTML = featured.length ? featured.map(card).join("") : '<p class="hc-content-note" data-en="Featured projects will appear here when published." data-bn="নির্বাচিত প্রকল্প প্রকাশ করা হলে এখানে দেখানো হবে।">' + (lang()==="bn"?"নির্বাচিত প্রকল্প প্রকাশ করা হলে এখানে দেখানো হবে।":"Featured projects will appear here when published.") + '</p>';
          homeSection.classList.remove("hidden");
        }
      };
      render();
      document.addEventListener("hc:languageChanged", render);
    } catch (error) {
      console.warn("Published project feed unavailable.", error);
      if (projectGrid) projectGrid.innerHTML = '<p class="hc-content-note">Projects could not be loaded right now. Please refresh the page later.</p>';
      if (homeSection) homeSection.classList.add("hidden");
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load); else load();
})();
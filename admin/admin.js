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
  let teamMembers = [];

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
    loadManagedFields();
    loadProjects();
    if ($("teamList")) loadTeam();
  }
  function switchView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("hidden", v.id !== viewId));
    document.querySelectorAll("[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === viewId));
    $("pageTitle").textContent = viewId === "projectsView" ? "Projects" : (viewId === "pagesView" ? "All page content" : (viewId === "teamView" ? "Team Members" : (viewId === "designView" ? "Design Studio" : (viewId === "layoutView" ? "Page Layouts" : (viewId === "builderView" ? "Drag & Drop Builder" : (viewId === "settingsView" ? "Site Settings" : "Website content"))))));
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

  const DESIGN_KEYS = ["themePrimary","themeSecondary","themeAccent","themeText","themeFont","themeContainer","themeRadius","customCss"];
  const SETTINGS_MAP = {siteName:"siteName",siteTagline:"siteTagline",contactEmailGlobal:"contactEmailGlobal",contactPhone:"contactPhone",officeAddress:"officeAddress",footerText:"footerText",socialFacebook:"socialFacebook",socialInstagram:"socialInstagram",socialYoutube:"socialYoutube",socialLinkedin:"socialLinkedin"};
  async function loadManagedFields() {
    try {
      const r = await api("getContent"); const c = r.content || {};
      DESIGN_KEYS.forEach(k => { if ($(k)) $(k).value = c[k] || $(k).value; });
      Object.entries(SETTINGS_MAP).forEach(([id,key]) => { if ($(id)) $(id).value = c[key] || ""; });
    } catch (e) { showStatus("globalStatus", "Could not load design/site settings: " + e.message, false); }
  }
  async function saveManagedForm(formId, keys, statusId) {
    hideStatus(statusId); const content = {};
    keys.forEach(k => { const el = $(k); if (el) content[k] = el.value.trim(); });
    try { await api("saveContent", {content}); showStatus(statusId, "Settings saved. Refresh the public website to view the changes.", true); }
    catch (e) { showStatus(statusId, "Save failed: " + e.message, false); if (/session expired|session missing|unauthorized/i.test(e.message)) expireSession(e.message); }
  }
  $("designForm").addEventListener("submit", e => { e.preventDefault(); saveManagedForm("designForm", DESIGN_KEYS, "designStatus"); });
  $("settingsForm").addEventListener("submit", e => { e.preventDefault(); saveManagedForm("settingsForm", Object.values(SETTINGS_MAP), "settingsStatus"); });
  $("reloadDesign").addEventListener("click", loadManagedFields);
  $("reloadSettings").addEventListener("click", loadManagedFields);

  let layoutSections = [];
  async function loadLayoutPage() {
    hideStatus("layoutStatus"); const page = $("layoutPageSelect").value; const root = $("layoutSections"); root.replaceChildren();
    try {
      const [pageResponse, contentResponse] = await Promise.all([fetch("../" + page, {cache:"no-store"}), api("getContent")]);
      if (!pageResponse.ok) throw new Error("Could not load " + page);
      const doc = new DOMParser().parseFromString(await pageResponse.text(), "text/html");
      const sections = Array.from(doc.querySelectorAll("main > section"));
      const saved = contentResponse.content && contentResponse.content["layout:" + page];
      let config = {}; try { config = saved ? JSON.parse(saved) : {}; } catch (_) {}
      layoutSections = sections.map((el,i)=>({id:String(i),label:(el.getAttribute("aria-label") || el.querySelector("h1,h2,h3")?.textContent || el.className || ("Section " +(i+1))).trim().replace(/\s+/g," ").slice(0,90),visible:config[i]?.visible!==false,order:Number.isFinite(Number(config[i]?.order))?Number(config[i].order):i}));
      if (!layoutSections.length) throw new Error("No page sections were found.");
      layoutSections.forEach((item,i)=>{const row=document.createElement("div");row.className="record-item";row.draggable=true;row.dataset.sectionId=item.id;row.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/plain",item.id);e.dataTransfer.effectAllowed="move";row.style.opacity=".45";});row.addEventListener("dragend",()=>row.style.opacity="1");row.addEventListener("dragover",e=>e.preventDefault());row.addEventListener("drop",e=>{e.preventDefault();const from=e.dataTransfer.getData("text/plain"),to=item.id;if(!from||from===to)return;const a=layoutSections.findIndex(x=>x.id===from),b=layoutSections.findIndex(x=>x.id===to);if(a<0||b<0)return;const moved=layoutSections.splice(a,1)[0];layoutSections.splice(b,0,moved);layoutSections.forEach((x,j)=>x.order=j);Array.from(root.children).forEach(el=>{const found=layoutSections.find(x=>x.id===el.dataset.sectionId);if(found)root.appendChild(el);});Array.from(root.children).forEach((el,j)=>{const title=el.querySelector(".record-details b");if(title)title.textContent=(j+1)+". "+layoutSections[j].label;const input=el.querySelector("input[type=number]");if(input)input.value=String(j);});});const detail=document.createElement("div");detail.className="record-details";const b=document.createElement("b");b.textContent=(i+1)+". "+item.label;const p=document.createElement("p");p.textContent="Section ID: "+item.id;detail.append(b,p);const actions=document.createElement("div");actions.className="record-actions";const visible=document.createElement("label");visible.style.cssText="display:flex;align-items:center;gap:6px;font-size:11px";const cb=document.createElement("input");cb.type="checkbox";cb.checked=item.visible;cb.addEventListener("change",()=>item.visible=cb.checked);visible.append(cb,document.createTextNode("Visible"));const order=document.createElement("input");order.type="number";order.min="0";order.max="99";order.value=String(item.order);order.title="Display order (lower appears first)";order.style.width="75px";order.addEventListener("change",()=>item.order=Math.max(0,Math.min(99,Number(order.value)||0)));actions.append(visible,order);row.append(detail,actions);root.appendChild(row);});
      showStatus("layoutStatus","Loaded "+layoutSections.length+" sections. Drag rows to reorder, or use the order numbers.",true);
    } catch(e){showStatus("layoutStatus",e.message,false);}
  }
  $("loadLayoutPage").addEventListener("click",loadLayoutPage);
  $("saveLayout").addEventListener("click",async()=>{hideStatus("layoutStatus");const page=$("layoutPageSelect").value;const config={};layoutSections.forEach(x=>config[x.id]={visible:x.visible,order:x.order});try{await api("saveContent",{content:{["layout:"+page]:JSON.stringify(config)}});showStatus("layoutStatus","Page layout saved. Refresh the public page to apply it.",true);}catch(e){showStatus("layoutStatus","Could not save layout: "+e.message,false);}});




  // Drag-and-drop page builder: custom content blocks are stored as JSON in the Website Content sheet.
  let builderBlocks = [], selectedBlockId = null;
  const builderPage = () => $("builderPageSelect").value;
  const newBlock = type => ({id:"blk-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),type,visible:true,title:type==="cta"?"Make a difference today":type==="stats"?"Our impact":type==="image"?"Our work in action":type==="features"?"What we do":"A story of change",body:"Add your content here.",imageUrl:"",buttonText:"Learn more",buttonUrl:"about.html",items:[{title:"Education",body:"Support learning and opportunity."},{title:"Health",body:"Improve community wellbeing."},{title:"Protection",body:"Help people live safely."}],stats:[{value:"10,000+",label:"People reached"},{value:"25",label:"Communities"},{value:"15",label:"Projects"}]});
  async function loadBuilder(){hideStatus("builderStatus");$("builderBlocks").textContent="Loading saved sections…";try{const r=await api("getContent"),raw=(r.content||{})["builder:"+builderPage()];builderBlocks=raw?JSON.parse(raw):[];if(!Array.isArray(builderBlocks))builderBlocks=[];selectedBlockId=null;renderBuilder();$("builderEditor").textContent="Select a section above to edit its content.";showStatus("builderStatus","Loaded "+builderBlocks.length+" custom section(s). Drag the handle to reorder.",true);}catch(e){$("builderBlocks").textContent="Could not load builder: "+e.message;showStatus("builderStatus",e.message,false);}}
  function renderBuilder(){const root=$("builderBlocks");root.replaceChildren();if(!builderBlocks.length){const p=document.createElement("p");p.className="muted";p.textContent="No custom sections yet. Add your first section above.";root.append(p);return;}builderBlocks.forEach((b,i)=>{const row=document.createElement("div");row.className="builder-block"+(b.id===selectedBlockId?" selected":"");row.draggable=true;row.dataset.id=b.id;const handle=document.createElement("span");handle.className="drag-handle";handle.textContent="⠿";handle.title="Drag to reorder";const meta=document.createElement("div");meta.className="block-meta";const strong=document.createElement("strong");strong.textContent=(i+1)+". "+(b.title||b.type);const small=document.createElement("small");small.textContent=b.type.toUpperCase()+" · "+(b.visible===false?"Hidden":"Visible");meta.append(strong,small);const actions=document.createElement("div");actions.className="block-actions";[["Edit",()=>selectBuilderBlock(b.id)],["Duplicate",()=>{const copy=JSON.parse(JSON.stringify(b));copy.id="blk-"+Date.now()+"-copy";builderBlocks.splice(i+1,0,copy);renderBuilder();}],[b.visible===false?"Show":"Hide",()=>{b.visible=b.visible===false;renderBuilder();}],["Delete",()=>{if(confirm("Delete this section?")){builderBlocks=builderBlocks.filter(x=>x.id!==b.id);if(selectedBlockId===b.id)selectedBlockId=null;renderBuilder();$("builderEditor").textContent="Select a section above to edit its content.";}}]].forEach(([label,fn])=>{const btn=document.createElement("button");btn.type="button";btn.textContent=label;if(label==="Delete")btn.className="delete";btn.addEventListener("click",fn);actions.append(btn);});row.append(handle,meta,actions);row.addEventListener("click",e=>{if(!e.target.closest("button"))selectBuilderBlock(b.id);});row.addEventListener("dragstart",e=>{row.classList.add("dragging");e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",b.id);});row.addEventListener("dragend",()=>row.classList.remove("dragging"));row.addEventListener("dragover",e=>{e.preventDefault();});row.addEventListener("drop",e=>{e.preventDefault();const from=e.dataTransfer.getData("text/plain"),to=b.id;if(!from||from===to)return;const a=builderBlocks.findIndex(x=>x.id===from),z=builderBlocks.findIndex(x=>x.id===to);if(a<0||z<0)return;const moved=builderBlocks.splice(a,1)[0];builderBlocks.splice(z,0,moved);renderBuilder();});root.append(row);});}
  function addEditorField(root,label,key,value,kind){const wrap=document.createElement("div");wrap.className="field";const l=document.createElement("label");l.textContent=label;const el=document.createElement(kind==="textarea"?"textarea":"input");if(kind!=="textarea")el.type="text";el.value=value||"";el.addEventListener("input",()=>{const b=builderBlocks.find(x=>x.id===selectedBlockId);if(!b)return;if(key.startsWith("_stat")){const i=Number(key.slice(5));b.stats[i].value=el.value;}else if(key.startsWith("_label")){const i=Number(key.slice(6));b.stats[i].label=el.value;}else if(key.startsWith("_itemTitle")){const i=Number(key.slice(10));b.items[i].title=el.value;}else if(key.startsWith("_itemBody")){const i=Number(key.slice(9));b.items[i].body=el.value;}else b[key]=el.value;const row=Array.from($("builderBlocks").children).find(x=>x.dataset.id===selectedBlockId);if(row&&key==="title")row.querySelector("strong").textContent=(builderBlocks.indexOf(b)+1)+". "+el.value;});wrap.append(l,el);root.append(wrap);}
  function selectBuilderBlock(id){selectedBlockId=id;const b=builderBlocks.find(x=>x.id===id);if(!b)return;renderBuilder();const root=$("builderEditor");root.replaceChildren();const grid=document.createElement("div");grid.className="builder-editor-grid";addEditorField(grid,"Section heading","title",b.title,"input");addEditorField(grid,"Body text","body",b.body,"textarea");if(["image","features"].includes(b.type))addEditorField(grid,"Image URL (HTTPS)","imageUrl",b.imageUrl,"input");if(b.type==="cta"){addEditorField(grid,"Button label","buttonText",b.buttonText,"input");addEditorField(grid,"Button link","buttonUrl",b.buttonUrl,"input");}if(b.type==="stats"){(b.stats||[]).forEach((x,i)=>{addEditorField(grid,"Statistic "+(i+1)+" value","_stat"+i,x.value,"input");addEditorField(grid,"Statistic "+(i+1)+" label","_label"+i,x.label,"input");});}if(b.type==="features"){(b.items||[]).forEach((x,i)=>{addEditorField(grid,"Card "+(i+1)+" title","_itemTitle"+i,x.title,"input");addEditorField(grid,"Card "+(i+1)+" text","_itemBody"+i,x.body,"textarea");});}root.append(grid);const note=document.createElement("p");note.className="muted";note.textContent="Changes are held in this editor until you save the page builder.";root.append(note);}
  if($("loadBuilder"))$("loadBuilder").addEventListener("click",loadBuilder);
  if($("addBuilderBlock"))$("addBuilderBlock").addEventListener("click",()=>{const b=newBlock($("builderBlockType").value);builderBlocks.push(b);renderBuilder();selectBuilderBlock(b.id);});
  if($("saveBuilder"))$("saveBuilder").addEventListener("click",async()=>{hideStatus("builderStatus");try{const json=JSON.stringify(builderBlocks);if(json.length>29000)throw new Error("This page builder data is too large. Reduce the number of sections or text length.");await api("saveContent",{content:{["builder:"+builderPage()]:json}});showStatus("builderStatus","Page builder saved to Google Sheets. Refresh the public page to see the changes.",true);}catch(e){showStatus("builderStatus","Could not save: "+e.message,false);}});
  if($("previewBuilder"))$("previewBuilder").addEventListener("click",()=>window.open("../"+builderPage(),"_blank","noopener"));

  function clearProject() {
    $("projectForm").reset();
    $("projectId").value = "";
    $("projectStatus").value = "draft";
    $("projectFeatured").checked = false;
    $("projectImageFile").value = "";
    if ($("projectTitleBn")) $("projectTitleBn").value = "";
    if ($("projectDescriptionBn")) $("projectDescriptionBn").value = "";
    if ($("projectImageUrls")) $("projectImageUrls").value = "";
    if ($("projectImagePreviews")) $("projectImagePreviews").replaceChildren();
    $("projectFormTitle").textContent = "Add project";
    hideStatus("projectStatusMessage");
  }
  $("clearProject").addEventListener("click", clearProject);

  function projectImageList() {
    const urls = ($("projectImageUrls").value || "").split(/\r?\n|,/).map(v => v.trim()).filter(v => /^https:\/\//i.test(v));
    const cover = $("projectImage").value.trim();
    if (cover && /^https:\/\//i.test(cover)) urls.unshift(cover);
    return urls.filter((u, i, a) => a.indexOf(u) === i);
  }
  function updateProjectImagePreview() {
    const urls = projectImageList();
    const root = $("projectImagePreviews");
    if (!root) return;
    root.replaceChildren();
    urls.forEach(url => {
      const img = document.createElement("img");
      img.src = url; img.alt = "Project photo preview"; img.loading = "lazy";
      img.onerror = () => img.remove();
      root.appendChild(img);
    });
  }
  $("projectImage").addEventListener("input", updateProjectImagePreview);
  $("projectImageUrls").addEventListener("input", updateProjectImagePreview);
  $("projectImageFile").addEventListener("change", async function () {
    const files = Array.from(this.files || []);
    if (!files.length) return;
    const status = "projectImageUploadStatus";
    hideStatus(status);
    const accepted = files.filter(file => /^image\/(png|jpeg|webp|gif)$/i.test(file.type) && file.size <= 4 * 1024 * 1024);
    if (accepted.length !== files.length) {
      showStatus(status, "Some files were skipped. Use PNG, JPEG, WebP or GIF images up to 4 MB each.", false);
    }
    const uploaded = [];
    try {
      for (let i = 0; i < accepted.length; i++) {
        const file = accepted[i];
        showStatus(status, "Uploading photo " + (i + 1) + " of " + accepted.length + "…", true);
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "")); reader.onerror = () => reject(new Error("Could not read " + file.name)); reader.readAsDataURL(file);
        });
        const result = await api("uploadProjectImage", { fileName: file.name, mimeType: file.type, base64: dataUrl.split(",")[1] });
        if (!result.url) throw new Error("Upload response did not include an image URL.");
        uploaded.push(result.url);
      }
      const existing = ($("projectImageUrls").value || "").split(/\r?\n/).map(v => v.trim()).filter(Boolean);
      const all = existing.concat(uploaded).filter((u, i, a) => a.indexOf(u) === i);
      $("projectImageUrls").value = all.join("\n");
      if (!$("projectImage").value.trim() && all.length) $("projectImage").value = all[0];
      updateProjectImagePreview();
      showStatus(status, uploaded.length + " photo(s) uploaded successfully.", true);
    } catch (err) {
      showStatus(status, "Image upload failed: " + err.message, false);
    } finally {
      this.value = "";
    }
  });

  $("projectForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    hideStatus("projectStatusMessage");
    const id = $("projectId").value.trim();
    const payload = {
      id: id,
      title: $("projectTitle").value.trim(),
      titleEn: $("projectTitle").value.trim(),
      titleBn: $("projectTitleBn").value.trim(),
      category: $("projectCategory").value.trim(),
      categoryEn: $("projectCategory").value.trim(),
      categoryBn: $("projectCategoryBn").value.trim(),
      location: $("projectLocation").value.trim(),
      locationEn: $("projectLocation").value.trim(),
      locationBn: $("projectLocationBn").value.trim(),
      status: $("projectStatus").value,
      description: $("projectDescription").value.trim(),
      descriptionEn: $("projectDescription").value.trim(),
      descriptionBn: $("projectDescriptionBn").value.trim(),
      imageUrl: $("projectImage").value.trim(),
      imageUrls: projectImageList(),
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
      title.textContent = project.titleEn || project.title || "(Untitled project)";
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
        $("projectTitle").value = project.titleEn || project.title || "";
        $("projectTitleBn").value = project.titleBn || "";
        $("projectCategory").value = project.categoryEn || project.category || "";
        $("projectCategoryBn").value = project.categoryBn || "";
        $("projectLocation").value = project.locationEn || project.location || "";
        $("projectLocationBn").value = project.locationBn || "";
        $("projectStatus").value = project.status || "draft";
        $("projectDescription").value = project.descriptionEn || project.description || "";
        $("projectDescriptionBn").value = project.descriptionBn || "";
        $("projectImage").value = project.imageUrl || "";
        $("projectImageUrls").value = (Array.isArray(project.imageUrls) ? project.imageUrls : (project.imageUrl ? [project.imageUrl] : [])).join("\n");
        updateProjectImagePreview();
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



  function clearTeam(){
    $("teamForm").reset(); $("teamId").value=""; $("teamStatus").value="draft"; $("teamSortOrder").value="0";
    $("teamPhotoFile").value=""; $("teamPhotoUrl").value=""; $("teamPhotoPreview").classList.add("hidden");
    $("teamFormTitle").textContent="Add team member"; hideStatus("teamStatusMessage");
  }
  $("clearTeam").addEventListener("click",clearTeam);
  $("teamPhotoUrl").addEventListener("input",()=>{const u=$("teamPhotoUrl").value.trim(),im=$("teamPhotoPreview");if(u&&/^https:\/\//i.test(u)){im.src=u;im.classList.remove("hidden");}else{im.removeAttribute("src");im.classList.add("hidden");}});
  $("teamPhotoFile").addEventListener("change",async function(){
    const file=this.files&&this.files[0];if(!file)return;const status="teamPhotoUploadStatus";hideStatus(status);
    if(!/^image\/(png|jpeg|webp|gif)$/i.test(file.type)){showStatus(status,"Choose a PNG, JPEG, WebP or GIF image.",false);this.value="";return;}
    if(file.size>4*1024*1024){showStatus(status,"Photo must be 4 MB or smaller.",false);this.value="";return;}
    showStatus(status,"Uploading photo to GitHub…",true);
    try{const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||""));r.onerror=()=>reject(new Error("Could not read photo."));r.readAsDataURL(file);});
      const result=await api("uploadProjectImage",{fileName:file.name,mimeType:file.type,base64:dataUrl.split(",")[1],folder:"team"});
      if(!result.url)throw new Error("Upload response did not include a photo URL.");$("teamPhotoUrl").value=result.url;$("teamPhotoPreview").src=result.url;$("teamPhotoPreview").classList.remove("hidden");showStatus(status,"Photo uploaded to GitHub.",true);
    }catch(err){showStatus(status,"Photo upload failed: "+err.message,false);}
  });
  $("teamForm").addEventListener("submit",async function(e){e.preventDefault();hideStatus("teamStatusMessage");const id=$("teamId").value.trim();const payload={id,name:$("teamName").value.trim(),role:$("teamRole").value.trim(),bio:$("teamBio").value.trim(),photoUrl:$("teamPhotoUrl").value.trim(),status:$("teamStatus").value,sortOrder:Number($("teamSortOrder").value)||0};
    try{await api(id?"updateTeamMember":"createTeamMember",payload);showStatus("teamStatusMessage",id?"Team member updated.":"Team member saved.",true);clearTeam();await loadTeam();}
    catch(err){showStatus("teamStatusMessage","Could not save team member: "+err.message,false);if(/session expired|session missing|unauthorized/i.test(err.message))expireSession(err.message);}
  });
  async function loadTeam(){const root=$("teamList");if(!root)return;root.textContent="Loading team members…";try{const result=await api("adminTeamMembers");teamMembers=Array.isArray(result.team)?result.team:[];renderTeam();}catch(err){root.textContent="Could not load team members: "+err.message;if(/session expired|session missing|unauthorized/i.test(err.message))expireSession(err.message);}}
  function renderTeam(){const root=$("teamList");root.replaceChildren();if(!teamMembers.length){const p=document.createElement("p");p.className="muted";p.textContent="No team members yet. Add the first member above.";root.appendChild(p);return;}
    teamMembers.forEach(m=>{const row=document.createElement("div");row.className="project-row";const info=document.createElement("div");const title=document.createElement("strong");title.textContent=m.name;const badge=document.createElement("span");badge.className="badge";badge.textContent=m.status;const desc=document.createElement("p");desc.textContent=[m.role,m.bio].filter(Boolean).join(" · ");info.append(title,document.createTextNode(" "),badge,desc);if(m.photoUrl){const img=document.createElement("img");img.src=m.photoUrl;img.alt=m.name;img.style.cssText="width:72px;height:72px;object-fit:contain;border-radius:8px;margin-top:8px;background:#f4f6f3";info.appendChild(img);}const actions=document.createElement("div");actions.className="actions";actions.style.marginTop="0";const edit=document.createElement("button");edit.className="secondary";edit.type="button";edit.textContent="Edit";edit.addEventListener("click",()=>{$("teamId").value=m.id;$("teamName").value=m.name||"";$("teamRole").value=m.role||"";$("teamBio").value=m.bio||"";$("teamPhotoUrl").value=m.photoUrl||"";$("teamStatus").value=m.status||"draft";$("teamSortOrder").value=String(m.sortOrder||0);if(m.photoUrl){$("teamPhotoPreview").src=m.photoUrl;$("teamPhotoPreview").classList.remove("hidden");}else $("teamPhotoPreview").classList.add("hidden");$("teamFormTitle").textContent="Edit team member";switchView("teamView");$("teamForm").scrollIntoView({behavior:"smooth",block:"start"});});const del=document.createElement("button");del.className="danger";del.type="button";del.textContent="Delete";del.addEventListener("click",async()=>{if(!confirm('Delete team member "'+m.name+'"? This cannot be undone.'))return;try{await api("deleteTeamMember",{id:m.id});await loadTeam();showStatus("globalStatus","Team member deleted.",true);}catch(err){showStatus("globalStatus","Delete failed: "+err.message,false);}});actions.append(edit,del);row.append(info,actions);root.appendChild(row);});
  }
  $("reloadTeam").addEventListener("click",loadTeam);

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
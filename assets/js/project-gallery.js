(function(){
"use strict";
const config=window.HopeCareConfig, endpoint=config&&config.backend&&config.backend.appsScriptEndpoint;
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const lang=()=>document.documentElement.lang||"en";
function render(projects){
 const root=document.getElementById("project-gallery-grid");if(!root)return;
 const photos=[];
 projects.filter(p=>["published","completed"].includes(String(p.status||"").toLowerCase())).forEach(p=>{
  const urls=Array.isArray(p.imageUrls)?p.imageUrls.slice():[];if(p.imageUrl)urls.unshift(p.imageUrl);
  urls.filter((u,i,a)=>/^https:\/\//i.test(String(u||""))&&a.indexOf(u)===i).forEach((url,i)=>photos.push({url,title:lang()==="bn"?(p.titleBn||p.titleEn||p.title):(p.titleEn||p.title||p.titleBn),desc:lang()==="bn"?(p.descriptionBn||p.descriptionEn||p.description):(p.descriptionEn||p.description||p.descriptionBn),index:i+1}));
 });
 root.innerHTML=photos.length?photos.map(p=>'<article class="gallery-card"><img src="'+esc(p.url)+'" loading="lazy" alt="'+esc(p.title||"Project photo")+'"><div class="gallery-card-content"><h3>'+esc(p.title|| (lang()==="bn"?"প্রকল্পের ছবি":"Project photo"))+'</h3><p>'+esc((p.desc||"").slice(0,180))+'</p></div></article>').join(""):'<p class="gallery-feed-note">'+(lang()==="bn"?"প্রকাশিত প্রকল্পে এখনো কোনো ছবি নেই।":"No photos have been added to published projects yet.")+'</p>';
}
async function load(){const root=document.getElementById("project-gallery-grid");if(!root||!endpoint)return;try{const r=await fetch(endpoint+"?action=projects",{cache:"no-store"});const d=await r.json();if(!r.ok||!(d.ok||d.success)||!Array.isArray(d.projects))throw Error("Could not load project photos");render(d.projects);document.addEventListener("hc:languageChanged",()=>render(d.projects));}catch(e){root.textContent=lang()==="bn"?"প্রকল্পের ছবি লোড করা যায়নি।":"Could not load project photos right now.";console.warn(e);}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load);else load();
})();
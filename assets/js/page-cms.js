/* Hope & Care public page content bridge. Content is stored in the Website content sheet. */
(function(){"use strict";const cfg=window.HopeCareConfig;const endpoint=cfg&&cfg.backend&&cfg.backend.appsScriptEndpoint;if(!endpoint)return;
const page=(location.pathname.split("/").pop()||"index.html").toLowerCase();
function targets(){return Array.from(document.querySelectorAll("main h1,main h2,main h3,main h4,main p,main li,main button")).filter(el=>!el.querySelector("*"));}
async function load(){try{const r=await fetch(endpoint+"?action=content",{method:"GET",redirect:"follow",cache:"no-store"});if(!r.ok)return;const d=await r.json();if(!d||!(d.ok||d.success))return;const c=d.content||{};targets().forEach((el,i)=>{const base="page:"+page+":";const en=base+"en:"+i,bn=base+"bn:"+i,plain=base+"text:"+i;if(el.hasAttribute("data-en")||el.hasAttribute("data-bn")){if(typeof c[en]==="string"&&c[en]!=="")el.setAttribute("data-en",c[en]);if(typeof c[bn]==="string"&&c[bn]!=="")el.setAttribute("data-bn",c[bn]);const lang=(window.HopeCareLanguage&&window.HopeCareLanguage.getLanguage())||document.documentElement.lang||"en";const v=c[lang==="bn"?bn:en];if(typeof v==="string"&&v!=="")el.textContent=v;}else if(typeof c[plain]==="string"&&c[plain]!=="")el.textContent=c[plain];});
}catch(e){console.warn("Live page content unavailable; showing website defaults.",e)}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load);else load();
})();

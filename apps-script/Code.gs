/**
 * Hope & Care Bangladesh website backend (Google Apps Script).
 * 1) Set GOOGLE_CLIENT_ID in Script Properties to your OAuth Web Client ID.
 * 2) Run setup() once while signed into the organization's Google account.
 * 3) Deploy as Web App, execute as you, access: Anyone. The app verifies Google ID tokens
 *    server-side and only authorizes ADMIN_EMAIL. Never rely on a typed email as identity.
 *
 * Note: test end-to-end after deployment. Google account policies may restrict public Drive
 * links; if setSharing(ANYONE_WITH_LINK) is blocked, use a different public media strategy.
 */
const ADMIN_EMAIL = "hopeandcarebd@gmail.com";
const TAB = {projects:"Projects",contacts:"Contact messages",volunteers:"Volunteer applications",sessions:"Admin sessions",content:"Website content",media:"Media"};
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function setup() {
  const props=PropertiesService.getScriptProperties();
  let sid=props.getProperty("SPREADSHEET_ID"),ss=sid?SpreadsheetApp.openById(sid):SpreadsheetApp.create("Hope & Care Bangladesh — Website Data");
  props.setProperty("SPREADSHEET_ID",ss.getId());
  ensure_(ss,TAB.projects,["id","title","category","location","description","imageUrl","status","createdAt","updatedAt"]);
  ensure_(ss,TAB.contacts,["createdAt","name","email","subject","message","language","page"]);
  ensure_(ss,TAB.volunteers,["createdAt","name","email","phone","interest","message","language","page"]);
  ensure_(ss,TAB.sessions,["tokenHash","email","expiresAt"]);
  ensure_(ss,TAB.content,["key","value","updatedAt"]);
  ensure_(ss,TAB.media,["id","name","mimeType","url","driveFileId","description","createdAt"]);
  seedContent_(ss);
  let fid=props.getProperty("DRIVE_FOLDER_ID");
  if(!fid)fid=DriveApp.createFolder("Hope & Care Bangladesh — Website Files").getId();
  props.setProperty("DRIVE_FOLDER_ID",fid);
  return {spreadsheetId:ss.getId(),driveFolderId:fid};
}
function doGet(e){
  const action=String((e&&e.parameter&&e.parameter.action)||"");
  if(action==="projects")return out_({ok:true,success:true,projects:publicProjects_()});
  if(action==="content"||action==="publicContent")return out_({ok:true,success:true,content:publicContent_()});
  return out_({ok:true,success:true,service:"Hope & Care Bangladesh API",version:"2.0.0",status:"online",submissionsEnabled:true,adminLoginEnabled:true,actions:["projects","content","adminLoginToken","getContent","saveContent"]});
}
function doPost(e){
  try{
    const p=parse_(e);
    // Accept the field/action aliases used by the currently deployed admin client.
    let a=String(p.action||p.kind||p.formType||p.form_type||p.type||"");
    const aliases={admin_login:"adminLoginToken",adminLogin:"adminLoginToken",login:"adminLoginToken",get_content:"getContent",save_content:"saveContent",admin_projects:"adminProjects",create_project:"createProject",update_project:"updateProject",delete_project:"deleteProject",contact_form:"contact",volunteer_form:"volunteer"};
    a=aliases[a]||a;
    if(a==="contact"||a==="volunteer")return savePublicForm_(p,a);
    if(a==="adminLogin")return login_(p);
    if(a==="adminLoginToken")return loginWithAdminToken_(p);
    if(a==="adminProjects"){auth_(p);return out_({ok:true,success:true,projects:allProjects_()})}
    if(a==="createProject"){auth_(p);return out_({ok:true,success:true,project:writeProject_(p,false)})}
    if(a==="updateProject"){auth_(p);return out_({ok:true,success:true,project:writeProject_(p,true)})}
    if(a==="deleteProject"){auth_(p);deleteProject_(p.id);return out_({ok:true,success:true})}
    if(a==="getContent"){auth_(p);return out_({ok:true,success:true,content:allContent_()})}
    if(a==="saveContent"){auth_(p);return out_({ok:true,success:true,content:saveContent_(p.content||{})})}
    if(a==="uploadFile"){auth_(p);return out_({ok:true,success:true,file:uploadFile_(p)})}
    throw Error("Unknown action");
  }catch(err){return out_({ok:false,success:false,error:String(err&&err.message||err),message:String(err&&err.message||err)})}
}
function parse_(e){if(e&&e.postData&&e.postData.contents){try{return JSON.parse(e.postData.contents)}catch(_){}}return (e&&e.parameter)||{}}
function login_(p){
  const claims=verifyGoogleIdToken_(String(p.idToken||""));
  if(claims.email.toLowerCase()!==ADMIN_EMAIL.toLowerCase())throw Error("This Google account is not authorized for the admin panel.");
  const token=Utilities.getUuid()+Utilities.getUuid(),expires=Date.now()+21600000;
  ss_().getSheetByName(TAB.sessions).appendRow([hash_(token),claims.email,expires]);
  return out_({ok:true,success:true,email:claims.email,token,expiresAt:expires});
}

function loginWithAdminToken_(p){
  const supplied=String(p.adminToken||"");
  const expected=PropertiesService.getScriptProperties().getProperty("ADMIN_TOKEN");
  if(!expected)throw Error("Backend setup incomplete: set ADMIN_TOKEN in Apps Script Script Properties.");
  if(!supplied || supplied.length<16 || !constantTimeEquals_(supplied,expected))throw Error("Invalid Apps Script Token Value.");
  const token=Utilities.getUuid()+Utilities.getUuid(),expires=Date.now()+21600000;
  ss_().getSheetByName(TAB.sessions).appendRow([hash_(token),ADMIN_EMAIL,expires]);
  return out_({ok:true,success:true,email:ADMIN_EMAIL,token,expiresAt:expires});
}
function constantTimeEquals_(a,b){
  a=String(a);b=String(b);if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;
}
function verifyGoogleIdToken_(idToken){
  if(!idToken)throw Error("Google sign-in token missing. Please sign in again.");
  const clientId=PropertiesService.getScriptProperties().getProperty("GOOGLE_CLIENT_ID");
  if(!clientId)throw Error("Backend setup incomplete: set GOOGLE_CLIENT_ID in Apps Script Script Properties.");
  const res=UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?id_token="+encodeURIComponent(idToken),{muteHttpExceptions:true});
  if(res.getResponseCode()!==200)throw Error("Google sign-in token could not be verified.");
  const c=JSON.parse(res.getContentText());
  if(String(c.aud)!==clientId)throw Error("Google token audience does not match this website.");
  if(String(c.email_verified)!=="true")throw Error("Google account email is not verified.");
  if(Number(c.exp)<=Math.floor(Date.now()/1000))throw Error("Google sign-in token expired. Sign in again.");
  if(!c.email)throw Error("Google account email is missing.");
  return c;
}
function auth_(p){
  const token=String(p.token||"");if(!token)throw Error("Admin session missing. Sign in again.");
  // Session token is issued only after server-side verification of ADMIN_TOKEN or the legacy Google login.
  const rows=ss_().getSheetByName(TAB.sessions).getDataRange().getValues(),h=hash_(token),now=Date.now();
  for(let i=rows.length-1;i>=1;i--)if(String(rows[i][0])===h&&String(rows[i][1]).toLowerCase()===ADMIN_EMAIL.toLowerCase()&&Number(rows[i][2])>now){
    if(p.idToken){const claims=verifyGoogleIdToken_(String(p.idToken));if(String(claims.email).toLowerCase()!==ADMIN_EMAIL.toLowerCase())throw Error("Unauthorized Google account.");}
    return;
  }
  throw Error("Admin session expired. Sign in again.");
}
function savePublicForm_(p,kind){
  const name=clean_(p.name,100),email=clean_(p.email,150),msg=clean_(p.message,3000);
  if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error("Please provide a valid name and email.");
  if(kind==="contact") {
    ss_().getSheetByName(TAB.contacts).appendRow([new Date(),name,email,clean_(p.subject,160),msg,clean_(p.language,10),clean_(p.page,500)]);
    try { MailApp.sendEmail(ADMIN_EMAIL,"Website contact message: "+clean_(p.subject,160),"Name: "+name+"\nEmail: "+email+"\nSubject: "+clean_(p.subject,160)+"\n\n"+msg); } catch(mailErr) { console.error("Contact notification email failed: "+mailErr); }
  } else {
    const phone=clean_(p.phone,40),interest=clean_(p.interest,120);
    ss_().getSheetByName(TAB.volunteers).appendRow([new Date(),name,email,phone,interest,msg,clean_(p.language,10),clean_(p.page,500)]);
    try { MailApp.sendEmail(ADMIN_EMAIL,"New volunteer application — "+name,"A new volunteer application was received.\n\nName: "+name+"\nEmail: "+email+"\nPhone: "+phone+"\nInterest: "+interest+"\nMessage: "+msg); } catch(mailErr) { console.error("Volunteer admin notification failed: "+mailErr); }
    try { MailApp.sendEmail(email,"Thank you for volunteering with Hope & Care Bangladesh","Dear "+name+",\n\nThank you for your interest in volunteering with Hope & Care Bangladesh. We have received your application and our team will review it.\n\nWith gratitude,\nHope & Care Bangladesh"); } catch(mailErr) { console.error("Volunteer confirmation email failed: "+mailErr); }
  }
  return out_({ok:true,success:true});
}
function writeProject_(p,updating){
  const title=clean_(p.title,140),description=clean_(p.description,1200);if(!title||!description)throw Error("Title and description are required.");
  const s=ss_().getSheetByName(TAB.projects),rows=s.getDataRange().getValues();let id=clean_(p.id,80),row=-1;
  if(updating){for(let i=1;i<rows.length;i++)if(String(rows[i][0])===id){row=i+1;break}if(row<0)throw Error("Project not found.");}else id=Utilities.getUuid();
  const old=updating?rows[row-1]:null,now=new Date(),created=old?old[7]:now,url=clean_(p.imageUrl,1000);
  if(url&&!/^https:\/\//i.test(url))throw Error("Image URL must start with https://");
  const status=["draft","published","completed"].includes(String(p.status))?String(p.status):"draft";
  const values=[id,title,clean_(p.category,80),clean_(p.location,120),description,url,status,created,now];
  if(updating)s.getRange(row,1,1,values.length).setValues([values]);else s.appendRow(values);return projectObject_(values);
}
function deleteProject_(id){const s=ss_().getSheetByName(TAB.projects),r=s.getDataRange().getValues();for(let i=1;i<r.length;i++)if(String(r[i][0])===String(id)){s.deleteRow(i+1);return}throw Error("Project not found.");}
function uploadFile_(p){
  const name=clean_(p.fileName,180),mime=clean_(p.mimeType,100),b64=String(p.base64||"");
  if(!name||!b64)throw Error("File name or content missing.");
  if(!(/^image\/(png|jpeg|gif|webp|svg\+xml)$/i.test(mime)||mime==="application/pdf"))throw Error("Only PNG, JPEG, GIF, WebP, SVG and PDF files are allowed.");
  const bytes=Utilities.base64Decode(b64);if(bytes.length>MAX_UPLOAD_BYTES)throw Error("File exceeds 5 MB limit.");
  const folder=DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("DRIVE_FOLDER_ID"));
  const blob=Utilities.newBlob(bytes,mime,name),file=folder.createFile(blob);
  file.setDescription(clean_(p.description,300));
  try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(err){file.setTrashed(true);throw Error("Google Drive could not enable public view links. Check your Google account or organization sharing policy.");}
  const id=Utilities.getUuid(),url="https://drive.google.com/uc?export=view&id="+file.getId();
  ss_().getSheetByName(TAB.media).appendRow([id,name,mime,url,file.getId(),clean_(p.description,300),new Date()]);
  return {id:id,name:name,mimeType:mime,url:url,driveFileId:file.getId()};
}

function seedContent_(ss){
  const defaults={
    heroTitle:"Small acts of care. Lasting change.",
    heroCopy:"We work alongside communities to support vulnerable people and create opportunities for a more hopeful future.",
    aboutText:"Hope & Care Bangladesh is a community-based social initiative committed to supporting vulnerable people and creating meaningful opportunities through grassroots action, volunteer engagement, and meaningful partnerships.",
    missionText:"Connect people, resources, and local action so vulnerable individuals and families can access support, dignity, and opportunity.",
    visionText:"A caring, inclusive Bangladesh where people are empowered to shape brighter futures together.",
    valuesText:"We listen first, act transparently, and build solutions with communities—not just for them.",
    activitiesIntro:"Our activities respond to local needs and grow through participation, volunteer time, and trusted partnerships.",
    projectsIntro:"Explore initiatives we’re building with communities. Published projects can be managed in the admin workspace.",
    contactEmail:ADMIN_EMAIL,logoUrl:"",bannerUrl:""
  };
  const sheet=ss.getSheetByName(TAB.content),rows=sheet.getDataRange().getValues(),existing={};
  for(let i=1;i<rows.length;i++)existing[String(rows[i][0])]=true;
  Object.keys(defaults).forEach(k=>{if(!existing[k])sheet.appendRow([k,defaults[k],new Date()]);});
}

function saveContent_(obj){
  const allowed=["heroTitle","heroCopy","aboutText","missionText","visionText","valuesText","activitiesIntro","projectsIntro","contactEmail","logoUrl","bannerUrl"];
  // Page content keys use page:<filename>:<field>; only known website pages are accepted.
  const pageFiles=["index.html","about.html","programs.html","projects.html","impact.html","gallery.html","news.html","contact.html","donate.html","reports.html","team.html","volunteer.html","privacy.html"];
  Object.keys(obj||{}).forEach(k=>{if(/^page:[a-z0-9-]+\.html:(?:text|en|bn):\d+$/.test(k)){const page=k.split(":")[1];if(pageFiles.includes(page))allowed.push(k);}});
  const s=ss_().getSheetByName(TAB.content),rows=s.getDataRange().getValues(),map={};
  for(let i=1;i<rows.length;i++)map[String(rows[i][0])]=i+1;
  allowed.forEach(k=>{if(obj[k]!==undefined){const v=clean_(obj[k],k==="aboutText"?1500:(k.startsWith("page:")?3000:1000));if(k==="contactEmail"&&v&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))throw Error("Contact email is invalid.");if((k==="logoUrl"||k==="bannerUrl")&&v&&!/^https:\/\//i.test(v))throw Error("Image URLs must start with https://");const row=[k,v,new Date()];if(map[k])s.getRange(map[k],1,1,3).setValues([row]);else s.appendRow(row);}});
  return allContent_();
}
function allContent_(){const rows=ss_().getSheetByName(TAB.content).getDataRange().getValues(),o={};rows.slice(1).forEach(r=>{if(r[0])o[String(r[0])]=String(r[1]||"")});return o;}
function publicContent_(){return allContent_();}
function publicProjects_(){return allProjects_().filter(p=>["published","completed"].includes(p.status));}
function allProjects_(){const r=ss_().getSheetByName(TAB.projects).getDataRange().getValues();return r.slice(1).filter(x=>x[0]).map(projectObject_).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));}
function projectObject_(r){return {id:String(r[0]),title:String(r[1]||""),category:String(r[2]||""),location:String(r[3]||""),description:String(r[4]||""),imageUrl:String(r[5]||""),status:String(r[6]||"draft"),createdAt:r[7] instanceof Date?r[7].toISOString():String(r[7]||""),updatedAt:r[8] instanceof Date?r[8].toISOString():String(r[8]||"")};}
function ensure_(ss,n,headers){let s=ss.getSheetByName(n);if(!s)s=ss.insertSheet(n);if(!s.getLastRow())s.appendRow(headers);return s;}
function ss_(){const id=PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");if(!id)throw Error("Backend not initialized: run setup() in Apps Script.");return SpreadsheetApp.openById(id);}
function clean_(v,n){return String(v==null?"":v).replace(/[\u0000-\u001F]/g," ").trim().slice(0,n||3000);}
function hash_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s,Utilities.Charset.UTF_8).map(b=>("0"+(b&255).toString(16)).slice(-2)).join("");}
function out_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}

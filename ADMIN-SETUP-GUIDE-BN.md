# Hope & Care Bangladesh — Admin + Google Sheets setup (বাংলা)

## এই প্যাকেজে কী যুক্ত হয়েছে
- `assets/js/config.js` হলো একমাত্র shared Apps Script Web App URL configuration। Admin এবং public forms এই URL ব্যবহার করে; URL প্রতিটি ফাইলে আলাদা করে কপি করার প্রয়োজন নেই।
- `admin/admin.js` login action `adminLoginToken` পাঠায় এবং backend-এর `ok`/`success` response দুটোই গ্রহণ করে।
- `apps-script/Code.gs`-এ `adminLoginToken`, projects CRUD, website content read/write, public contact/volunteer form এবং page content keys support আছে। পুরোনো `admin_login`, `formType`/`type`-এর কিছু alias-ও গ্রহণ করে।
- Admin Panel-এর **All page content** section থেকে Home, About, Programs, Projects, Impact, Gallery, News, Contact, Donate, Reports, Team, Volunteer এবং Privacy পেজের main headings, simple paragraphs/list items/buttons edit করা যায়। Text Website content Google Sheet-এ save হয় এবং public page-এ load হয়।
- Projects section থেকে project add/edit/delete করা যায়। Contact/volunteer form submissions Google Sheets-এ যায়; backend authorization সফল হলে email notifications পাঠানোর চেষ্টা করে।

## জরুরি: Apps Script deployment আপডেট করতে হবে
শুধু website ZIP আপলোড করলে live Apps Script code বদলাবে না। `INVALID_FORM_TYPE`-এর কারণ live deployment-এ অন্য/পুরোনো backend code চলার সম্ভাবনা।

1. Apps Script project খুলুন, যে project-টি এই Web App URL-এর deployment-এর সঙ্গে যুক্ত।
2. `apps-script/Code.gs`-এর সম্পূর্ণ code Apps Script editor-এর `Code.gs`-এ বসান (পুরোনো code-এর backup রাখুন)।
3. **Project Settings → Script Properties**-এ যাচাই করুন:
   - `ADMIN_TOKEN`: কমপক্ষে 16 অক্ষরের গোপন token; এটি GitHub-এ দেবেন না।
   - `SPREADSHEET_ID`: website data-র Google Spreadsheet ID। আগে থেকে live data থাকলে সেই spreadsheet-ই ব্যবহার করুন।
   - `DRIVE_FOLDER_ID`: upload support ব্যবহার করলে Drive folder ID।
4. যদি spreadsheet আগে থেকেই সেটআপ করা থাকে, অকারণে `setup()` চালাবেন না—এটি `SPREADSHEET_ID` না পেলে নতুন spreadsheet বানাতে পারে। প্রথমবার setup দরকার হলে সঠিক spreadsheet property সেট করে তারপর চালান।
5. **Deploy → Manage deployments → Edit** নির্বাচন করে নতুন version deploy করুন। Web app হিসেবে execute as owner এবং access Anyone (আপনার Google Workspace policy অনুমতি দিলে) রাখুন। বিদ্যমান Web App deployment-এর URL একই আছে কি না নিশ্চিত করুন।
6. ওই URL browser-এ খুলে JSON-এ `status: online` দেখুন। তারপর Admin Panel থেকে login পরীক্ষা করুন।

## Website deploy
1. ZIP extract করুন।
2. GitHub repository-র একই folder structure বজায় রেখে files upload/replace করুন।
3. GitHub Pages update হলে `/admin/` খুলুন, `Ctrl+F5` দিন, তারপর login করুন।

## গুরুত্বপূর্ণ সীমা ও নিরাপত্তা
- Admin token কখনও `config.js`, HTML, JavaScript বা GitHub-এ রাখবেন না; শুধু Apps Script Script Properties-এ রাখবেন।
- Google Apps Script-এর live version deploy না করলে নতুন backend code কাজ করবে না।
- Page editor বর্তমানে মূল content-এর simple headings, paragraphs, list items ও buttons-এর text manage করে। Layout/design, navigation structure, arbitrary rich HTML, team member CRUD, gallery image records এবং news/event record CRUD-এর আলাদা management screens এই release-এ নেই; সেগুলোকে আলাদা structured sheet/API/UI হিসেবে যোগ করতে হবে।
- Email send failure হলে form row Sheets-এ save হওয়ার পরেও notification mail নাও যেতে পারে; Apps Script execution logs দেখুন।
- Deployment এবং Google permissions live account দিয়ে পরীক্ষা করতে হবে; package build করার সময় production account-এ login করা সম্ভব নয়।

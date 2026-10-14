# Project Management Update — বাংলা নির্দেশনা

এই আপডেটে Admin Panel থেকে project add/edit/delete, Published/Draft status, Home page Featured নির্বাচন, project photo upload to GitHub এবং public Projects/Home page-এ live rendering যোগ করা হয়েছে।

## 1. GitHub-এ upload

ZIP থেকে `Hope-Care-Website-main`-এর ফাইলগুলো একই repository structure রেখে upload/replace করুন। গুরুত্বপূর্ণ ফাইল:
- `admin/index.html`
- `admin/admin.js`
- `apps-script/Code.gs`
- `assets/js/project-feed.js` (নতুন)
- `assets/js/page-cms.js`
- `assets/css/style.css`
- `index.html`
- `projects.html`

## 2. Apps Script Script Properties

Apps Script project → Project Settings → Script Properties-এ যোগ করুন:
- `GITHUB_TOKEN` = GitHub fine-grained personal access token; repository `hopeandcarebd/Hope-Care-Website`-এর Contents permission **Read and write** হতে হবে।
- `GITHUB_OWNER` = `hopeandcarebd`
- `GITHUB_REPO` = `Hope-Care-Website`
- `GITHUB_BRANCH` = `main` (যদি GitHub Pages অন্য branch থেকে publish হয়, সেই branch দিন)

Token কখনো HTML/JavaScript বা GitHub repository-তে রাখবেন না। এটি শুধু Apps Script Script Properties-এ থাকবে।

## 3. Deploy Apps Script

1. বর্তমান Apps Script code-এর backup নিন।
2. `apps-script/Code.gs`-এর নতুন code বসান।
3. `setup()` একবার চালান। এটি বর্তমান `SPREADSHEET_ID` ব্যবহার করবে এবং Projects sheet-এ `featured` column না থাকলে যোগ করবে; নতুন spreadsheet বানাবেন না যদি `SPREADSHEET_ID` আগে থেকে ঠিক থাকে।
4. প্রয়োজনীয় permissions authorize করুন।
5. Deploy → Manage deployments → Edit → New version → Deploy করুন। একই Web App URL ব্যবহার করতে পারবেন।

## 4. Project publish

1. Admin Panel-এ sign in করুন।
2. Projects-এ project title, description, status দিন।
3. Photo চাইলে Upload project photo to GitHub থেকে ছবি বাছুন। Upload সফল হলে image URL নিজে থেকে পূরণ হবে।
4. `Published` নির্বাচন করুন এবং Home page-এ দেখাতে `Feature this project on the Home page` টিক দিন।
5. Save project চাপুন।

Published/Completed project Projects page-এ দেখা যাবে। Featured টিক দেওয়া Published/Completed project-এর সর্বোচ্চ ৩টি Home page-এ দেখা যাবে। Draft project public page-এ দেখাবে না।

## Important

- GitHub photo upload কাজ করতে Script Properties-এ valid token এবং repository write permission আবশ্যক।
- Upload করা ছবির URL GitHub raw URL হবে; GitHub Pages deployment সম্পন্ন হতে কিছুটা সময় লাগতে পারে।
- Delete action Google Sheets-এর project row মুছে দেয়; GitHub-এ আগের upload করা image file স্বয়ংক্রিয়ভাবে delete করে না।
- এই পরিবেশ থেকে live GitHub, Apps Script, Sheets বা token দিয়ে end-to-end production test করা হয়নি। Deploy-এর পর test project publish করে Home ও Projects page যাচাই করুন।

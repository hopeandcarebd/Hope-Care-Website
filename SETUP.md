# Hope & Care Bangladesh — Smart Admin Panel

## Admin login URL
After publishing the GitHub Pages site, open:
`https://hopeandcarebd.github.io/Hope-Care-Website/admin/`

The login screen uses the supplied Hope & Care Bangladesh logo and asks for **Apps Script Token Value**. The token is verified server-side; it is not stored in GitHub files.

## Configure token login in Google Apps Script
1. Open the Apps Script project connected to your current `/exec` URL.
2. Replace its `Code.gs` with the included `apps-script/Code.gs` (or merge the `adminLoginToken`, `constantTimeEquals_`, and updated `auth_` functions if you have other custom changes).
3. In Apps Script, open **Project Settings → Script Properties** and add:
   - `ADMIN_TOKEN` = a long, unique secret (at least 16 characters; use a password manager to generate it).
   - Keep existing `SPREADSHEET_ID` and `DRIVE_FOLDER_ID` properties if already configured.
4. Save, then **Deploy → Manage deployments → Edit** the Web App deployment and choose a new version. Keep execution as your account and access set as required for your public website.
5. Ensure `config.js` contains the current deployed Web App URL ending in `/exec`.
6. Open the Admin URL and paste the exact value of `ADMIN_TOKEN` into **Apps Script Token Value**, then click **Sign In**.

Never put the secret token in `config.js`, HTML, JavaScript, GitHub, or a public Google Sheet. If exposed, rotate `ADMIN_TOKEN` and redeploy.

## GitHub upload
1. Back up your repository.
2. Extract this ZIP and upload the extracted files/folders to the repository root, replacing matching files.
3. Keep `index.html`, `config.js`, `script.js`, `style.css` at the root, and keep `admin/` and `apps-script/` as folders.
4. Commit changes and wait for GitHub Pages to deploy.

## Important functionality status
The token login endpoint is included in this package, but it only becomes active after you paste the updated `Code.gs` into Apps Script and redeploy it. The current project/content UI forms are still local draft placeholders; Google Sheets/Drive CRUD, real photo uploads, finance/CRM modules, and live publishing still require additional API wiring and end-to-end testing. Do not use it as a production CRM/BMS or store confidential records until those parts are implemented and tested.

# Google Apps Script setup — Hope & Care Bangladesh

This backend is prepared for About-page editing and Team CRUD. It has **not** been deployed to your Google account by this ZIP; you must deploy it yourself because deployment and password setup require your account authorization.

## 1. Update the existing Apps Script project
1. Open the Apps Script project associated with your existing `/exec` URL.
2. Replace the project code with `Code.gs` from this folder. If your existing project has other scripts/triggers, back them up and review before replacing.
3. Save the project.
4. In the function dropdown, select `setupStorage` and click **Run**. Approve Google permissions. It creates a spreadsheet and stores its ID in Script Properties. Check **Execution log** for the spreadsheet URL.
5. Select `setAdminPassword` and click Run only after adding a one-time password argument in the editor, e.g. `function initializeAdminPasswordOnce(){ setAdminPassword('REPLACE-WITH-A-UNIQUE-16-PLUS-CHARACTER-PASSWORD'); }`. Run that helper once, then delete the helper and save. Never put the password in website files or share it in chat.
6. Deploy → Manage deployments → Edit the existing Web app deployment → choose **New version** → Execute as **Me**. Set access to **Anyone** only if you intend the public website to use this endpoint. Save/deploy and authorize if asked. Keep the `/exec` URL unchanged where possible.

## 2. Deploy the website
Upload the full website files, including `admin/`, `assets/js/config.js`, and `google-apps-script/Code.gs` to your GitHub Pages repository. The admin page is `/admin/`.

## 3. Smoke tests
- Open the `/exec` URL: JSON should show status `ready`.
- Open `/exec?action=publicContent`: should return JSON with content and visible team members.
- Sign in at `/admin/`; save a harmless About text edit; confirm it persists after reload.
- Add a test team member, confirm it appears in the public About/Team section, then delete the test member.

## Security and limitations
- Admin password hash and spreadsheet ID are stored in Apps Script Script Properties; the password is never stored in website JS.
- Login tokens expire after 30 minutes and are held in Apps Script cache. A cache eviction requires logging in again.
- The Apps Script web app endpoint is public for public reads; write actions require a valid short-lived session token.
- Browser fetch/CORS behavior depends on the Google Apps Script deployment. Test the admin sign-in after deployment. If the browser reports CORS/redirect errors, the endpoint needs a compatible proxy or a same-origin deployment strategy before live admin edits can work.
- `setupStorage()` creates a new spreadsheet the first time. If you already have a production sheet, adapt `HC_SPREADSHEET_ID` in Script Properties to that sheet and ensure it has the three expected tabs/headers before using it.
- Contact/volunteer submissions are stored by `submitForm` only when wired from the public forms. This package does not automatically enable those forms.

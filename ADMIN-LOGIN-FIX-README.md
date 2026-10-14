# Hope & Care Bangladesh — Admin Login Fix

This update is based on the exact `Hope-Care-Website-main.zip` provided by the site owner.

## Files changed
- `admin/index.html`: updated admin interface to match the existing Apps Script actions and content keys.
- `admin/admin.js`: fixes the login mismatch and aligns all requests with `apps-script/Code.gs`.

## Root cause
The old admin JavaScript sent `action: "login"` with `password`, but the provided Apps Script backend expects `action: "adminLoginToken"` with `adminToken`. The backend returns `{ok:true}`, while the old JavaScript only accepted `{success:true}`. Therefore a valid token could not complete login.

## Before using
1. In the Apps Script project deployed at your existing `/exec` URL, confirm the current `apps-script/Code.gs` code is deployed as a new Web App version. That code already contains `adminLoginToken` and reads `ADMIN_TOKEN` from Script Properties.
2. In Apps Script → Project Settings → Script Properties, set `ADMIN_TOKEN` to a strong private token (at least 16 characters). Do not put it in website files.
3. Confirm `SPREADSHEET_ID` points to your existing spreadsheet and run `setup()` only if the required existing backend tabs have not yet been created. Do not run setup against a different production spreadsheet without checking.
4. Upload the updated website files to the same GitHub repository, keeping the folder structure.
5. Open `/admin/` and sign in with the Script Properties token.

## Notes
- Existing public site files and assets are preserved.
- The admin UI is aligned to the actual APIs already present in this Code.gs: website content and projects.
- Login and requests use `text/plain` JSON POST to avoid a JSON Content-Type preflight. Browser CORS/redirect behavior still depends on the Apps Script deployment; if the browser console shows a CORS error, the Apps Script endpoint needs a compatible same-origin/proxy approach.
- JavaScript syntax checked locally; the live Google account, spreadsheet, and browser login were not accessible for end-to-end testing.

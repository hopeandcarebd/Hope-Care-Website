# Hope & Care Bangladesh — Setup

## GitHub Pages
1. Extract this ZIP.
2. Upload the CONTENTS of this folder to the root of `hopeandcarebd/Hope-Care-Website` (not the ZIP itself).
3. Commit the files.
4. Repository Settings → Pages → Deploy from a branch → `main` → `/(root)` → Save.
5. Your likely URL is `https://hopeandcarebd.github.io/Hope-Care-Website/` after Pages deploys.

## Admin panel (OAuth-free starter)
Open `/admin/` on the deployed site. This version provides a local editor and JSON export without Google OAuth. **Changes are stored only in the browser and do not automatically update the public site.** To publish edits, the site needs a real authenticated backend or a Git-based CMS with authentication. Do not put a password in frontend JavaScript; visitors can inspect it.

## Contact forms
The Apps Script URL remains in `config.js` for form/project API compatibility. The existing Apps Script admin API was designed for Google ID-token authentication; this local admin panel does not authenticate to it.

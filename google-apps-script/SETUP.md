# Hope & Care Bangladesh — updated website backend deployment

This release uses the same Google Apps Script backend source at `apps-script/Code.gs` and `google-apps-script/Code.gs`. Deploy this updated source to the existing Apps Script project connected to the website endpoint.

## What the updated backend adds
- Existing Google Sheets storage for website content, projects, messages, volunteers and media.
- A Team members sheet with authenticated create, read, update and delete actions.
- Public read-only endpoint for published team profiles.
- Website-wide design settings, global organization settings and custom CSS saved in the Website content sheet.
- Existing admin token authentication and session validation remain in place.

## Deployment steps
1. Open the Google Apps Script project currently used by the website's `/exec` endpoint.
2. Back up its current source, then replace the project code with `apps-script/Code.gs` from this package.
3. Save. Run `setup()` once from the Apps Script editor and approve the requested Google permissions. The setup function reuses the existing spreadsheet ID in Script Properties and creates the new Team members tab if it is missing.
4. In Project Settings → Script Properties, confirm `ADMIN_TOKEN` is set to a strong secret of at least 16 characters. Do not put this token in website files or share it in chat. The existing `GOOGLE_CLIENT_ID` property can remain if legacy Google login is used.
5. Deploy → Manage deployments → Edit the existing Web app deployment → select **New version**. Keep the existing deployment URL where possible and use the same access policy as the current public website endpoint.
6. Upload the complete website folder to the same hosting location (for example, the GitHub Pages repository). Do not upload only selected HTML files; include the new CSS and JavaScript assets.

## Smoke tests
- Open the existing `/exec` endpoint and confirm the service responds.
- Open `/exec?action=content` and confirm it returns public website content.
- Open `/exec?action=team` and confirm it returns published team profiles (an empty list is normal before profiles are published).
- Sign in at `/admin/`, save a test colour setting, refresh a public page, and confirm the colour change appears.
- Add a test team member in Admin → Team Members, publish it, confirm it appears in the Team page, then delete the test record.
- Test project image upload, contact form and volunteer form after deployment.

## Important notes
- The admin panel requires the backend deployment to be updated before the new design/site settings and Team Members CRUD will work.
- The website's existing Apps Script endpoint is configured in `assets/js/config.js`; retain it unless you intentionally migrate the backend.
- Public content and published team records are read-only. All write operations require a valid authenticated admin session.
- Google Apps Script deployment permissions and Google Drive sharing policies are controlled by the organization's Google account. Test public image URLs and form delivery after deployment.
- Keep a backup of the old Apps Script code and spreadsheet before production deployment.

## Visual Page Builder (new)
After uploading the latest `apps-script/Code.gs` and deploying a new Web App version, open Admin → Drag & Drop Builder. Select a page, load its saved sections, then add Text/Story, Image Feature, Call to Action, Impact Statistics or Three Feature Cards blocks. Drag blocks to reorder; use Edit, Duplicate, Hide/Show and Delete as needed. Save the builder to store the configuration in the existing Website Content sheet. Public pages load the saved blocks automatically through `assets/js/page-cms.js`.

Existing built-in page sections can be reordered and hidden under Admin → Page Layouts (drag the rows to reorder). Builder-created blocks are managed separately in Drag & Drop Builder. Keep a backup of the Google Sheet and website folder before deployment.

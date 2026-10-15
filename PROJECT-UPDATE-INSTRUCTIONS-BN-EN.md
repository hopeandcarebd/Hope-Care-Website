# Hope & Care Bangladesh — Project update notes

This update preserves the Admin Panel sections **Website content**, **Projects**, **Team Members**, and **All page content**.

## What changed
- Project form now accepts English and Bangla title, description, category, and location.
- Project form accepts multiple photos; uploaded photo URLs are saved with the project.
- Homepage featured projects display full descriptions and all project photos directly below the hero. There is no need to click a “View project details” link to read them.
- Projects page displays full project descriptions and all project photos.
- Published/completed project photos appear automatically in the Gallery.
- Project photos use natural image dimensions/aspect ratio and are not cropped or stretched.
- The Apps Script response remains compatible with older projects that only have `title`, `description`, and `imageUrl`.

## Deploy safely
1. Back up the live repository and the current Apps Script code first.
2. Replace the website files with the files in this ZIP while preserving your repository's existing configuration.
3. Copy `apps-script/Code.gs` into the Apps Script project. The duplicate `google-apps-script/Code.gs` is kept in sync for projects using that folder.
4. In Apps Script **Script Properties**, verify `SPREADSHEET_ID` points to your existing data spreadsheet. Do not remove it; otherwise `setup()` may create a new spreadsheet.
5. Run `setup()` once after verifying the existing spreadsheet ID. This adds new project columns without removing existing data.
6. Deploy a **new version** of the Apps Script web app and confirm the website config still points to the correct deployment URL.
7. Test by creating a draft project with two photos, English/Bangla fields, and then publish it. Verify language switching on Home/Projects/Gallery and confirm Team Members and All page content still work.

The code has passed JavaScript syntax checks, but it has not been deployed to or end-to-end tested against your live Apps Script spreadsheet.

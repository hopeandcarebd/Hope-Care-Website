
/**
 * Hope & Care Bangladesh
 * Google Apps Script Backend — Initial Safe Foundation
 *
 * This version:
 * - Provides a basic health/status endpoint.
 * - Does not accept or store form submissions.
 * - Does not expose spreadsheet data.
 * - Does not implement admin authentication yet.
 *
 * IMPORTANT:
 * Do not deploy this as a working form or admin backend.
 */

const APP_CONFIG = Object.freeze({
  organizationName: "Hope & Care Bangladesh",
  version: "0.1.0",
  submissionsEnabled: false
});

/**
 * Basic backend status.
 *
 * This confirms only that the script can respond.
 * It does not confirm spreadsheet connectivity,
 * authentication, or form submission functionality.
 */
function doGet() {
  return jsonResponse({
    success: true,
    application: APP_CONFIG.organizationName,
    version: APP_CONFIG.version,
    status: "initialized",
    submissionsEnabled: APP_CONFIG.submissionsEnabled,
    message: "Backend initialized. Submission services are not enabled."
  });
}

/**
 * Return JSON output.
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Deliberately reject POST requests until server-side
 * validation, authentication, and storage are implemented.
 */
function doPost() {
  return jsonResponse({
    success: false,
    error: "SUBMISSIONS_DISABLED",
    message: "Form submissions are not enabled on this backend."
  });
}

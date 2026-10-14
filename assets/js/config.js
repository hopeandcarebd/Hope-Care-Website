
/*
 * Hope & Care Bangladesh
 * Public Website Configuration
 *
 * Public settings only.
 * Never store passwords, API secrets, private keys,
 * financial data, or admin credentials in this file.
 */

(function () {
  "use strict";

  const CONFIG = {
    organization: {
      name: "Hope & Care Bangladesh",
      email: "hopeandcarebd@gmail.com",
      phone: "+880 1821-988040",
      address: "Shalbahan, Tetulia, Panchagarh, Bangladesh",
      facebook: "https://www.facebook.com/hopeandcarebd",
      website: "https://hopeandcarebd.github.io/Hope-Care-Website/"
    },

    language: {
      default: "en",
      supported: ["en", "bn"],
      storageKey: "hc-language"
    },

    backend: {
      enabled: true,
      appsScriptEndpoint:
        "https://script.google.com/macros/s/AKfycbwvQm4jnvYD10pJRQJ3YbuglcyAGx_v3VQT9eoJc589x1cyqc_Zbdr5l5LGdQIdHK2WKg/exec"
    },

    /*
     * Keep forms disabled until form-handler.js is configured
     * and a real website submission has been tested.
     */
    forms: {
      contactEnabled: true,
      volunteerEnabled: true
    },

    /*
     * Admin access is not implemented by this public config.
     */
    admin: {
      enabled: true
    }
  };

  /*
   * Expose read-only public configuration.
   * This is not a security boundary.
   */
  window.HopeCareConfig = Object.freeze({
    organization: Object.freeze(CONFIG.organization),
    language: Object.freeze(CONFIG.language),
    backend: Object.freeze(CONFIG.backend),
    forms: Object.freeze(CONFIG.forms),
    admin: Object.freeze(CONFIG.admin)
  });
})();

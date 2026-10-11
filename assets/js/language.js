
/* =========================================
   Hope & Care Bangladesh
   Language Switcher: English / Bangla
========================================= */

"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const languageButton = document.getElementById("language-toggle");

  const supportedLanguages = ["en", "bn"];

  function getSavedLanguage() {
    try {
      const savedLanguage = localStorage.getItem("hc-language");

      if (supportedLanguages.includes(savedLanguage)) {
        return savedLanguage;
      }
    } catch (error) {
      // Continue with the default language if storage is unavailable.
    }

    return "en";
  }

  function applyLanguage(language) {
    if (!supportedLanguages.includes(language)) {
      language = "en";
    }

    document.documentElement.lang = language;

    // Update all elements that provide both translations.
    document.querySelectorAll("[data-en][data-bn]").forEach(function (element) {
      const translatedText = element.getAttribute(
        language === "bn" ? "data-bn" : "data-en"
      );

      if (translatedText !== null) {
        element.textContent = translatedText;
      }
    });

    // Update the language switcher's label.
    if (languageButton) {
      languageButton.textContent = language === "en" ? "বাংলা" : "English";

      languageButton.setAttribute(
        "aria-label",
        language === "en"
          ? "Switch language to Bangla"
          : "Switch language to English"
      );

      languageButton.setAttribute("aria-pressed", String(language === "bn"));
    }

    // Save the visitor's language preference.
    try {
      localStorage.setItem("hc-language", language);
    } catch (error) {
      // Language switching still works without saved preferences.
    }

    // Let other scripts respond to language changes if needed.
    document.dispatchEvent(
      new CustomEvent("hc:languageChanged", {
        detail: { language: language }
      })
    );
  }

  // Expose a small API for future website pages.
  window.HopeCareLanguage = {
    setLanguage: applyLanguage,
    getLanguage: function () {
      return document.documentElement.lang || "en";
    }
  };

  // Load the saved language, or use English by default.
  applyLanguage(getSavedLanguage());

  // Toggle between English and Bangla.
  if (languageButton) {
    languageButton.addEventListener("click", function () {
      const currentLanguage = document.documentElement.lang || "en";

      const nextLanguage = currentLanguage === "en" ? "bn" : "en";

      applyLanguage(nextLanguage);
    });
  }
});


/*
 * Hope & Care Bangladesh
 * Public Contact and Volunteer Form Handler
 *
 * Requires:
 *   assets/js/config.js loaded before this file.
 *
 * Supported form markers:
 *   <form data-hc-form="contact">
 *   <form data-hc-form="volunteer">
 *
 * Never put passwords, private keys, or admin credentials here.
 */

(function () {
  "use strict";

  const CONFIG = window.HopeCareConfig;

  function getFormConfig(type) {
    if (!CONFIG || !CONFIG.backend || !CONFIG.forms) {
      return { enabled: false, endpoint: "" };
    }

    const enabled =
      CONFIG.backend.enabled === true &&
      (
        (type === "contact" && CONFIG.forms.contactEnabled === true) ||
        (type === "volunteer" && CONFIG.forms.volunteerEnabled === true)
      );

    return {
      enabled: enabled,
      endpoint: CONFIG.backend.appsScriptEndpoint || ""
    };
  }

  function showMessage(form, message, type) {
    let status = form.querySelector("[data-form-status]");

    if (!status) {
      status = document.createElement("p");
      status.setAttribute("data-form-status", "");
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      form.appendChild(status);
    }

    status.textContent = message;
    status.dataset.statusType = type || "info";
  }

  function getField(form, names) {
    for (const name of names) {
      const field = form.elements.namedItem(name);

      if (field) {
        if (field.type === "checkbox") {
          return field.checked ? (field.value || "yes") : "";
        }

        return String(field.value || "").trim();
      }
    }

    return "";
  }

  function collectPayload(form, type) {
    const payload = {
      action: type,
      type: type,
      name: getField(form, ["name", "fullName", "full_name"]),
      email: getField(form, ["email", "emailAddress", "email_address"]),
      phone: getField(form, ["phone", "mobile", "telephone"]),
      message: getField(form, ["message", "details", "comments"]),

      // Honeypot field: keep empty for real users.
      website: getField(form, ["website"])
    };

    if (type === "contact") {
      payload.subject = getField(form, ["subject", "topic"]);
    }

    if (type === "volunteer") {
      payload.location = getField(form, ["location", "address", "city"]);
      payload.interest = getField(
        form,
        ["interest", "areaOfInterest", "area_of_interest"]
      );
      payload.availability = getField(
        form,
        ["availability", "availableTime", "available_time"]
      );

      const consent = form.elements.namedItem("consent");
      payload.consent = consent
        ? (consent.checked ? "yes" : "no")
        : getField(form, ["consent"]);
    }

    return payload;
  }

  function validatePayload(payload, type) {
    if (!payload.name || !payload.email || !payload.phone) {
      return "Please complete your name, email and phone fields.";
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(payload.email)) {
      return "Please enter a valid email address.";
    }

    if (type === "contact" && !payload.message) {
      return "Please enter your message.";
    }

    if (type === "volunteer" && payload.consent !== "yes") {
      return "Please provide consent before submitting the form.";
    }

    return "";
  }

  async function submitForm(form, type, submitButton) {
    const settings = getFormConfig(type);

    if (!settings.enabled || !settings.endpoint) {
      showMessage(
        form,
        "This form is not enabled yet. Please contact hopeandcarebd@gmail.com.",
        "warning"
      );
      return;
    }

    const payload = collectPayload(form, type);
    const validationMessage = validatePayload(payload, type);

    if (validationMessage) {
      showMessage(form, validationMessage, "warning");
      return;
    }

    // A honeypot value should never be submitted by a normal visitor.
    // Server-side validation remains essential.
    if (payload.website) {
      showMessage(form, "Your submission could not be processed.", "warning");
      return;
    }

    const originalButtonText = submitButton
      ? submitButton.textContent
      : "";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    showMessage(form, "Sending your submission...", "info");

    try {
      /*
       * text/plain avoids the usual JSON Content-Type preflight.
       * The Apps Script doPost() must parse e.postData.contents as JSON.
       */
      const response = await fetch(settings.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload),
        redirect: "follow"
      });

      if (!response.ok) {
        throw new Error("The server returned HTTP " + response.status + ".");
      }

      const result = await response.json();

      if (!result || (result.success !== true && result.ok !== true)) {
        throw new Error(
          result && result.message
            ? result.message
            : "The submission was not accepted."
        );
      }

      showMessage(
        form,
        type === "contact"
          ? "Thank you. Your message has been submitted successfully."
          : "Thank you for volunteering. Your application has been submitted successfully.",
        "success"
      );

      form.reset();
    } catch (error) {
      console.error("Hope & Care form submission failed:", error);

      showMessage(
        form,
        (error && error.message ? error.message + " " : "") + "We could not confirm your submission. Please try again later or contact hopeandcarebd@gmail.com.",
        "error"
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  }

  function initializeForms() {
    const forms = document.querySelectorAll("form[data-hc-form]");

    forms.forEach(function (form) {
      const type = form.getAttribute("data-hc-form");

      if (type !== "contact" && type !== "volunteer") {
        return;
      }

      if (form.dataset.hcHandlerInitialized === "true") {
        return;
      }

      form.dataset.hcHandlerInitialized = "true";

      form.addEventListener("submit", function (event) {
        event.preventDefault();

        const submitButton =
          form.querySelector('button[type="submit"]') ||
          form.querySelector('input[type="submit"]');

        submitForm(form, type, submitButton);
      });
    });

    window.HopeCareForms = Object.freeze({
      initialized: true,
      formsFound: forms.length,
      submissionEnabled: Boolean(
        CONFIG &&
        CONFIG.backend &&
        CONFIG.backend.enabled
      )
    });
  }

  function start() {
    initializeForms();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

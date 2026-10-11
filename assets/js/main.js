
/* =========================================
   Hope & Care Bangladesh
   Main JavaScript
========================================= */

"use strict";

document.addEventListener("DOMContentLoaded", function () {

  /* ---------- 1. Mobile navigation ---------- */

  const menuToggle = document.getElementById("menu-toggle");
  const navigation = document.getElementById("primary-navigation");

  if (menuToggle && navigation) {

    function closeMenu() {
      navigation.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
    }

    function openMenu() {
      navigation.classList.add("is-open");
      menuToggle.setAttribute("aria-expanded", "true");
      menuToggle.setAttribute("aria-label", "Close navigation");
    }

    menuToggle.addEventListener("click", function () {
      const isOpen =
        menuToggle.getAttribute("aria-expanded") === "true";

      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close the menu after selecting a navigation link.
    navigation.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    // Close the menu when the user presses Escape.
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
        menuToggle.focus();
      }
    });

    // Close the mobile menu when the layout returns to desktop.
    window.addEventListener("resize", function () {
      if (window.innerWidth > 850) {
        closeMenu();
      }
    });

    // Close the menu when clicking outside it.
    document.addEventListener("click", function (event) {
      const clickedInsideNavigation =
        navigation.contains(event.target);

      const clickedMenuButton =
        menuToggle.contains(event.target);

      if (!clickedInsideNavigation && !clickedMenuButton) {
        closeMenu();
      }
    });
  }


  /* ---------- 2. Automatic copyright year ---------- */

  const currentYear = document.getElementById("current-year");

  if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
  }


  /* ---------- 3. Smooth in-page navigation ---------- */

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      const targetId = link.getAttribute("href");

      if (!targetId || targetId === "#") {
        return;
      }

      const target = document.querySelector(targetId);

      if (target) {
        event.preventDefault();

        target.scrollIntoView({
          behavior: window.matchMedia(
            "(prefers-reduced-motion: reduce)"
          ).matches ? "auto" : "smooth",
          block: "start"
        });
      }
    });
  });


  /* ---------- 4. Prevent empty placeholder links ---------- */

  document.querySelectorAll('a[href="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
    });
  });

});

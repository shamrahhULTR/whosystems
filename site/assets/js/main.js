/* Whosystems — interactions */

/* ------------------------------------------------------------
   BOOKING_URL: paste your Calendly / Cal.com link between the
   quotes and every "Book a Call" button on the page points there.
   Leave empty to keep buttons scrolling to the contact section.
   ------------------------------------------------------------ */
const BOOKING_URL = "";

(function () {
  "use strict";

  if (BOOKING_URL) {
    document.querySelectorAll(".js-book").forEach(function (a) {
      a.href = BOOKING_URL;
      a.target = "_blank";
      a.rel = "noopener";
    });
  }

  /* Light / dark mode toggle (initial theme is set inline in <head> to avoid flash) */
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var applyThemeColor = function () {
    if (themeMeta) {
      themeMeta.content = document.documentElement.getAttribute("data-theme") === "dark" ? "#101211" : "#F5F5F3";
    }
  };
  applyThemeColor();
  document.querySelectorAll(".js-theme").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      applyThemeColor();
    });
  });

  /* Nav pill: shrink on scroll */
  var nav = document.querySelector(".nav");
  var onScroll = function () {
    nav.classList.toggle("is-scrolled", window.scrollY > 40);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Scroll reveals (staggered per container) */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var seen = new WeakMap();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var parent = el.parentElement;
        var count = seen.get(parent) || 0;
        seen.set(parent, count + 1);
        el.style.setProperty("--d", Math.min(count * 90, 360) + "ms");
        el.classList.add("is-in");
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* Count-up numbers when they scroll into view */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        cio.unobserve(el);
        var target = parseInt(el.getAttribute("data-count"), 10);
        var start = null;
        var dur = 1200;
        var step = function (ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(eased * target);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* Accordions */
  document.querySelectorAll("[data-accordion]").forEach(function (acc) {
    acc.querySelectorAll(".acc__head").forEach(function (head) {
      head.addEventListener("click", function () {
        var item = head.parentElement;
        var wasOpen = item.classList.contains("is-open");
        acc.querySelectorAll(".acc__item.is-open").forEach(function (open) {
          open.classList.remove("is-open");
          open.querySelector(".acc__head").setAttribute("aria-expanded", "false");
        });
        if (!wasOpen) {
          item.classList.add("is-open");
          head.setAttribute("aria-expanded", "true");
        }
      });
    });
  });
})();

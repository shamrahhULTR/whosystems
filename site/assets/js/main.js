/* Whosystems — interactions */

/* ------------------------------------------------------------
   BOOKING_URL: paste your Calendly / Cal.com link between the
   quotes and every "Book a Call" button on the page points there.
   Leave empty to keep buttons scrolling to the contact section.
   ------------------------------------------------------------ */
const BOOKING_URL = "https://cal.com/rjonesshamrahh/15min";

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

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Cinematic scroll layer (GPU-composited, fast) ---- */
  if (!reduceMotion) {
    // Scroll progress bar
    var bar = document.createElement("div");
    bar.className = "scrollbar";
    document.body.appendChild(bar);

    // Word-by-word reveal on big headings
    var headings = document.querySelectorAll(".h2, .hero__title, .leakcta__title");
    headings.forEach(function (h) {
      if (h.dataset.split) return;
      h.dataset.split = "1";
      var walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT, null);
      var textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      textNodes.forEach(function (node) {
        if (!node.nodeValue.trim()) return;
        var frag = document.createDocumentFragment();
        node.nodeValue.split(/(\s+)/).forEach(function (part) {
          if (/^\s+$/.test(part) || part === "") { frag.appendChild(document.createTextNode(part)); return; }
          var span = document.createElement("span");
          span.className = "word";
          span.textContent = part;
          frag.appendChild(span);
        });
        node.parentNode.replaceChild(frag, node);
      });
    });
    if ("IntersectionObserver" in window) {
      var wio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var h = entry.target;
          var words = h.querySelectorAll(".word");
          words.forEach(function (w, i) { w.style.transitionDelay = Math.min(i * 40, 500) + "ms"; });
          h.classList.add("is-revealed");
          wio.unobserve(h);
        });
      }, { threshold: 0.3 });
      headings.forEach(function (h) { wio.observe(h); });
    }

    // Parallax drift — single rAF loop, transform only
    var pxEls = [];
    document.querySelectorAll(".hero__chips .chip, .leakcta__meter, .case__media img").forEach(function (el, i) {
      el.classList.add("parallax");
      pxEls.push({ el: el, speed: (i % 2 === 0 ? -0.06 : -0.1) });
    });
    // Pinned scroll story — scenes swap as you scroll through the tall section
    var story = document.querySelector(".story");
    var scenes = [];
    var ticks = [];
    var storyVids = [];
    var storyIdx = -1;
    if (story) {
      story.classList.add("is-on");
      scenes = Array.prototype.slice.call(story.querySelectorAll(".story__scene"));
      ticks = Array.prototype.slice.call(story.querySelectorAll(".story__tick"));
      storyVids = Array.prototype.slice.call(story.querySelectorAll(".story__vid"));
      scenes.forEach(function (scene) {
        scene.querySelectorAll(".s").forEach(function (el, i) {
          el.style.setProperty("--i", i);
        });
      });
    }
    var applyStory = function () {
      if (!scenes.length) return;
      var rect = story.getBoundingClientRect();
      var span = story.offsetHeight - vh;
      var p = span > 0 ? Math.min(Math.max(-rect.top / span, 0), 1) : 0;
      var idx = Math.min(Math.floor(p * scenes.length), scenes.length - 1);
      scenes.forEach(function (scene, i) {
        var local = Math.min(Math.max(p * scenes.length - i, 0), 1);
        scene.style.setProperty("--sp", local.toFixed(3));
        scene.classList.toggle("is-active", i === idx);
        scene.classList.toggle("is-past", i < idx);
      });
      if (idx !== storyIdx) {
        storyIdx = idx;
        ticks.forEach(function (t, i) { t.classList.toggle("is-active", i === idx); });
        storyVids.forEach(function (v) {
          v.classList.toggle("is-live", parseInt(v.dataset.vid, 10) === idx);
        });
      }
    };

    // Hero fades and drifts up as it scrolls away
    var heroWrap = document.querySelector(".hero .container");

    var ticking = false;
    var vh = window.innerHeight;
    var applyParallax = function () {
      var mid = window.scrollY + vh / 2;
      pxEls.forEach(function (p) {
        var rect = p.el.getBoundingClientRect();
        var center = window.scrollY + rect.top + rect.height / 2;
        var offset = (center - mid) * p.speed;
        p.el.style.setProperty("--py", offset.toFixed(1) + "px");
      });
      if (heroWrap) {
        var hp = Math.min(window.scrollY / (vh * 0.8), 1);
        heroWrap.style.opacity = (1 - hp * 0.7).toFixed(3);
        heroWrap.style.transform = "translateY(" + (-hp * 30).toFixed(1) + "px)";
      }
      applyStory();
      ticking = false;
    };
    var pScroll = function () {
      // progress bar
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? window.scrollY / max : 0) + ")";
      if (!ticking) { ticking = true; requestAnimationFrame(applyParallax); }
    };
    window.addEventListener("scroll", pScroll, { passive: true });
    window.addEventListener("resize", function () { vh = window.innerHeight; }, { passive: true });
    pScroll();

    /* ---- Lenis smooth scroll (buttery inertia; drives native scroll, so
       every scroll listener above keeps working) ---- */
    if (window.Lenis) {
      var lenis = new Lenis({ lerp: 0.09 });
      window.__lenis = lenis;
      var lenisRaf = function (time) { lenis.raf(time); requestAnimationFrame(lenisRaf); };
      requestAnimationFrame(lenisRaf);
      document.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener("click", function (e) {
          var id = a.getAttribute("href");
          if (id.length > 1 && document.querySelector(id)) {
            e.preventDefault();
            lenis.scrollTo(id, { duration: 1.5 });
          }
        });
      });
    }

    /* ---- GSAP ScrollTrigger scrubs ---- */
    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);

      gsap.utils.toArray(".bignum").forEach(function (el) {
        gsap.fromTo(el, { scale: 0.94, opacity: 0.6 }, {
          scale: 1,
          opacity: 1,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 96%", end: "top 55%", scrub: true }
        });
      });

      gsap.utils.toArray(".case__media").forEach(function (el) {
        gsap.fromTo(el, { clipPath: "inset(12% 8% 12% 8% round 22px)" }, {
          clipPath: "inset(0% 0% 0% 0% round 22px)",
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 92%", end: "top 45%", scrub: true }
        });
      });
    }

    /* ---- Videos: desktop-only, data-saver aware, lazy ---- */
    var allowVids = window.matchMedia("(min-width: 720px)").matches &&
      !(navigator.connection && navigator.connection.saveData);
    document.querySelectorAll("video[data-src]").forEach(function (v) {
      if (allowVids) v.src = v.getAttribute("data-src");
    });

    var vids = document.querySelectorAll(".js-vid");
    if ("IntersectionObserver" in window && vids.length) {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var v = en.target;
          if (en.isIntersecting) {
            var p = v.play();
            if (p && p.catch) p.catch(function () {});
          } else {
            v.pause();
          }
        });
      }, { rootMargin: "25% 0px" });
      vids.forEach(function (v) { vio.observe(v); });
    }

    /* ---- Magnetic buttons + card tilt (desktop pointers only) ---- */
    if (window.matchMedia("(pointer: fine)").matches) {
      document.querySelectorAll(".btn").forEach(function (btn) {
        btn.classList.add("js-magnet");
        btn.addEventListener("mousemove", function (e) {
          var r = btn.getBoundingClientRect();
          var x = e.clientX - r.left - r.width / 2;
          var y = e.clientY - r.top - r.height / 2;
          btn.style.transform = "translate(" + (x * 0.16).toFixed(1) + "px," + (y * 0.3).toFixed(1) + "px)";
        });
        btn.addEventListener("mouseleave", function () { btn.style.transform = ""; });
      });

      document.querySelectorAll(".story__visual > *, .case__card").forEach(function (el) {
        el.classList.add("js-tilt");
        el.addEventListener("mousemove", function (e) {
          var r = el.getBoundingClientRect();
          var rx = ((e.clientY - r.top) / r.height - 0.5) * -5;
          var ry = ((e.clientX - r.left) / r.width - 0.5) * 6;
          el.style.transform = "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
        });
        el.addEventListener("mouseleave", function () { el.style.transform = ""; });
      });
    }
  }

  /* Count-up numbers when they scroll into view */
  var counters = document.querySelectorAll("[data-count]");
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

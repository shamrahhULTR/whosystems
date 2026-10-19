/* WHO Revenue Intelligence System. Booking URL lives here and in the hrefs. */
var BOOKING_URL = "https://link.whosystem.com/widget/bookings/revenue-call-15-min";
(function () {
  var root = document.documentElement;
  document.querySelectorAll(".js-book").forEach(function (a) { a.href = BOOKING_URL; a.target = "_blank"; a.rel = "noopener"; });
  var t = document.querySelector(".js-theme");
  if (t) t.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });
  var bar = document.querySelector(".mbar"), book = document.getElementById("book");
  function onScroll() {
    if (!bar) return;
    var nearBook = book && book.getBoundingClientRect().top < window.innerHeight;
    bar.classList.toggle("is-on", window.scrollY > 640 && !nearBook);
  }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  var els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("is-in"); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  els.forEach(function (e) { io.observe(e); });
})();

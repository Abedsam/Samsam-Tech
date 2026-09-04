import { animate, inView } from "https://cdn.jsdelivr.net/npm/motion@11/+esm";

/* ---------- Scroll reveal for .reveal elements ---------- */
document.querySelectorAll(".reveal").forEach(function (el) {
  inView(
    el,
    function () {
      animate(
        el,
        { opacity: [0, 1], y: [24, 0] },
        { duration: 0.7, easing: [0.22, 1, 0.36, 1] }
      );
    },
    { margin: "0px 0px -80px 0px" }
  );
});

/* ---------- Stat counters ---------- */
document.querySelectorAll(".stat-number[data-count]").forEach(function (el) {
  inView(
    el,
    function () {
      var target = parseInt(el.getAttribute("data-count"), 10);
      var suffix = el.getAttribute("data-suffix") || "";
      animate(0, target, {
        duration: 1.2,
        easing: [0.22, 1, 0.36, 1],
        onUpdate: function (latest) {
          el.textContent = Math.round(latest) + suffix;
        }
      });
    },
    { amount: 0.6 }
  );
});

/* Mark Motion as ready so main.js's fallback timer knows it doesn't need to force-reveal. */
document.documentElement.setAttribute("data-motion-ready", "true");

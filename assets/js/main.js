(function () {
  "use strict";

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Sticky header shadow-free tint on scroll ---------- */
  var header = document.getElementById("site-header");
  var onScrollHeader = function () {
    if (window.scrollY > 12) {
      header.style.background = "rgba(1, 38, 36, 0.92)";
    } else {
      header.style.background = "rgba(1, 38, 36, 0.72)";
    }
  };
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---------- Mobile nav ---------- */
  var navToggle = document.getElementById("nav-toggle");
  var mobileNav = document.getElementById("mobile-nav");
  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = mobileNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var revealIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealIo.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" }
    );
    revealEls.forEach(function (el) { revealIo.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* Safety net: ensure content is never permanently hidden */
  setTimeout(function () {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }, 2500);

  /* ---------- Stat counters ---------- */
  var statEls = document.querySelectorAll(".stat-number[data-count]");
  var animateCount = function (el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    var suffix = el.getAttribute("data-suffix") || "";
    var duration = 1200;
    var start = null;

    var step = function (ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = Math.round(target * eased);
      el.textContent = value + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if (statEls.length && "IntersectionObserver" in window) {
    var statIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            statIo.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    statEls.forEach(function (el) { statIo.observe(el); });
  }

  /* ---------- Contact form -> mailto ---------- */
  var form = document.getElementById("contact-form");
  var formNote = document.getElementById("form-note");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var firstname = form.firstname.value.trim();
      var lastname = form.lastname.value.trim();
      var company = form.company.value.trim();
      var email = form.email.value.trim();
      var phone = form.phone.value.trim();
      var message = form.message.value.trim();

      var subject = "Anfrage über samsam-tech.de von " + firstname + " " + lastname;
      var bodyLines = [
        "Vorname: " + firstname,
        "Nachname: " + lastname,
        "Unternehmen: " + (company || "-"),
        "E-Mail: " + email,
        "Telefon: " + (phone || "-"),
        "",
        "Nachricht:",
        message
      ];
      var body = bodyLines.join("\n");

      var mailto =
        "mailto:Info@samsam-tech.de" +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);

      window.location.href = mailto;

      if (formNote) {
        formNote.style.display = "block";
      }
    });
  }

  /* ---------- Hero particle sphere ---------- */
  var canvas = document.getElementById("hero-sphere");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var size = 0;
    var particles = [];
    var rotation = 0;
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      size = Math.max(rect.width, rect.height) || 600;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function buildParticles(count) {
      particles = [];
      var goldenAngle = Math.PI * (3 - Math.sqrt(5));
      for (var i = 0; i < count; i++) {
        var t = i / count;
        var yAxis = 1 - t * 2;
        var radiusAtY = Math.sqrt(1 - yAxis * yAxis);
        var theta = goldenAngle * i;
        particles.push({
          x: Math.cos(theta) * radiusAtY,
          y: yAxis,
          z: Math.sin(theta) * radiusAtY,
          isAccent: Math.random() < 0.12
        });
      }
    }

    function draw() {
      var w = size, h = size;
      ctx.clearRect(0, 0, w, h);
      var cx = w / 2, cy = h / 2;
      var R = w * 0.36;

      var cosR = Math.cos(rotation), sinR = Math.sin(rotation);
      var cosT = Math.cos(rotation * 0.4), sinT = Math.sin(rotation * 0.4);

      var projected = particles.map(function (p) {
        var x1 = p.x * cosR - p.z * sinR;
        var z1 = p.x * sinR + p.z * cosR;
        var y1 = p.y * cosT - z1 * sinT;
        var z2 = p.y * sinT + z1 * cosT;

        var scale = (z2 + 1.6) / 2.6;
        return {
          sx: cx + x1 * R,
          sy: cy + y1 * R,
          scale: scale,
          isAccent: p.isAccent
        };
      });

      projected.sort(function (a, b) { return a.scale - b.scale; });

      projected.forEach(function (p) {
        var r = 1.1 + p.scale * 2.2;
        var alpha = 0.15 + p.scale * 0.75;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        if (p.isAccent) {
          ctx.fillStyle = "rgba(253, 233, 255, " + alpha + ")";
        } else {
          ctx.fillStyle = "rgba(203, 255, 252, " + (alpha * 0.9) + ")";
        }
        ctx.fill();
      });
    }

    function tick() {
      rotation += 0.0022;
      draw();
      if (!reduceMotion) requestAnimationFrame(tick);
    }

    resize();
    buildParticles(window.innerWidth < 720 ? 380 : 720);
    draw();
    if (!reduceMotion) requestAnimationFrame(tick);

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        resize();
        draw();
      }, 150);
    });
  }
})();

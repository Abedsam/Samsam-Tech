(function () {
  "use strict";

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[id="year"]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Liquid-metal button ripple ---------- */
  function initButtonRipple() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".btn-primary");
      if (!btn) return;
      var rect = btn.getBoundingClientRect();
      var ripple = document.createElement("span");
      ripple.className = "btn-ripple";
      ripple.style.left = (e.clientX - rect.left) + "px";
      ripple.style.top = (e.clientY - rect.top) + "px";
      btn.appendChild(ripple);
      ripple.addEventListener("animationend", function () { ripple.remove(); });
    });
  }

  /* ---------- Platform marquee (infinite scrolling chip strip) ---------- */
  function buildPlatformMarquee(track) {
    if (track.dataset.cloned) return;
    var originalChips = Array.prototype.slice.call(track.children);
    var singleSetWidth = track.scrollWidth;
    var gapPx = parseFloat(getComputedStyle(track).columnGap) || 0;
    // The exact distance one full chip-set (plus the gap that follows it)
    // occupies. Shifting the track by precisely this amount - instead of
    // a "-50%" guess - guarantees the wrap point lines up pixel-for-pixel
    // with no blank gap or jump, however many copies get appended below.
    var period = singleSetWidth + gapPx;
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth;

    // Keep duplicating full sets until the track comfortably outlasts one
    // shift-by-a-period animation cycle on the widest realistic screen -
    // otherwise the last copy scrolls past before the loop restarts.
    var copies = Math.max(2, Math.ceil((viewportWidth * 2.5) / period) + 1);
    for (var i = 1; i < copies; i++) {
      originalChips.forEach(function (chip) {
        var clone = chip.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
      });
    }

    var speed = 55; // px per second, constant regardless of copy count
    track.style.setProperty("--marquee-shift", period + "px");
    track.style.animationDuration = (period / speed) + "s";
    track.dataset.cloned = "true";
  }

  function initPlatformMarquee() {
    var tracks = document.querySelectorAll(".platform-marquee__track");
    if (!tracks.length) return;

    // The chip labels render in a fallback font until Google's Inter
    // (loaded with display=swap) finishes downloading. Measuring widths
    // before that swap locks in a --marquee-shift distance that no longer
    // matches the real (reflowed) content once the font swaps in mid-loop -
    // the animation keeps using the stale distance, so the wrap point no
    // longer lines up and the strip visibly stutters/jumps. Waiting for
    // document.fonts.ready avoids measuring on the wrong font.
    var build = function () {
      tracks.forEach(buildPlatformMarquee);
    };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(build).catch(build);
    } else {
      build();
    }
  }

  /* ---------- Sticky header shadow-free tint on scroll ---------- */
  var header = document.getElementById("site-header");
  if (header) {
    var onScrollHeader = function () {
      if (window.scrollY > 12) {
        header.style.background = "rgba(255, 255, 255, 0.96)";
      } else {
        header.style.background = "rgba(255, 255, 255, 0.85)";
      }
    };
    window.addEventListener("scroll", onScrollHeader, { passive: true });
    onScrollHeader();
  }

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

  /* ---------- Dock-style magnetic nav ---------- */
  function initMagneticNav(nav) {
    var links = Array.prototype.slice.call(nav.children).filter(function (el) {
      return el.tagName === "A";
    });
    if (!links.length) return;
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    var maxScale = 1.22;
    var falloff = 70;

    nav.addEventListener("mousemove", function (e) {
      links.forEach(function (a) {
        var rect = a.getBoundingClientRect();
        var center = rect.left + rect.width / 2;
        var dist = Math.abs(e.clientX - center);
        var t = Math.max(0, 1 - dist / falloff);
        var scale = 1 + t * (maxScale - 1);
        a.style.transform = "scale(" + scale.toFixed(3) + ")";
      });
    });

    nav.addEventListener("mouseleave", function () {
      links.forEach(function (a) { a.style.transform = "scale(1)"; });
    });
  }
  document.querySelectorAll(".nav-links").forEach(initMagneticNav);

  /* ---------- Magnetic pull on the closing-CTA button ---------- */
  function initMagneticButton(btn) {
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    btn.addEventListener("mousemove", function (e) {
      var rect = btn.getBoundingClientRect();
      var x = e.clientX - rect.left - rect.width / 2;
      var y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = "translate(" + (x * 0.3).toFixed(1) + "px, " + (y * 0.3).toFixed(1) + "px)";
    });

    btn.addEventListener("mouseleave", function () {
      btn.style.transform = "";
    });
  }
  document.querySelectorAll(".projects-panel .btn-primary").forEach(initMagneticButton);

  /* ---------- Mouse-spotlight reveal on ghost wordmarks ---------- */
  function bindSpotlight(wrap, spot, listenEl) {
    if (!wrap || !spot || !listenEl) return;
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    listenEl.addEventListener("mousemove", function (e) {
      var rect = wrap.getBoundingClientRect();
      var inside = e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom;
      wrap.classList.toggle("is-active", inside);
      if (inside) {
        spot.style.setProperty("--spot-x", (e.clientX - rect.left) + "px");
        spot.style.setProperty("--spot-y", (e.clientY - rect.top) + "px");
      }
    });
    listenEl.addEventListener("mouseleave", function () {
      wrap.classList.remove("is-active");
    });
  }
  document.querySelectorAll(".projects-panel-ghost-wrap").forEach(function (wrap) {
    bindSpotlight(wrap, wrap.querySelector(".projects-panel-ghost-spot"), wrap.closest(".projects-panel"));
  });

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

  /* ---------- Contact form -> Web3Forms backend ---------- */
  var WEB3FORMS_ACCESS_KEY = "8f4a7e89-b8a7-4c5c-8b27-6c4ac8f3e1c7";

  function initContactForm(suffix) {
    var form = document.getElementById("contact-form" + suffix);
    var formNote = document.getElementById("form-note" + suffix);
    if (!form) return;

    var submitBtn = form.querySelector("button[type=submit]");

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var firstname = form.firstname.value.trim();
      var lastname = form.lastname.value.trim();
      var company = form.company.value.trim();
      var email = form.email.value.trim();
      var phone = form.phone.value.trim();
      var message = form.message.value.trim();

      var isEnglish = document.documentElement.lang === "en" || suffix === "-en";
      var subject = (isEnglish ? "Inquiry via samsam-tech.de from " : "Anfrage über samsam-tech.de von ") + firstname + " " + lastname;

      // FormData (not JSON) so the request stays a CORS "simple request" -
      // no preflight OPTIONS round-trip that some browsers/extensions
      // (tracker/ad blockers) intermittently block. This is also the
      // submission style Web3Forms' own docs use.
      var formData = new FormData();
      formData.append("access_key", WEB3FORMS_ACCESS_KEY);
      formData.append("subject", subject);
      formData.append("from_name", firstname + " " + lastname);
      formData.append("Vorname", firstname);
      formData.append("Nachname", lastname);
      formData.append("Unternehmen", company || "-");
      formData.append("E-Mail", email);
      formData.append("Telefon", phone || "-");
      formData.append("Nachricht", message);

      if (submitBtn) submitBtn.disabled = true;
      if (formNote) {
        formNote.style.color = "";
        formNote.textContent = isEnglish ? "Sending…" : "Wird gesendet…";
        formNote.style.display = "block";
      }

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: formData
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { status: res.status, data: data };
          });
        })
        .then(function (result) {
          if (!result.data.success) {
            console.error("Web3Forms submit failed:", result.status, result.data);
            throw new Error(result.data.message || "submit failed");
          }
          form.reset();
          if (formNote) {
            formNote.textContent = isEnglish
              ? "Thank you! Your inquiry has been sent to Samsam-Tech. We'll get back to you within 48 hours."
              : "Danke! Ihre Anfrage wurde an Samsam-Tech gesendet. Wir melden uns innerhalb von 48 Stunden.";
          }
        })
        .catch(function (err) {
          console.error("Contact form: falling back to mailto because:", err);
          // Falls back to the visitor's own mail client (e.g. access key not
          // yet configured, or the Web3Forms request fails for any reason)
          // so the form never just silently does nothing.
          var bodyLines = isEnglish ? [
            "First name: " + firstname,
            "Last name: " + lastname,
            "Company: " + (company || "-"),
            "Email: " + email,
            "Phone: " + (phone || "-"),
            "",
            "Message:",
            message
          ] : [
            "Vorname: " + firstname,
            "Nachname: " + lastname,
            "Unternehmen: " + (company || "-"),
            "E-Mail: " + email,
            "Telefon: " + (phone || "-"),
            "",
            "Nachricht:",
            message
          ];
          window.location.href =
            "mailto:Info@samsam-tech.de" +
            "?subject=" + encodeURIComponent(subject) +
            "&body=" + encodeURIComponent(bodyLines.join("\n"));

          if (formNote) {
            formNote.style.color = "";
            formNote.textContent = isEnglish
              ? "Opening your email program with your inquiry to Samsam-Tech…"
              : "Ihr E-Mail-Programm öffnet sich mit Ihrer Anfrage an Samsam-Tech…";
          }
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* ---------- Hero scroll-scrub (locked-scroll intro sequence) ---------- */
  function initScrollScrubHero(suffix) {
    var section = document.getElementById("sst-hero" + suffix);
    if (!section) return;

    var orb = document.getElementById("sst-orb" + suffix);
    var panel = document.getElementById("sst-panel" + suffix);
    var claim = document.getElementById("sst-claim" + suffix);
    var hint = document.getElementById("sst-hint" + suffix);
    var bar = document.getElementById("sst-bar" + suffix);

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var PANEL_END = 0.34;
    var MARK_START = 0.42;
    var MARK_END = 0.82;
    var SCRUB_DISTANCE = 2600;

    function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
    function ease(t) { return t * t * (3 - 2 * t); }

    var target = 0, cur = 0, vel = 0, last = 0, raf = 0;
    var started = false, locked = false, lockY = 0, touchY = 0;

    function engage() {
      if (locked) return;
      locked = true;
      lockY = window.scrollY;
      var b = document.body.style;
      b.position = "fixed"; b.top = "-" + lockY + "px"; b.left = "0"; b.right = "0"; b.width = "100%";
    }
    function release() {
      if (!locked) return;
      locked = false;
      var b = document.body.style;
      b.position = ""; b.top = ""; b.left = ""; b.right = ""; b.width = "";
      window.scrollTo(0, lockY);
    }

    function addDelta(dy) {
      // clamp per-event delta so trackpad/mouse jumps don't snap the sequence
      var step = (Math.sign(dy) * Math.min(Math.abs(dy), 90)) / SCRUB_DISTANCE;
      target = clamp(target + step, 0, 1);
      if (target > 0.001) started = true;
      if (target >= 0.999) release();
      else if (window.scrollY <= 0) engage();
    }

    function onWheel(e) {
      if (locked || (window.scrollY <= 0 && e.deltaY < 0)) { addDelta(e.deltaY); e.preventDefault(); }
    }
    function onTouchStart(e) { touchY = e.touches[0] ? e.touches[0].clientY : 0; }
    function onTouchMove(e) {
      var y = e.touches[0] ? e.touches[0].clientY : touchY;
      var dy = touchY - y;
      touchY = y;
      if (locked) { addDelta(dy); e.preventDefault(); }
    }
    function onKey(e) {
      if (!locked) return;
      var map = { ArrowDown: 120, PageDown: 600, ArrowUp: -120, PageUp: -600, " ": 400 };
      if (map[e.key] !== undefined) { addDelta(map[e.key]); e.preventDefault(); }
    }

    if (!reduceMotion) {
      engage();
      window.addEventListener("wheel", onWheel, { passive: false });
      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("keydown", onKey);
    } else {
      target = cur = 1;
    }

    function frame(now) {
      var dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;
      var k = 34, d = 2 * Math.sqrt(34) * 1.02; // critically damped spring
      vel += ((target - cur) * k - vel * d) * dt;
      cur += vel * dt;
      if (Math.abs(target - cur) < 0.0002 && Math.abs(vel) < 0.0005) { cur = target; vel = 0; }
      var p = cur;

      if (orb) {
        orb.style.transform = "translate(" + (-p * 16) + "%, " + (p * 3) + "%) scale(" + (1 + p * 0.22) + ")";
        orb.style.filter = "brightness(" + (1 + p * 0.28) + ") saturate(" + (1 + p * 0.2) + ")";
      }
      if (panel) {
        var t1 = 1 - ease(clamp(p / PANEL_END, 0, 1));
        panel.style.opacity = String(t1);
        panel.style.transform = "translateY(" + ((1 - t1) * -28) + "px) scale(" + (0.97 + t1 * 0.03) + ")";
        panel.style.filter = "blur(" + ((1 - t1) * 12) + "px)";
        panel.style.pointerEvents = t1 < 0.4 ? "none" : "auto";
      }
      if (claim) {
        var t2 = ease(clamp((p - MARK_START) / (MARK_END - MARK_START), 0, 1));
        claim.style.opacity = String(t2);
        claim.style.transform = "translateY(" + ((1 - t2) * 22) + "px) scale(" + (0.985 + t2 * 0.015) + ")";
        claim.style.filter = "blur(" + ((1 - t2) * 7) + "px)";
        claim.style.letterSpacing = ((1 - t2) * 0.12) + "em";
      }
      if (hint) hint.style.opacity = started ? "0" : "1";
      if (bar) bar.style.transform = "scaleX(" + p + ")";

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  /* ---------- Circular scroll showcase (Home, desktop) ---------- */
  function initCircularShowcase(suffix) {
    var titleTrack = document.getElementById("circular-titles" + suffix);
    var cardTrack = document.getElementById("circular-cards" + suffix);
    if (!titleTrack || !cardTrack) return;
    var circularWrap = titleTrack.closest(".circular-showcase-wrap");
    if (!circularWrap) return;

    var titleItems = Array.prototype.slice.call(titleTrack.children);
    var cardItems = Array.prototype.slice.call(cardTrack.children);
    var itemCount = titleItems.length;
    var desktopQuery = window.matchMedia("(min-width: 900px)");
    var circularReduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var radiusY = 190;

    function wrap01(v) {
      v = v % 1;
      if (v < 0) v += 1;
      return v;
    }

    function renderCircular(progress) {
      for (var i = 0; i < itemCount; i++) {
        var local = wrap01(i / itemCount - progress);
        var angle = local * Math.PI * 2;
        var y = Math.cos(angle) * radiusY;
        var depth = Math.sin(angle);
        var strength = (depth + 1) / 2;
        var eased = Math.pow(strength, 2.2);
        var scale = 0.7 + eased * 0.3;
        var opacity = 0.14 + eased * 0.86;
        var z = Math.round(eased * 50);

        var transform = "translate(-50%, calc(-50% + " + y + "px)) scale(" + scale + ")";

        titleItems[i].style.transform = transform;
        titleItems[i].style.opacity = opacity;
        titleItems[i].style.zIndex = z;

        cardItems[i].style.transform = transform;
        cardItems[i].style.opacity = opacity;
        cardItems[i].style.zIndex = z;
      }
    }

    renderCircular(0);

    var circularTicking = false;
    function updateCircular() {
      circularTicking = false;
      if (!desktopQuery.matches || circularReduceMotion) return;
      var rect = circularWrap.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var progress = total > 0 ? -rect.top / total : 0;
      progress = Math.max(0, Math.min(1, progress));
      renderCircular(progress);
    }

    if (!circularReduceMotion) {
      window.addEventListener("scroll", function () {
        if (!circularTicking) {
          circularTicking = true;
          requestAnimationFrame(updateCircular);
        }
      }, { passive: true });
      window.addEventListener("resize", updateCircular);
      updateCircular();
    }
  }

  /* ---------- Elastic process accordion (Wie arbeiten wir) ---------- */
  function initElasticProcess(suffix) {
    var elasticProcess = document.getElementById("elastic-process" + suffix);
    if (!elasticProcess) return;

    var elasticPanels = Array.prototype.slice.call(elasticProcess.querySelectorAll(".elastic-panel"));
    var setActivePanel = function (panel) {
      elasticPanels.forEach(function (p) {
        p.classList.toggle("is-active", p === panel);
      });
    };
    elasticPanels.forEach(function (panel) {
      panel.addEventListener("mouseenter", function () { setActivePanel(panel); });
      panel.addEventListener("click", function () { setActivePanel(panel); });
    });
    setActivePanel(elasticPanels[1] || elasticPanels[0]);
  }

  /* ---------- Sticky stacking service cards (Dienstleistungen) ---------- */
  function initStickyStack(suffix) {
    var stickyStack = document.getElementById("sticky-stack" + suffix);
    if (!stickyStack) return;

    var stackCards = Array.prototype.slice.call(stickyStack.querySelectorAll(".sticky-stack-card"));
    var stackCount = stackCards.length;
    var stackReduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function renderStack(progress) {
      stackCards.forEach(function (card, i) {
        var targetScale = Math.max(0.6, 1 - (stackCount - i - 1) * 0.08);
        var rangeStart = i / stackCount;
        var t = rangeStart >= 1 ? 0 : Math.max(0, Math.min(1, (progress - rangeStart) / (1 - rangeStart)));
        var scale = 1 - (1 - targetScale) * t;
        var stagger = i * 14;
        card.style.transform = "translateY(" + stagger + "px) scale(" + scale + ")";
      });
    }

    renderStack(0);

    if (!stackReduceMotion) {
      var stackTicking = false;
      function updateStack() {
        stackTicking = false;
        var rect = stickyStack.getBoundingClientRect();
        var total = stickyStack.offsetHeight - window.innerHeight;
        var progress = total > 0 ? -rect.top / total : 0;
        progress = Math.max(0, Math.min(1, progress));
        renderStack(progress);
      }
      window.addEventListener("scroll", function () {
        if (!stackTicking) {
          stackTicking = true;
          requestAnimationFrame(updateStack);
        }
      }, { passive: true });
      window.addEventListener("resize", updateStack);
      updateStack();
    }
  }

  /* ---------- Project image-expansion slider + lightbox (Projekte) ---------- */
  function initProjectSlider(suffix) {
    var projectTrack = document.getElementById("project-track" + suffix);
    if (!projectTrack) return;
    var projectSlider = document.getElementById("project-slider" + suffix);

    var projectData = suffix === "-en" ? [
      { title: "SJ Corporate Consultants", desc: "Corporate website for a consulting firm in Dubai." },
      { title: "Athlonix", desc: "Modern online shop — currently in development." },
      { title: "Your Idea, Our Execution", desc: "Have a project in mind? We'd love to bring it to life with you." }
    ] : [
      { title: "SJ Corporate Consultants", desc: "Corporate-Website für ein Beratungsunternehmen in Dubai." },
      { title: "Athlonix", desc: "Moderner Online-Shop — aktuell in Entwicklung." },
      { title: "Ihre Idee, unsere Umsetzung", desc: "Sie haben ein Projekt im Kopf? Wir freuen uns, es gemeinsam mit Ihnen umzusetzen." }
    ];

    var projectCards = Array.prototype.slice.call(projectTrack.querySelectorAll(".project-card"));
    var projectDots = Array.prototype.slice.call((projectSlider || document).querySelectorAll(".project-dot"));
    var projectPrev = document.getElementById("project-prev" + suffix);
    var projectNext = document.getElementById("project-next" + suffix);
    var projectCount = projectCards.length;
    var currentProjectIndex = 0;

    function scrollToProject(index) {
      index = Math.max(0, Math.min(projectCount - 1, index));
      currentProjectIndex = index;
      var card = projectCards[index];
      if (card) {
        projectTrack.scrollTo({ left: card.offsetLeft - projectTrack.offsetLeft, behavior: "smooth" });
      }
      projectDots.forEach(function (dot, i) { dot.classList.toggle("is-active", i === index); });
    }

    projectDots.forEach(function (dot) {
      dot.addEventListener("click", function () { scrollToProject(parseInt(dot.getAttribute("data-index"), 10)); });
    });
    if (projectPrev) projectPrev.addEventListener("click", function () { scrollToProject(currentProjectIndex - 1); });
    if (projectNext) projectNext.addEventListener("click", function () { scrollToProject(currentProjectIndex + 1); });

    var projectScrollTimer;
    projectTrack.addEventListener("scroll", function () {
      clearTimeout(projectScrollTimer);
      projectScrollTimer = setTimeout(function () {
        var nearest = 0;
        var minDiff = Infinity;
        projectCards.forEach(function (card, i) {
          var diff = Math.abs(card.offsetLeft - projectTrack.offsetLeft - projectTrack.scrollLeft);
          if (diff < minDiff) { minDiff = diff; nearest = i; }
        });
        currentProjectIndex = nearest;
        projectDots.forEach(function (dot, i) { dot.classList.toggle("is-active", i === nearest); });
      }, 120);
    }, { passive: true });

    /* Lightbox */
    var lightbox = document.getElementById("project-lightbox" + suffix);
    var lightboxFrame = document.getElementById("lightbox-frame" + suffix);
    var lightboxTitle = document.getElementById("lightbox-title" + suffix);
    var lightboxDesc = document.getElementById("lightbox-desc" + suffix);
    var lightboxClose = document.getElementById("lightbox-close" + suffix);
    var lightboxPrev = document.getElementById("lightbox-prev" + suffix);
    var lightboxNext = document.getElementById("lightbox-next" + suffix);
    var lightboxIndex = 0;

    function openLightbox(index) {
      lightboxIndex = index;
      var data = projectData[index];
      var logoImg = projectCards[index].querySelector(".project-card-logo img");
      lightboxFrame.className = "project-lightbox-frame project-card";
      lightboxFrame.setAttribute("data-index", index);
      lightboxFrame.innerHTML =
        '<div class="project-card-bg" aria-hidden="true"><span></span><span></span></div>' +
        (logoImg ? '<div class="project-card-logo"><img src="' + logoImg.getAttribute("src") + '" alt="' + logoImg.getAttribute("alt") + '"></div>' : "") +
        '<div class="project-card-overlay"></div>';
      lightboxTitle.textContent = data.title;
      lightboxDesc.textContent = data.desc;
      lightbox.classList.add("is-open");
    }

    function closeLightbox() {
      lightbox.classList.remove("is-open");
    }

    projectCards.forEach(function (card, i) {
      card.addEventListener("click", function () { openLightbox(i); });
    });
    projectTrack.querySelectorAll(".project-card-cta[href]").forEach(function (link) {
      link.addEventListener("click", function (e) { e.stopPropagation(); });
    });

    if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
    if (lightbox) {
      lightbox.addEventListener("click", function (e) {
        if (e.target === lightbox) closeLightbox();
      });
    }
    if (lightboxPrev) lightboxPrev.addEventListener("click", function () { openLightbox((lightboxIndex - 1 + projectCount) % projectCount); });
    if (lightboxNext) lightboxNext.addEventListener("click", function () { openLightbox((lightboxIndex + 1) % projectCount); });

    document.addEventListener("keydown", function (e) {
      if (!lightbox || !lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") openLightbox((lightboxIndex - 1 + projectCount) % projectCount);
      if (e.key === "ArrowRight") openLightbox((lightboxIndex + 1) % projectCount);
    });
  }

  /* ---------- FAQ tabs + accordion ---------- */
  function initFaq(suffix) {
    var faqTabsWrap = document.getElementById("faq-tabs" + suffix);
    var faqPanelsWrap = document.getElementById("faq-panels" + suffix);
    if (!faqTabsWrap || !faqPanelsWrap) return;

    var faqTabs = Array.prototype.slice.call(faqTabsWrap.querySelectorAll(".faq-tab"));
    var faqPanels = Array.prototype.slice.call(faqPanelsWrap.querySelectorAll(".faq-panel"));

    function setActiveFaqTab(category) {
      faqTabs.forEach(function (tab) {
        tab.classList.toggle("is-active", tab.getAttribute("data-category") === category);
      });
      faqPanels.forEach(function (panel) {
        panel.classList.toggle("is-active", panel.getAttribute("data-category") === category);
      });
    }

    faqTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        setActiveFaqTab(tab.getAttribute("data-category"));
      });
    });

    function setupFaqAccordion(panel) {
      var items = Array.prototype.slice.call(panel.querySelectorAll(".faq-item"));
      items.forEach(function (item) {
        var question = item.querySelector(".faq-question");
        var answer = item.querySelector(".faq-answer");

        question.addEventListener("click", function () {
          var isOpen = item.classList.contains("is-open");

          items.forEach(function (other) {
            other.classList.remove("is-open");
            other.querySelector(".faq-question").setAttribute("aria-expanded", "false");
            other.querySelector(".faq-answer").style.maxHeight = "";
          });

          if (!isOpen) {
            item.classList.add("is-open");
            question.setAttribute("aria-expanded", "true");
            answer.style.maxHeight = answer.scrollHeight + "px";
          }
        });
      });
    }

    faqPanels.forEach(setupFaqAccordion);
  }

  /* ---------- Init: real site uses "", the combined preview also inits the "-en" copies ---------- */
  ["", "-en"].forEach(function (suffix) {
    initContactForm(suffix);
    initScrollScrubHero(suffix);
    initCircularShowcase(suffix);
    initElasticProcess(suffix);
    initStickyStack(suffix);
    initProjectSlider(suffix);
    initFaq(suffix);
  });
  initPlatformMarquee();
  initButtonRipple();

})();

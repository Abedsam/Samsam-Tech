(function () {
  "use strict";

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[id="year"]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Sticky header shadow-free tint on scroll ---------- */
  var header = document.getElementById("site-header");
  if (header) {
    var onScrollHeader = function () {
      if (window.scrollY > 12) {
        header.style.background = "rgba(1, 38, 36, 0.92)";
      } else {
        header.style.background = "rgba(1, 38, 36, 0.72)";
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
  function initContactForm(suffix) {
    var form = document.getElementById("contact-form" + suffix);
    var formNote = document.getElementById("form-note" + suffix);
    if (!form) return;

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

  /* ---------- Hero scroll-morph cards ---------- */
  function initHeroMorph(suffix) {
    var morphEl = document.getElementById("hero-morph" + suffix);
    var track = document.getElementById("hero-morph-track" + suffix);
    if (!morphEl || !track) return;

    var heroEl = morphEl.closest(".hero");
    var cards = Array.prototype.slice.call(track.children);
    var count = cards.length;
    if (!count) return;

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var radius = 170;

    function circlePosition(i) {
      var angle = (i / count) * Math.PI * 2;
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    }

    function linePosition(i) {
      var spacing = 48;
      var totalWidth = (count - 1) * spacing;
      return { x: i * spacing - totalWidth / 2, y: 0 };
    }

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function setCardTransform(card, x, y, opacity, scale) {
      card.style.transform = "translate(-50%, -50%) translate(" + x + "px, " + y + "px) scale(" + scale + ")";
      card.style.opacity = opacity;
    }

    var scatterPositions = cards.map(function () {
      return { x: (Math.random() - 0.5) * 700, y: (Math.random() - 0.5) * 700 };
    });

    if (reduceMotion) {
      cards.forEach(function (card, i) {
        var c = circlePosition(i);
        card.style.transition = "none";
        setCardTransform(card, c.x, c.y, 1, 1);
      });
      return;
    }

    cards.forEach(function (card, i) {
      var s = scatterPositions[i];
      setCardTransform(card, s.x, s.y, 0, 0.6);
    });

    var restOpacity = 0.4;

    setTimeout(function () {
      cards.forEach(function (card, i) {
        var c = circlePosition(i);
        setCardTransform(card, c.x, c.y, restOpacity, 1);
      });
    }, 200);

    /* Mouse parallax */
    if (heroEl) {
      heroEl.addEventListener("mousemove", function (e) {
        var rect = heroEl.getBoundingClientRect();
        var nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        track.style.transform = "translateX(" + (nx * 20) + "px)";
      });
    }

    /* After the intro settles, morph the circle into a horizontal line as the hero scrolls past */
    var scrollDriven = false;
    var ticking = false;

    function updateMorph() {
      ticking = false;
      if (!scrollDriven || !heroEl) return;
      var heroRect = heroEl.getBoundingClientRect();
      var scrollRange = 320;
      var progress = Math.min(1, Math.max(0, -heroRect.top / scrollRange));

      cards.forEach(function (card, i) {
        var c = circlePosition(i);
        var l = linePosition(i);
        var x = lerp(c.x, l.x, progress);
        var y = lerp(c.y, l.y, progress);
        var opacity = lerp(restOpacity, 1, progress);
        setCardTransform(card, x, y, opacity, 1);
      });
    }

    setTimeout(function () {
      scrollDriven = true;
      cards.forEach(function (card) { card.style.transition = "none"; });
      updateMorph();
    }, 1300);

    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateMorph);
      }
    }, { passive: true });
    window.addEventListener("resize", function () {
      if (scrollDriven) updateMorph();
    });
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
    initHeroMorph(suffix);
    initCircularShowcase(suffix);
    initElasticProcess(suffix);
    initStickyStack(suffix);
    initProjectSlider(suffix);
    initFaq(suffix);
  });

})();

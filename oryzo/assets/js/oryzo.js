(function () {
  var track = document.getElementById('oryzo-hero-track');
  var globe = document.getElementById('oryzo-globe');
  var frame = document.getElementById('oryzo-frame');
  var base = document.getElementById('oryzo-base');
  var reveal = document.getElementById('oryzo-reveal');

  if (!track || !globe || !frame || !base || !reveal) return;

  var ZOOM_STRENGTH = 3.2;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raf = null;

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  function apply() {
    raf = null;
    var vh = window.innerHeight || 1;
    var span = Math.max(track.offsetHeight - vh, 1);
    var p = clamp(-track.getBoundingClientRect().top / span, 0, 1);
    var ease = p * p * (3 - 2 * p);

    if (reduceMotion) {
      globe.style.transform = 'scale(1)';
    } else {
      globe.style.transform = 'scale(' + (1 + (ZOOM_STRENGTH - 1) * ease) + ')';
    }
    globe.style.opacity = String(1 - 0.35 * Math.max(0, (p - 0.7) / 0.3));

    var fade = Math.max(0, 1 - p / 0.42);
    frame.style.opacity = String(fade);
    frame.style.transform = 'translateY(' + (-24 * (1 - fade)) + 'px)';
    base.style.opacity = String(fade);
    base.style.transform = 'translateY(' + (24 * (1 - fade)) + 'px)';

    var r = clamp((p - 0.62) / 0.28, 0, 1);
    reveal.style.opacity = String(r);
    reveal.style.transform = 'translateY(' + (28 * (1 - r)) + 'px)';
    reveal.style.pointerEvents = r > 0.6 ? 'auto' : 'none';
  }

  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(apply);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();

function initAbout() {
  const statsContainer = document.querySelector('#about-stats');
  if (!statsContainer) return;

  // Clean up any previously created spans from a previous page render to avoid double-wrapping
  var about = document.querySelector('.about-para');
  if (about && about.querySelectorAll('.about-word').length > 0) {
    // If already wrapped, let's reset or just skip wrapping
  } else if (about) {
    wrapTextNodesWithSpans(about);
  }

  /* ── STATS COUNTER ── */
  function animateCounter(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    var target = parseInt(el.dataset.target, 10);
    var useComma = el.dataset.format === 'comma';
    var duration = 2000;
    var startTime = null;

    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.floor(eased * target);
      el.textContent = useComma ? current.toLocaleString() : current;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = useComma ? target.toLocaleString() : target;
      }
    }
    requestAnimationFrame(step);
  }

  var statsObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        document.querySelectorAll('#about-stats .count').forEach(animateCounter);
        statsObserver.disconnect();
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px -60px 0px' });

  var statsRow = document.querySelector('#about-stats .stats-row');
  if (statsRow) statsObserver.observe(statsRow);

  /* ── GSAP ABOUT PARAGRAPH WORD COLOUR ANIMATION ── */
  (function () {
    if (!about || typeof gsap === 'undefined') return;
    try { gsap.registerPlugin(ScrollTrigger); } catch (e) {}

    var lightColor = '#B4B4B4';
    var darkColor = '#1a1a1a';
    gsap.set(about.querySelectorAll('.about-word'), { color: lightColor });

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: about,
        start: 'top 80%',
        end: 'bottom 20%',
        scrub: 0.4
      }
    });

    tl.to(about.querySelectorAll('.about-word'), {
      color: darkColor,
      stagger: { each: 0.03, from: 'start' },
      ease: 'none',
      duration: 0.1
    });
  })();

  function wrapTextNodesWithSpans(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach(function (t) {
      if (!t.nodeValue.trim()) return;
      var parts = t.nodeValue.split(/(\s+)/);
      if (parts.length === 1) return;
      var frag = document.createDocumentFragment();
      parts.forEach(function (part) {
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
        } else {
          var span = document.createElement('span');
          span.className = 'about-word';
          span.textContent = part;
          frag.appendChild(span);
        }
      });
      t.parentNode.replaceChild(frag, t);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAbout);
} else {
  initAbout();
}
document.addEventListener('astro:page-load', initAbout);

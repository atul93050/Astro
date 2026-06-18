/* =====================
   SHARED UTILITIES
   ===================== */

/* Set CSS variable for mega dropdown offset so it spans full viewport */
(function () {
  function setNavOffset() {
    var nav = document.querySelector('.nav');
    if (!nav) return;
    var rect = nav.getBoundingClientRect();
    document.documentElement.style.setProperty('--nav-offset', rect.left + 'px');
  }
  window.addEventListener('resize', setNavOffset);
  window.addEventListener('load', setNavOffset);
  setNavOffset();
})();

/* =====================
   CLIENTS LOGO SLIDER JS
   Depends on: jQuery, Slick Carousel
   ===================== */

(function () {
  function initClientsSlider() {
    var slickLogoOpts = {
      slidesToShow: 8,
      slidesToScroll: 1,
      autoplay: true,
      autoplaySpeed: 0,
      speed: 4000,
      cssEase: 'linear',
      arrows: false,
      dots: false,
      infinite: true,
      pauseOnHover: false,
      responsive: [
        { breakpoint: 1200, settings: { slidesToShow: 6 } },
        { breakpoint: 992,  settings: { slidesToShow: 5 } },
        { breakpoint: 576,  settings: { slidesToShow: 3 } }
      ]
    };

    // Re-initialize slider if it's already initialized (prevents bugs during fast navigation)
    var $slider1 = $('.logo-slider-1');
    var $slider2 = $('.logo-slider-2');

    if ($slider1.hasClass('slick-initialized')) {
      $slider1.slick('unslick');
    }
    if ($slider2.hasClass('slick-initialized')) {
      $slider2.slick('unslick');
    }

    if ($slider1.length) $slider1.slick(slickLogoOpts);
    if ($slider2.length) $slider2.slick(slickLogoOpts);
  }

  // Initialize on DOM ready
  $(document).ready(initClientsSlider);

  // Re-run on Astro view transition navigations
  document.addEventListener('astro:page-load', initClientsSlider);
})();

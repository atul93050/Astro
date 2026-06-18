/* =====================
   CLIENTS LOGO SLIDER JS
   Depends on: jQuery, Slick Carousel
   ===================== */

$(document).ready(function () {
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

  $('.logo-slider-1').slick(slickLogoOpts);
  $('.logo-slider-2').slick(slickLogoOpts);
});

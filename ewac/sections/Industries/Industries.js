/* =====================
   INDUSTRIES SECTION JS
   Depends on: jQuery, Slick Carousel
   ===================== */

$('.industries-slider').slick({
  slidesToShow: 4,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 3000,
  speed: 600,
  arrows: true,
  prevArrow: $('.ind-prev'),
  nextArrow: $('.ind-next'),
  dots: false,
  infinite: true,
  pauseOnHover: true,
  responsive: [
    { breakpoint: 1200, settings: { slidesToShow: 3 } },
    { breakpoint: 768,  settings: { slidesToShow: 2 } },
    { breakpoint: 480,  settings: { slidesToShow: 1 } }
  ]
});

/* =====================
   HERO BANNER SLIDER JS
   Depends on: jQuery, Slick Carousel
   ===================== */

var $carousel = $('.banner-slider');

var settings = {
  arrows: true,
  autoplay: true,
  infinite: true,
  autoplaySpeed: 2600,
  speed: 700,
  slide: '.slick-slideshow__slide',
  slidesToShow: 1,
  centerPadding: '0px',
  dots: true,
};

function setSlideVisibility() {
  var visibleSlides = $carousel.find('.slick-slideshow__slide[aria-hidden="false"]');
  $(visibleSlides).each(function () {
    $(this).css('opacity', 1);
  });
}

$carousel.slick(settings);
$carousel.slick('slickGoTo', 1);
setSlideVisibility();

$carousel.on('afterChange', function () {
  setSlideVisibility();
});

/* Slide counter display */
setInterval(function () {
  var number = $('.banner-slider .slick-dots li').length;
  var counter = null;
  for (var i = 0; i < number; i++) {
    if ($('.banner-slider .slick-dots li').eq(i).hasClass('slick-active')) {
      counter = i + 1;
    }
  }
  $('.counter').text(counter);
  $('.number').text(number);
}, 100);

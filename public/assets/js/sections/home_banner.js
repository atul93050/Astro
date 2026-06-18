function initHomeBanner() {
  var $carousel = $('.banner-slider');
  if (!$carousel.length) return;

  if ($carousel.hasClass('slick-initialized')) {
    return;
  }

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
  var counterInterval = setInterval(function () {
    var $dots = $('.banner-slider .slick-dots li');
    var number = $dots.length;
    if (number === 0) return; // Wait until slick dots are rendered

    var counter = null;
    for (var i = 0; i < number; i++) {
      if ($dots.eq(i).hasClass('slick-active')) {
        counter = i + 1;
      }
    }
    $('.counter').text(counter);
    $('.number').text(number);
  }, 100);

  document.addEventListener("astro:before-swap", () => {
    clearInterval(counterInterval);
  }, { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomeBanner);
} else {
  initHomeBanner();
}
document.addEventListener('astro:page-load', initHomeBanner);

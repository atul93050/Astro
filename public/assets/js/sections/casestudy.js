$('.services-slider').slick({
  slidesToShow: 3,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 3500,
  speed: 600,
  arrows: false,
  dots: false,
  infinite: true,
  pauseOnHover: true,
  responsive: [
    { breakpoint: 992, settings: { slidesToShow: 2 } },
    { breakpoint: 600, settings: { slidesToShow: 1 } }
  ]
});

$('#svcPrev').on('click', function() { $('#mainServicesSlider').slick('slickPrev'); });
$('#svcNext').on('click', function() { $('#mainServicesSlider').slick('slickNext'); });
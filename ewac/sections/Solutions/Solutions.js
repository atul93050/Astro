/* =====================
   SOLUTIONS SECTION JS
   Tabs + inner Slick slider
   Depends on: jQuery, Slick Carousel
   ===================== */

function solSlickOpts() {
  return {
    slidesToShow: 3,
    slidesToScroll: 1,
    arrows: false,
    infinite: true,
    speed: 500,
    responsive: [
      { breakpoint: 900, settings: { slidesToShow: 2 } },
      { breakpoint: 560, settings: { slidesToShow: 1 } }
    ]
  };
}

function initSolSlider($pane) {
  var $s = $pane.find('.sol-products-slider');
  if (!$s.hasClass('slick-initialized')) $s.slick(solSlickOpts());
}

initSolSlider($('#sol-maintenance'));

$('.sol-tab-item').on('click', function () {
  if ($(this).hasClass('active')) return;
  var tab = $(this).data('tab');
  $('.sol-tab-item').removeClass('active');
  $(this).addClass('active');
  $('.sol-pane').removeClass('active');
  var $pane = $('#sol-' + tab);
  $pane.addClass('active');
  initSolSlider($pane);
  $('#solDropdown').val(tab);
});

$('#solDropdown').on('change', function () {
  var tab = $(this).val();
  $('.sol-tab-item').removeClass('active');
  $('[data-tab="' + tab + '"]').addClass('active');
  $('.sol-pane').removeClass('active');
  var $pane = $('#sol-' + tab);
  $pane.addClass('active');
  initSolSlider($pane);
});

$('.sol-arr-prev').on('click', function () {
  $('.sol-pane.active .sol-products-slider').slick('slickPrev');
});
$('.sol-arr-next').on('click', function () {
  $('.sol-pane.active .sol-products-slider').slick('slickNext');
});

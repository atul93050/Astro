/* =====================
   FAQ ACCORDION JS
   Depends on: jQuery
   ===================== */

(function () {
  /* Open first item on load */
  var $first = $('.faq-item.active');
  $first.find('.faq-answer').css('max-height', $first.find('.faq-answer')[0].scrollHeight + 'px');

  $('.faq-question').on('click', function () {
    var $item = $(this).closest('.faq-item');
    var isOpen = $item.hasClass('active');

    /* Close all */
    $('.faq-item').removeClass('active');
    $('.faq-answer').css('max-height', '0');

    if (!isOpen) {
      $item.addClass('active');
      $item.find('.faq-answer').css('max-height', $item.find('.faq-answer')[0].scrollHeight + 'px');
    }
  });
})();

/* =====================
   FAQ ACCORDION JS
   Depends on: jQuery
   ===================== */

(function () {
  function initFaqAccordion() {
    /* Open active item on load safely */
    var $first = $('.faq-item.active');
    if ($first.length) {
      var $answer = $first.find('.faq-answer');
      if ($answer.length && $answer[0]) {
        $answer.css('max-height', $answer[0].scrollHeight + 'px');
      }
    }

    // Unbind first to avoid duplicate bindings
    $(document).off('click', '.faq-question').on('click', '.faq-question', function () {
      var $item = $(this).closest('.faq-item');
      var isOpen = $item.hasClass('active');

      /* Close all */
      $('.faq-item').removeClass('active');
      $('.faq-answer').css('max-height', '0');

      if (!isOpen) {
        $item.addClass('active');
        var $answer = $item.find('.faq-answer');
        if ($answer.length && $answer[0]) {
          $answer.css('max-height', $answer[0].scrollHeight + 'px');
        }
      }
    });
  }

  // Initialize on DOM ready
  $(document).ready(initFaqAccordion);
  
  // Re-run on Astro view transition page navigations
  document.addEventListener('astro:page-load', initFaqAccordion);
})();

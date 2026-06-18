/* =====================
   WHY CHOOSE SECTION JS
   Tab switching + dropdown sync
   Depends on: jQuery
   ===================== */

$('.why-tab').on('click', function () {
  if ($(this).hasClass('active')) return;
  $('.why-tab').removeClass('active');
  $(this).addClass('active');
  var tab = $(this).data('tab');
  $('.why-pane').removeClass('active');
  $('#why-' + tab).addClass('active');
  $('#whyDropdown').val(tab);
});

$('#whyDropdown').on('change', function () {
  var tab = $(this).val();
  $('.why-tab').removeClass('active');
  $('[data-tab="' + tab + '"]').addClass('active');
  $('.why-pane').removeClass('active');
  $('#why-' + tab).addClass('active');
});

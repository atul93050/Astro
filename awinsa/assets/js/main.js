


$('.menu-icon').on('click', 'a', function (e) {
    e.preventDefault();
    $('.full-navigation').addClass('active');
    $('.fixed-navigation').addClass('active-index');
    setTimeout(function () {
      $('.full-menu').addClass('open');
      $('.fixed-navigation').addClass('active-main');
    }, 500)
  });
  
  $('.menu-close').on('click', function (e) {
    e.preventDefault();
    $('.fixed-navigation').removeClass('active-index');
    $('.fixed-navigation').removeClass('active-main');
    $('.full-navigation').removeClass('active');
    $('.full-menu').removeClass('open');
  });
  



  $(document).ready(function () {
    function visible(partial) {
        var $t = partial,
            $w = jQuery(window),
            viewTop = $w.scrollTop(),
            viewBottom = viewTop + $w.height(),
            _top = $t.offset().top,
            _bottom = _top + $t.height(),
            compareTop = partial === true ? _bottom : _top,
            compareBottom = partial === true ? _top : _bottom;
    
        return ((compareBottom <= viewBottom) && (compareTop >= viewTop) && $t.is(':visible'));
    
    }
    
    $(window).scroll(function(){
    
      if(visible($('.count-digit')))
        {
          if($('.count-digit').hasClass('counter-loaded')) return;
          $('.count-digit').addClass('counter-loaded');
          
    $('.count-digit').each(function () {
      var $this = $(this);
      jQuery({ Counter: 0 }).animate({ Counter: $this.text() }, {
        duration: 8000,
        easing: 'swing',
        step: function () {
          $this.text(Math.ceil(this.Counter));
        }
      });
    });
        }
    })
    
        });



  $(".change-video").click(function() {
    $('html,body').animate({
        scrollTop: $(".yt-play-section").offset().top - 100},
        'slow');
});

$('.open-search').on('click', function(){
    $('.search-nav').slideToggle()
});




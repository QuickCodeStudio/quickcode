(function($) {
  "use strict"; // Start of use strict

  // Toggle the side navigation
  $("#sidebarToggle, #sidebarToggleTop").on('click', function(e) {
    $("body").toggleClass("sidebar-toggled");
    $(".sidebar").toggleClass("toggled");
    if ($(".sidebar").hasClass("toggled")) {
      // Bootstrap 5 collapse API - use jQuery for compatibility
      $('.sidebar .collapse').each(function() {
        var collapseElement = this;
        if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
          var bsCollapse = bootstrap.Collapse.getInstance(collapseElement);
          if (bsCollapse) {
            bsCollapse.hide();
          } else {
            bsCollapse = new bootstrap.Collapse(collapseElement, { toggle: false });
            bsCollapse.hide();
          }
        } else {
          // Fallback to jQuery if Bootstrap 5 not loaded
          $(this).collapse('hide');
        }
      });
    };
  });

  // Close any open menu accordions when window is resized below 768px
  $(window).resize(function() {
    if ($(window).width() < 768) {
      // Bootstrap 5 collapse API - use jQuery for compatibility
      $('.sidebar .collapse').each(function() {
        var collapseElement = this;
        if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
          var bsCollapse = bootstrap.Collapse.getInstance(collapseElement);
          if (bsCollapse) {
            bsCollapse.hide();
          } else {
            bsCollapse = new bootstrap.Collapse(collapseElement, { toggle: false });
            bsCollapse.hide();
          }
        } else {
          // Fallback to jQuery if Bootstrap 5 not loaded
          $(this).collapse('hide');
        }
      });
    };
  });

  $(document).ready(function () {
    if ($(window).width() < 768) {
      // Bootstrap 5 collapse API - use jQuery for compatibility
      $('.sidebar .collapse').each(function() {
        var collapseElement = this;
        if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
          var bsCollapse = bootstrap.Collapse.getInstance(collapseElement);
          if (bsCollapse) {
            bsCollapse.hide();
          } else {
            bsCollapse = new bootstrap.Collapse(collapseElement, { toggle: false });
            bsCollapse.hide();
          }
        } else {
          // Fallback to jQuery if Bootstrap 5 not loaded
          $(this).collapse('hide');
        }
      });

      // Mobile drawer starts closed (do not toggle — avoids open/close flicker on navigation)
      $("body").addClass("sidebar-toggled");
      $(".sidebar").addClass("toggled");
    };
  });


  // Prevent the content wrapper from scrolling when the fixed side navigation hovered over
  $('body.fixed-nav .sidebar').on('mousewheel DOMMouseScroll wheel', function(e) {
    if ($(window).width() > 768) {
      var e0 = e.originalEvent,
          delta = e0.wheelDelta || -e0.detail;
      this.scrollTop += (delta < 0 ? 1 : -1) * 30;
      e.preventDefault();
    }
  });

  // Scroll to top button appear
  $(document).on('scroll', function() {
    var scrollDistance = $(this).scrollTop();
    if (scrollDistance > 100) {
      $('.scroll-to-top').fadeIn();
    } else {
      $('.scroll-to-top').fadeOut();
    }
  });

  // Smooth scrolling using jQuery easing
  $(document).on('click', 'a.scroll-to-top', function(e) {
    var $anchor = $(this);
    $('html, body').stop().animate({
      scrollTop: ($($anchor.attr('href')).offset().top)
    }, 1000, 'easeInOutExpo');
    e.preventDefault();
  });

})(jQuery); // End of use strict

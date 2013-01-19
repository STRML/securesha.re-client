$(function() {
  // Basic page JS


  // Gracefully handle page resizing & hide bxSlider if on a narrow viewpoert
  resize();
  $(window).on('resize',  resize);
  function resize(){
    // FIXME this math is pretty janky
    var width = $(window).width() - ($("#main-content").outerWidth() + 100);
    if(width < 180) $("#sidebar").fadeOut();
    else $("#sidebar").fadeIn();
    $("#sidebar").width(width);
  }

  // advanced toggle
  $("#advance-toggle").click(function(){
    $("#inner-advanced").slideToggle();
    $(this).find("i").toggleClass("icon-chevron-down");
    explainAdvanced();
  });

  $("#days").change(explainAdvanced);
  $("#views").change(explainAdvanced);

  // Change explanation text
  function explainAdvanced(){
    var $explain = $("#expiration-field .explain");
    var days = $("#days").val();
    var expirationDate = new Date(new Date().getTime() + (86400000 * days));
    var views = $("#views").val();
    $explain.text("Your file will expire at " + expirationDate.toString() + " or after " + views + " view" +
      (views > 1 ? 's' : '') + ", " + "whichever comes first.");
  }

  // map fileupload
  $(".fileUpload").click(function(){
    $("#fileupload").click(function(e){
      e.stopImmediatePropagation();
    });
    $("#fileupload").click();
  });

  $("#bxSlider").bxSlider({auto: true, adaptiveHeight: true, pause: 10000});
});
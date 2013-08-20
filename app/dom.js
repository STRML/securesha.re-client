$(function() {
  // Basic page JS

  // advanced toggle
  $("#advance-toggle").click(function(){
    $("#inner-advanced").slideToggle();
    $(this).find("i").toggleClass("glyphicon-chevron-down");
    explainAdvanced();
  });

  $("#days").change(explainAdvanced);
  $("#views").change(explainAdvanced);

  // Change explanation text
  function explainAdvanced(){
    var $explain = $("#upload-form .explain");
    var days = $("#days").val();
    var views = $("#views").val();
    adjustLabelText(days, views);
    var expirationDate = new Date(new Date().getTime() + (86400000 * days));
    $explain.text("Your file will expire at " + expirationDate.toString() + " or after " + views + " view" +
      (views > 1 ? 's' : '') + ", " + "whichever comes first.");
  }

  function adjustLabelText(days, views) {
    $("#days").siblings('.add-on').text(days == 1 ? 'Day' : 'Days');
    $("#views").siblings('.add-on').text(views == 1 ? 'View' : 'Views');
  }

  // map fileupload
  $(".fileUpload").click(function(){
    $("#fileupload").click(function(e){
      e.stopImmediatePropagation();
    });
    $("#fileupload").click();
  });
});
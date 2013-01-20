/*global _:true, File:true */
$(function() {
  var encryptedFile /* object */;
  var passphrase = Math.uuid(16);
  $("#password").val(passphrase);
  var cryptoWorker;

  // bindings
  $('#fileupload').change(encryptFile);
  $('#submit').click(uploadFile);

  function encryptFile(){
    var me = this;

    // Clear any errors
    $(".itemStatus").add(".attachedFileInfo").html("");
    $(".uploadLoader").hide();
    $("#downloaded-content").hide();
    $(".fileInfo").hide();
    $("#link").hide();
    window.location.hash = "";

    // Check file
    var file = this.files[0]; // browser 'File' object
    if(!file) return window.alert("Please attach a file to share.");
    if(file.size > window.secureShared.fileSizeLimit) return window.alert("File is too big. Please choose a file under 10MB.");
    file.name = file.name + "?" + (Math.random() * 1000); // browser cache buster

    // Change page styles to indicate encryption is in #uploadProgress
    window.isEncrypting = true;
    $(".uploadLoader").show();
    $(".attachedFileInfo").html("File attached: " + file.name + ". <br>Size: " + window.secureShared.fileSize(file.size));
    $(".itemStatus").html("Encrypting: 0% complete");
    $("#submit").removeClass('btn-primary').addClass('btn-inverse loading').attr('disabled', 'disabled');
    $("#uploadProgress").toggle();

    // Create worker
    if(cryptoWorker) cryptoWorker.terminate();
    var workers = window.secureShared.spawnWorkers(window.secureShared.workerCount), i;
    for(i = 0; i < workers.length; i++){
      workers[i].addEventListener('message', onWorkerMessage, false);
      // Log errors
      workers[i].onError = onWorkerError;
    }

    // Slice file into chunks
    var slices = sliceFile(file);

    // Encrypt slices (post to workers)
    for(i = 0; i < slices.length; i++){
      var msg = {slice: slices[i], encrypt: true, passphrase: passphrase, index: i};
      if(i === 0) msg.fileName = file.name; // don't send filename past the first slice
      workers[i % workers.length].postMessage(msg);
    }

    encryptedFile = {
      fileData : [],
      fileName : '',
      contentType: file.type,
      chunkDelimiter: window.secureShared.chunkDelimiter
    };
    // Listen to encryption events
    var finished = 0;
    var total = 0;
    var time = new Date();

    function onWorkerError(e){
      console.error(event.data);
    }
    function onWorkerMessage(e){
      // received a slice.
      if(_.isString(e.data)){
        // message
        return console.log(e.data);
      }
      // console.log(e.data.fileData.length);

      onSlice(e);
      total += e.data.fileData.length;

      // If finished
      if(e.data.index == slices.length - 1){
        onUploadFinished();
      }
    }

    function onSlice(e){
      encryptedFile.fileData[e.data.index] = e.data.fileData;
      if(e.data.fileName) encryptedFile.fileName = e.data.fileName;
      finished++;
      $("#uploadProgress").attr({value: finished, max: slices.length + 1});
      $(".itemStatus").html("Encrypting: " + ((finished / (slices.length + 1))* 100).toFixed(0) + "% complete.");
    }

    function onUploadFinished(){
      // console.log("File Size: " + file.size);
      // console.log("Total: " + total);
      // console.log("Time elapsed: " + (new Date() - time));

      // Terminate workers
      for(var i = 0; i < workers.length; i++){
        workers[i].terminate();
      }
      window.isEncrypting = false;
      $(".uploadLoader").hide();
      $(".itemStatus").html("Encryption complete. Click \"Get Secure Link\" to upload.");
      $("#submit").addClass('btn-primary').removeClass('btn-inverse loading').removeAttr('disabled');
      $("#uploadProgress").toggle();
    }
  }


  // Upload file to server, triggered by user click.
  function uploadFile() {
    if(!encryptedFile) return window.alert("Please attach a file to share.");
    if(!encryptedFile.fileData.length || window.isEncrypting) return window.alert("Still encrypting! Please wait...");

    $("#uploadProgress").toggle();

    // Get form params
    var formParams = $("form").serializeArray();
    var params = encryptedFile;
    formParams.forEach(function(param) {
      params[param.name] = param.value;
    });
    delete params.password; // IMPORTANT: don't send password to server!

    // Set #uploadProgress bar to zero
    $('#uploadProgress').attr({value: 0, total: 1});
    // Create params string in a worker to not freeze up the browser
    var xhrWorker = new Worker("app/xhrWorker.js");
    xhrWorker.postMessage(params);

    // Show 'preparing upload' text
    $(".itemStatus").html("Preparing Upload...");

    // When the worker responds, send the returned data as form data
    xhrWorker.addEventListener('message', function(e){
      // Send ajax request
      xhrWorker.terminate();
      $(".uploadLoader").show();
      $.ajax({
        url: '/putfile',
        //server script to process data
        type: 'POST',
        xhr: function() { // custom xhr
          var myXhr = $.ajaxSettings.xhr();
          if(myXhr.upload) { // check if upload property exists
            myXhr.upload.addEventListener('progress', progressHandler, false); // for handling the progress of the upload
          }
          return myXhr;
        },
        //Ajax events
        //beforeSend: beforeSendHandler,
        success: successHandler,
        error: errorHandler,
        // Form data
        data: e.data,
        cache: false
      });

      function beforeSendHandler(xhr) {
        // TODO: Show 'uploading' text
      }

      function successHandler(response) {
        displayURL(response.url, passphrase);
        $(".uploadLoader").hide();
        $(".itemStatus").html("");
      }

      function errorHandler() {
        $(".itemStatus").html("<i>Error</i>");
        $(".uploadLoader").hide();
      }

      function progressHandler(e) {
        if(e.lengthComputable) {
          $('#uploadProgress').attr({
            value: e.loaded,
            max: e.total
          });
        }
        if(e.loaded != e.total){
          $(".itemStatus").html("Uploading: " + ((e.loaded / e.total) * 100).toFixed(0) + "% complete.");
        } else {
          $(".itemStatus").html("Upload complete. Generating URL...");
        }
      }
    }, false);
  }

  // Display uploaded file URL on screen.
  function displayURL(url, passphrase) {
    var fileURL = window.location.protocol + "//" + window.location.host + '?#u=' + url + '&p=' + passphrase;
    var fileURLNoPass = window.location.protocol + "//" + window.location.host + '?#u=' + url;
    var link = "Your file can be reached at: <textarea rows=\"2\" readonly>" + fileURL + "</textarea><br><br>" +
               "The above link is enough for a user to access the file. If you have sent the password separately, " +
               "use this URL instead: <textarea rows=\"2\" readonly>" + fileURLNoPass + "</textarea><br>" +
               "Your file's password: <input value=\"" + passphrase + "\"/>";
    $("#link").html(link).fadeIn();
    $("#warnings").show();
  }

  // Regen hashes if the user changes the encryption key
  var onPasswordKeyUp = _.debounce(function(){$("#fileupload").trigger('change');}, 250);
  $('#password').bind('input', function() {
    onPasswordKeyUp();
    passphrase = $(this).val(); // change encrypted file's passphrase
  });

  // Slice a file into chunks for fast encryption & upload.
  function sliceFile(file){
    file.slice = file.mozSlice || file.webkitSlice || file.slice; // compatibility
    var pos = 0;
    var slices = [];
    while(pos < file.size){
      slices.push(file.slice(pos, pos += window.secureShared.chunkSize));
    }
    return slices;
  }
});

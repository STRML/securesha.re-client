/*global _:true */
$(function() {

  // parse hash
  var hash = (function(a) {
    if (a === "") return {};
    var b = {};
    for (var i = 0; i < a.length; ++i)
    {
      var p=a[i].split('=');
      if (p.length !== 2) continue;
      b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return b;
  })(window.location.hash.substr(1).split('&'));

  // Check if url & passphrase are present
  if(hash.u){
    var url = hash.u;
    // Browser restrictions, unfortunately
    // TODO detect capabilities instead
    var isOkay = false;
    if(/Chrome/i.test(window.BrowserDetect.browser)) isOkay = true;
    if(/Firefox/i.test(window.BrowserDetect.browser)) isOkay = true;
    if(/Safari/i.test(window.BrowserDetect.browser)) isOkay = true;
    if(!isOkay){
      return window.alert("We're sorry, but " + window.BrowserDetect.browser + " does not support the HTML5 " +
                   "File APIs this application requires. Please try opening this file in the latest versions of "+
                   "Chrome or Firefox.");
    }
    // Password was provided, download file from server.
    doDownload(url, function(file, fileMeta){
      updateView(fileMeta);
      passphrasePrompt(function(passphrase){
        decrypt(file, fileMeta, passphrase);
      });
    });
  }

  // Download encrypted file
  function doDownload(url, cb){
    $("#downloaded-content").fadeIn();
    $(".downloadLoader").show();
    $("#downloadProgress").toggle();
    $(".downloadStatusText").text("Downloading your file...");
    var xhr = $.ajax({
      url: '/get/' + url,
      //server script to process data
      type: 'GET',
      xhr: function() { // custom xhr
        var myXhr = $.ajaxSettings.xhr();
        myXhr.onprogress = progressHandler; // for handling the progress of the download
        return myXhr;
      },
      //Ajax events
      //beforeSend: beforeSendHandler,
      success: successHandler,
      error: errorHandler
    });

    function successHandler(response){
      var fileData = response;
      var fileMeta = {
        views: xhr.getResponseHeader('X-File-Views'),
        maxViews: xhr.getResponseHeader('X-File-Max-Views'),
        fileName: xhr.getResponseHeader('X-File-Name'),
        expiration: xhr.getResponseHeader('X-File-Expiration'),
        contentType: xhr.getResponseHeader('X-File-Content-Type')
      };
      cb(fileData, fileMeta);
      $("#downloadProgress").toggle();
    }

    function errorHandler(){
      $(".downloadStatusText").hide();
      $("#downloaded-content .fileInfo").addClass('alert').addClass('alert-danger').html("Sorry! File not found.");
      $(".downloadLoader").hide();
      $("#downloadProgress").hide();
    }

    function progressHandler(e) {
      if(e.lengthComputable) {
        $('#downloadProgress').attr({
          value: e.loaded,
          max: e.total
        });
        if(e.loaded !== e.total){
          $(".downloadStatusText").html("Downloading: " + ((e.loaded / e.total) * 100).toFixed(0) + "% complete.");
        } else {
          $(".downloadStatusText").html("Download complete. Generating link...");
        }
      }
    }
  }

  // Show the user some information about their file.
  function updateView(fileMeta){
    var remainingViews = fileMeta.maxViews - fileMeta.views;
    var expiration = new Date(fileMeta.expiration).toString();
    var expiringSoonText = "This file has " + remainingViews + " view" + (remainingViews > 1 ? "s " : " ") +
      "remaining. The file will be destroyed on " + expiration + " or when the views are exhausted, whichever " +
      "comes first.";
    var expiredText = "Please click the download link below. This file has expired and has now been deleted from our servers.";
    var isExpired = remainingViews < 1;
    if(isExpired) $("#downloaded-content .fileInfo").addClass('alert-danger');
    $("#downloaded-content .fileInfo").addClass('alert').html(isExpired ? expiredText : expiringSoonText);
  }

  // Prompt the user for a passphrase
  function passphrasePrompt(callback){
    // Provided in URL.
    if(hash.p) return callback(hash.p);
    $("#passwordModal").modal();

    // Grab passphrase & throw it back
    $("#passwordModal button.download").click(function(){
      var passphrase = $("#decryptPassphrase").val();
      callback(passphrase);
    });

    // Get enter keypress
    $("#decryptPassphrase").keypress(function(e){
      if(e.which === 13){
        $("#passwordModal").modal('hide');
        $("#passwordModal button.download").click();
        return false;
      }
    });
  }

  // Decrypt file using worker.
  function decrypt(file, fileMeta, passphrase){
    $(".downloadStatusText").text("Decrypting...");
    window.isDecrypting = true;
    var workers = window.secureShared.spawnWorkers(window.secureShared.workerCount), i;
    for(i = 0; i < workers.length; i++){
      workers[i].addEventListener('message', onWorkerMessage, false);
    }

    var slices = file.split(window.secureShared.chunkDelimiter);

    // Send slices to workers
    for(i = 0; i < slices.length; i++){
      workers[i % workers.length].postMessage({
        fileData: slices[i],
        fileName: i === 0 ? fileMeta.fileName: '', // only send this once
        passphrase: passphrase,
        decrypt: true,
        index: i
      });
    }

    var decryptedFile = {fileData: []};
    var receivedCount = 0;
    $("#downloadProgress").toggle();
    $('#downloadProgress').attr({
      value: 0,
      max: slices.length
    });

    function onWorkerMessage(e){
      // got a slice. Process it.
      if(!_.isObject(e.data)){
        // error message
        var msg = "Incorrect password. Refresh this page to try again.";
        $(".downloadStatusText").hide();
        $("#downloaded-content .fileInfo").addClass('alert').addClass('alert-error').html(msg);
        $(".downloadLoader").hide();
        return;
      }
      receivedCount++;
      onSliceReceived(e.data);

      if(receivedCount === slices.length){
        // last slice, finalize
        onFinish();
      }
    }

    function onSliceReceived(slice){
      if(slice.fileName) decryptedFile.fileName = slice.fileName;
      decryptedFile.fileData[slice.index] = slice.fileData;
      $('#downloadProgress').attr({
        value: receivedCount,
        max: slices.length
      });
      $(".downloadStatusText").html("Decrypting: " + ((receivedCount / (slices.length)) * 100).toFixed(0) + "% complete.");
    }

    function onFinish(){
      // Create blob
      var binaryData = decryptedFile.fileData.join("");
      var blob = new Blob([window.secureShared.str2ab(binaryData)], {type: fileMeta.contentType});

      if(!/Safari/i.test(window.BrowserDetect.browser)){
        var URL = window.URL || window.webkitURL;
        var url = URL.createObjectURL(blob);
        $("<a>").attr("href", url).attr("download", decryptedFile.fileName).addClass("btn btn-success")
          .html('<i class="icon-download-alt icon-white"></i> Download').appendTo("#downloaded-content").hide().fadeIn();
      } else {
        // Safari can't open blobs, create a data URI
        // This will fail if the file is greater than ~200KB or so
        // TODO figure out what's wrong with the blob size in safari
        // TODO Why doesn't safari want a dataview here?
        if(blob.size > 200000) return window.alert("Sorry, this file is too big for Safari. Please try to open it in Chrome.");
        var fileReader = new FileReader();
        fileReader.onload = function (event) {
          $("<a>").text("Download").appendTo("#downloaded-content").attr("href", event.target.result).hide().fadeIn();
        };
        fileReader.readAsDataURL(blob);
      }

      window.isDecrypting = false;
      $(".downloadStatusText").hide();
      $("#downloadProgress").hide();
      $(".downloadLoader").hide();
    }
  }
});

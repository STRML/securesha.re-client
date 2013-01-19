/*global _:true, escape: true */
$(function() {

  // parse hash
  var hash = (function(a) {
      if (a === "") return {};
      var b = {};
      for (var i = 0; i < a.length; ++i)
      {
          var p=a[i].split('=');
          if (p.length != 2) continue;
          b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
      }
      return b;
  })(window.location.hash.substr(1).split('&'));

  // Check if url & passphrase are present
  if(hash.u){
    var url = hash.u;
    // Browser restrictions, unfortunately
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
    $("progress").toggle();
    $("#downloaded-content .loadingText").text("Downloading your file...");
    var xhr = $.ajax({
      url: '/get/' + url,
      //server script to process data
      type: 'GET',
      xhr: function() { // custom xhr
        var myXhr = $.ajaxSettings.xhr();
        if(myXhr.download) { // check if download property exists
          myXhr.download.addEventListener('progress', progressHandler, false); // for handling the progress of the download
        }
        return myXhr;
      },
      //Ajax events
      //beforeSend: beforeSendHandler,
      success: successHandler,
      error: errorHandler
    });

    function successHandler(response, wat){
      var fileMeta = JSON.parse(xhr.getResponseHeader("X-File-Stats"));
      cb(response, fileMeta);
      $("progress").toggle();
    }

    function errorHandler(){
      $("#downloaded-content .loadingText").hide();
      $("#downloaded-content .fileInfo").addClass('alert').addClass('alert-error').html("Sorry! File not found.");
      $(".downloadLoader").hide();
    }

    function progressHandler(e) {
      if(e.lengthComputable) {
        $('progress').attr({
          value: e.loaded,
          max: e.total
        });
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
    var expiredText = "This file has expired and has been deleted. You hold the last copy. Good luck.";
    var isExpired = remainingViews < 1;
    if(isExpired) $("#downloaded-content .fileInfo").addClass('alert-error');
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
      if(e.which == 13){
        $("#passwordModal").modal('hide');
        $("#passwordModal button.download").click();
        return false;
      }
    });
  }

  // Decrypt file using worker.
  function decrypt(file, fileMeta, passphrase){
    $("#downloaded-content .loadingText").text("Decrypting...");
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
    $("progress").toggle();
    $('progress').attr({
      value: 0,
      max: slices.length - 1
    });
    
    function onWorkerMessage(e){
      // got a slice. Process it.
      if(!_.isObject(e.data)){
        // error message
        var msg = "Incorrect password. Refresh this page to try again.";
        $("#downloaded-content .loadingText").hide();
        $("#downloaded-content .fileInfo").addClass('alert').addClass('alert-error').html(msg);
        $(".downloadLoader").hide();
        return;
      }
      onSliceReceived(e.data);
      if(e.data.index == slices.length - 1){
        // last slice, finalize
        onFinish();
      }
    }

    function onSliceReceived(slice){
      if(slice.fileName) decryptedFile.fileName = slice.fileName;
      decryptedFile.fileData[slice.index] = slice.fileData;
      $('progress').attr({
        value: ++receivedCount,
        max: slices.length - 1
      });
    }

    function onFinish(){
      // Create blob
      var binaryData = decryptedFile.fileData.join("");
      //binaryData = window.secureShared.convertLatin1ToUtf8(binaryData);
      var blob = new Blob([new DataView(window.secureShared.str2ab(binaryData))], {type: fileMeta.contentType});

      if(!/Safari/i.test(window.BrowserDetect.browser)){
        var URL = window.URL || window.webkitURL;
        var url = URL.createObjectURL(blob);
        $("<a>").attr("href", url).attr("download", decryptedFile.fileName)
          .text("Download").appendTo("#downloaded-content").hide().fadeIn();
      } else {
        // Safari can't open blobs, create a data URI
        // This will fail if the file is greater than ~6MB or so
        // TODO figure out what's wrong with the blob size in safari
        if(blob.size > 6291456) return window.alert("This file is too big for Safari.. Please try to open it in Chrome.");
        var fileReader = new FileReader();
        fileReader.onload = function (event) {
          $("<a>").text("Download").appendTo("#downloaded-content").hide().fadeIn().click(function(){
            window.open(event.target.result);
          });
        };
        fileReader.readAsDataURL(blob);
      }

      window.isDecrypting = false;
      $("#downloaded-content .loadingText").fadeIn().text("Done!");
      $(".downloadLoader").hide();
    }
  }
});
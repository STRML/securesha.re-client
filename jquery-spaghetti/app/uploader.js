/*global _:true, $:true, Unibabel:true */
$(function() {
  var encryptedFile /* object */;
  var passphrase = window.secureShared.generatePassphrase();
  $("#password").val(passphrase);

  // bindings
  $('#fileupload').change(encryptFile);
  $('#submit').click(uploadFile);

  function encryptFile(){

    // Clear any errors
    $(".itemStatus").add(".attachedFileInfo").html("");
    $(".uploadLoader").hide();
    $("#downloaded-content").hide();
    $(".fileInfo").hide();
    $("#link").hide();

    // Remove hash from URL bar to avoid confusion.
    window.location.hash = "";

    // Check file
    var file = this.files[0]; // browser 'File' object
    if(!file) return window.alert("Please attach a file to share.");
    if(file.size > window.secureShared.fileSizeLimit) {
      return window.alert("File is too big. Please choose a file under " +
        window.secureShared.fileSize(window.secureShared.fileSizeLimit) + ".");
    }
    file.name = file.name + "?" + (Math.random() * 1000); // browser cache buster

    // Change page styles to indicate encryption is in #uploadProgress
    window.isEncrypting = true;
    $(".uploadLoader").show();
    $(".attachedFileInfo").html("File attached: " + file.name + ". <br>Size: " + window.secureShared.fileSize(file.size));
    $(".itemStatus").html("Encrypting: 0% complete");
    $("#submit").removeClass('btn-primary').addClass('btn-inverse loading').attr('disabled', 'disabled');
    $("#uploadProgress").toggle();

    encryptedFile = {
      fileData : null,
      fileName : file.name,
      contentType: file.type,
    };

    var crypto = window.crypto.subtle;

    // salt should be Uint8Array or ArrayBuffer
    var saltBuffer = Unibabel.utf8ToBuffer(passphrase);

    // don't use naïve approaches for converting text, otherwise international
    // characters won't have the correct byte sequences. Use TextEncoder when
    // available or otherwise use relevant polyfills
    var passphraseKey = Unibabel.utf8ToBuffer("I hëart årt and £$¢!");

    // You should firstly import your passphrase Uint8array into a CryptoKey
    console.time('encrypting');
    crypto.importKey(
      'raw',
      passphraseKey,
      {name: 'PBKDF2'},
      false,
      ['deriveBits', 'deriveKey']
    ).then(function(masterKey) {
      return crypto.deriveKey(
        { "name": 'PBKDF2',
          "salt": saltBuffer,
          // don't get too ambitious, or at least remember
          // that low-power phones will access your app
          "iterations": 100,
          "hash": 'SHA-256'
        },
        masterKey,

        // Note: for this demo we don't actually need a cipher suite,
        // but the api requires that it must be specified.

        // For AES the length required to be 128 or 256 bits (not bytes)
        { "name": 'AES-CBC', "length": 256 },

        // Whether or not the key is extractable (less secure) or not (more secure)
        // when false, the key can only be passed as a web crypto object, not inspected
        false,

        // this web crypto object will only be allowed for these functions
        [ "encrypt", "decrypt" ]
      )
    })
    .then(function(cryptoKey) {
      return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.addEventListener("loadend", function() {
          resolve(reader.result);
        });
        reader.addEventListener("loadError", function() {
          reject(reader.error);
        })
        reader.readAsArrayBuffer(file);
      })
      .then(function(fileBuf) {
        var iv = new Uint8Array(16);
        window.crypto.getRandomValues(iv);
        return crypto.encrypt({name: 'AES-CBC', iv: iv}, cryptoKey, fileBuf)
      })
    })
    .then(function(encryptedBuffer) {
      console.timeEnd('encrypting');
      encryptedFile.fileData = encryptedBuffer;
      onEncryptFinished();
    })
    .catch(console.error);


    function onEncryptFinished(){
      // console.log("File Size: " + file.size);
      // console.log("Total: " + total);
      // console.log("Time elapsed: " + (new Date() - time));

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

    // Show 'preparing upload' text
    $(".itemStatus").html("Preparing Upload...");

    $(".uploadLoader").show();
    errorHandler();
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
      contentType: 'text/plain',
      //Ajax events
      //beforeSend: beforeSendHandler,
      success: successHandler,
      error: errorHandler,
      // Form data
      headers: {
        'X-File-Expiration-Days' : params.days,
        'X-File-Max-Views': params.views,
        'X-File-Content-Type': params.contentType,
        'X-File-Name': params.fileName
      },
      data: params.fileData.join(window.secureShared.chunkDelimiter),
      processData: false,
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
  }

  // Display uploaded file URL on screen.
  function displayURL(url, passphrase) {
    var fileURL = window.location.protocol + "//" + window.location.host + '?#u=' + url + '&p=' + passphrase;
    var fileURLNoPass = window.location.protocol + "//" + window.location.host + '?#u=' + url;
    var link = "Your file can be reached at:<br> <textarea rows=\"2\" readonly>" + fileURL + "</textarea><br><br>" +
               "The above link is enough for a user to access the file. If you have sent the password separately, " +
               "use this URL instead:<br><textarea rows=\"2\" readonly>" + fileURLNoPass + "</textarea><br><br>" +
               "Your file's password:<br> <input value=\"" + passphrase + "\"/>";
    $("#link").html(link).fadeIn();
    $("#warnings").show();
  }

  // Regen hashes if the user changes the encryption key
  var onPasswordKeyUp = _.debounce(function(){$("#fileupload").trigger('change');}, 250);
  $('#password').bind('input', function() {
    onPasswordKeyUp();
    passphrase = $(this).val(); // change encrypted file's passphrase
  });
});

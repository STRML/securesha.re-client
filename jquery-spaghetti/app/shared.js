/*global _:true, escape: true, CryptoJS: true */
window.secureShared = {
  chunkSize : 64 * 1024, // 64kb chunks
  chunkDelimiter : "/--delimiter--/",
  fileSizeLimit: 20 * 1024 * 1024,
  workerCount : 4,
  spawnWorkers : function(workerCount){
    var workers = [];
    for(var i = 0; i < workerCount; i++){
      workers.push(new Worker("app/crypto.js"));
    }
    return workers;
  },

  convertLatin1ToUtf8 : function(str){
    return decodeURIComponent(escape(str));
  },

  // Generate a 256-bit key. 
  generatePassphrase: function() {
    // If window.crypto is available, use it.
    var passphrase;
    if(window.crypto && typeof window.crypto.getRandomValues === "function"){
      var array = new Uint8Array(32);
      window.crypto.getRandomValues(array);
      passphrase = window.secureShared.ab2str(array.buffer);
    }
    // Otherwise, use CryptoJS internals.
    else {
      passphrase = CryptoJS.enc.Base64.stringify(CryptoJS.lib.WordArray.random(32));
    }
    return window.secureShared.urlSafeBase64encode(passphrase);
  },

  // Create url-safe base64 string from array buffer.
  ab2str: function(buf) {
    return window.btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
  },

  // Create an array buffer from a string.
  str2ab : function(str) {
    var buf = new ArrayBuffer(str.length); // 2 bytes for each char
    var bufView = new Uint8Array(buf);
    for (var i=0, strLen=str.length; i<strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  },

  // Convert a base64 string into something url-safe.
  urlSafeBase64encode: function(input) {
    return input.replace(/\+/g, '-').replace(/\//, '_').replace(/\=/g, ''); // '=' is padding char and can be removed
  },

  // Reverse the above process.
  urlSafeBase64decode: function(input) {
    return input.replace(/-/g, '+').replace(/_/, '/');
  },

  showStatusMessage: function(message){
  },

  fileSize: function(fileSizeInBytes) {
    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
    do {
      fileSizeInBytes = fileSizeInBytes / 1024;
      i++;
    } while (fileSizeInBytes > 1024);

    return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
  }
};

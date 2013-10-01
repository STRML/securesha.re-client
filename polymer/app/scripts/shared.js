/*global escape: true, CryptoJS: true */
'use strict';
window.secureShared = {
  chunkSize : 512 * 1024, // 512kb chunks
  fileSizeLimit: 10 * 1024 * 1024, // 10MB
  workerCount : 1,

  convertLatin1ToUtf8 : function(str){
    return decodeURIComponent(escape(str));
  },

  getHash: function() {
    // parse hash
    var hash = (function(a) {
      if (a === '') return {};
      var b = {};
      for (var i = 0; i < a.length; ++i)
      {
        var p=a[i].split('=');
        if (p.length !== 2) continue;
        b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, ' '));
      }
      return b;
    })(window.location.hash.substr(1).split('&'));
    return hash;
  },

  // Generate a 256-bit key. 
  generatePassphrase: function() {
    // If window.crypto is available, use it.
    var passphrase;
    if(window.crypto && typeof window.crypto.getRandomValues === 'function'){
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
  }

};
/*global escape: true, CryptoJS: true */
'use strict';
window.secureShared = {
  chunkSize : 512 * 1024, // 512kb chunks
  fileSizeLimit: 10 * 1024 * 1024, // 10MB
  workerCount : 1,

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
  }

};
/*global _:true, escape: true */
window.secureShared = {
  chunkSize : 512 * 1024, // 512kb chunks
  chunkDelimiter : "/--delimiter--/",
  fileSizeLimit: 10 * 1024 * 1024,
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

  str2ab : function(str) {
    var buf = new ArrayBuffer(str.length); // 2 bytes for each char
    var bufView = new Uint8Array(buf);
    for (var i=0, strLen=str.length; i<strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
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
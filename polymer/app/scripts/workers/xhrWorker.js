/*jshint worker:true*/
'use strict';

// This simple worker joins the fileData together and encodes the part.
// With large files, this gets really slow, so I put it here instead.
self.onmessage = function (oEvent) {
  encodeFileData(oEvent);
};

function encodeFileData(oEvent){
  var r20 = /%20/g;
  // Join chunks on chunk delimiter
  var fileData = oEvent.data.fileData;
  for(var i = 0; i < fileData.length; i++) {
    fileData[i] = encodeURIComponent(fileData[i]).replace(r20, '+');
  }
  // Join file chunks by the delimiter. This is intentional - the chunks need to be decrypted
  // the same way they were encrypted, so this delimiter allows us to split the chunks again
  // when they come back down.
  oEvent.data.fileData = new Blob([fileData.join(oEvent.data.chunkDelimiter)]);

  postMessage(oEvent.data);
}
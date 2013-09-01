/*jshint worker:true*/

self.onmessage = function (oEvent) {
  createParams(oEvent);
};

function createParams(oEvent){
  oEvent.data.fileData = oEvent.data.fileData.join(oEvent.data.chunkDelimiter);
  delete oEvent.data.chunkDelimiter; // don't need to send this
  postMessage(buildParams(oEvent.data));
}

// based on jquery.param, removed 'traditional'
function buildParams(obj){
  var r20 = /%20/g;
  var s = [], prefix;
  for(prefix in obj){
    s.push(encodeURIComponent( prefix ) + "=" + encodeURIComponent( obj[prefix] ));
  }
  return s.join( "&" ).replace( r20, "+" );
}
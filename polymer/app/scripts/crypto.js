/*jshint worker:true*/
/*global CryptoJS:true, FileReaderSync:true, Latin1Formatter:true */
'use strict';
importScripts('../bower_components/crypto-js/rollups/aes.js');
importScripts('vendor/lib-typedarrays.js');
importScripts('formatters.js'); // returns Latin1Formatter

self.onmessage = function (oEvent) {
  if (oEvent.data instanceof Object && oEvent.data.encrypt) {
    encrypt(oEvent);
  } else if (oEvent.data instanceof Object && oEvent.data.decrypt) {
    decrypt(oEvent);
  }
};


function encrypt(oEvent){
  var fileName = oEvent.data.fileName;
  var passphrase = oEvent.data.passphrase;
  var slice = oEvent.data.slice;
  var useTypedArrays = oEvent.useTypedArrays;
  var encrypted = {index: oEvent.data.index}; // keep index for eventual rebuilding

  // Encrypt filename
  if (fileName) {
    encrypted.fileName = CryptoJS.AES.encrypt(fileName, passphrase).toString();
  }

  if (slice) {
    if (useTypedArrays){
      encrypted.fileData = CryptoJS.AES.encrypt(CryptoJS.lib.WordArray.create(slice), passphrase);
    } else {
      // Read file using FileReader so we can get it as a binary string
      var fileReader = new FileReaderSync();
      //var time = new Date();
      var fileData = fileReader.readAsBinaryString(oEvent.data.slice); // reads as utf8 string
      //postMessage("time to read file: " + (new Date() - time));

      // Encrypt filedata
      //time = new Date();
      encrypted.fileData = CryptoJS.AES.encrypt(fileData, passphrase).toString(Latin1Formatter);
      //postMessage("time to encrypt + format: " + (new Date() - time) + " size: " + encrypted.fileData.length);
    }
  }

  postMessage(encrypted);
}

function decrypt(oEvent){
  // decrypt
  var decrypted = {index: oEvent.data.index};
  var slice = oEvent.data.slice;
  var fileData;
  var fileName = oEvent.data.fileName;
  var passphrase = oEvent.data.passphrase;
  var useTypedArrays = oEvent.useTypedArrays;
  try{
    // Decrypt fileName if present
    if(fileName) decrypted.fileName = CryptoJS.AES.decrypt(fileName, passphrase).toString(CryptoJS.enc.Latin1);
    // Decrypt fileData
    if (useTypedArrays) {
      fileData = CryptoJS.lib.WordArray.create(slice); // Create wordArray from ArrayBuffer
      decrypted.fileData = CryptoJS.AES.decrypt(fileData, passphrase).toArrayBuffer();
    } else {
      fileData = Latin1Formatter.parse(slice); // create wordArray from encrypted Latin1
      decrypted.fileData = CryptoJS.AES.decrypt(fileData, passphrase).toString(CryptoJS.enc.Utf8);
    }
    postMessage(decrypted);
  } catch (e){
    postMessage('Error: ' + e); // usually bad password
  }
}


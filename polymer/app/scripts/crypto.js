/*jshint worker:true*/
/*global CryptoJS:true, FileReaderSync:true, Latin1Formatter:true */
'use strict';
importScripts('../bower_components/crypto-js/rollups/aes.js');
importScripts('vendor/lib-typedarrays.js');
importScripts('formatters.js'); // returns Latin1Formatter

// shortcut
var WordArray = CryptoJS.lib.WordArray;

self.onmessage = function (oEvent) {
  var data = oEvent.data;
  if (data instanceof Object && data.encrypt) {
    encrypt(data);
  } else if (data instanceof Object && data.decrypt) {
    decrypt(data);
  }
};

// Encrypt a file. `data.slice` is always a Blob object.
// If the browser supports XHR2 (it pretty much has to, to get to this point anyway),
// we output a typed array instead of a string.
function encrypt(data){
  var fileName = data.fileName;
  var passphrase = data.passphrase;
  var slice = data.slice;
  var useTypedArrays = data.useTypedArrays;
  var encrypted = {index: data.index}; // keep index for eventual rebuilding
  var cryptoContainer;

  // Encrypt filename
  if (fileName) {
    encrypted.fileName = CryptoJS.AES.encrypt(fileName, passphrase).toString();
  }

  if (slice) {
    cryptoContainer = CryptoJS.AES.encrypt(_getWordArrayFromSlice(slice, useTypedArrays), passphrase);
    if (useTypedArrays) {
      encrypted.fileData = cryptoContainer.ciphertext.toArrayBuffer();
    } else {
      encrypted.fileData = cryptoContainer.toString(Latin1Formatter);
    }
  }

  postMessage(encrypted);
}

// Decrypt a file. It can come in as a string (old browsers) or as a 
// Blob or ArrayBuffer in newer browsers.
function decrypt(data){
  var decrypted = {index: data.index};
  var slice = data.slice;
  var fileData;
  var fileName = data.fileName;
  var passphrase = data.passphrase;
  var useTypedArrays = data.useTypedArrays;

  // Wrap the decryption in a try/catch. If the password is wrong or the data garbled, it will throw.
  try{
    // Decrypt fileName if present
    if(fileName) decrypted.fileName = CryptoJS.AES.decrypt(fileName, passphrase).toString(CryptoJS.enc.Latin1);

    // Decrypt fileData
    if (useTypedArrays) {
      fileData = _getWordArrayFromSlice(slice);
      decrypted.fileData = CryptoJS.AES.decrypt(fileData, passphrase).ciphertext.toArrayBuffer();
    } else {
      fileData = Latin1Formatter.parse(slice); // create wordArray from encrypted Latin1
      decrypted.fileData = CryptoJS.AES.decrypt(fileData, passphrase).toString(CryptoJS.enc.Utf8);
    }

    postMessage(decrypted);
  } catch (e){
    postMessage('Error: ' + e); // usually bad password
  }
}

// Given a slice (which is likely a blob), turn it into a wordarray.
// If we support typed arrays use those instead of strings, they're faster.
// If `slice` is already a typed array it will be passed directly into the
// WordArray constructor.
// 3.1.2 of CryptoJS lets us pass a typed array directly into an encrypt/decrypt function,
// but r667 (newer) deletes that functionality. This works in both.
function _getWordArrayFromSlice(slice, useTypedArrays) {
  var data = slice;
  if (Object.prototype.toString.call(slice) === '[object Blob]'){
    var fileReader = new FileReaderSync();
    if (useTypedArrays) {
      data = fileReader.readAsArrayBuffer(slice);
    } else {
      data = fileReader.readAsBinaryString(slice);
    }
  }
  return WordArray.create(data);
}


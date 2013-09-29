/*jshint worker:true*/
/*global CryptoJS:true, FileReaderSync:true, Latin1Formatter:true */
'use strict';
importScripts('../bower_components/crypto-js/rollups/aes.js');
importScripts('vendor/lib-typedarrays.js');
importScripts('vendor/formatters.js'); // returns Latin1Formatter

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
  var encrypted = {index: data.index}; // keep index for eventual rebuilding
  var cipherParams;

  // Encrypt filename
  if (data.fileName) {
    encrypted.fileName = CryptoJS.AES.encrypt(data.fileName, data.passphrase).toString();
  }

  if (data.slice) {
    cipherParams = CryptoJS.AES.encrypt(_getWordArrayFromSlice(data.slice, data.useTypedArrays), data.passphrase);
    if (data.useTypedArrays) {
      encrypted.fileData = _createArrayBufferFromCipherParams(cipherParams);
    } else {
      encrypted.fileData = cipherParams.toString(Latin1Formatter);
    }
  }

  postMessage(encrypted);
}

// Decrypt a file. It can come in as a string (old browsers) or as a 
// Blob or ArrayBuffer in newer browsers.
function decrypt(data){
  var decrypted = {index: data.index};
  var fileData, cipherParams;

  // Wrap the decryption in a try/catch. If the password is wrong or the data garbled, it will throw.
  try{
    // Decrypt fileName if present
    if(data.fileName){
      decrypted.fileName = CryptoJS.AES.decrypt(data.fileName, data.passphrase).toString(CryptoJS.enc.Latin1);
    }

    // Decrypt fileData
    if (data.useTypedArrays) {
      fileData = _getWordArrayFromSlice(data.slice, data.useTypedArrays);
      cipherParams = _createCipherParamsFromWordArray(fileData);
      decrypted.fileData = CryptoJS.AES.decrypt(cipherParams, data.passphrase).toArrayBuffer();
    } else {
      fileData = Latin1Formatter.parse(data.slice); // create wordArray from encrypted Latin1
      decrypted.fileData = CryptoJS.AES.decrypt(fileData, data.passphrase).toString(CryptoJS.enc.Utf8);
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

// These parsing functions are similar to the Latin1Formatter.
// Append magical salt value to outgoing ArrayBuffer.
function _createArrayBufferFromCipherParams(cipherParams) {
  var wordArray = WordArray.create([0x53616c74, 0x65645f5f])
    .concat(cipherParams.salt).concat(cipherParams.ciphertext);
  return wordArray.toArrayBuffer();
}

// Pretty much copy/paste from Latin1Formatter
function _createCipherParamsFromWordArray(wordArray) {
  var salt;

  // Test for salt
  if (wordArray.words[0] === 0x53616c74 && wordArray.words[1] === 0x65645f5f) {
    // Extract salt
    salt = CryptoJS.lib.WordArray.create(wordArray.words.slice(2, 4));

    // Remove salt from ciphertext
    wordArray.words.splice(0, 4);
    wordArray.sigBytes -= 16;
  }

  return CryptoJS.lib.CipherParams.create({ ciphertext: wordArray, salt: salt });
}
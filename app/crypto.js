/*jshint worker:true*/
/*global CryptoJS:true, FileReaderSync:true, Latin1Formatter:true, sjcl:true */

importScripts('../vendor/cryptoJS/rollups/aes.js');
importScripts('formatters.js'); // returns Latin1Formatter

self.onmessage = function (oEvent) {
  if (oEvent.data instanceof Object && oEvent.data.encrypt) {
    encrypt(oEvent);
  } else if (oEvent.data instanceof Object && oEvent.data.decrypt) {
    decrypt(oEvent);
  }
};


function encrypt(oEvent){

  // Read file
  var fileReader = new FileReaderSync();
  var fileData;
  var time = new Date();
  if(oEvent.data.slice) fileData = fileReader.readAsBinaryString(oEvent.data.slice); // reads as utf8 string
  //postMessage("time to read file: " + (new Date() - time));
  var fileName = oEvent.data.fileName;
  var passphrase = oEvent.data.passphrase;
  var encrypted = {index: oEvent.data.index}; // keep index for eventual rebuilding

  // Encrypt filename
  if(fileName) encrypted.fileName = CryptoJS.AES.encrypt(fileName, passphrase).toString();

  // Encrypt filedata
  //time = new Date();
  encrypted.fileData = CryptoJS.AES.encrypt(fileData, passphrase).toString(Latin1Formatter);
  //postMessage("time to encrypt + format: " + (new Date() - time) + " size: " + encrypted.fileData.length);

  postMessage(encrypted);
}

function decrypt(oEvent){
  // decrypt
  var decrypted = {index: oEvent.data.index};
  var fileData = Latin1Formatter.parse(oEvent.data.fileData); // create wordArray from encrypted Latin1
  var fileName = oEvent.data.fileName;
  var passphrase = oEvent.data.passphrase;
  try{
    // Decrypt fileName if present
    if(fileName) decrypted.fileName = CryptoJS.AES.decrypt(fileName, passphrase).toString(CryptoJS.enc.Latin1);
    // Decrypt fileData
    decrypted.fileData = CryptoJS.AES.decrypt(fileData, passphrase).toString(CryptoJS.enc.Utf8);
    postMessage(decrypted);
  } catch (e){
    postMessage("Error"); // usually bad password
  }
}


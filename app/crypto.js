/*jshint worker:true*/
/*global CryptoJS:true, FileReaderSync:true, Latin1Formatter:true, sjcl:true */

importScripts('../lib/cryptoJS/rollups/rabbit.js');
importScripts('formatters.js'); // returns Latin1Formatter

var encryptor;
var decryptor;

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
  if(fileName) encrypted.fileName = CryptoJS.Rabbit.encrypt(fileName, passphrase).toString();

  // Encrypt filedata
  //time = new Date();
  encrypted.fileData = CryptoJS.Rabbit.encrypt(fileData, passphrase).toString(Latin1Formatter);
  //postMessage("time to encrypt + format: " + (new Date() - time) + " size: " + encrypted.fileData.length);

  // Encrypt with sjcl
  // time = new Date();
  // encrypted.fileData = lzw_encode(sjcl.encrypt(passphrase, fileData));
  // postMessage("time to encrypt + format with sjcl: " + (new Date() - time) + " size: " + encrypted.fileData.length);

  //debugger;

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
    if(fileName) decrypted.fileName = CryptoJS.Rabbit.decrypt(fileName, passphrase).toString(CryptoJS.enc.Latin1);
    // Decrypt fileData
    decrypted.fileData = CryptoJS.Rabbit.decrypt(fileData, passphrase).toString(CryptoJS.enc.Utf8);
    postMessage(decrypted);
  } catch (e){
    postMessage("Error"); // usually bad password
  }
}


// Using a static IV. Since the keys are randomly generated this is not a risk.
// Using a static IV is only a problem if an attacker has multiple files encrypted with the same key,
// something that is not likely to happen in this application.
function createEncryptor(passphrase){
  var iv  = CryptoJS.enc.Hex.parse('101112131415161718191a1b1c1d1e1f');
  var passphraseArray = CryptoJS.enc.Utf8.parse(passphrase);
  encryptor = CryptoJS.algo.Rabbit.createEncryptor(passphraseArray, {iv : iv});
}

function createDecryptor(passphrase){
  var iv  = CryptoJS.enc.Hex.parse('101112131415161718191a1b1c1d1e1f');
  var passphraseArray = CryptoJS.enc.Utf8.parse(passphrase);
  decryptor = CryptoJS.algo.Rabbit.createDecryptor(passphraseArray, {iv: iv});
}


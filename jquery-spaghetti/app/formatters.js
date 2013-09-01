/*jshint worker:true*/
/*global CryptoJS:true, lzw_encode:true, lzw_decode:true */

importScripts('../vendor/lzw.js'); // returns lzw_encode, lzw_decode functions

// Must be included after cryptoJS

var Latin1Formatter = {
  /**
   * Converts a cipher params object to an OpenSSL-style string using Latin1
   *
   * @param {CipherParams} cipherParams The cipher params object.
   *
   * @return {string} The OpenSSL-style string.
   *
   */
  stringify: function (cipherParams, opts) {
    // Shortcuts
    var ciphertext = cipherParams.ciphertext;
    var salt = cipherParams.salt;
    var wordArray;

    // Format
    if (salt) {
      wordArray = CryptoJS.lib.WordArray.create([0x53616c74, 0x65645f5f]).concat(salt).concat(ciphertext);
    } else {
      wordArray = ciphertext;
    }
    var output = wordArray.toString(CryptoJS.enc.Latin1);

    //return lzw_encode(output);
    return output;
  },

  /**
   * Converts an OpenSSL-style string using Latin1 to a cipher params object.
   *
   * @param {string} openSSLStr The OpenSSL-style string.
   *
   * @return {CipherParams} The cipher params object.
   *
   */
  parse: function (str) {
    // Parse base64
    //var ciphertext = CryptoJS.enc.Latin1.parse(lzw_decode(str)), salt;
    var ciphertext = CryptoJS.enc.Latin1.parse(str), salt;

    // Test for salt
    if (ciphertext.words[0] == 0x53616c74 && ciphertext.words[1] == 0x65645f5f) {
      // Extract salt
      salt = CryptoJS.lib.WordArray.create(ciphertext.words.slice(2, 4));

      // Remove salt from ciphertext
      ciphertext.words.splice(0, 4);
      ciphertext.sigBytes -= 16;
    }

    return CryptoJS.lib.CipherParams.create({ ciphertext: ciphertext, salt: salt });
  }
};
/*
CryptoJS v3.x
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
r667
*/
(function (ArrayBuffer, Uint8Array, Uint8ClampedArray) {
    // Ensure typed arrays are supported before proceeding
    if (!ArrayBuffer) {
        return;
    }

    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var WordArray = C_lib.WordArray;

    /**
     * Initializes a newly created word array.
     *
     * @param {ArrayBuffer|ArrayBufferView} typedArray A typed array buffer or view
     */
    var superInit = WordArray.init;
    var subInit   = WordArray.init = function (typedArray) {
        // Convert ArrayBuffer to Uint8Array
        if (typedArray instanceof ArrayBuffer) {
            typedArray = new Uint8Array(typedArray);
        }

        // Convert other ArrayBufferViews to Uint8Array
        if (
            typedArray instanceof Int8Array ||
            (
                // Safari doesn't seem to support Uint8ClampedArray
                Uint8ClampedArray && typedArray instanceof Uint8ClampedArray
            ) ||
            typedArray instanceof Int16Array ||
            typedArray instanceof Uint16Array ||
            typedArray instanceof Int32Array ||
            typedArray instanceof Uint32Array ||
            typedArray instanceof Float32Array ||
            typedArray instanceof Float64Array ||
            typedArray instanceof DataView
        ) {
            typedArray = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
        }

        // Handle Uint8Array
        if (typedArray instanceof Uint8Array) {
            // Shortcut
            var typedArrayByteLength = typedArray.byteLength;

            // Extract bytes
            var words = [];
            for (var i = 0; i < typedArrayByteLength; i++) {
                words[i >>> 2] |= typedArray[i] << (24 - (i % 4) * 8);
            }

            // Initialize this word array
            superInit.call(this, words, typedArrayByteLength);
        } else {
            // Else call normal init
            superInit.apply(this, arguments);
        }
    };
    subInit.prototype = WordArray;

    /**
     * Converts this word array to an array buffer.
     *
     * @returns {ArrayBuffer} The array buffer.
     */
    WordArray.toArrayBuffer = function () {
        // Shortcuts
        var words = this.words;
        var sigBytes = this.sigBytes;

        // Create buffer
        var arrayBuffer = new ArrayBuffer(sigBytes);
        var uint8View = new Uint8Array(arrayBuffer);

        // Copy data into buffer
        for (var i = 0; i < sigBytes; i++) {
            uint8View[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        }

        return arrayBuffer;
    };
}(ArrayBuffer, Uint8Array, Uint8ClampedArray));

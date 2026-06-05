// XHR transport with progress. We use XHR (not fetch) because fetch cannot report
// upload progress, and the progress bars are core UX.

// X-File-Name is a fixed dummy string — the server stores it into files.fileName
// and echoes it back, but the client never reads it (the real filename rides
// encrypted inside the body). Kept short to fit the varchar(255) column.
const DUMMY_NAME = 'encrypted';

export function putFile(payload, { expirationDays, maxViews }, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/putfile');
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.setRequestHeader('X-File-Content-Type', 'application/octet-stream');
    xhr.setRequestHeader('X-File-Name', DUMMY_NAME);
    xhr.setRequestHeader('X-File-Expiration-Days', String(expirationDays));
    xhr.setRequestHeader('X-File-Max-Views', String(maxViews));

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    });
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(new Error('Unexpected server response.'));
        }
      } else if (xhr.status === 400) {
        reject(new Error('Upload rejected (file too large or missing length).'));
      } else {
        reject(new Error('Upload failed (HTTP ' + xhr.status + ').'));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error during upload.')));

    // Content-Length is set automatically by XHR for an ArrayBufferView body.
    xhr.send(payload);
  });
}

export function getFile(url, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/get/' + encodeURIComponent(url));
    // MUST be set before send(). Load-bearing: the default responseText decodes
    // bytes through UTF and corrupts binary ciphertext, which would then surface
    // as a spurious "wrong key".
    xhr.responseType = 'arraybuffer';

    xhr.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    });
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const num = (h) => {
          const v = parseInt(xhr.getResponseHeader(h), 10);
          return Number.isFinite(v) ? v : null;
        };
        resolve({
          body: xhr.response,
          meta: {
            views: num('X-File-Views'),
            maxViews: num('X-File-Max-Views'),
            expiration: xhr.getResponseHeader('X-File-Expiration'),
          },
        });
      } else {
        reject(new Error('File not found or expired (HTTP ' + xhr.status + ').'));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error during download.')));
    xhr.send();
  });
}

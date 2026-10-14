// Pure helpers — no DOM, no crypto. Unit-tested in format.test.js.

// base64url <-> bytes. URL-safe, unpadded (so it rides cleanly in a URL fragment).
export function bytesToB64url(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlToBytes(b64) {
  const padLen = (4 - (b64.length % 4)) % 4;
  const std = b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen);
  const bin = atob(std);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// Human-readable file size. Mirrors the original client's kB/MB/... ladder.
export function fileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  const units = ['kB', 'MB', 'GB', 'TB', 'PB'];
  let n = bytes / 1024;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return n.toFixed(1) + ' ' + units[i];
}

// Parse a location.hash like "#u=abc&p=xyz" into an object.
export function parseHash(hash) {
  const out = {};
  const s = (hash || '').replace(/^#/, '').replace(/^\?/, '');
  if (!s) return out;
  for (const part of s.split('&')) {
    if (!part) continue;
    const idx = part.indexOf('=');
    if (idx === -1) {
      out[decodeURIComponent(part)] = '';
      continue;
    }
    out[decodeURIComponent(part.slice(0, idx))] = decodeURIComponent(part.slice(idx + 1));
  }
  return out;
}

// A key made by this client is a 32-byte AES-GCM key as 43 base64url characters.
// Links from the original client carry a longer double-base64 passphrase.
export function isCurrentKey(key) {
  return /^[A-Za-z0-9_-]{43}$/.test(key || '');
}

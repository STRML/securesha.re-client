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

// True when the URL has an EMPTY query part before the fragment ("/?#u=..."). The
// original client built its links as "...?#u=...", this one builds ".../#u=...". Only
// an empty query counts: a link shared through a mailer or social site can pick up
// "?fbclid=..." or "?utm_...", and that is not a reason to hand it to the other client.
// The key cannot tell the two apart: both are 32 random bytes in base64, 43 characters.
export function hasEmptyQuery(href) {
  return /\?$/.test((href || '').split('#')[0]);
}

// The server serves the original client at this path. It is a real path, not "/?",
// because a proxy may drop an empty query before the request reaches the server.
export const ORIGINAL_CLIENT_PATH = '/original';

export function isOriginalPath(pathname) {
  return pathname === ORIGINAL_CLIENT_PATH;
}

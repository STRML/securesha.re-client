// WebCrypto AES-GCM. All framing lives here, behind two entry points:
// encryptPayload / decryptPayload.
//
// Wire blob (the opaque body POSTed to /putfile and returned by /get):
//
//   [ metaLen : 4 bytes, big-endian uint32      ]
//   [ metaSection : metaLen bytes = metaIV(12) ‖ AES-GCM(JSON{fileName,contentType}) ]
//   [ bodySection : bodyIV(12) ‖ AES-GCM(fileBytes) ]
//
// Two independent random 12-byte IVs. Metadata rides in the body (NOT a header)
// because the server stores X-File-Name into a varchar(255) latin1 column that
// would silently truncate it. Overhead = 4 + 2*(12+16) = 60 bytes.
import { bytesToB64url, b64urlToBytes } from './format.js';

const ALG = 'AES-GCM';
const IV_LEN = 12;
const TAG_LEN = 16;
export const OVERHEAD = 4 + 2 * (IV_LEN + TAG_LEN); // 60 bytes

// Thrown when the ciphertext is structurally short/truncated (transport problem,
// NOT a wrong key). Lets the UI avoid the "looks like a bad password" trap.
export class TransportError extends Error {}
// Thrown when AES-GCM authentication fails on a structurally-complete blob
// (most likely a wrong key, possibly tampering).
export class DecryptError extends Error {}

export async function generateKey() {
  return crypto.subtle.generateKey({ name: ALG, length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function exportKeyB64(key) {
  const raw = await crypto.subtle.exportKey('raw', key);
  return bytesToB64url(raw);
}

export async function importKeyB64(b64) {
  let raw;
  try {
    raw = b64urlToBytes((b64 || '').trim());
  } catch (e) {
    // atob throws a DOMException on malformed base64 (e.g. a mistyped pasted key).
    throw new DecryptError('Invalid key format.');
  }
  if (raw.length !== 32) throw new DecryptError('Invalid key (expected a 256-bit key).');
  return crypto.subtle.importKey('raw', raw, { name: ALG }, true, ['encrypt', 'decrypt']);
}

// A fresh key is generated per upload, so (key, IV) can never repeat — the random
// per-section IVs only need to be unique within a single blob. Do NOT reuse a key
// across uploads; that would reintroduce GCM nonce-reuse risk.
async function encryptSection(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: ALG, iv }, key, plaintext));
  const out = new Uint8Array(IV_LEN + ct.length);
  out.set(iv, 0);
  out.set(ct, IV_LEN);
  return out;
}

async function decryptSection(key, section) {
  const iv = section.subarray(0, IV_LEN);
  const ct = section.subarray(IV_LEN);
  return new Uint8Array(await crypto.subtle.decrypt({ name: ALG, iv }, key, ct));
}

export async function encryptPayload(key, fileBytes, meta) {
  const metaBytes = new TextEncoder().encode(JSON.stringify(meta));
  const metaSection = await encryptSection(key, metaBytes);
  const bodySection = await encryptSection(key, fileBytes);
  const out = new Uint8Array(4 + metaSection.length + bodySection.length);
  new DataView(out.buffer).setUint32(0, metaSection.length, false); // big-endian
  out.set(metaSection, 4);
  out.set(bodySection, 4 + metaSection.length);
  return out;
}

export async function decryptPayload(key, arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  // Structural checks first — these are transport failures, not crypto failures.
  if (bytes.length < 4) throw new TransportError('Payload truncated (no length prefix).');
  const metaLen = new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, false);
  const minMeta = IV_LEN + TAG_LEN;
  if (metaLen < minMeta || 4 + metaLen >= bytes.length) {
    throw new TransportError('Payload corrupt or truncated.');
  }
  const metaSection = bytes.subarray(4, 4 + metaLen);
  const bodySection = bytes.subarray(4 + metaLen);
  if (bodySection.length < IV_LEN + TAG_LEN) {
    throw new TransportError('Payload body missing or truncated.');
  }

  let metaBytes, fileBytes;
  try {
    metaBytes = await decryptSection(key, metaSection);
    fileBytes = await decryptSection(key, bodySection);
  } catch (e) {
    // GCM auth failed on a structurally-complete blob → wrong key / tampered.
    throw new DecryptError('Authentication failed — wrong key or tampered data.');
  }

  let meta;
  try {
    meta = JSON.parse(new TextDecoder().decode(metaBytes));
  } catch (e) {
    throw new DecryptError('Decrypted metadata was unreadable.');
  }
  return { fileBytes, meta };
}

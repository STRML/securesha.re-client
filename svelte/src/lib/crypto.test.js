import { describe, it, expect } from 'vitest';
import {
  generateKey,
  exportKeyB64,
  importKeyB64,
  encryptPayload,
  decryptPayload,
  TransportError,
  DecryptError,
  OVERHEAD,
} from './crypto.js';

const meta = { fileName: 'secret report (final) v2.pdf', contentType: 'application/pdf' };

function randomBytes(n) {
  const a = new Uint8Array(n);
  for (let i = 0; i < n; i++) a[i] = (i * 131 + 7) & 0xff;
  return a;
}

describe('encrypt/decrypt round-trip', () => {
  it('recovers the original bytes and metadata', async () => {
    const key = await generateKey();
    const data = randomBytes(4096);
    const blob = await encryptPayload(key, data, meta);
    const { fileBytes, meta: out } = await decryptPayload(key, blob.buffer);
    expect(Array.from(fileBytes)).toEqual(Array.from(data));
    expect(out).toEqual(meta);
  });

  it('survives an empty file', async () => {
    const key = await generateKey();
    const blob = await encryptPayload(key, new Uint8Array(0), meta);
    const { fileBytes, meta: out } = await decryptPayload(key, blob.buffer);
    expect(fileBytes.length).toBe(0);
    expect(out).toEqual(meta);
  });

  it('survives a long filename (the C3 regression case)', async () => {
    const key = await generateKey();
    const longMeta = { fileName: 'x'.repeat(300) + '.bin', contentType: 'application/octet-stream' };
    const blob = await encryptPayload(key, randomBytes(64), longMeta);
    const { meta: out } = await decryptPayload(key, blob.buffer);
    expect(out.fileName.length).toBe(304);
  });

  it('overhead is exactly 60 bytes over plaintext + metadata json', async () => {
    const key = await generateKey();
    const data = randomBytes(1000);
    const blob = await encryptPayload(key, data, meta);
    const metaJsonLen = new TextEncoder().encode(JSON.stringify(meta)).length;
    expect(blob.length).toBe(OVERHEAD + data.length + metaJsonLen);
  });
});

describe('key handling', () => {
  it('exports and re-imports a key', async () => {
    const key = await generateKey();
    const b64 = await exportKeyB64(key);
    expect(b64.length).toBe(43);
    const data = randomBytes(128);
    const blob = await encryptPayload(key, data, meta);
    const reimported = await importKeyB64(b64);
    const { fileBytes } = await decryptPayload(reimported, blob.buffer);
    expect(Array.from(fileBytes)).toEqual(Array.from(data));
  });

  it('rejects a malformed key', async () => {
    await expect(importKeyB64('too-short')).rejects.toBeInstanceOf(DecryptError);
  });
});

describe('failure modes', () => {
  it('throws DecryptError on a wrong key (complete blob)', async () => {
    const key = await generateKey();
    const wrong = await generateKey();
    const blob = await encryptPayload(key, randomBytes(256), meta);
    await expect(decryptPayload(wrong, blob.buffer)).rejects.toBeInstanceOf(DecryptError);
  });

  it('throws TransportError on a truncated blob', async () => {
    const key = await generateKey();
    const blob = await encryptPayload(key, randomBytes(256), meta);
    const truncated = blob.slice(0, 8); // keep the length prefix, drop the rest
    await expect(decryptPayload(key, truncated.buffer)).rejects.toBeInstanceOf(TransportError);
  });

  it('throws TransportError on an empty blob', async () => {
    const key = await generateKey();
    await expect(decryptPayload(key, new Uint8Array(0).buffer)).rejects.toBeInstanceOf(TransportError);
  });
});

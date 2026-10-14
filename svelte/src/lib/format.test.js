import { describe, it, expect } from 'vitest';
import { bytesToB64url, b64urlToBytes, fileSize, parseHash, isCurrentKey, hasQuery } from './format.js';

describe('base64url', () => {
  it('round-trips arbitrary bytes', () => {
    for (const len of [0, 1, 2, 3, 31, 32, 33, 200]) {
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = (i * 37 + 11) & 0xff;
      const round = b64urlToBytes(bytesToB64url(bytes));
      expect(Array.from(round)).toEqual(Array.from(bytes));
    }
  });

  it('produces url-safe, unpadded output', () => {
    const bytes = new Uint8Array([251, 255, 191, 0, 16]);
    const s = bytesToB64url(bytes);
    expect(s).not.toMatch(/[+/=]/);
  });

  it('encodes a 32-byte key to 43 chars', () => {
    expect(bytesToB64url(new Uint8Array(32)).length).toBe(43);
  });
});

describe('fileSize', () => {
  it('formats across unit boundaries', () => {
    expect(fileSize(0)).toBe('0 B');
    expect(fileSize(512)).toBe('512 B');
    expect(fileSize(1024)).toBe('1.0 kB');
    expect(fileSize(1536)).toBe('1.5 kB');
    expect(fileSize(20 * 1024 * 1024)).toBe('20.0 MB');
  });
});

describe('parseHash', () => {
  it('parses u and p', () => {
    expect(parseHash('#u=abc.bin&p=KEY')).toEqual({ u: 'abc.bin', p: 'KEY' });
  });
  it('handles missing key', () => {
    expect(parseHash('#u=abc.bin')).toEqual({ u: 'abc.bin' });
  });
  it('returns empty for blank hash', () => {
    expect(parseHash('')).toEqual({});
    expect(parseHash('#')).toEqual({});
  });
  it('tolerates a leading ? (legacy ?# links)', () => {
    expect(parseHash('?u=x&p=y')).toEqual({ u: 'x', p: 'y' });
  });
});

describe('isCurrentKey', () => {
  it('accepts a freshly encoded 32-byte key', () => {
    expect(isCurrentKey(bytesToB64url(new Uint8Array(32).fill(7)))).toBe(true);
  });
  it('rejects the original client passphrase (double base64, ~59 chars)', () => {
    const old = btoa(btoa(String.fromCharCode(...new Uint8Array(32).fill(7)))).replace(/=+$/, '');
    expect(old.length).toBeGreaterThan(43);
    expect(isCurrentKey(old)).toBe(false);
  });
  it('rejects empty, undefined, and wrong-length keys', () => {
    for (const k of ['', undefined, 'short', 'a'.repeat(44), 'a'.repeat(42)]) {
      expect(isCurrentKey(k)).toBe(false);
    }
  });
});

describe('hasQuery', () => {
  it('sees the empty query of an original-client link', () => {
    expect(hasQuery('https://securesha.re/?#u=abc&p=xyz')).toBe(true);
    expect(hasQuery('https://securesha.re/?u=abc')).toBe(true);
  });
  it('ignores a ? inside the fragment', () => {
    expect(hasQuery('https://securesha.re/#u=a?b&p=xyz')).toBe(false);
  });
  it('is false for a plain current-client link', () => {
    expect(hasQuery('https://securesha.re/#u=abc&p=xyz')).toBe(false);
    expect(hasQuery('')).toBe(false);
    expect(hasQuery(undefined)).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { bytesToB64url, b64urlToBytes, fileSize, parseHash } from './format.js';

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

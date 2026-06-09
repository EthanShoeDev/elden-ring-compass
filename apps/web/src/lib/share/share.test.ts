import { describe, it, expect } from 'vitest';
import { encodeToUrl } from './encode';
import { decodeFromUrl, isValidShareData } from './decode';
import { type ShareableProgression, SHAREABLE_VERSION } from './types';

describe('Share encode/decode', () => {
  const mockShareableData: ShareableProgression = {
    v: SHAREABLE_VERSION,
    n: 'TestCharacter',
    s: {
      l: 150,
      v: 60,
      m: 30,
      e: 40,
      st: 50,
      d: 45,
      i: 20,
      f: 25,
      a: 15,
      r: 500000,
      rm: 10000000,
    },
    g: 0,
    at: 1,
    wl: 25,
    ef: [100, 50, 75, 25], // delta encoded event IDs
    ur: [1, 2, 3, 4, 5],
    inv: [
      [0xb0001234, 5],
      [0xb0005678, 10],
    ],
    ga: [
      [100, 10],
      [200, 5],
    ],
  };

  it('should encode and decode data correctly (round-trip)', () => {
    const encoded = encodeToUrl(mockShareableData);
    const decoded = decodeFromUrl(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded?.v).toBe(SHAREABLE_VERSION);
    expect(decoded?.n).toBe('TestCharacter');
    expect(decoded?.s.l).toBe(150);
    expect(decoded?.ef).toEqual([100, 50, 75, 25]);
    expect(decoded?.ur).toEqual([1, 2, 3, 4, 5]);
  });

  it('should produce a URL-safe encoded string', () => {
    const encoded = encodeToUrl(mockShareableData);

    // Should not contain characters that need URL encoding
    expect(encoded).not.toContain(' ');
    expect(encoded).not.toContain('\n');

    // Should be a non-empty string
    expect(encoded.length).toBeGreaterThan(0);
  });

  it('should return null for invalid encoded data', () => {
    const decoded = decodeFromUrl('invalid-data');
    expect(decoded).toBeNull();
  });

  it('should return null for empty string', () => {
    const decoded = decodeFromUrl('');
    expect(decoded).toBeNull();
  });
});

describe('isValidShareData', () => {
  it('should return true for valid share data', () => {
    const validData: ShareableProgression = {
      v: SHAREABLE_VERSION,
      n: 'Test',
      s: { l: 1, v: 1, m: 1, e: 1, st: 1, d: 1, i: 1, f: 1, a: 1, r: 0, rm: 0 },
      g: 0,
      at: 0,
      wl: 0,
      ef: [],
      ur: [],
      inv: [],
      ga: [],
    };

    expect(isValidShareData(validData)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isValidShareData(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isValidShareData(undefined)).toBe(false);
  });

  it('should return false for wrong version', () => {
    const wrongVersion = {
      v: 999,
      n: 'Test',
      s: { l: 1, v: 1, m: 1, e: 1, st: 1, d: 1, i: 1, f: 1, a: 1, r: 0, rm: 0 },
      g: 0,
      at: 0,
      wl: 0,
      ef: [],
      ur: [],
      inv: [],
      ga: [],
    };

    expect(isValidShareData(wrongVersion)).toBe(false);
  });

  it('should return false for missing required fields', () => {
    expect(isValidShareData({ v: SHAREABLE_VERSION })).toBe(false);
    expect(isValidShareData({ v: SHAREABLE_VERSION, n: 'Test' })).toBe(false);
  });
});

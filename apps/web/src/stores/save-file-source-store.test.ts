import { describe, it, expect } from 'vitest';
import {
  isFileSource,
  isUrlSource,
  isSharedSource,
  normalizePersistedUrl,
  SAMPLE_SAVE_URL,
  type SaveFileSource,
} from './save-file-source-store';
import { LEGACY_SHAREABLE_VERSION } from '@/lib/share/types';

describe('SaveFileSource type guards', () => {
  describe('isFileSource', () => {
    it('should return true for file source', () => {
      const source: SaveFileSource = {
        file: {
          name: 'test.sl2',
          buffer: new ArrayBuffer(0),
        },
      };
      expect(isFileSource(source)).toBe(true);
    });

    it('should return false for url source', () => {
      const source: SaveFileSource = { url: 'http://example.com/save.sl2' };
      expect(isFileSource(source)).toBe(false);
    });

    it('should return false for shared source', () => {
      const source: SaveFileSource = {
        sharedData: {
          v: LEGACY_SHAREABLE_VERSION,
          n: 'Test',
          s: { l: 1, v: 1, m: 1, e: 1, st: 1, d: 1, i: 1, f: 1, a: 1, r: 0, rm: 0 },
          g: 0,
          at: 0,
          wl: 0,
          ef: [],
          ur: [],
          inv: [],
          ga: [],
        },
      };
      expect(isFileSource(source)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isFileSource(undefined)).toBe(false);
    });
  });

  describe('isUrlSource', () => {
    it('should return true for url source', () => {
      const source: SaveFileSource = { url: 'http://localhost:8080/ER0000.sl2' };
      expect(isUrlSource(source)).toBe(true);
    });

    it('should return false for file source', () => {
      const source: SaveFileSource = {
        file: {
          name: 'test.sl2',
          buffer: new ArrayBuffer(0),
        },
      };
      expect(isUrlSource(source)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isUrlSource(undefined)).toBe(false);
    });
  });

  describe('isSharedSource', () => {
    it('should return true for shared source', () => {
      const source: SaveFileSource = {
        sharedData: {
          v: LEGACY_SHAREABLE_VERSION,
          n: 'Test',
          s: { l: 1, v: 1, m: 1, e: 1, st: 1, d: 1, i: 1, f: 1, a: 1, r: 0, rm: 0 },
          g: 0,
          at: 0,
          wl: 0,
          ef: [],
          ur: [],
          inv: [],
          ga: [],
        },
      };
      expect(isSharedSource(source)).toBe(true);
    });

    it('should return false for url source', () => {
      const source: SaveFileSource = { url: 'http://example.com' };
      expect(isSharedSource(source)).toBe(false);
    });

    it('should return false for file source', () => {
      const source: SaveFileSource = {
        file: {
          name: 'test.sl2',
          buffer: new ArrayBuffer(0),
        },
      };
      expect(isSharedSource(source)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isSharedSource(undefined)).toBe(false);
    });
  });
});

describe('normalizePersistedUrl', () => {
  it('re-points the pre-fingerprint sample path at the current sample asset', () => {
    expect(normalizePersistedUrl('/ER0000.sl2')).toBe(SAMPLE_SAVE_URL);
  });

  it('re-points a stale fingerprinted sample url at the current one', () => {
    expect(normalizePersistedUrl('/assets/ER0000-Cabc123_.sl2')).toBe(SAMPLE_SAVE_URL);
  });

  it('is a no-op for the current sample url', () => {
    expect(normalizePersistedUrl(SAMPLE_SAVE_URL)).toBe(SAMPLE_SAVE_URL);
  });

  it('leaves absolute urls (a local file server) alone', () => {
    const url = 'http://localhost:8080/ER0000.sl2';
    expect(normalizePersistedUrl(url)).toBe(url);
  });

  it('leaves other same-origin urls alone', () => {
    expect(normalizePersistedUrl('/saves/other.sl2')).toBe('/saves/other.sl2');
  });
});

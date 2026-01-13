import { describe, it, expect } from 'vitest';
import {
  isFileSource,
  isUrlSource,
  isSharedSource,
  type SaveFileSource,
} from './save-file-source-store';
import { SHAREABLE_VERSION } from '@/lib/share/types';

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

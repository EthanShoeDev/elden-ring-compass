import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cn, delayMs } from './utils';

describe('cn (className utility)', () => {
  it('should merge class names', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    const include = true;
    const exclude = false;
    const result = cn('base', include && 'included', exclude && 'excluded');
    expect(result).toBe('base included');
  });

  it('should merge tailwind classes correctly', () => {
    // twMerge should keep the last conflicting class
    const result = cn('p-2', 'p-4');
    expect(result).toBe('p-4');
  });

  it('should handle arrays of classes', () => {
    const result = cn(['foo', 'bar'], 'baz');
    expect(result).toBe('foo bar baz');
  });

  it('should handle undefined and null values', () => {
    const result = cn('foo', undefined, null, 'bar');
    expect(result).toBe('foo bar');
  });

  it('should handle empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });
});

describe('delayMs', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve after specified delay', async () => {
    const promise = delayMs(1000);

    // Should not resolve immediately
    let resolved = false;
    void promise.then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);

    // Advance timers
    await vi.advanceTimersByTimeAsync(1000);

    expect(resolved).toBe(true);
  });

  it('should resolve with undefined', async () => {
    const promise = delayMs(100);
    vi.advanceTimersByTime(100);
    const result = await promise;
    expect(result).toBeUndefined();
  });
});

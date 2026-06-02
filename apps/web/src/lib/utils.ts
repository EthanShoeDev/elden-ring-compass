import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs));
}

/**
 * @deprecated Prefer Effect: `yield* Effect.sleep('200 millis')` (or `Effect.sleep(Duration.millis(n))`)
 * inside an Effect, instead of an untracked timer Promise.
 */
export function delayMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Narrows `T | null | undefined` to `T`, throwing when the value is missing.
 *
 * @deprecated Prefer Effect-TS: `Option.fromNullable(value)` then `Option.getOrThrowWith` /
 * pattern-match, or `Predicate.isNotNullable` for narrowing. For validated parsing use
 * `effect/Schema`. Avoid throwing helpers in new code.
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): T {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Value is not defined');
  }
  return value;
}

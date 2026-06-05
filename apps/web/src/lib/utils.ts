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
 * @deprecated Throwing helpers bypass Effect's error channel. Prefer Effect-TS:
 * `Option.fromNullable(value)` then either `Option.match({ onNone: () => Effect.fail(new SomeError(...)),
 * onSome: ... })` inside an Effect, or `Option.getOrElse(() => fallback)` when a default makes sense;
 * `Predicate.isNotNullable` for plain narrowing; `effect/Schema` for validated parsing. Do NOT reach
 * for `Option.getOrThrow`/`getOrThrowWith` — they are the same throw-at-runtime anti-pattern this
 * helper is. No new usages.
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): T {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Value is not defined');
  }
  return value;
}

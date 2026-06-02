import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs));
}

export function delayMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Narrows `T | null | undefined` to `T`, throwing when the value is missing.
 * Use this instead of the non-null assertion operator (`!`), which silently
 * bypasses strict null checks.
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): T {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Value is not defined');
  }
  return value;
}

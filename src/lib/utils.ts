import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function delayMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

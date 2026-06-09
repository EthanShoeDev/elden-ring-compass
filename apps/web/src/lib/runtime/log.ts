import { Effect } from 'effect';
import { clientRuntime } from './client';
import { serverRuntime } from './server';

// Emit Effect logs at non-Effect boundaries (DOM event handlers, isomorphic helpers)
// through the environment's ManagedRuntime — pretty console in the browser, logfmt on
// the server. `import.meta.env.SSR` is statically replaced per Vite build, so the dead
// branch and its runtime import are tree-shaken: the client bundle never pulls in the
// server logger, and the server bundle never pulls in the client one.
const runtime = import.meta.env.SSR ? serverRuntime : clientRuntime;

export const logWarning = (message: string): void => runtime.runSync(Effect.logWarning(message));

export const logError = (message: string, cause?: unknown): void =>
  runtime.runSync(cause === undefined ? Effect.logError(message) : Effect.logError(message, cause));

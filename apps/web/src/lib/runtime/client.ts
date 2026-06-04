import { Logger, ManagedRuntime } from 'effect';

// Client-side Effect ManagedRuntime.
//
// Purpose: run Effects at non-Effect JavaScript boundaries — Web Workers, DOM event handlers,
// Comlink callbacks — without reaching for ad-hoc `Effect.runSync(...)`. The runtime owns its
// layer (here: the client logger), caches the built context, and exposes `runFork`/`runPromise`/
// `runSync` for those boundaries.
//
// Logging: a console logger with ANSI colors off — browser DevTools renders raw ANSI escapes as
// garbage, so `colors: false` keeps client logs readable. Use Effect's logging (`Effect.log*`)
// everywhere; this runtime is how non-Effect code emits those logs.
//
// Distinct from `browserKvsRuntime` (`Atom.runtime` in atoms/kvs.ts), which backs reactive atoms —
// that's for state; this is for running effects at entry points.
const ClientLayer = Logger.layer([Logger.consolePretty({ colors: false })]);

export const clientRuntime = ManagedRuntime.make(ClientLayer);

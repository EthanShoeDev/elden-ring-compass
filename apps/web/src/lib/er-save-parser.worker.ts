// Dedicated Web Worker entry for the save parser. Kept separate from `er-save-parser.ts` (which the
// Node unit test imports) so it can use browser-/Vite-only constructs: a `?url` import of the wasm
// binary and a top-level `await init()`.
//
// Two things that were both missing before — together they made parsing a save hang forever:
//   1. the `--target web` wasm needs an explicit `init()` (else `__wbindgen_malloc` is undefined),
//   2. a Comlink worker must `expose()` an API or the wrapped caller never gets an answer.
// Importing the wasm with `?url` and passing it to `init()` is the reliable form in a worker, where
// the glue's default `new URL(..., import.meta.url)` self-fetch resolves to the wrong path.
import init from '@elden-ring-compass/save-parser';
import wasmUrl from '@elden-ring-compass/save-parser/elden_ring_save_parser_bg.wasm?url';
import * as Comlink from 'comlink';
import { Effect } from 'effect';
import { clientRuntime } from './runtime/client';
import { parseEldenRingData } from './er-save-parser';

// Init first, then expose — no top-level await (Vite's worker bundling is flaky with it). The
// caller's first Comlink message simply queues until `expose()` runs.
init({ module_or_path: wasmUrl })
  .then(() => {
    Comlink.expose({ parseEldenRingData });
  })
  .catch((err: unknown) => {
    // Non-Effect boundary (a Promise catch): emit the log through the client ManagedRuntime rather
    // than `console.error` or an ad-hoc `Effect.runSync`.
    clientRuntime.runFork(Effect.logError('save-parser worker: wasm init failed', err));
  });

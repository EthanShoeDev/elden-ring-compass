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
import { parseSave } from '@elden-ring-compass/save-parser-ts';
import * as Comlink from 'comlink';
import type { WasmEldenRingSave } from './wasm-wrapper';
import { parseEldenRingData } from './er-save-parser';

// `Comlink.expose` MUST run synchronously at module eval so the worker's message listener is
// attached before any call can arrive. `atoms/save.ts` calls `api.parseEldenRingData(...)` the
// instant it creates the Worker; a message that arrives before the listener exists is dropped and
// the caller hangs forever. (An earlier `init().then(expose)` lost that race intermittently.)
//
// The `--target web` wasm still needs `init()` before `parse_save`, so each call awaits a one-time
// init — racing-safe because the listener is already up while init resolves.
let wasmReady: Promise<unknown> | undefined;
const ensureWasm = () => (wasmReady ??= init({ module_or_path: wasmUrl }));

Comlink.expose({
  // Rust/WASM backend (default). Needs a one-time wasm init.
  async parseEldenRingData(buffer: ArrayBuffer) {
    await ensureWasm();
    return parseEldenRingData(buffer);
  },
  // Pure-TS backend (no wasm init). Emits the identical lean DTO — verified
  // byte-for-byte against WASM in `packages/save-parser/test/parity.test.ts`. The
  // structurally-identical `LeanSave` is cast to the web's `WasmEldenRingSave` so
  // every downstream view-model stays unchanged. See
  // `docs/projects/typescript-save-parser-port.md`.
  parseEldenRingDataTs(buffer: ArrayBuffer) {
    return parseSave(buffer) as unknown as WasmEldenRingSave;
  },
});

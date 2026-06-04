import initWasm from '@elden-ring-compass/save-parser';
import { parseSave as parseSaveTs } from '@elden-ring-compass/save-parser-ts';
import * as Comlink from 'comlink';
import { it } from '@effect/vitest';
import { Effect } from 'effect';
import { expect } from 'vitest';
import { forceGcHeapUsedBytes, mb } from '@/test/perf/cdp-memory';
import { parseEldenRingData } from './er-save-parser';
import type { WasmEldenRingSave } from './wasm-wrapper';

// WASM save-parse perf, measured in real Chromium (real V8 + WASM tiers) — the engine your users
// actually run. Two paths:
//  • direct  — `parseEldenRingData(buffer)` on the test thread: the parse + wasm-bindgen marshalling
//              cost, isolated.
//  • worker  — through the real Comlink Worker exactly as `atoms/save.ts` does it: adds the
//              structured-clone of the ~1.7 MB-per-slot result across the worker boundary, a prime
//              suspect for the post-parse stall. (Also the regression guard for the `Comlink.expose`
//              fix — without it this call hangs forever.)
//
// Thresholds are deliberately HIGH to start; ratchet them down as you learn the real numbers on
// your machine. Run locally with `bun run test:perf`.

const SAVE_URL = '/ER0000.sl2';
const WARMUP = 1;
const RUNS = 5;

const PARSE_DIRECT_MS = 3000;
const PARSE_WORKER_MS = 6000;
const PARSE_HEAP_MB = 300;

const median = (xs: readonly number[]): number =>
  [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;

const loadSaveBuffer = Effect.promise(() => fetch(SAVE_URL).then((r) => r.arrayBuffer()));

type SaveParserApi = {
  parseEldenRingData: (buffer: ArrayBuffer) => Promise<WasmEldenRingSave>;
};

it.effect('parse (direct): median time + retained heap within bounds', () =>
  Effect.gen(function* () {
    // `--target web` wasm: init once before any direct `parse_save` call (the worker inits itself).
    yield* Effect.promise(() => initWasm());
    const buffer = yield* loadSaveBuffer;

    for (let i = 0; i < WARMUP; i++) parseEldenRingData(buffer);

    const heapBefore = yield* Effect.promise(forceGcHeapUsedBytes);
    const times: number[] = [];
    let save: WasmEldenRingSave | undefined;
    for (let i = 0; i < RUNS; i++) {
      const start = performance.now();
      save = parseEldenRingData(buffer);
      times.push(performance.now() - start);
    }
    const heapAfter = yield* Effect.promise(forceGcHeapUsedBytes);

    const med = median(times);
    const heapDeltaMb = mb(heapAfter - heapBefore);
    yield* Effect.log(
      `parse direct: median ${med.toFixed(1)}ms (${RUNS} runs), retained +${heapDeltaMb}MB`,
    );

    expect((save?.slots.length ?? 0) > 0).toBe(true);
    expect(med).toBeLessThan(PARSE_DIRECT_MS);
    expect(heapDeltaMb).toBeLessThan(PARSE_HEAP_MB);
  }),
);

it.effect('parse TS (direct): median time + retained heap within bounds', () =>
  Effect.gen(function* () {
    // Pure-TS parser: no wasm init, no marshalling boundary — it builds the JS object
    // graph directly. Measured the same way as the WASM direct test so the two numbers
    // are comparable back-to-back on the same buffer/machine. See
    // `docs/projects/typescript-save-parser-port.md` (Performance).
    const buffer = yield* loadSaveBuffer;

    for (let i = 0; i < WARMUP; i++) parseSaveTs(buffer);

    const heapBefore = yield* Effect.promise(forceGcHeapUsedBytes);
    const times: number[] = [];
    let save: WasmEldenRingSave | undefined;
    for (let i = 0; i < RUNS; i++) {
      const start = performance.now();
      save = parseSaveTs(buffer) as unknown as WasmEldenRingSave;
      times.push(performance.now() - start);
    }
    const heapAfter = yield* Effect.promise(forceGcHeapUsedBytes);

    const med = median(times);
    const heapDeltaMb = mb(heapAfter - heapBefore);
    yield* Effect.log(
      `parse TS direct: median ${med.toFixed(1)}ms (${RUNS} runs), retained +${heapDeltaMb}MB`,
    );

    expect((save?.slots.length ?? 0) > 0).toBe(true);
    expect(med).toBeLessThan(PARSE_DIRECT_MS);
    expect(heapDeltaMb).toBeLessThan(PARSE_HEAP_MB);
  }),
);

// PARKED: the real-worker path. The Comlink `expose` fix is verified working (in an earlier run the
// worker answered — it threw the wasm error rather than hanging), but `init()` stays *pending* when
// the wasm is loaded inside a Vitest-browser module worker (it resolves fine on the main thread, so
// the direct test above passes). This is the worker+`?url`-asset corner where Vitest browser mode is
// weakest — exactly the "not a full E2E runner" caveat. The app's worker code (er-save-parser.worker
// .ts) uses the standard Vite `new URL(...) + ?url` pattern and should be validated by running the
// real app (or a Playwright E2E), not here. Unskip once the worker-init story is resolved.
it.effect.skip('parse (worker): real Comlink round-trip time + retained heap', () =>
  Effect.gen(function* () {
    const buffer = yield* loadSaveBuffer;
    const worker = new Worker(new URL('./er-save-parser.worker.ts', import.meta.url), {
      name: 'EldenRingSaveParserPerf',
      type: 'module',
    });
    const api = Comlink.wrap<SaveParserApi>(worker);

    yield* Effect.promise(() => api.parseEldenRingData(buffer));

    const heapBefore = yield* Effect.promise(forceGcHeapUsedBytes);
    const times: number[] = [];
    let save: WasmEldenRingSave | undefined;
    for (let i = 0; i < RUNS; i++) {
      const start = performance.now();
      save = yield* Effect.promise(() => api.parseEldenRingData(buffer));
      times.push(performance.now() - start);
    }
    const heapAfter = yield* Effect.promise(forceGcHeapUsedBytes);

    worker.terminate();

    const med = median(times);
    const heapDeltaMb = mb(heapAfter - heapBefore);
    yield* Effect.log(
      `parse worker: median ${med.toFixed(1)}ms (${RUNS} runs), retained +${heapDeltaMb}MB`,
    );

    expect((save?.slots.length ?? 0) > 0).toBe(true);
    expect(med).toBeLessThan(PARSE_WORKER_MS);
    expect(heapDeltaMb).toBeLessThan(PARSE_HEAP_MB);
  }),
);

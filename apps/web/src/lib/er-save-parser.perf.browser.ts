import { parseSave as parseSaveTs } from '@elden-ring-compass/save-parser-ts';
import { it } from '@effect/vitest';
import { Effect } from 'effect';
import { expect } from 'vitest';
import { forceGcHeapUsedBytes, mb } from '@/test/perf/cdp-memory';
import type { WasmEldenRingSave } from './save-dto';

// Pure-TS save-parse perf (direct), measured in real Chromium (real V8 + DOM) — the engine your
// users actually run. `parseSave(buffer)` on the test thread: the parse cost, isolated. (The
// worker round-trip is covered by the Playwright E2E `e2e/save-parse.spec.ts`, not here.)
//
// The TS port replaced the Rust/WASM parser (~60× faster in node; see
// `docs/projects/typescript-save-parser-port.md`). Numbers are `console.log`-ged; the `test:perf`
// script runs with `--reporter=verbose` to surface them. Thresholds are deliberately HIGH; ratchet
// down as you learn the real numbers. Run locally with `bun run test:perf`.

import SAVE_URL from '@elden-ring-compass/save-parser-ts/fixtures/ER0000.sl2?url';
const WARMUP = 1;
const RUNS = 5;

const PARSE_DIRECT_MS = 3000;
const PARSE_HEAP_MB = 300;

const median = (xs: readonly number[]): number =>
  [...xs].toSorted((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;

const loadSaveBuffer = Effect.promise(() => fetch(SAVE_URL).then((r) => r.arrayBuffer()));

it.effect('parse TS (direct): median time + retained heap within bounds', () =>
  Effect.gen(function* () {
    // Pure-TS parser: no wasm init, no marshalling boundary — it builds the JS object graph
    // directly. See `docs/projects/typescript-save-parser-port.md` (Performance).
    const buffer = yield* loadSaveBuffer;

    for (let i = 0; i < WARMUP; i++) yield* parseSaveTs(buffer);

    const heapBefore = yield* Effect.promise(forceGcHeapUsedBytes);
    const times: number[] = [];
    let save: WasmEldenRingSave | undefined;
    for (let i = 0; i < RUNS; i++) {
      const start = performance.now();
      save = yield* parseSaveTs(buffer);
      times.push(performance.now() - start);
    }
    const heapAfter = yield* Effect.promise(forceGcHeapUsedBytes);

    const med = median(times);
    const heapDeltaMb = mb(heapAfter - heapBefore);
    // `console.log` (not `Effect.log`) so the number surfaces in the vitest terminal output.
    console.log(
      `[perf][browser] ts    (direct): median ${med.toFixed(1)}ms (${RUNS} runs), retained +${heapDeltaMb}MB`,
    );

    expect((save?.slots.length ?? 0) > 0).toBe(true);
    expect(med).toBeLessThan(PARSE_DIRECT_MS);
    expect(heapDeltaMb).toBeLessThan(PARSE_HEAP_MB);
  }),
);

/**
 * Timing bench (tinybench, via `vitest bench`) — TS parser vs the WASM parser on the
 * same `ER0000.sl2` buffer in node. Vitest reports min/max/mean/p99/ops-sec per bench,
 * so this replaces hand-rolled `performance.now()` timing. Memory is measured separately
 * in `save-parser.mem.test.ts` (tinybench has no memory metric).
 *
 * Run: `bun run --filter @elden-ring-compass/save-parser-ts bench`
 * (or `vitest bench --project save-parser-perf` from the repo root).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import wasmInit, { parse_save } from '@elden-ring-compass/save-parser';
import { bench, describe } from 'vitest';

import { parseSave } from '../src/index.ts';

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

const fixture = readFileSync(here('../../../apps/web/public/ER0000.sl2'));
const arrayBuffer = fixture.buffer.slice(
  fixture.byteOffset,
  fixture.byteOffset + fixture.byteLength,
) as ArrayBuffer;
const wasmInput = new Uint8Array(arrayBuffer);
const wasmBytes = readFileSync(
  here('../../elden-ring-save-parser/pkg/elden_ring_save_parser_bg.wasm'),
);

// Top-level await: initialise the WASM module BEFORE the benches register, so the `wasm`
// bench never runs un-initialised (a throwing bench is silently skipped → "NaNx" summary).
await wasmInit({ module_or_path: wasmBytes });

describe('parse ER0000.sl2', () => {
  // `throws: true` surfaces a failing bench instead of silently dropping it.
  bench(
    'ts',
    () => {
      parseSave(arrayBuffer);
    },
    { throws: true },
  );

  bench(
    'wasm',
    () => {
      parse_save(wasmInput);
    },
    { throws: true },
  );
});

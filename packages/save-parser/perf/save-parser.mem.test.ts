/**
 * Memory bench (node) — retained heap of one parsed `ER0000.sl2`, TS parser vs WASM.
 * Vitest's tinybench `bench` has no memory metric, so memory is a normal `it()` that
 * reads `process.memoryUsage().heapUsed` around a parse, forcing GC on both sides so the
 * delta reflects the retained object graph (one parsed save). Timing lives in
 * `save-parser.bench.ts`.
 *
 * Run: `bun run --filter @elden-ring-compass/save-parser-ts test:perf` (that script
 * passes `--expose-gc` via NODE_OPTIONS so `global.gc` exists; without it the bench
 * still runs and logs that the heap reads are noisy). Part of the `save-parser-perf`
 * project; excluded from the default `test:run`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import wasmInit, { parse_save } from '@elden-ring-compass/save-parser';
import { beforeAll, describe, expect, it } from 'vitest';

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

const maybeGc = (globalThis as { gc?: () => void }).gc;
const heapUsedMb = () => process.memoryUsage().heapUsed / (1024 * 1024);

/** Retained-heap delta of holding one parse result, with GC on both reads. */
function retainedMb(parse: () => { slots: unknown[] }): {
  retained: number;
  result: { slots: unknown[] };
} {
  parse(); // warm up lazy allocations / JIT
  maybeGc?.();
  const before = heapUsedMb();
  const result = parse();
  maybeGc?.();
  const retained = heapUsedMb() - before;
  // Reference `result` after the read so V8 can't collect it early.
  expect(result.slots.length).toBeGreaterThan(0);
  return { retained, result };
}

describe('save parser memory (node)', () => {
  beforeAll(async () => {
    await wasmInit({ module_or_path: wasmBytes });
  });

  const note = maybeGc ? '' : '  (no --expose-gc; heap noisy)';

  it('TS parser — retained heap of one parsed save', () => {
    const { retained } = retainedMb(() => parseSave(arrayBuffer));
    console.log(`[mem][node] ts  : retained +${retained.toFixed(1)}MB${note}`);
  });

  it('WASM parser — retained heap of one parsed save', () => {
    const { retained } = retainedMb(
      () => parse_save(wasmInput) as { slots: unknown[] },
    );
    console.log(`[mem][node] wasm: retained +${retained.toFixed(1)}MB${note}`);
  });
});

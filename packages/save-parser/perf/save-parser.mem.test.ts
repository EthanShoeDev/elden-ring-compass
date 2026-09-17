/**
 * Memory bench (node) — retained heap of one parsed `ER0000.sl2` by the TS parser.
 * Vitest's tinybench `bench` has no memory metric, so memory is a normal `it()` that reads
 * `process.memoryUsage().heapUsed` around a parse, forcing GC on both sides so the delta
 * reflects the retained object graph (one parsed save). Timing lives in `save-parser.bench.ts`.
 *
 * Run: `bun run --filter @elden-ring-compass/save-parser-ts test:perf` (that script passes
 * `--expose-gc` via NODE_OPTIONS so `global.gc` exists; without it it still runs and logs that
 * the heap reads are noisy). Part of the `save-parser-perf` project; excluded from `test:run`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';

import { parseSave } from '../src/index.ts';

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

const fixture = readFileSync(here('../test/fixtures/ER0000.sl2'));
const arrayBuffer = fixture.buffer.slice(
  fixture.byteOffset,
  fixture.byteOffset + fixture.byteLength,
);

const maybeGc = (globalThis as { gc?: () => void }).gc;
const heapUsedMb = () => process.memoryUsage().heapUsed / (1024 * 1024);

describe('save parser memory (node)', () => {
  const note = maybeGc ? '' : '  (no --expose-gc; heap noisy)';

  it('TS parser — retained heap of one parsed save', () => {
    Effect.runSync(parseSave(arrayBuffer)); // warm up lazy allocations / JIT
    maybeGc?.();
    const before = heapUsedMb();
    const result = Effect.runSync(parseSave(arrayBuffer));
    maybeGc?.();
    const retained = heapUsedMb() - before;
    // Reference `result` after the read so V8 can't collect it early.
    expect(result.slots.length).toBeGreaterThan(0);
    console.log(`[mem][node] ts: retained +${retained.toFixed(1)}MB${note}`);
  });
});

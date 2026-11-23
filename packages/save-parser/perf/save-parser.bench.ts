/**
 * Timing bench (tinybench, via `vitest bench`) for the TS save parser on `ER0000.sl2`.
 * Vitest reports min/max/mean/p99/ops-sec — a timing regression guard. Memory is measured
 * separately in `save-parser.mem.test.ts` (tinybench has no memory metric).
 *
 * (The WASM parser this was once compared against has been retired — the TS port measured
 * ~60× faster in node; see docs/projects/typescript-save-parser-port.md.)
 *
 * Run: `bun run --filter @elden-ring-compass/save-parser-ts bench`
 * (or `vitest bench --project save-parser-perf` from the repo root).
 */
import { Effect } from 'effect';
import { describe, test } from 'vitest';

import { parseSave } from '../src/index.ts';
import { loadFixtureSave } from '../test/fixture-save.ts';

const arrayBuffer = await Effect.runPromise(loadFixtureSave);

describe('parse ER0000.sl2', () => {
  // Vitest 5: `bench` is a test-context fixture; each registration is run explicitly.
  // `throws: true` surfaces a failing bench instead of silently dropping it.
  test('ts', ({ bench }) =>
    bench('ts', () => {
      Effect.runSync(parseSave(arrayBuffer));
    }).run({ throws: true }));
});

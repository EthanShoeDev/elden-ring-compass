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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { Effect } from 'effect';
import { describe, test } from 'vitest';

import { parseSave } from '../src/index.ts';

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

const fixture = readFileSync(here('../test/fixtures/ER0000.sl2'));
const arrayBuffer = fixture.buffer.slice(
  fixture.byteOffset,
  fixture.byteOffset + fixture.byteLength,
);

describe('parse ER0000.sl2', () => {
  // Vitest 5: `bench` is a test-context fixture; each registration is run explicitly.
  // `throws: true` surfaces a failing bench instead of silently dropping it.
  test('ts', async ({ bench }) => {
    await bench('ts', () => {
      Effect.runSync(parseSave(arrayBuffer));
    }).run({ throws: true });
  });
});

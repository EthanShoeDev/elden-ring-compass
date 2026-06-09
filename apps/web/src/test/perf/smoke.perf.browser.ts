import { it } from '@effect/vitest';
import { Effect } from 'effect';
import { expect } from 'vitest';
import { forceGcHeapUsedBytes } from './cdp-memory';

// Smoke test for the perf project's risky bits, validated before the real tests rely on them:
//  1. `@effect/vitest` (`it.effect`) runs in browser mode at all (depends on the
//     `node:assert` → `assert` alias in vitest.perf.config.ts resolving).
//  2. CDP (`cdp()`) is reachable (depends on browser.api.allowWrite/allowExec) and can force GC +
//     read the JS heap — the foundation of every memory measurement here.

it.effect('effect-vitest runs in browser mode', () =>
  Effect.gen(function* () {
    const inBrowser = yield* Effect.sync(() => typeof window !== 'undefined');
    expect(inBrowser).toBe(true);
  }),
);

it('cdp can force GC and read JS heap', async () => {
  const before = await forceGcHeapUsedBytes();
  // Allocate ~live data, then drop it.
  let blob: number[] | null = Array.from({ length: 1_000_000 }, (_, i) => i);
  expect(blob.length).toBe(1_000_000);
  blob = null;
  const after = await forceGcHeapUsedBytes();
  // We don't assert a delta (GC timing is non-deterministic); we only assert the metric is real.
  expect(before).toBeGreaterThan(0);
  expect(after).toBeGreaterThan(0);
});

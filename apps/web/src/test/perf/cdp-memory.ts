import { cdp } from 'vitest/browser';

// Vitest types its `cdp()` return as an empty `interface CDPSession {}`, but at runtime it IS the
// Playwright Chrome DevTools Protocol session (so `.send(...)` works — see the passing smoke test).
// Narrow it to just the calls used here rather than pulling Playwright's heavy protocol types.
//
// This is the one bit of shared infra under perf/: a typed accessor for a browser API Vitest hands
// over raw. It is NOT a measurement wrapper — timing stays inline (`performance.now()` + `expect`)
// in each test.
interface CdpSend {
  send(method: 'Performance.enable'): Promise<unknown>;
  send(method: 'HeapProfiler.collectGarbage'): Promise<unknown>;
  send(method: 'Performance.getMetrics'): Promise<{
    metrics: Array<{ name: string; value: number }>;
  }>;
}

let performanceEnabled = false;

/**
 * Force a full GC, then return the post-GC JS heap used size in bytes. Forcing GC first is what
 * makes memory numbers honest — otherwise you measure GC timing, not retention. This is the right
 * signal for "is the app holding too much live data" (and the thing IndexedDB would reduce).
 */
export async function forceGcHeapUsedBytes(): Promise<number> {
  // oxlint-disable-next-line unknown-cast/forbidden -- Playwright's CDPSession isn't typed with the send() shape we use
  const session = cdp() as unknown as CdpSend;
  if (!performanceEnabled) {
    // `Performance.getMetrics` returns nothing until the domain is enabled (idempotent).
    await session.send('Performance.enable');
    performanceEnabled = true;
  }
  await session.send('HeapProfiler.collectGarbage');
  const { metrics } = await session.send('Performance.getMetrics');
  return metrics.find((m) => m.name === 'JSHeapUsedSize')?.value ?? 0;
}

/** Bytes → MB, rounded to 2 decimals, for readable log/threshold values. */
export const mb = (bytes: number): number => Math.round((bytes / 1_048_576) * 100) / 100;

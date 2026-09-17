import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

// Web perf/memory project — real Chromium (real V8 + WASM tiers + DOM layout). Time +
// retained heap (CDP) are measured with plain `it()` here, not tinybench, because only the
// browser CDP path can read browser heap (Vitest bench has no memory metric). `mergeConfig`
// the app build config for plugins; add the `node:assert` polyfill (`@effect/vitest` needs
// it in the browser). Run: `bun run --filter @elden-ring-compass/web test:perf`
// (or `vitest run --project web-perf` from the repo root).
export default mergeConfig(
  viteConfig,
  defineConfig({
    resolve: { alias: { 'node:assert': 'assert' } },
    test: {
      name: 'web-perf',
      globals: true,
      include: ['src/**/*.perf.browser.{ts,tsx}'],
      // The bench's time/heap numbers are `console.log`-ged from the browser; the default
      // reporter buffers passing-test stdout, so the `test:perf` script runs with
      // `--reporter=verbose` to surface them. (Browser-context console isn't affected by
      // `disableConsoleIntercept`, which is why the script, not this flag, is the fix.)
      // Serialize: parallel browser tabs contend for CPU and ruin timing/memory numbers.
      fileParallelism: false,
      // Gates `cdp()` (forced GC + heap metrics); safe on localhost (both default true there).
      // Top-level in Vitest 5 (`browser.api` was removed).
      api: { allowWrite: true, allowExec: true },
      browser: {
        enabled: true,
        provider: playwright(),
        headless: true,
        instances: [{ browser: 'chromium' }],
      },
    },
  }),
);

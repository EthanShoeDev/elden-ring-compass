import { defineConfig } from 'vitest/config';

// Perf project for the save parser (node). Two run modes share this config:
//   • `vitest bench` runs the tinybench TIMING benches (perf/*.bench.ts) — TS vs WASM.
//   • `vitest run`   runs the MEMORY tests (perf/*.mem.test.ts) — heap delta via
//     process.memoryUsage() + global.gc() (Vitest bench has no memory metric, so memory
//     is a normal test). `--expose-gc` for clean heap reads comes from the package's
//     `test:perf` script via NODE_OPTIONS.
// `disableConsoleIntercept` lets the bench/memory console.log numbers print to stdout.
export default defineConfig({
  test: {
    name: 'save-parser-perf',
    include: ['perf/**/*.mem.test.ts'],
    benchmark: {
      include: ['perf/**/*.bench.ts'],
    },
    disableConsoleIntercept: true,
    fileParallelism: false,
    testTimeout: 60_000,
  },
});

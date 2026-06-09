import { defineConfig } from 'vitest/config';

// Unit project: the byte-for-byte parity test vs the committed WASM oracle. Fast, node.
// Perf (timing bench + memory) lives in vitest.config.perf.ts. Aggregated by the root
// config; runnable standalone via `bun run test`.
export default defineConfig({
  test: {
    name: 'save-parser',
    include: ['{src,test}/**/*.test.ts'],
  },
});

import { defineConfig } from 'vitest/config';

// Unit project for @elden-ring-compass/data — currently the AR-formula golden test
// (ar.test.ts). Fast, node. Aggregated by the root config; runnable standalone via
// `bun run test`.
export default defineConfig({
  test: {
    name: 'data',
    include: ['src/**/*.test.ts'],
  },
});

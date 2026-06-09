import { defineConfig } from 'vitest/config';

// Node-runtime vitest for the extractor's pure/effect logic (parsers, decoders).
// Most extractor stages need the game install + Bun APIs and are validated by
// running the pipeline; unit tests cover the install-independent building blocks
// (e.g. the EMEDF instruction decoder).
export default defineConfig({
  test: {
    name: 'extractor',
    include: ['src/**/*.test.ts'],
  },
});

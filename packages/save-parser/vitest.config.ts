import { defineConfig } from 'vitest/config';

// Node-runtime vitest for the pure-TS save parser. The parity test diffs the parser
// against a committed oracle (generated from the verified WASM parser via
// `bun run gen-oracle`), so it needs no browser and no WASM at test time.
export default defineConfig({
  test: {
    include: ['{src,test}/**/*.test.ts'],
  },
});

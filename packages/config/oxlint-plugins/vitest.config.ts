import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'oxlint-plugins-unit',
    root: import.meta.dirname,
    // The vendored anti-slop RuleTester suites, minus the one that shells out
    // to `pnpm exec oxlint` (packages/config/oxlint-plugins/src/vendor/anti-slop/UPSTREAM.md).
    include: ['./src/vendor/anti-slop/**/*.test.ts'],
    exclude: ['**/require-readable-spacing-cli.test.ts'],
    globals: true,
    environment: 'node',
    testTimeout: 15_000,
  },
});

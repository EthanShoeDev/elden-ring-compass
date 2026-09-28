import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: true,
  entry: [
    'src/*.ts',
    // The vendored anti-slop plugin: only its two entry points are bundled,
    // never its internals or RuleTester suites.
    'src/vendor/anti-slop/index.ts',
    'src/vendor/anti-slop/effect/index.ts',
  ],
  sourcemap: true,
  exports: { devExports: true }, // Point to source files during development for reliable type resolution
  deps: { neverBundle: ['eslint', '@oxlint/plugins'] },
});

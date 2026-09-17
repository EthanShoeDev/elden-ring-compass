import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: true,
  entry: 'src/**/*.ts',
  sourcemap: true,
  exports: { devExports: true }, // Point to source files during development for reliable type resolution
  deps: { neverBundle: ['eslint'] },
});

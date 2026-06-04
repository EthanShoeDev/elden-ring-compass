import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

// Web unit project (jsdom). `mergeConfig` the app's build config so tests get its Vite
// plugins (react/tailwind/wasm/erDataTiles) + resolve aliases; the app-server plugins are
// already excluded under VITEST in vite.config.ts. Aggregated by the root vitest.config.ts;
// runnable standalone via `bun run test`. Browser perf lives in vitest.config.browser.ts.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      name: 'web',
      globals: true,
      environment: 'jsdom',
      include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
      setupFiles: ['./src/test/setup.ts'],
    },
  }),
);

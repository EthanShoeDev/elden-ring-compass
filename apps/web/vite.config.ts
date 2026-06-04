import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { nitro } from 'nitro/vite';
import path from 'path';
import wasm from 'vite-plugin-wasm';
// `defineConfig` from `vitest/config` (not `vite`) types the `test` field natively — incl.
// `projects`/`browser` — so no `/// <reference types="vitest/config" />` shim is needed, and it's
// still a valid Vite config for `vite dev`/`vite build`.
import { defineConfig } from 'vitest/config';
import { erDataTiles } from './vite-plugins/er-data-tiles';

// Vitest sets this. The app-server plugins below (devtools/tanstackStart/nitro) are only needed for
// `vite dev`/`vite build`; under Vitest they break browser mode (`react: module is not defined`
// during dep-scan) and leave the process hanging. Vitest always runs ROOT plugin hooks even for
// standalone projects, so excluding them here — not just in the perf project — is what keeps the
// browser run clean. Tests get only react + tailwind + wasm + erDataTiles (map-tile middleware).
const appOnlyPlugins = process.env.VITEST
  ? []
  : [devtools(), tanstackStart({ prerender: { enabled: false } }), nitro()];

export default defineConfig({
  server: {
    port: 3005,
    strictPort: true,
  },
  plugins: [erDataTiles(), wasm(), tailwindcss(), viteReact(), ...appOnlyPlugins],
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    projects: [
      {
        // Unit / component tests in jsdom. Inherits the (test-trimmed) root plugins + resolve.
        // Run via `bun run test` (scoped to `--project unit` in package.json to stay fast).
        extends: true,
        test: {
          name: 'unit',
          globals: true,
          environment: 'jsdom',
          include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
      {
        // Perf / memory tests in real Chromium (real V8 + WASM tiers + DOM layout). Inherits the
        // trimmed root plugins; adds the `node:assert` polyfill alias (`@effect/vitest` needs it in
        // the browser). Run via `bun run test:perf`.
        extends: true,
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './src'),
            'node:assert': 'assert',
          },
        },
        test: {
          name: 'perf',
          globals: true,
          include: ['src/**/*.perf.browser.{ts,tsx}'],
          // Serialize: parallel browser tabs contend for CPU and ruin timing/memory numbers.
          fileParallelism: false,
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
            // Gates `cdp()` (forced GC + heap metrics); safe on localhost (both default true there).
            api: { allowWrite: true, allowExec: true },
          },
        },
      },
    ],
  },
});

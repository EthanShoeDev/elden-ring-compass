import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import path from 'path';
import wasm from 'vite-plugin-wasm';
// Pure Vite build/plugins config for the app (`vite dev`/`vite build`). The Vitest test
// PROJECTS live in the root `vitest.config.ts` + `apps/web/vitest.config{,.browser}.ts`,
// which `mergeConfig` THIS config to inherit the plugins below. `defineConfig` from
// `vitest/config` (a superset of Vite's) keeps it importable from those configs.
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
  // `viteReact()` MUST come after `tanstackStart()` — the TanStack Router plugin (inside
  // tanstackStart/appOnlyPlugins) has to run before the JSX transform. Under VITEST appOnlyPlugins
  // is empty, so react ends up last either way.
  plugins: [erDataTiles(), wasm(), tailwindcss(), ...appOnlyPlugins, viteReact()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

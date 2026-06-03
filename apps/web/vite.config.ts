/// <reference types="vitest/config" />
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import { cpSync, createReadStream, existsSync, rmSync, statSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
// import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import wasm from 'vite-plugin-wasm';
import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';

/**
 * Serve the extractor-generated map-tile pyramid from `@elden-ring-compass/data` at
 * `/map-tiles/{map}/{layer}/{z}/{y}/{x}.webp`, with no pre-build sync step. Tiles can't be
 * ESM-imported (Leaflet builds tile URLs from a runtime `{z}/{y}/{x}` template), so in dev a
 * middleware streams them from the package, and for the static build they're staged into
 * `public/map-tiles/` so Vite's public-dir handling emits them.
 */
function erDataTiles(): Plugin {
  const MIME: Record<string, string> = {
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.xml': 'application/xml',
  };
  const pkgJson = fileURLToPath(import.meta.resolve('@elden-ring-compass/data/package.json'));
  const src = path.join(path.dirname(pkgJson), 'images', 'map-tiles');
  const publicDest = fileURLToPath(new URL('./public/map-tiles', import.meta.url));
  let isBuild = false;

  return {
    name: 'er-data-tiles',
    configResolved(config) {
      isBuild = config.command === 'build';
      if (!existsSync(src)) {
        throw new Error(
          `[er-data-tiles] tiles missing: ${src}\n` +
            `Run the er-extractor images stage first (it writes the data package).`,
        );
      }
    },
    configureServer(server) {
      const prefix = '/map-tiles/';
      server.middlewares.use((req, res, next) => {
        const url = req.url;
        if (!url || !url.startsWith(prefix)) return next();
        const rel = path
          .normalize(decodeURIComponent(url.split('?')[0] ?? url))
          .slice(prefix.length);
        const file = path.join(src, rel);
        if (!file.startsWith(src) || !existsSync(file) || !statSync(file).isFile()) {
          return next();
        }
        res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        createReadStream(file).pipe(res);
      });
    },
    buildStart() {
      // Stage tiles into public/ so the static build emits them. Dev uses the middleware
      // above, so skip the copy there (buildStart also fires on `serve`).
      if (!isBuild) return;
      rmSync(publicDest, { recursive: true, force: true });
      cpSync(src, publicDest, { recursive: true });
    },
  };
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
  server: {
    port: 3000,
    strictPort: false,
  },
  plugins: [
    devtools(),
    erDataTiles(),
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    // ViteImageOptimizer({
    //   cache: true,
    //   cacheLocation: './node_modules/.cache/vite-plugin-image-optimizer',
    // }),
    wasm(),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: false,
      },
    }),
    nitro(),
    viteReact(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

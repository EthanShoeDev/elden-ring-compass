import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { comlink } from 'vite-plugin-comlink';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'esnext',
  },
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]],
      },
    }),
    ViteImageOptimizer({
      cache: true,
      cacheLocation: './node_modules/.cache/vite-plugin-image-optimizer',
      exclude: /^[0].*/, // Exclude odd-numbered images
    }),
    wasm(),
    comlink(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    format: 'es',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    plugins: () => [comlink(), wasm()],
  },
});

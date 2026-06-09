import { defineConfig, devices } from '@playwright/test';

// Standalone Playwright E2E — separate from the Vitest perf project. Used for the few things Vitest
// browser mode can't do: here, driving the REAL app's worker save-parse path (URL source → Comlink
// worker → wasm), which hangs when init'd inside a Vitest-browser module worker. Run: `bun run
// test:e2e`. Reuses the dev server on :3005 (vite.config.ts `server.port`).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3005',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3005',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

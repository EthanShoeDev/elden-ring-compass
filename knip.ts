import { defineKnipConfig } from 'shoemaker-knip-config';

// Workspaces are read from package.json#workspaces (apps/*, packages/*).
// Plugins (vite, vitest, playwright, tanstack-router, nitro, tailwind, babel, oxlint, bun)
// auto-enable and contribute their own entry/config files; this only fills the gaps.
export default defineKnipConfig({
  ignore: [
    // Cloned upstream repos read as docs (gitignored).
    'docs/cloned-repos-as-docs/**',
    // shadcn Base UI components are vendored from the registry; their unused
    // variants are intentional (matches oxlint's `**/components/ui/**` ignore).
    '**/components/ui/**',
  ],

  // `node:assert` is aliased to the `assert` polyfill in vitest.config.browser.ts
  // (@effect/vitest needs it in browser mode); there's no literal import for knip to see.
  ignoreDependencies: ['assert'],

  workspaces: {
    '.': {
      // Maintenance scripts run via `bun scripts/*.ts`.
      entry: ['*.ts', 'scripts/*.ts'],
    },
    'packages/save-parser': {
      // Vitest benchmark entry; lives in vitest.config.perf.ts, which the plugin doesn't read.
      entry: ['perf/*.bench.ts'],
    },
  },
});

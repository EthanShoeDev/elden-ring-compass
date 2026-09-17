import type { KnipConfig } from 'knip';

// Workspaces are read from package.json#workspaces (apps/*, packages/*, packages/config/*).
// Plugins (vite, vitest, playwright, tanstack-router, nitro, tailwind, babel, oxlint, bun)
// auto-enable and contribute their own entry/config files — this only fills the gaps.
const config: KnipConfig = {
  // shadcn Base UI components are vendored from the registry; their unused variants are
  // intentional and we don't hand-author them (matches oxlint's `**/components/ui/**` ignore).
  ignore: ['**/components/ui/**'],

  // `node:assert` is aliased to the `assert` polyfill in vitest.config.browser.ts
  // (@effect/vitest needs it in browser mode) — there's no literal import for knip to see.
  ignoreDependencies: ['assert'],

  // `nix flake update` (nix:flake:update script) — a system binary, not a package.
  ignoreBinaries: ['nix'],

  workspaces: {
    '.': {
      // Maintenance scripts run via `bun scripts/*.ts`; map-calibrate.ts isn't a stage yet.
      entry: ['scripts/*.ts'],
    },
    'packages/extractor': {
      // The pipeline stages are Effect values whose inferred types pull in these internal
      // errors/interfaces; with `declaration: true` (tsconfig.base) they must stay exported
      // so tsc can name them in the emitted .d.ts, even though no other file imports them by
      // name. knip can't see inferred-type usage, so don't flag in-file-only exports here.
      ignoreExportsUsedInFile: true,
    },
    'packages/save-parser': {
      // Vitest benchmark entry — lives in a separate vitest.config.perf.ts the plugin doesn't read.
      entry: ['perf/*.bench.ts'],
    },
  },
};

export default config;

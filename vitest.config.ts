import { defineConfig } from 'vitest/config';

// Root Vitest config — the monorepo aggregator (https://vitest.dev/guide/projects).
// Each entry references a package's own single-project config FILE, so:
//   • each package keeps its environment/plugins in its own config (turbo runs them
//     per-package, cached/affected — the hybrid the Turborepo+Vitest docs recommend), and
//   • from the repo root, `vitest run` runs them all and `vitest --project <name>` filters.
// (A `packages/*` glob can't be used here: Vitest treats each referenced config as ONE
// project and does NOT expand a package's own nested `test.projects` — see
// node/projects/resolveProjects.ts — so multi-mode packages get one config file per mode.)
//
// Projects: extractor, save-parser, save-parser-perf, web, web-perf.
// Benches (tinybench, `vitest bench`) live in the save-parser-perf project.
// Root-only options (coverage, reporters) belong here, not in the project files.
export default defineConfig({
  test: {
    projects: [
      'packages/extractor/vitest.config.ts',
      'packages/save-parser/vitest.config.ts',
      'packages/save-parser/vitest.config.perf.ts',
      'apps/web/vitest.config.ts',
      'apps/web/vitest.config.browser.ts',
    ],
  },
});

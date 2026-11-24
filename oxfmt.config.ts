import { defineConfig } from 'oxfmt';
import { defineShoemakerFormat } from 'shoemaker-oxfmt-config';

export default defineConfig(
  defineShoemakerFormat({
    tailwindStylesheet: 'apps/web/src/index.css',
    ignorePatterns: [
      // Cloned upstream repos read as docs (gitignored).
      'docs/cloned-repos-as-docs/**',
      // shadcn/ui components are vendored from the registry; keep them verbatim
      // so `shadcn add --diff` stays clean. Mirrors the oxlint ignore.
      '**/components/ui/**',
      // Generated game data and static assets.
      'apps/web/src/assets/**',
      'apps/web/src/lib/elden-ring-raw-db/**',
      // Generated map-tile manifest (LFS-tracked, written by the images stage);
      // reformatting churns the LFS oid.
      'packages/data/images/**',
      // Frozen golden parity fixtures (oracle / reference), kept verbatim.
      'packages/save-parser/test/fixtures/*.json',
      // Vitest snapshot files (incl. `toMatchFileSnapshot` output): written by the test runner,
      // so formatting them makes the next run report a mismatch.
      '**/__snapshots__/**',
      // Vendored verbatim from soulstruct (EMEVD instruction dictionary).
      'packages/vendored-data/assets/er-common.emedf.json',
      '**/pkg/**',
    ],
  }),
);

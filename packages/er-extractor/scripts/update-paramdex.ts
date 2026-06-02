/**
 * Refreshes the vendored Paramdex defs from upstream.
 *
 * The game does NOT ship PARAMDEF (field layouts) — Elden Ring strips them; only
 * the param row DATA is in `regulation.bin`. The schema (which byte is "weight",
 * etc.) was reverse-engineered by the community (soulsmods/Paramdex). So it's a
 * vendored dependency (plan §7), pinned by upstream commit for reproducibility.
 *
 * This sparse-clones ONLY `ER/Defs` from soulsmods/Paramdex into
 * `src/vendor/paramdex/ER/Defs/` and records the source commit in PROVENANCE.md.
 *
 * Run: bun run update-paramdex   (from packages/er-extractor)
 */
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { $ } from 'bun';

const REPO = 'https://github.com/soulsmods/Paramdex';
// Upstream subdirs to vendor. Add 'ER/Names'/'ER/Tdfs' when we decode enums/row names.
const SUBDIRS = ['ER/Defs'];

const here = import.meta.dir;
const vendor = resolve(here, '..', 'src', 'vendor', 'paramdex');
const tmp = resolve(here, '.paramdex-tmp');

await rm(tmp, { recursive: true, force: true });
console.log(`cloning ${REPO} (sparse: ${SUBDIRS.join(', ')}) …`);
await $`git clone --depth 1 --filter=blob:none --sparse ${REPO} ${tmp}`;
await $`git -C ${tmp} sparse-checkout set ${SUBDIRS}`;
const sha = (await $`git -C ${tmp} rev-parse HEAD`.text()).trim();

// Replace the vendored tree with the freshly-fetched subdirs.
await rm(resolve(vendor, 'ER'), { recursive: true, force: true });
for (const sub of SUBDIRS) {
  await mkdir(resolve(vendor, sub), { recursive: true });
  await cp(resolve(tmp, sub), resolve(vendor, sub), { recursive: true });
}

const defs = (await readdir(resolve(vendor, 'ER', 'Defs'))).filter((f) => f.endsWith('.xml'));
const provenance = `# Vendored Paramdex (DO NOT EDIT BY HAND)

These PARAMDEF field-layout definitions are **reverse-engineered community data**,
not extracted from the game: Elden Ring does not ship paramdefs (the field schema
lives only in the game executable). They are required to decode \`regulation.bin\`
param rows into named fields. See plan §7 ("vendor baked content").

- Source:  ${REPO}
- Subdirs: ${SUBDIRS.join(', ')}
- Commit:  ${sha}
- Files:   ${defs.length} ER defs

Refresh with \`bun run update-paramdex\` (from packages/er-extractor). On a game
patch, re-run this and watch for the param-def version drift warning at decode.
`;
await writeFile(resolve(vendor, 'PROVENANCE.md'), provenance);
await rm(tmp, { recursive: true, force: true });

console.log(`vendored ${defs.length} ER defs @ ${sha.slice(0, 10)} → src/vendor/paramdex/ER/Defs`);

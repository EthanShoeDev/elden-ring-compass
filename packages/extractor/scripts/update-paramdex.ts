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
import { BunRuntime, BunServices } from '@effect/platform-bun';
import { $ } from 'bun';
import {
  Array as Arr,
  Console,
  Effect,
  FileSystem,
  Path,
  String as Str,
} from 'effect';

const REPO = 'https://github.com/soulsmods/Paramdex';
// Upstream subdirs to vendor. Add 'ER/Names'/'ER/Tdfs' when we decode enums/row names.
const SUBDIRS = ['ER/Defs'];

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const here = import.meta.dir;
  const vendor = path.resolve(here, '..', 'src', 'vendor', 'paramdex');
  const tmp = path.resolve(here, '.paramdex-tmp');

  yield* fs.remove(tmp, { recursive: true, force: true });
  yield* Console.log(`cloning ${REPO} (sparse: ${Arr.join(SUBDIRS, ', ')}) …`);
  // Bun shell has no Effect equivalent; a failing git command rejects (a defect).
  yield* Effect.promise(
    () => $`git clone --depth 1 --filter=blob:none --sparse ${REPO} ${tmp}`,
  );
  yield* Effect.promise(() => $`git -C ${tmp} sparse-checkout set ${SUBDIRS}`);
  const shaOutput = yield* Effect.promise(() =>
    $`git -C ${tmp} rev-parse HEAD`.text(),
  );
  const sha = Str.trim(shaOutput);

  // Replace the vendored tree with the freshly-fetched subdirs.
  yield* fs.remove(path.resolve(vendor, 'ER'), {
    recursive: true,
    force: true,
  });
  yield* Effect.forEach(
    SUBDIRS,
    (sub) =>
      Effect.gen(function* () {
        yield* fs.makeDirectory(path.resolve(vendor, sub), { recursive: true });
        yield* fs.copy(path.resolve(tmp, sub), path.resolve(vendor, sub), {
          overwrite: true,
        });
      }),
    { concurrency: 1, discard: true },
  );

  const defFiles = yield* fs.readDirectory(path.resolve(vendor, 'ER', 'Defs'));
  const defs = Arr.filter(defFiles, Str.endsWith('.xml'));
  const provenance = `# Vendored Paramdex (DO NOT EDIT BY HAND)

These PARAMDEF field-layout definitions are **reverse-engineered community data**,
not extracted from the game: Elden Ring does not ship paramdefs (the field schema
lives only in the game executable). They are required to decode \`regulation.bin\`
param rows into named fields. See plan §7 ("vendor baked content").

- Source:  ${REPO}
- Subdirs: ${Arr.join(SUBDIRS, ', ')}
- Commit:  ${sha}
- Files:   ${defs.length} ER defs

Refresh with \`bun run update-paramdex\` (from packages/er-extractor). On a game
patch, re-run this and watch for the param-def version drift warning at decode.
`;
  yield* fs.writeFileString(path.resolve(vendor, 'PROVENANCE.md'), provenance);
  yield* fs.remove(tmp, { recursive: true, force: true });

  yield* Console.log(
    `vendored ${defs.length} ER defs @ ${Str.slice(0, 10)(sha)} → src/vendor/paramdex/ER/Defs`,
  );
});

program.pipe(Effect.provide(BunServices.layer), BunRuntime.runMain);

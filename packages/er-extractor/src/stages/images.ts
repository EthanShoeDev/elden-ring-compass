import { Effect } from 'effect';

import { PipelineContext } from '../domain/context.ts';
import { findOodleDll } from '../external/oodle.ts';
import { extractImages } from '../game/images.ts';

// Images land in the @elden-ring-compass/data package alongside the generated
// .ts (the single source of truth the web app consumes), resolved from this
// module so it's independent of the process cwd — same approach as codegen.
const DATA_PACKAGE_DIR = Bun.fileURLToPath(
  new URL('../../../elden-ring-data/', import.meta.url),
);

/**
 * Stage 8 — images. Decodes the game's TPF textures from the 71_maptile
 * BHF4/BDF4 archive (base + DLC) plus menu/item icon sheets. Rust
 * (`er-image-codec`, via bun:ffi) does the BCn decode → lossless PNG. Map tiles
 * are then stitched + re-tiled by `sharp` into a clean power-of-2 `{z}/{y}/{x}`
 * pyramid per map/layer (see `game/map-pyramid.ts`); icons go through `Bun.Image`.
 * Output under `packages/elden-ring-data/images/` (tiles + `manifest.json`);
 * skip-if-exists makes reruns cheap.
 */
export const images = Effect.gen(function* () {
  const ctx = yield* PipelineContext;
  const oo2core = yield* findOodleDll(ctx.gameRoot);
  const summary = yield* extractImages(
    ctx.gameRoot,
    oo2core,
    DATA_PACKAGE_DIR,
    { format: ctx.imageFormat, quality: ctx.imageQuality },
    (msg) => Effect.logInfo(msg),
  );
  yield* Effect.logInfo(
    `images — ${summary.tiles} tiles (+${summary.tilesSkipped} cached), ` +
      `${summary.icons} menu icons, ${summary.itemIcons} item icons ` +
      `(+${summary.itemIconsSkipped} cached) as ${ctx.imageFormat} q${ctx.imageQuality}`,
  );
});

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
 * Stage 7 — images. Decodes the game's TPF textures: all ~28k overworld map
 * tiles (base + DLC, from the 71_maptile BHF4/BDF4 archive) for the tiled map
 * view, plus menu/item icon sheets. Rust (`er-image-codec`, via bun:ffi) does
 * the BCn decode → lossless PNG; `Bun.Image` re-encodes to the configured format
 * (default WebP) so we ship compressed assets and re-extract rather than commit
 * full-res. Output under `packages/elden-ring-data/images/`; skip-if-exists
 * makes reruns cheap.
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
      `${summary.icons} icons as ${ctx.imageFormat} q${ctx.imageQuality}`,
  );
});

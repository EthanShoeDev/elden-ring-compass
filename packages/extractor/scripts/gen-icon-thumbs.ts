/**
 * Backfills small thumbnails for the per-item icons in `@elden-ring-compass/data`.
 *
 * The full icons (`packages/data/images/icons/items/{id}.webp`) are full-res,
 * 100–160KB each — wasteful for the ~40px thumbnail rendered in every data-table
 * row, where a virtualized table downloads one per visible row. This generates an
 * 80px webp per icon (~2–4KB) into `items-thumb/`; the web app uses it for table
 * cells and keeps the full image only for the hover tooltip.
 *
 * The extractor (`game/images.ts`) emits these going forward; this script (re)builds
 * them from the already-committed full icons, so no game files / Oodle are needed.
 *
 * Run: bun run gen-icon-thumbs           (from packages/extractor)
 *      bun run gen-icon-thumbs --force   (re-encode even if the thumb exists)
 */
import { BunRuntime, BunServices } from '@effect/platform-bun';
import { Console, Data, Effect, FileSystem, Path } from 'effect';

import { globSorted } from '../src/external/glob.ts';

const THUMB_PX = 80;
const QUALITY = 80;
const CONCURRENCY = 24;

class IconScanError extends Data.TaggedError('IconScanError')<{
  readonly detail: string;
}> {}

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const dataImages = path.resolve(
    import.meta.dir,
    '..',
    '..',
    'data',
    'images',
    'icons',
  );
  const srcDir = path.join(dataImages, 'items');
  const outDir = path.join(dataImages, 'items-thumb');
  const force = process.argv.includes('--force');

  yield* fs.makeDirectory(outDir, { recursive: true });
  const files = yield* globSorted(
    '*.webp',
    srcDir,
    (cause) =>
      new IconScanError({ detail: `scanning ${srcDir}: ${String(cause)}` }),
  );
  yield* Console.log(
    `${files.length} icons → ${THUMB_PX}px thumbnails (${outDir})${force ? ' [force]' : ''}`,
  );

  let written = 0;
  let skipped = 0;
  // Bounded concurrency so we don't spawn 2.9k Bun.Image pipelines at once.
  yield* Effect.forEach(
    files,
    (src) =>
      Effect.gen(function* () {
        const out = path.join(outDir, path.basename(src));
        if (!force && (yield* fs.exists(out))) {
          skipped++;
          return;
        }
        // Bun.Image has no Effect equivalent; the encode is native Promise work.
        yield* Effect.promise(() =>
          Bun.file(src)
            .image()
            .resize(THUMB_PX, THUMB_PX, { fit: 'inside' })
            .webp({ quality: QUALITY })
            .write(out),
        );
        written++;
        if (written % (CONCURRENCY * 20) === 0)
          yield* Console.log(`  …${written + skipped}/${files.length}`);
      }),
    { concurrency: CONCURRENCY, discard: true },
  );

  yield* Console.log(`done: ${written} written, ${skipped} skipped`);
});

// oxlint-disable-next-line effecttsgo/strict-effect-provide -- the script entry point is where the platform layer is provided
program.pipe(Effect.provide(BunServices.layer), BunRuntime.runMain);

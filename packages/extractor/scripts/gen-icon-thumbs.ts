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
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { Glob } from 'bun';

const THUMB_PX = 80;
const QUALITY = 80;
const CONCURRENCY = 24;

const here = import.meta.dir;
const srcDir = resolve(here, '..', '..', 'data', 'images', 'icons', 'items');
const outDir = resolve(
  here,
  '..',
  '..',
  'data',
  'images',
  'icons',
  'items-thumb',
);
const force = process.argv.includes('--force');

await mkdir(outDir, { recursive: true });

const files = [...new Glob('*.webp').scanSync(srcDir)];
console.log(
  `${files.length} icons → ${THUMB_PX}px thumbnails (${outDir})${force ? ' [force]' : ''}`,
);

let written = 0;
let skipped = 0;

const genOne = async (file: string) => {
  const src = resolve(srcDir, file);
  const out = resolve(outDir, file);
  if (!force && (await Bun.file(out).exists())) {
    skipped++;
    return;
  }
  await Bun.file(src)
    .image()
    .resize(THUMB_PX, THUMB_PX, { fit: 'inside' })
    .webp({ quality: QUALITY })
    .write(out);
  written++;
};

// Bounded concurrency so we don't spawn 2.9k Bun.Image pipelines at once.
for (let i = 0; i < files.length; i += CONCURRENCY) {
  await Promise.all(files.slice(i, i + CONCURRENCY).map(genOne));
  if (i % (CONCURRENCY * 20) === 0)
    console.log(`  …${i + CONCURRENCY}/${files.length}`);
}

console.log(`done: ${written} written, ${skipped} skipped`);

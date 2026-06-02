/**
 * Copy the extractor-generated map-tile pyramid from the `@elden-ring-compass/data`
 * package into `apps/web/public/map-tiles/` so the dev server / static build serve
 * it at `/map-tiles/{map}/{layer}/{z}/{y}/{x}.webp`.
 *
 * The tiles live (and are committed) in the data package — the source of truth. The
 * `public/` copy is a generated artifact (gitignored) refreshed before dev/build.
 * Run `bun run sync:map-tiles`, or rely on the `dev`/`build` scripts that prefix it.
 */
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataPkgJson = fileURLToPath(
  import.meta.resolve('@elden-ring-compass/data/package.json'),
);
const src = join(dirname(dataPkgJson), 'images', 'map-tiles');
const dest = fileURLToPath(new URL('../public/map-tiles', import.meta.url));

if (!existsSync(src)) {
  console.error(
    `[sync-map-tiles] source missing: ${src}\n` +
      `Run the er-extractor images stage first (it writes the data package).`,
  );
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`[sync-map-tiles] synced → ${dest}`);

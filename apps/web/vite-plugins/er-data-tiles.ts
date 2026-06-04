import {
  cpSync,
  createReadStream,
  existsSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'path';
import { type Plugin } from 'vite';

/**
 * Serve the extractor-generated map-tile pyramid from `@elden-ring-compass/data` at
 * `/map-tiles/{map}/{layer}/{z}/{y}/{x}.webp`, with no pre-build sync step. Tiles can't be
 * ESM-imported (Leaflet builds tile URLs from a runtime `{z}/{y}/{x}` template), so in dev a
 * middleware streams them from the package, and for the static build they're staged into
 * `public/map-tiles/` so Vite's public-dir handling emits them.
 *
 * Extracted from `vite.config.ts` so the perf test project (`vitest.perf.config.ts`) can reuse
 * just this plugin without inheriting the app-server plugins (`tanstackStart`/`nitro`), which
 * don't play nicely with Vitest browser mode.
 *
 * It also derives a `tile-index.json` (served / staged next to `manifest.json`): the extractor
 * drops fully-transparent tiles (sharp `skipBlanks`), so the blank corners of the square master
 * have no file on disk. The index lets the client skip requesting them (`_isValidTile`) instead
 * of firing a 404 per blank tile. It's computed from the real files, so it can't drift.
 */
export function erDataTiles(): Plugin {
  const MIME: Record<string, string> = {
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.xml': 'application/xml',
  };
  const pkgJson = fileURLToPath(import.meta.resolve('@elden-ring-compass/data/package.json'));
  const src = path.join(path.dirname(pkgJson), 'images', 'map-tiles');
  const publicDest = fileURLToPath(new URL('../public/map-tiles', import.meta.url));
  const INDEX_PATH = '/map-tiles/tile-index.json';
  let isBuild = false;
  let indexJson: string | null = null;

  /** Lazily build (and cache) the JSON existence index from the on-disk pyramid. */
  const getIndexJson = (): string => (indexJson ??= JSON.stringify(buildTileIndex(src)));

  return {
    name: 'er-data-tiles',
    configResolved(config) {
      isBuild = config.command === 'build';
      if (!existsSync(src)) {
        throw new Error(
          `[er-data-tiles] tiles missing: ${src}\n` +
            `Run the er-extractor images stage first (it writes the data package).`,
        );
      }
    },
    configureServer(server) {
      const prefix = '/map-tiles/';
      server.middlewares.use((req, res, next) => {
        const url = req.url;
        if (!url || !url.startsWith(prefix)) return next();
        // Synthetic index (no file on disk) — derived from the tile tree.
        if ((url.split('?')[0] ?? url) === INDEX_PATH) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(getIndexJson());
          return;
        }
        const rel = path
          .normalize(decodeURIComponent(url.split('?')[0] ?? url))
          .slice(prefix.length);
        const file = path.join(src, rel);
        if (!file.startsWith(src) || !existsSync(file) || !statSync(file).isFile()) {
          return next();
        }
        res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        createReadStream(file).pipe(res);
      });
    },
    buildStart() {
      // Stage tiles into public/ so the static build emits them. Dev uses the middleware
      // above, so skip the copy there (buildStart also fires on `serve`).
      if (!isBuild) return;
      rmSync(publicDest, { recursive: true, force: true });
      cpSync(src, publicDest, { recursive: true });
      writeFileSync(path.join(publicDest, 'tile-index.json'), getIndexJson());
    },
  };
}

/**
 * Walk the `base`-layer pyramid and record which tiles actually exist, as
 * `{ [mapId]: { [zoom]: [x0, y0, x1, y1, …] } }` (flattened `x,y` pairs — the URL
 * template is `{z}/{y}/{x}`, so `y` is the sub-directory and `x` the filename).
 */
function buildTileIndex(srcDir: string): Record<string, Record<string, number[]>> {
  const dirs = (p: string): string[] =>
    existsSync(p) ? readdirSync(p).filter((e) => statSync(path.join(p, e)).isDirectory()) : [];
  const index: Record<string, Record<string, number[]>> = {};
  for (const map of dirs(srcDir)) {
    const baseDir = path.join(srcDir, map, 'base');
    if (!existsSync(baseDir)) continue;
    const perZoom: Record<string, number[]> = {};
    for (const z of dirs(baseDir)) {
      const pairs: number[] = [];
      const zDir = path.join(baseDir, z);
      for (const y of dirs(zDir)) {
        for (const file of readdirSync(path.join(zDir, y))) {
          const m = /^(\d+)\.webp$/.exec(file);
          if (m) pairs.push(Number(m[1]), Number(y));
        }
      }
      perZoom[z] = pairs;
    }
    index[map] = perZoom;
  }
  return index;
}

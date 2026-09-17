import { createHash } from 'node:crypto';
import {
  cpSync,
  createReadStream,
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'path';
import { type Plugin } from 'vite';

/**
 * Serve the extractor-generated map-tile pyramid from `@elden-ring-compass/data` at
 * `/map-tiles/{version}/{map}/{layer}/{z}/{y}/{x}.webp`, with no pre-build sync step. Tiles
 * can't be ESM-imported (Leaflet builds tile URLs from a runtime `{z}/{y}/{x}` template), so in
 * dev a middleware streams them from the package, and for the static build they're staged into
 * `public/map-tiles/{version}/` so Vite's public-dir handling emits them.
 *
 * `{version}` is a content hash of the whole pyramid (see `hashTileTree`). Files under
 * `public/` aren't fingerprinted by Vite, so without it Vercel serves them with
 * `max-age=0, must-revalidate` and every map pan re-validates every tile (a 304 per tile,
 * each billed as an edge request). Versioning the path lets the deploy mark `/map-tiles/**`
 * `immutable` (the `routeRules` entry in `vite.config.ts`) — regenerating tiles changes the
 * hash, so stale caches can't survive a rebuild. The client reads the prefix from the
 * `__ER_MAP_TILES_BASE__` define (`@/lib/map-tiles`) rather than a fetched manifest so it costs
 * zero extra requests and manifest/tile-index live under the same immutable prefix.
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
    '.json': 'application/json',
  };
  const pkgJson = fileURLToPath(import.meta.resolve('@elden-ring-compass/data/package.json'));
  const src = path.join(path.dirname(pkgJson), 'images', 'map-tiles');
  const publicRoot = fileURLToPath(new URL('../public/map-tiles', import.meta.url));
  const INDEX_FILE = 'tile-index.json';
  let isBuild = false;
  let version = '';
  let indexJson: string | null = null;

  /** Lazily build (and cache) the JSON existence index from the on-disk pyramid. */
  const getIndexJson = (): string => (indexJson ??= JSON.stringify(buildTileIndex(src)));

  return {
    name: 'er-data-tiles',
    config(_config, { command }) {
      isBuild = command === 'build';
      if (!existsSync(src)) {
        throw new Error(
          `[er-data-tiles] tiles missing: ${src}\n` +
            `Run the er-extractor images stage first (it writes the data package).`,
        );
      }
      version = hashTileTree(src);
      return { define: { __ER_MAP_TILES_BASE__: JSON.stringify(`/map-tiles/${version}`) } };
    },
    configureServer(server) {
      const prefix = `/map-tiles/${version}/`;
      server.middlewares.use((req, res, next) => {
        const url = req.url;
        if (!url || !url.startsWith(prefix)) return next();
        const pathname = url.split('?')[0] ?? url;
        // Synthetic index (no file on disk) — derived from the tile tree.
        if (pathname === prefix + INDEX_FILE) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(getIndexJson());
          return;
        }
        const rel = path.normalize(decodeURIComponent(pathname)).slice(prefix.length);
        const file = path.join(src, rel);
        if (!file.startsWith(src) || !existsSync(file) || !statSync(file).isFile()) {
          return next();
        }
        res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream');
        // Not `immutable` in dev: the version is computed once at startup, so tiles regenerated
        // mid-session would otherwise stay stale in the browser until the URL changes.
        res.setHeader('Cache-Control', 'no-cache');
        createReadStream(file).pipe(res);
      });
    },
    buildStart() {
      // Stage tiles into public/ so the static build emits them. Dev uses the middleware
      // above, so skip the copy there (buildStart also fires on `serve`). Wiping the root
      // (not just this version's dir) drops pyramids staged by earlier builds.
      if (!isBuild) return;
      const dest = path.join(publicRoot, version);
      rmSync(publicRoot, { recursive: true, force: true });
      cpSync(src, dest, { recursive: true });
      writeFileSync(path.join(dest, INDEX_FILE), getIndexJson());
    },
  };
}

/**
 * Short content hash of every file in the pyramid (paths + bytes). ~50 MB, so it costs on the
 * order of 100 ms once per dev start / build. Bytes rather than sizes: a re-encoded tile of
 * identical byte length would otherwise be served stale for a year under `immutable`.
 *
 * Sorted by the forward-slash RELATIVE path so the hash is identical on every platform: sorting
 * native paths gives a different order on Windows (`\` is 0x5C and sorts after digits, `/` is
 * 0x2F and sorts before them — `…/2/…` vs `…/20/…` flips), which made a local build disagree
 * with Vercel's Linux build about which URL the tiles live at.
 */
function hashTileTree(srcDir: string): string {
  const files: string[] = [];
  const walk = (dir: string, rel: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), relPath);
      else if (entry.isFile()) files.push(relPath);
    }
  };
  walk(srcDir, '');
  files.sort();
  const hash = createHash('sha1');
  for (const rel of files) {
    hash.update(rel);
    hash.update('\0');
    hash.update(readFileSync(path.join(srcDir, rel)));
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 12);
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

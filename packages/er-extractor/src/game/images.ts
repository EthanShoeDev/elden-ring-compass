import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';

import {
  Data,
  Effect,
  Schema,
  SchemaGetter,
  SchemaTransformation,
} from 'effect';

import type { ImageFormat } from '../domain/context.ts';
import { ddsToPng, type ImageCodecError } from '../external/image-codec.ts';
import type { OodleError } from '../external/oodle.ts';
import { type Bnd4Error, parseBnd4Headers } from '../formats/bnd4.ts';
import { type DcxError, dcxDecompress, isDcx } from '../formats/dcx.ts';
import { parseTpf, type TpfError } from '../formats/tpf.ts';
import {
  buildLayerPyramid,
  MASTER_PX,
  MAX_NATIVE_ZOOM,
  type MapPyramidError,
  parseTileName,
  TILE_PX,
} from './map-pyramid.ts';

/**
 * Image extraction: TPF textures → PNG (BCn decode in Rust, see image-codec.ts).
 *   - Map tiles: `menu/71_maptile.tpfbhd`/`.tpfbdt` (a BHF4/BDF4 split binder of
 *     ~28k `.tpf.dcx` tiles, base + DLC). The .tpfbdt is ~1.25 GB, so we read
 *     the header table once and slice each tile lazily from the data file.
 *   - Icons: `menu/hi/*.tpf.dcx` atlases.
 *
 * Map tiles are NOT shipped as the game's native LOD stack. We keep only **L0**
 * (highest detail), composite each map's L0 grid onto one canvas, and regenerate
 * a clean power-of-2 `{z}/{y}/{x}` pyramid with `sharp` (see `map-pyramid.ts` for
 * the why). Output: `images/map-tiles/{map}/{layer}/{z}/{y}/{x}.{ext}` plus a
 * top-level `images/map-tiles/manifest.json` the web app reads. Icons still go
 * through the per-texture `Bun.Image` transcode below.
 *
 * Rust (`er-image-codec`) decodes BCn → a lossless PNG; for map tiles `sharp`
 * stitches + re-tiles, for icons `Bun.Image` re-encodes to the configured format.
 * Skip-if-exists (per map/layer for tiles) makes reruns cheap.
 */

export class ImagesError extends Data.TaggedError('ImagesError')<{
  readonly detail: string;
}> {}

type ImgErrors =
  | ImagesError
  | Bnd4Error
  | DcxError
  | OodleError
  | TpfError
  | ImageCodecError
  | MapPyramidError;

export interface ImageEncodeOptions {
  readonly format: ImageFormat;
  readonly quality: number; // 1–100; ignored for png
}

/** Re-encode a lossless PNG buffer to the configured format and write it (icons). */
const encodePng = (
  png: Uint8Array,
  outBase: string,
  opts: ImageEncodeOptions,
) =>
  Effect.promise(() => {
    const img = new Bun.Image(png);
    const out = `${outBase}.${opts.format}`;
    const pipe =
      opts.format === 'png'
        ? img.png()
        : opts.format === 'jpeg'
          ? img.jpeg({ quality: opts.quality })
          : opts.format === 'avif'
            ? img.avif({ quality: opts.quality })
            : img.webp({ quality: opts.quality });
    return pipe.write(out);
  });

const ICON_TPFS = [
  'menu/hi/01_common.tpf.dcx',
  'menu/hi/02_title.tpf.dcx',
  'menu/hi/03_chrmake.tpf.dcx',
];

/** Decompress a slice if it's a DCX, then parse its TPF textures. */
const tpfTextures = (bytes: Uint8Array, oo2core: string) =>
  Effect.gen(function* () {
    const tpf = isDcx(bytes) ? yield* dcxDecompress(bytes, oo2core) : bytes;
    return yield* parseTpf(tpf);
  });

const fileExists = (path: string) =>
  Effect.promise(() => Bun.file(path).exists());

const dirHasEntries = (dir: string) =>
  Effect.promise(() =>
    readdir(dir)
      .then((e) => e.length > 0)
      .catch(() => false),
  );

/** Human-readable map names for the manifest. */
const MAP_NAMES: Record<string, string> = {
  M00: 'Lands Between (Overworld)',
  M01: 'Lands Between (Underground)',
  M10: 'Land of Shadow (DLC)',
  M11: 'Land of Shadow — Underground (DLC)',
};
const BASE_LAYER = '00000000';
/**
 * Which layers to emit. `'base'` = the base map only (`00000000`). Flip to
 * `'all'` to also emit the event/elevation overlays (e.g. the crater =
 * `00004000`, the underground floors); the pipeline is generic over layer and
 * the manifest enumerates whatever is emitted. Overlays are sparse, so
 * `skipBlanks` keeps them tiny on disk.
 */
const EMIT_LAYERS: 'base' | 'all' = 'base';

const LayerSummary = Schema.Struct({
  id: Schema.String,
  base: Schema.Boolean,
  tileCount: Schema.Number, // L0 tiles composited into the master
});
type LayerSummary = typeof LayerSummary.Type;

const MapSummary = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  /** world→pixel affine; calibrated during web integration (TODO). */
  worldToPixelAffine: Schema.Null,
  layers: Schema.Array(LayerSummary),
});
type MapSummary = typeof MapSummary.Type;

const TileManifest = Schema.Struct({
  tileSize: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
  maxNativeZoom: Schema.Number,
  format: Schema.String,
  tileUrlTemplate: Schema.String,
  maps: Schema.Array(MapSummary),
});

// Like `Schema.fromJsonString(schema)`, but pretty-prints on encode. The v4
// `fromJsonString` transformation is hard-wired to compact output, so we rebuild
// it with a `stringifyJson` getter that passes `space: 2` — keeping the emitted
// manifest.json human-readable and diff-friendly. Mirrors the library's own
// generic combinator so `decodeTo` infers the transformation against the
// schema's `unknown`-bound encoded type.
const prettyJsonString = <S extends Schema.Top>(schema: S) =>
  Schema.String.pipe(
    Schema.decodeTo(
      schema,
      new SchemaTransformation.Transformation<unknown, string>(
        SchemaGetter.parseJson(),
        SchemaGetter.stringifyJson({ space: 2 }),
      ),
    ),
  );
const encodeManifest = Schema.encodeSync(prettyJsonString(TileManifest));

export interface ImageSummary {
  readonly tiles: number;
  readonly tilesSkipped: number;
  readonly icons: number;
}

export const extractImages = (
  gameRoot: string,
  oo2corePath: string,
  outDir: string,
  opts: ImageEncodeOptions,
  log: (msg: string) => Effect.Effect<void>,
): Effect.Effect<ImageSummary, ImgErrors> =>
  Effect.gen(function* () {
    const ext = opts.format;
    const tileDir = `${outDir}/images/map-tiles`;
    const iconDir = `${outDir}/images/icons`;
    yield* Effect.promise(() => mkdir(tileDir, { recursive: true }));
    yield* Effect.promise(() => mkdir(iconDir, { recursive: true }));

    // --- Map tiles → per-(map,layer) power-of-2 pyramids + manifest ---
    const bhdPath = `${gameRoot}/menu/71_maptile.tpfbhd`;
    const bdtPath = `${gameRoot}/menu/71_maptile.tpfbdt`;
    let tiles = 0;
    let tilesSkipped = 0;
    if (yield* fileExists(bhdPath)) {
      // One-time cleanup of the old flat `MENU_MapTile_*.{ext}` layout.
      const rootEntries = yield* Effect.promise(() =>
        readdir(tileDir).catch(() => [] as string[]),
      );
      const legacy = rootEntries.filter((f) =>
        /^MENU_MapTile_.*\.(webp|png|jpeg|avif)$/i.test(f),
      );
      if (legacy.length > 0) {
        yield* log(`removing ${legacy.length} legacy flat map-tile files`);
        yield* Effect.promise(() =>
          Promise.all(
            legacy.map((f) => rm(`${tileDir}/${f}`, { force: true })),
          ),
        );
      }

      const bhd = new Uint8Array(
        yield* Effect.promise(() => Bun.file(bhdPath).arrayBuffer()),
      );
      const headers = yield* parseBnd4Headers(bhd);
      yield* log(`map tiles: ${headers.length} archive entries`);

      // Group L0 tiles by map → layer (filtered to the layers we emit).
      const byMap = new Map<
        string,
        Map<
          string,
          { col: number; row: number; offset: number; size: number }[]
        >
      >();
      for (const h of headers) {
        const base = (h.name ?? '').split(/[\\/]/).pop() ?? '';
        const stem = base.replace(/\.tpf(\.dcx)?$/i, '');
        const t = parseTileName(stem);
        if (!t || t.lod !== 0) continue;
        if (EMIT_LAYERS === 'base' && t.layer !== BASE_LAYER) continue;
        let layers = byMap.get(t.map);
        if (!layers) {
          layers = new Map();
          byMap.set(t.map, layers);
        }
        const arr = layers.get(t.layer) ?? [];
        arr.push({
          col: t.col,
          row: t.row,
          offset: h.dataOffset,
          size: h.size,
        });
        layers.set(t.layer, arr);
      }

      const manifestMaps: MapSummary[] = [];
      for (const map of [...byMap.keys()].sort()) {
        const layers = byMap.get(map)!;
        // Base layer first, then overlays by id.
        const layerIds = [...layers.keys()].sort((a, b) =>
          a === BASE_LAYER ? -1 : b === BASE_LAYER ? 1 : a.localeCompare(b),
        );
        const layerSummaries: LayerSummary[] = [];
        for (const layer of layerIds) {
          const group = layers.get(layer)!;
          const isBase = layer === BASE_LAYER;
          const outBaseDir = `${tileDir}/${map}/${layer}`;
          if (yield* dirHasEntries(outBaseDir)) {
            tilesSkipped += group.length;
            layerSummaries.push({
              id: layer,
              base: isBase,
              tileCount: group.length,
            });
            continue;
          }
          // Decode every L0 tile in the group (BCn → lossless PNG, in Rust).
          const decoded: { col: number; row: number; png: Uint8Array }[] = [];
          for (const g of group) {
            const slice = new Uint8Array(
              yield* Effect.promise(() =>
                Bun.file(bdtPath)
                  .slice(g.offset, g.offset + g.size)
                  .arrayBuffer(),
              ),
            );
            const textures = yield* tpfTextures(slice, oo2corePath);
            if (textures.length === 0) continue;
            const png = yield* ddsToPng(textures[0]!.dds);
            decoded.push({ col: g.col, row: g.row, png });
          }
          const { tileCount } = yield* buildLayerPyramid(
            decoded,
            outBaseDir,
            opts,
          );
          tiles += tileCount;
          layerSummaries.push({ id: layer, base: isBase, tileCount });
          yield* log(`  ${map}/${layer}: ${tileCount} L0 tiles → pyramid`);
        }
        manifestMaps.push({
          id: map,
          name: MAP_NAMES[map] ?? map,
          worldToPixelAffine: null,
          layers: layerSummaries,
        });
      }

      const manifest = {
        tileSize: TILE_PX,
        width: MASTER_PX,
        height: MASTER_PX,
        maxNativeZoom: MAX_NATIVE_ZOOM,
        format: ext,
        tileUrlTemplate: `{map}/{layer}/{z}/{y}/{x}.${ext}`,
        maps: manifestMaps,
      };
      yield* Effect.promise(() =>
        writeFile(`${tileDir}/manifest.json`, `${encodeManifest(manifest)}\n`),
      );
      yield* log(
        `map tiles: ${tiles} L0 composited, ${tilesSkipped} cached; ` +
          `${manifestMaps.length} maps → manifest.json`,
      );
    } else {
      yield* log('no 71_maptile.tpfbhd; skipping map tiles');
    }

    // --- Icons ---
    let icons = 0;
    for (const rel of ICON_TPFS) {
      const path = `${gameRoot}/${rel}`;
      if (!(yield* fileExists(path))) continue;
      const sheet = (rel.split('/').pop() ?? '').replace(/\.tpf\.dcx$/i, '');
      const bytes = new Uint8Array(
        yield* Effect.promise(() => Bun.file(path).arrayBuffer()),
      );
      const textures = yield* tpfTextures(bytes, oo2corePath);
      yield* Effect.promise(() =>
        mkdir(`${iconDir}/${sheet}`, { recursive: true }),
      );
      for (let i = 0; i < textures.length; i++) {
        const t = textures[i]!;
        const safe = (t.name || `tex_${i}`).replace(/[^\w.-]/g, '_');
        const outBase = `${iconDir}/${sheet}/${i}_${safe}`;
        if (yield* fileExists(`${outBase}.${ext}`)) continue;
        const png = yield* ddsToPng(t.dds);
        yield* encodePng(png, outBase, opts);
        icons++;
      }
    }
    yield* log(`icons: ${icons} written`);

    return { tiles, tilesSkipped, icons };
  });

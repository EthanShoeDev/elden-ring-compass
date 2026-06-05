// NOTE: the images stage uses `Bun.file(bdt).slice(offset, len)` for RANDOM-ACCESS
// reads into multi-GB BHD/BDT archives (reading just the bytes for one texture),
// which effect `FileSystem` has no ranged-read API for — loading the whole slab
// would be the real regression. That ranged `Bun.file` read is the *only* exception;
// all directory/file IO here goes through effect `FileSystem`.
import {
  Data,
  Effect,
  FileSystem,
  PlatformError,
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
import {
  EVENT_BITS,
  type MapMask,
  type MapMaskError,
  parseMapMasks,
  pickVanillaVariant,
} from './map-mask.ts';

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
  | MapPyramidError
  | MapMaskError
  | PlatformError.PlatformError;

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
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const entries = yield* fs
      .readDirectory(dir)
      .pipe(Effect.orElseSucceed(() => [] as string[]));
    return entries.length > 0;
  });

/** Human-readable map names for the manifest. */
const MAP_NAMES: Record<string, string> = {
  M00: 'Lands Between (Overworld)',
  M01: 'Lands Between (Underground)',
  M10: 'Land of Shadow (DLC)',
  M11: 'Land of Shadow — Underground (DLC)',
};
/**
 * Output sub-dir + manifest layer id for the single rendered map per map-id: the
 * **vanilla, all-fragments-revealed** map (event bits like the crater excluded).
 * The old `00000000` (fully-undiscovered) dir is superseded and cleaned up.
 * Phase 2 (the save-driven "collected maps" toggle) may add sibling overlay dirs.
 * See `docs/projects/map-tile-fragments.md`.
 */
const BASE_LAYER_ID = 'base';

const LayerSummary = Schema.Struct({
  id: Schema.String,
  base: Schema.Boolean,
  tileCount: Schema.Number, // L0 cells composited into the master
});
type LayerSummary = typeof LayerSummary.Type;

const MapSummary = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  /** world→pixel affine; calibrated during web integration (TODO). */
  worldToPixelAffine: Schema.Null,
  /** map-fragment reveal bits (the `variant` bitmask); drives the Phase-2 toggle. */
  fragmentBits: Schema.Array(Schema.Number),
  /** world-event/state bits (e.g. the crater) excluded from the vanilla map. */
  eventBits: Schema.Array(Schema.Number),
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
  readonly itemIcons: number;
  readonly itemIconsSkipped: number;
}

export const extractImages = (
  gameRoot: string,
  oo2corePath: string,
  outDir: string,
  opts: ImageEncodeOptions,
  log: (msg: string) => Effect.Effect<void>,
): Effect.Effect<ImageSummary, ImgErrors, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const ext = opts.format;
    const tileDir = `${outDir}/images/map-tiles`;
    const iconDir = `${outDir}/images/icons`;
    yield* fs.makeDirectory(tileDir, { recursive: true });
    yield* fs.makeDirectory(iconDir, { recursive: true });

    // --- Map tiles → per-map vanilla (all-fragments) pyramid + manifest ---
    // Each tile name ends in a 32-bit `variant` bitmask (collected fragments /
    // world events). We render the *vanilla, fully-revealed* map: per cell, drop
    // event-bit variants and pick the one with the most fragment bits set. See
    // `game/map-mask.ts` + `docs/projects/map-tile-fragments.md`.
    const bhdPath = `${gameRoot}/menu/71_maptile.tpfbhd`;
    const bdtPath = `${gameRoot}/menu/71_maptile.tpfbdt`;
    const mtmskPath = `${gameRoot}/menu/71_maptile.mtmskbnd.dcx`;
    let tiles = 0;
    let tilesSkipped = 0;
    if (yield* fileExists(bhdPath)) {
      // One-time cleanup of the old flat `MENU_MapTile_*.{ext}` layout.
      const rootEntries = yield* fs
        .readDirectory(tileDir)
        .pipe(Effect.orElseSucceed(() => [] as string[]));
      const legacy = rootEntries.filter((f) =>
        /^MENU_MapTile_.*\.(webp|png|jpeg|avif)$/i.test(f),
      );
      if (legacy.length > 0) {
        yield* log(`removing ${legacy.length} legacy flat map-tile files`);
        yield* Effect.forEach(
          legacy,
          (f) => fs.remove(`${tileDir}/${f}`, { force: true }),
          { discard: true },
        );
      }

      // Authoritative fragment/event taxonomy from the mask binder.
      const masks: Map<string, MapMask> = (yield* fileExists(mtmskPath))
        ? yield* parseMapMasks(
            new Uint8Array(
              yield* Effect.promise(() => Bun.file(mtmskPath).arrayBuffer()),
            ),
            oo2corePath,
          )
        : new Map();

      const bhd = new Uint8Array(
        yield* Effect.promise(() => Bun.file(bhdPath).arrayBuffer()),
      );
      const headers = yield* parseBnd4Headers(bhd);
      yield* log(`map tiles: ${headers.length} archive entries`);

      // Group L0 tiles by map → "col_row" → variants (the bitmask + its bytes).
      interface Variant {
        variant: number;
        col: number;
        row: number;
        offset: number;
        size: number;
      }
      const byMap = new Map<string, Map<string, Variant[]>>();
      for (const h of headers) {
        const base = (h.name ?? '').split(/[\\/]/).pop() ?? '';
        const stem = base.replace(/\.tpf(\.dcx)?$/i, '');
        const t = parseTileName(stem);
        if (!t || t.lod !== 0) continue;
        let cells = byMap.get(t.map);
        if (!cells) {
          cells = new Map();
          byMap.set(t.map, cells);
        }
        const key = `${t.col}_${t.row}`;
        const arr = cells.get(key) ?? [];
        arr.push({
          variant: parseInt(t.layer, 16) >>> 0,
          col: t.col,
          row: t.row,
          offset: h.dataOffset,
          size: h.size,
        });
        cells.set(key, arr);
      }

      const manifestMaps: MapSummary[] = [];
      for (const map of [...byMap.keys()].sort()) {
        const cells = byMap.get(map);
        if (cells === undefined) continue;
        const eventMask = EVENT_BITS[map] ?? 0;
        const outBaseDir = `${tileDir}/${map}/${BASE_LAYER_ID}`;

        // Fragment/event bits: prefer the mask binder; else derive from on-disk.
        const maskInfo = masks.get(map);
        const fragmentBits = maskInfo
          ? [...maskInfo.fragmentBits]
          : (() => {
              const all = new Set<number>();
              for (const vs of cells.values())
                for (const v of vs)
                  for (let b = 0; b < 32; b++)
                    if (v.variant & (1 << b)) all.add(1 << b);
              return [...all]
                .filter((b) => (b & eventMask) === 0)
                .sort((a, b) => a - b);
            })();
        const eventBits = maskInfo
          ? [...maskInfo.eventBits]
          : eventMask
            ? [eventMask]
            : [];

        // Drop any superseded fully-undiscovered `00000000` pyramid for this map.
        yield* fs.remove(`${tileDir}/${map}/00000000`, {
          recursive: true,
          force: true,
        });

        const mkSummary = (tileCount: number): MapSummary => ({
          id: map,
          name: MAP_NAMES[map] ?? map,
          worldToPixelAffine: null,
          fragmentBits,
          eventBits,
          layers: [{ id: BASE_LAYER_ID, base: true, tileCount }],
        });

        if (yield* dirHasEntries(outBaseDir)) {
          tilesSkipped += cells.size;
          manifestMaps.push(mkSummary(cells.size));
          continue;
        }

        // Pick + decode the fully-revealed tile for each cell. Authoritative:
        // the on-disk variant whose `code === cellMask` (the mtmsk full mask).
        // Cells with no mask are void (map edge/ocean) and cells whose mask
        // carries an event bit (the crater) are out-of-bounds — both skipped, so
        // the master is composited only where the real map exists (matches erdb's
        // `sourcer.py`). Without a mask binder we fall back to the max-fragment
        // heuristic across every cell.
        const cellMasks = maskInfo?.cellMasks;
        const useMasks = cellMasks !== undefined && cellMasks.size > 0;
        const decoded: { col: number; row: number; png: Uint8Array }[] = [];
        for (const [key, vs] of cells) {
          let pick: (typeof vs)[number] | undefined;
          if (useMasks) {
            const mask = cellMasks?.get(key);
            if (mask === undefined || (mask & eventMask) !== 0) continue;
            pick = vs.find((v) => v.variant === mask);
            if (!pick) continue; // no exact full-reveal variant on disk
          } else {
            const chosen = pickVanillaVariant(
              vs.map((v) => v.variant),
              eventMask,
            );
            pick = vs.find((v) => v.variant === chosen) ?? vs[0];
          }
          if (!pick) continue;
          const slice = new Uint8Array(
            yield* Effect.promise(() =>
              Bun.file(bdtPath)
                .slice(pick.offset, pick.offset + pick.size)
                .arrayBuffer(),
            ),
          );
          const textures = yield* tpfTextures(slice, oo2corePath);
          const [firstTexture] = textures;
          if (firstTexture === undefined) continue;
          const png = yield* ddsToPng(firstTexture.dds);
          decoded.push({ col: pick.col, row: pick.row, png });
        }
        const { tileCount } = yield* buildLayerPyramid(
          decoded,
          outBaseDir,
          opts,
        );
        tiles += tileCount;
        manifestMaps.push(mkSummary(tileCount));
        yield* log(
          `  ${map}: ${tileCount} cells → vanilla pyramid ` +
            `(${fragmentBits.length} fragment bits, ${eventBits.length} event bits)`,
        );
      }

      const manifest = {
        tileSize: TILE_PX,
        width: MASTER_PX,
        height: MASTER_PX,
        maxNativeZoom: MAX_NATIVE_ZOOM,
        format: ext,
        tileUrlTemplate: `{map}/${BASE_LAYER_ID}/{z}/{y}/{x}.${ext}`,
        maps: manifestMaps,
      };
      yield* fs.writeFileString(
        `${tileDir}/manifest.json`,
        `${encodeManifest(manifest)}\n`,
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
      yield* fs.makeDirectory(`${iconDir}/${sheet}`, { recursive: true });
      for (const [i, t] of textures.entries()) {
        const safe = (t.name || `tex_${i}`).replace(/[^\w.-]/g, '_');
        const outBase = `${iconDir}/${sheet}/${i}_${safe}`;
        if (yield* fileExists(`${outBase}.${ext}`)) continue;
        const png = yield* ddsToPng(t.dds);
        yield* encodePng(png, outBase, opts);
        icons++;
      }
    }
    yield* log(`icons: ${icons} written`);

    // --- Per-item icons (EquipParam*.iconId → image) ---
    // Item icons are a BHF4/BDF4 split binder of one-DDS-per-icon `.tpf.dcx`
    // entries named `MENU_Knowledge_{iconId:05}` (base + DLC together) — the same
    // shape as the map-tile binder, so we read the header table once and slice each
    // icon lazily from the 1.4 GB `.tpfbdt`. The decoded item rows reference these
    // by `icon` (= iconId), so we emit `images/icons/items/{iconId}.{ext}`.
    let itemIcons = 0;
    let itemIconsSkipped = 0;
    const soloBhd = `${gameRoot}/menu/hi/00_solo.tpfbhd`;
    const soloBdt = `${gameRoot}/menu/hi/00_solo.tpfbdt`;
    if ((yield* fileExists(soloBhd)) && (yield* fileExists(soloBdt))) {
      const itemIconDir = `${iconDir}/items`;
      yield* fs.makeDirectory(itemIconDir, { recursive: true });
      const headers = yield* parseBnd4Headers(
        new Uint8Array(
          yield* Effect.promise(() => Bun.file(soloBhd).arrayBuffer()),
        ),
      );
      for (const h of headers) {
        const base = (h.name ?? '').split(/[\\/]/).pop() ?? '';
        const m = base.match(/MENU_Knowledge_0*(\d+)/i);
        const idStr = m?.[1];
        if (idStr === undefined) continue;
        const iconId = parseInt(idStr, 10);
        const outBase = `${itemIconDir}/${iconId}`;
        if (yield* fileExists(`${outBase}.${ext}`)) {
          itemIconsSkipped++;
          continue;
        }
        const slice = new Uint8Array(
          yield* Effect.promise(() =>
            Bun.file(soloBdt)
              .slice(h.dataOffset, h.dataOffset + h.size)
              .arrayBuffer(),
          ),
        );
        const textures = yield* tpfTextures(slice, oo2corePath);
        const [firstTexture] = textures;
        if (firstTexture === undefined) continue;
        const png = yield* ddsToPng(firstTexture.dds);
        yield* encodePng(png, outBase, opts);
        itemIcons++;
      }
      yield* log(
        `item icons: ${itemIcons} written (+${itemIconsSkipped} cached)`,
      );
    } else {
      yield* log('no menu/hi/00_solo.tpfbhd; skipping item icons');
    }

    return { tiles, tilesSkipped, icons, itemIcons, itemIconsSkipped };
  });

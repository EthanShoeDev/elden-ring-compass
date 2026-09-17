import { Data, Effect, FileSystem, PlatformError } from 'effect';
import sharp, { type Sharp } from 'sharp';

import type { ImageEncodeOptions } from './images.ts';

/**
 * Map-tile pyramid builder.
 *
 * The game ships its map as a non-power-of-2 stack of LODs (L0–L4) of 256×256
 * `.tpf.dcx` tiles, named `MENU_MapTile_M{map}_L{lod}_{col}_{row}_{layer}`. That
 * is suboptimal for the web (uneven zoom ratios, a near-redundant L1). Instead we
 * consume only **L0** (highest detail) and regenerate a clean power-of-2 pyramid
 * with `sharp` / libvips:
 *
 *   1. Composite the L0 tiles onto one transparent `MASTER_PX²` canvas at their
 *      grid position (`col*256, row*256`). Every map tiles into the SAME canvas,
 *      so the base map, its overlay layers, and the other maps all share one
 *      pixel geometry (→ one world→pixel affine per world).
 *   2. `tile({ layout: 'google' })` slices a `{z}/{y}/{x}` pyramid (z 0 = whole
 *      map in one tile … z `MAX_NATIVE_ZOOM` = native L0), downsampling as it goes.
 *   3. `skipBlanks` drops fully-transparent tiles, so sparse layers — the DLC
 *      underground (M11) and the event overlays (e.g. the crater, layer `00004000`)
 *      — cost almost nothing on disk while still aligning pixel-for-pixel with the
 *      base map for compositing in Leaflet.
 *
 * Note `google` layout names leaves `{z}/{y}/{x}` (subdir = row, file = col), so
 * the Leaflet URL template is `…/{z}/{y}/{x}.{ext}` (verified empirically).
 */

/** Tile edge in pixels. Every game map tile is exactly 256². */
export const TILE_PX = 256;
/** Overworld L0 is a 41×41 grid; all maps composite into this square canvas. */
export const GRID = 41;
/** Master (native L0) edge: 41 × 256 = 10496 px. */
export const MASTER_PX = TILE_PX * GRID;
/** Deepest zoom level, native L0: ceil(log2(10496/256)) = 6. Matches rastercoords. */
export const MAX_NATIVE_ZOOM = Math.ceil(Math.log2(MASTER_PX / TILE_PX));

const TILE_RE =
  /^MENU_MapTile_(M\d{2})_L(\d)_(\d{2,})_(\d{2,})_([0-9A-Fa-f]{8})$/;

export interface TileName {
  readonly map: string; // "M00"
  readonly lod: number; // 0–4
  readonly col: number;
  readonly row: number;
  readonly layer: string; // 8-hex, lowercased; "00000000" = base map
}

/** Parse a tile file stem (no extension) into its parts, or null if it isn't one. */
export const parseTileName = (stem: string): TileName | null => {
  const m = TILE_RE.exec(stem);
  if (!m) return null;
  const [, map, lod, col, row, layer] = m;
  if (map === undefined || layer === undefined) return null;
  return {
    map,
    lod: Number(lod),
    col: Number(col),
    row: Number(row),
    layer: layer.toLowerCase(),
  };
};

export class MapPyramidError extends Data.TaggedError('MapPyramidError')<{
  readonly detail: string;
}> {}

/** One decoded L0 tile (lossless PNG) and its grid position. */
export interface DecodedTile {
  readonly col: number;
  readonly row: number;
  readonly png: Uint8Array;
}

const encodeMaster = (pipe: Sharp, opts: ImageEncodeOptions): Sharp =>
  opts.format === 'png'
    ? pipe.png()
    : opts.format === 'jpeg'
      ? pipe.jpeg({ quality: opts.quality }) // flattens alpha — base layer only
      : opts.format === 'avif'
        ? pipe.avif({ quality: opts.quality })
        : pipe.webp({ quality: opts.quality, alphaQuality: 100 });

/**
 * Composite L0 `tiles` onto a transparent `MASTER_PX²` canvas and emit a
 * google-layout `{z}/{y}/{x}.{ext}` pyramid under `outBaseDir`. The directory is
 * cleared first so a rebuild is clean. Returns the number of composited tiles.
 */
export const buildLayerPyramid = (
  tiles: ReadonlyArray<DecodedTile>,
  outBaseDir: string,
  opts: ImageEncodeOptions,
): Effect.Effect<
  { readonly tileCount: number },
  MapPyramidError | PlatformError.PlatformError,
  FileSystem.FileSystem
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    yield* fs.remove(outBaseDir, { recursive: true, force: true });
    // The sharp/libvips compose+tile is genuinely Promise-based native work, so it
    // stays in `tryPromise`; the surrounding file IO is effect `FileSystem`.
    yield* Effect.tryPromise({
      try: async () => {
        const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
        const canvas = sharp({
          create: {
            width: MASTER_PX,
            height: MASTER_PX,
            channels: 4,
            background: transparent,
          },
        }).composite(
          tiles.map((t) => ({
            // Wrap the Rust-returned bytes in a zero-copy Buffer (sharp's
            // OverlayOptions.input is typed as Buffer; this shares the memory).
            input: Buffer.from(
              t.png.buffer,
              t.png.byteOffset,
              t.png.byteLength,
            ),
            left: t.col * TILE_PX,
            // Flip the Y axis: the game's row index increases *northward* (erdb
            // `sourcer.py` pastes at `high_y - y`), so render north-up by mapping
            // row → (GRID-1 - row). Without this the whole map is upside-down.
            top: (GRID - 1 - t.row) * TILE_PX,
          })),
        );
        await encodeMaster(canvas, opts)
          .tile({
            size: TILE_PX,
            layout: 'google',
            background: transparent,
            skipBlanks: 0, // drop fully-transparent tiles (sparse overlays/M11)
          })
          .toFile(outBaseDir);
      },
      catch: (cause) =>
        new MapPyramidError({
          detail: `pyramid build failed: ${String(cause)}`,
        }),
    });
    // `google` layout writes a `blank.png` placeholder at the root; we don't use it.
    yield* fs.remove(`${outBaseDir}/blank.png`, { force: true });
    return { tileCount: tiles.length };
  });

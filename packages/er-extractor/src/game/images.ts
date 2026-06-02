import { mkdir } from 'node:fs/promises';

import { Data, Effect } from 'effect';

import type { ImageFormat } from '../domain/context.ts';
import { ddsToPng, type ImageCodecError } from '../external/image-codec.ts';
import type { OodleError } from '../external/oodle.ts';
import { type Bnd4Error, parseBnd4Headers } from '../formats/bnd4.ts';
import { type DcxError, dcxDecompress, isDcx } from '../formats/dcx.ts';
import { parseTpf, type TpfError } from '../formats/tpf.ts';

/**
 * Image extraction: TPF textures → PNG (BCn decode in Rust, see image-codec.ts).
 *   - Map tiles: `menu/71_maptile.tpfbhd`/`.tpfbdt` (a BHF4/BDF4 split binder of
 *     ~28k `.tpf.dcx` tiles, base + DLC). The .tpfbdt is ~1.25 GB, so we read
 *     the header table once and slice each tile lazily from the data file.
 *   - Icons: `menu/hi/*.tpf.dcx` atlases.
 * Output goes under `<outDir>/images/`, mirroring the in-game tile names so the
 * tiled map view can address them by map/LOD/grid. Skip-if-exists makes reruns
 * cheap (idempotent, like the unpack stage).
 *
 * Rust (`er-image-codec`) decodes BCn → a lossless PNG; `Bun.Image` then
 * re-encodes to the configured format (default WebP) at the configured quality,
 * so we can ship compressed assets and re-extract instead of committing full-res.
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
  | ImageCodecError;

export interface ImageEncodeOptions {
  readonly format: ImageFormat;
  readonly quality: number; // 1–100; ignored for png
}

/** Re-encode a lossless PNG buffer to the configured format and write it. */
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

    // --- Map tiles (lazy slices from the 1.25 GB .tpfbdt) ---
    const bhdPath = `${gameRoot}/menu/71_maptile.tpfbhd`;
    const bdtPath = `${gameRoot}/menu/71_maptile.tpfbdt`;
    let tiles = 0;
    let tilesSkipped = 0;
    if (yield* fileExists(bhdPath)) {
      const bhd = new Uint8Array(
        yield* Effect.promise(() => Bun.file(bhdPath).arrayBuffer()),
      );
      const headers = yield* parseBnd4Headers(bhd);
      yield* log(`map tiles: ${headers.length} entries`);
      for (const h of headers) {
        // "71_MapTile\MENU_MapTile_M00_L0_00_00_00000000.tpf.dcx" → base name.
        const base = (h.name ?? '').split(/[\\/]/).pop() ?? '';
        const stem = base.replace(/\.tpf(\.dcx)?$/i, '');
        if (!stem) continue;
        const outBase = `${tileDir}/${stem}`;
        if (yield* fileExists(`${outBase}.${ext}`)) {
          tilesSkipped++;
          continue;
        }
        const slice = new Uint8Array(
          yield* Effect.promise(() =>
            Bun.file(bdtPath)
              .slice(h.dataOffset, h.dataOffset + h.size)
              .arrayBuffer(),
          ),
        );
        const textures = yield* tpfTextures(slice, oo2corePath);
        if (textures.length === 0) continue;
        const png = yield* ddsToPng(textures[0]!.dds);
        yield* encodePng(png, outBase, opts);
        tiles++;
        if (tiles % 2000 === 0) yield* log(`  …${tiles} tiles written`);
      }
      yield* log(
        `map tiles: ${tiles} written, ${tilesSkipped} skipped (already present)`,
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

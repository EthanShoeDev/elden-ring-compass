import { Data, Effect } from 'effect';

import { oodleDecompress, type OodleError } from '../external/oodle.ts';

/**
 * DCX — From's per-file compression container. Most Elden Ring game files
 * (`*.dcx`) are `DCX_KRAK` (Oodle/Kraken); `regulation.bin` is `DCX_ZSTD`; some
 * older files are `DCX_DFLT` (zlib). Ported from SoulsFormatsNEXT `Formats/DCX.cs`
 * (the modern `DCX\0` container).
 *
 * Header (modern `DCX\0`): the DCS/DCP/data offsets are stored at fixed slots,
 * so we read those rather than asserting every Unk field:
 *   0x08 u32 → DCS offset (then +4 uncompressedSize, +8 compressedSize)
 *   0x0C u32 → DCP offset (then +4 the 4-char format: KRAK/ZSTD/DFLT)
 *   0x14 u32 → start of the compressed payload
 */

export class DcxError extends Data.TaggedError('DcxError')<{
  readonly detail: string;
}> {}

const ascii = (b: Uint8Array, o: number, n: number) =>
  new TextDecoder('latin1').decode(b.subarray(o, o + n));

export const isDcx = (b: Uint8Array) => b.length >= 4 && ascii(b, 0, 4) === 'DCX\0';

interface ParsedDcx {
  readonly format: string;
  readonly uncompressedSize: number;
  readonly compressed: Uint8Array;
}

const parseDcx = (bytes: Uint8Array): Effect.Effect<ParsedDcx, DcxError> =>
  Effect.gen(function* () {
    if (!isDcx(bytes)) {
      return yield* new DcxError({ detail: `not a DCX (magic "${ascii(bytes, 0, 4)}")` });
    }
    if (bytes.length < 0x18) {
      return yield* new DcxError({ detail: `DCX too short (${bytes.length} bytes)` });
    }
    // DCX headers are BIG-endian (unlike BHD5). `getUint32(off, false)` = BE.
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const dcsOffset = dv.getUint32(0x08, false);
    const dcpOffset = dv.getUint32(0x0c, false);
    const dataOffset = dv.getUint32(0x14, false);
    if (dcsOffset + 12 > bytes.length || dcpOffset + 8 > bytes.length || dataOffset > bytes.length) {
      return yield* new DcxError({ detail: 'DCX header offsets out of range' });
    }
    const uncompressedSize = dv.getUint32(dcsOffset + 4, false);
    const compressedSize = dv.getUint32(dcsOffset + 8, false);
    const format = ascii(bytes, dcpOffset + 4, 4);
    const end = compressedSize > 0 ? dataOffset + compressedSize : bytes.length;
    return { format, uncompressedSize, compressed: bytes.subarray(dataOffset, end) };
  });

/**
 * Decompress a DCX buffer to its raw contents (usually a BND4/FMG/TPF/MSB).
 *
 * @param bytes       the full `.dcx` file bytes
 * @param oo2corePath path to `oo2core_*_win64.dll` (needed only for DCX_KRAK)
 */
export const dcxDecompress = (
  bytes: Uint8Array,
  oo2corePath: string,
): Effect.Effect<Uint8Array, DcxError | OodleError> =>
  Effect.gen(function* () {
    const { format, uncompressedSize, compressed } = yield* parseDcx(bytes);
    switch (format) {
      case 'KRAK':
        return yield* oodleDecompress(compressed, uncompressedSize, oo2corePath);
      case 'ZSTD':
        return yield* Effect.tryPromise({
          try: async () => new Uint8Array(await Bun.zstdDecompress(compressed)),
          catch: (cause) => new DcxError({ detail: `zstd decompress failed: ${String(cause)}` }),
        });
      case 'DFLT':
        // Bun has no async inflate (only `inflateSync`); DFLT is a cold path for
        // Elden Ring (modern files are KRAK/ZSTD only), so sync here is fine and
        // keeps us off node:zlib/node:util.
        return yield* Effect.try({
          try: () => new Uint8Array(Bun.inflateSync(compressed as Uint8Array<ArrayBuffer>)),
          catch: (cause) => new DcxError({ detail: `zlib inflate failed: ${String(cause)}` }),
        });
      default:
        return yield* new DcxError({ detail: `unsupported DCX format "${format}"` });
    }
  });

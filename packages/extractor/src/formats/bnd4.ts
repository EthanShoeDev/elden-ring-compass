import { Data, Effect } from 'effect';

import { BinaryReader, reverseBits } from './binary-reader.ts';

/**
 * BND4 — From's general-purpose file container (`*bnd`). Ported from
 * SoulsFormatsNEXT `Formats/Binder/{BND4,BinderFileHeader,Binder}.cs`. The input
 * must already be DCX-decompressed (see ./dcx.ts). Non-essential constant asserts
 * are skipped (our inputs are trusted game files); we fail only on bad magic or
 * unsupported per-file compression.
 *
 * Also handles the split BXF4 variant (`BHF4` header + `BDF4` data, e.g.
 * `*.tpfbhd`/`*.tpfbdt`): pass the data file as `dataBuf` and entry offsets are
 * read from it instead of the header buffer.
 */

export class Bnd4Error extends Data.TaggedError('Bnd4Error')<{
  readonly detail: string;
}> {}

export interface Bnd4Entry {
  readonly id: number;
  readonly name: string | null;
  readonly bytes: Uint8Array;
}

/** Entry metadata without the bytes — for reading split BDF4 data lazily. */
export interface Bnd4Header {
  readonly id: number;
  readonly name: string | null;
  readonly dataOffset: number;
  readonly size: number;
}

// Binder.Format flag bits.
const FMT_IDS = 0x02;
const FMT_NAMES = 0x04 | 0x08;
const FMT_LONG_OFFSETS = 0x10;
const FMT_COMPRESSION = 0x20;
const FMT_NAMES1_ONLY = 0x04;
const FILE_COMPRESSED = 0x01;

// Binder format/file-flags bytes are bit-reversed unless bit-big-endian
// (Binder.ReadFormat / ReadFileFlags).
const readFormat = (raw: number, bitBigEndian: boolean): number => {
  const reverse = bitBigEndian || ((raw & 1) !== 0 && (raw & 0x80) === 0);
  return reverse ? raw : reverseBits(raw);
};
const readFileFlags = (raw: number, bitBigEndian: boolean): number =>
  bitBigEndian ? raw : reverseBits(raw);

/**
 * Read the entry header table (no bytes). Works for both BND4 and the BHF4 half
 * of a split binder. Throws on bad magic or per-file BND compression.
 */
const readHeaders = (data: Uint8Array): Bnd4Header[] => {
  const r = new BinaryReader(data);
  const magic = r.ascii(4);
  if (magic !== 'BND4' && magic !== 'BHF4') {
    throw new Error(`not a BND4/BHF4 (magic "${magic}")`);
  }
  r.skip(2); // Unk04, Unk05
  r.skip(3); // 0, 0, 0
  const bigEndian = r.bool();
  const bitBigEndian = !r.bool();
  r.skip(1); // 0
  r.little = !bigEndian;

  const fileCount = r.i32();
  r.skip(8); // header size (0x40)
  r.skip(8); // version (8-char timestamp)
  r.skip(8); // file header size
  r.skip(8); // headers end
  const unicode = r.bool();
  const format = readFormat(r.u8(), bitBigEndian);
  r.skip(1); // extended
  r.skip(1); // 0
  r.skip(4); // 0
  r.skip(8); // hash table offset (or 0)

  const longOffsets = (format & FMT_LONG_OFFSETS) !== 0;
  const compression = (format & FMT_COMPRESSION) !== 0;
  const hasIds = (format & FMT_IDS) !== 0;
  const hasNames = (format & FMT_NAMES) !== 0;
  const names1Only = format === FMT_NAMES1_ONLY;

  const headers: Bnd4Header[] = [];
  for (let i = 0; i < fileCount; i++) {
    const flags = readFileFlags(r.u8(), bitBigEndian);
    r.skip(3); // 0, 0, 0
    r.skip(4); // -1
    const size = r.i64();
    if (compression) r.skip(8); // uncompressed size
    const dataOffset = longOffsets ? r.i64() : r.u32();
    let id = -1;
    if (hasIds) id = r.i32();
    let name: string | null = null;
    if (hasNames) {
      const nameOffset = r.u32();
      name = unicode ? r.getUTF16(nameOffset) : r.getShiftJIS(nameOffset);
    }
    if (names1Only) {
      id = r.i32();
      r.skip(4);
    }
    if ((flags & FILE_COMPRESSED) !== 0) {
      throw new Error('compressed BND4 entries are not supported yet');
    }
    headers.push({ id, name, dataOffset, size });
  }
  return headers;
};

/** Parse the entry header table only (use with lazy BDF4 reads for huge archives). */
export const parseBnd4Headers = (
  data: Uint8Array,
): Effect.Effect<Bnd4Header[], Bnd4Error> =>
  Effect.try({
    try: () => readHeaders(data),
    catch: (cause) => new Bnd4Error({ detail: String(cause) }),
  });

export const parseBnd4 = (
  data: Uint8Array,
  dataBuf?: Uint8Array,
): Effect.Effect<Bnd4Entry[], Bnd4Error> =>
  Effect.try({
    try: () => {
      // Split binder (BHF4): entry bytes live in the companion BDF4 data file.
      const src = dataBuf ?? data;
      return readHeaders(data).map((h) => ({
        id: h.id,
        name: h.name,
        bytes: src.subarray(h.dataOffset, h.dataOffset + h.size),
      }));
    },
    catch: (cause) => new Bnd4Error({ detail: String(cause) }),
  });

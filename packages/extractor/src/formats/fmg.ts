import { Data, Effect } from 'effect';

import { BinaryReader } from './binary-reader.ts';

/**
 * FMG — From's localized-text table (`id → string`). Ported from
 * SoulsFormatsNEXT `Formats/FMG.cs`. Elden Ring uses the DarkSouls3 version
 * (wide = 64-bit offsets). Entries with a null/empty offset are skipped.
 */

export class FmgError extends Data.TaggedError('FmgError')<{
  readonly detail: string;
}> {}

export const parseFmg = (
  data: Uint8Array,
): Effect.Effect<Map<number, string>, FmgError> =>
  Effect.gen(function* () {
    const r = new BinaryReader(data);

    let md5 = false;
    if (r.byteAt(0) !== 0) {
      md5 = true;
      r.skip(16); // skip leading MD5
    }
    r.skip(1); // 0
    const bigEndian = r.bool();
    r.little = !bigEndian;
    const version = r.u8(); // 0 DeS, 1 DS1/2, 2 DS3/BB/ER
    r.skip(1); // 0
    const wide = version === 2;
    r.varintLong = wide;
    if (version !== 0 && version !== 1 && version !== 2) {
      return yield* new FmgError({ detail: `unknown FMG version ${version}` });
    }

    r.skip(4); // file size
    const unicode = r.bool();
    r.skip(3); // 0xFF/0x00, 0, 0
    const groupCount = r.i32();
    r.skip(4); // string count
    if (wide) r.skip(4); // 0xFF

    let stringOffsetsOffset = r.varint();
    if (md5) stringOffsetsOffset += 16;
    r.varint(); // 0

    const map = new Map<number, string>();
    for (let g = 0; g < groupCount; g++) {
      const offsetIndex = r.i32();
      const firstID = r.i32();
      const lastID = r.i32();
      if (wide) r.skip(4); // 0

      r.stepIn(stringOffsetsOffset + offsetIndex * (wide ? 8 : 4));
      for (let j = 0; j <= lastID - firstID; j++) {
        let stringOffset = r.varint();
        if (md5) stringOffset += 16;
        if (stringOffset > 0) {
          const id = firstID + j;
          map.set(
            id,
            unicode ? r.getUTF16(stringOffset) : r.getShiftJIS(stringOffset),
          );
        }
      }
      r.stepOut();
    }
    return map;
  });

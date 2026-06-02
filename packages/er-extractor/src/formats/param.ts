import { Data, Effect } from 'effect';

import { BinaryReader } from './binary-reader.ts';
import type { DefType, Paramdef } from './paramdef.ts';

/**
 * PARAM — From's row-based parameter table (`*.param`). Ported from ER-Save-Lib
 * (`src/regulation/params/{header,row_header}.rs`), Elden Ring variant. We parse
 * the header + row table (id + data/name offsets); interpreting row FIELDS needs
 * the matching PARAMDEF (Paramdex) and is layered on later.
 */

export class ParamError extends Data.TaggedError('ParamError')<{
  readonly detail: string;
}> {}

export interface ParamRow {
  readonly id: number;
  readonly dataOffset: number; // start of this row's field data
  readonly nameOffset: number; // 0 if no row name
}

export interface Param {
  readonly paramType: string; // e.g. "EQUIP_PARAM_WEAPON_ST"
  readonly dataVersion: number; // paramdef data version this row data expects
  readonly little: boolean; // row data endianness
  readonly rows: ParamRow[];
}

export type RowValue = number | string | Uint8Array;

// Format flag bits at header byte 0x2D.
const FLAG_LONG_DATA_OFFSET = 0x04;
const FLAG_OFFSET_PARAM_TYPE = 0x80;

export const parseParam = (bytes: Uint8Array): Effect.Effect<Param, ParamError> =>
  Effect.gen(function* () {
    if (bytes.length < 0x40) {
      return yield* new ParamError({ detail: `PARAM too short (${bytes.length} bytes)` });
    }
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const endByte = bytes[0x2c];
    if (endByte !== 0x00 && endByte !== 0xff) {
      return yield* new ParamError({ detail: `bad endian flag 0x${endByte!.toString(16)} at 0x2C` });
    }
    const little = endByte === 0x00;
    const format2d = bytes[0x2d]!;
    const longOffsets = (format2d & FLAG_LONG_DATA_OFFSET) !== 0;
    const offsetParamType = (format2d & FLAG_OFFSET_PARAM_TYPE) !== 0;
    const dataVersion = dv.getInt16(0x08, little);
    const rowCount = dv.getUint16(0x0a, little);

    // Param type: inline 0x20-byte string at 0x0C, or pointed to by an i64 at 0x10.
    let paramType: string;
    if (offsetParamType) {
      const off = Number(dv.getBigInt64(0x10, little));
      let end = off;
      while (end < bytes.length && bytes[end] !== 0) end++;
      paramType = new TextDecoder('shift_jis').decode(bytes.subarray(off, end));
    } else {
      let end = 0x0c;
      while (end < 0x2c && bytes[end] !== 0) end++;
      paramType = new TextDecoder('latin1').decode(bytes.subarray(0x0c, end));
    }

    const rows: ParamRow[] = new Array(rowCount);
    let p = 0x40;
    for (let i = 0; i < rowCount; i++) {
      const id = dv.getInt32(p, little);
      p += 4;
      let dataOffset: number;
      let nameOffset: number;
      if (longOffsets) {
        p += 4; // padding
        dataOffset = Number(dv.getBigInt64(p, little));
        p += 8;
        nameOffset = Number(dv.getBigInt64(p, little));
        p += 8;
      } else {
        dataOffset = dv.getInt32(p, little);
        p += 4;
        nameOffset = dv.getInt32(p, little);
        p += 4;
      }
      rows[i] = { id, dataOffset, nameOffset };
    }
    return { paramType, dataVersion, little, rows };
  });

// --- Row field decoding (PARAMDEF-driven), ported from SoulsFormats
// PARAM.Row.ReadCells / ParamUtil. ---

const isBitType = (t: DefType): boolean =>
  t === 's8' || t === 'u8' || t === 's16' || t === 'u16' || t === 's32' || t === 'u32' || t === 'dummy8';
const isSignedBit = (t: DefType): boolean => t === 's8' || t === 's16' || t === 's32';
const bitLimitOf = (t: DefType): number =>
  t === 's8' || t === 'u8' || t === 'dummy8' ? 8 : t === 's16' || t === 'u16' ? 16 : 32;

const BIT_VALUE_SIZE = 64n;

/**
 * Decode a single row's field data into a `name → value` map using its PARAMDEF.
 * Handles bit-packed fields, `dummy8` padding (dropped), and fixed strings.
 */
export const decodeRow = (
  paramBytes: Uint8Array,
  dataOffset: number,
  def: Paramdef,
  little: boolean,
): Map<string, RowValue> => {
  const r = new BinaryReader(paramBytes);
  r.little = little;
  r.pos = dataOffset;

  const out = new Map<string, RowValue>();
  let bitOffset = -1;
  let bitLimit = -1;
  let bitValue = 0n;

  for (const field of def.fields) {
    const { type, name, arrayLength, bitSize } = field;
    let value: RowValue | null = null;

    if (type === 'b32') value = r.i32();
    else if (type === 'f32' || type === 'angle32') value = r.f32();
    else if (type === 'f64') value = r.f64();
    else if (type === 'fixstr') value = r.fixStr(arrayLength);
    else if (type === 'fixstrW') value = r.fixStrW(arrayLength * 2);
    else if (isBitType(type) && bitSize === -1) {
      switch (type) {
        case 's8': value = r.i8(); break;
        case 'u8': value = arrayLength > 1 ? r.bytes(arrayLength) : r.u8(); break;
        case 's16': value = r.i16(); break;
        case 'u16': value = r.u16(); break;
        case 's32': value = r.i32(); break;
        case 'u32': value = r.u32(); break;
        case 'dummy8': value = r.bytes(arrayLength); break;
      }
    }

    if (value !== null) {
      bitOffset = -1; // a direct read ends any open bit run
    } else {
      // Packed bitfield (incl. dummy8 bit padding).
      const limit = bitLimitOf(type);
      if (bitOffset === -1 || limit !== bitLimit || bitOffset + bitSize > bitLimit) {
        bitOffset = 0;
        bitLimit = limit;
        bitValue = BigInt(limit === 8 ? r.u8() : limit === 16 ? r.u16() : r.u32());
      }
      const bs = BigInt(bitSize);
      const leftShift = BIT_VALUE_SIZE - bs - BigInt(bitOffset);
      const rightShift = BIT_VALUE_SIZE - bs;
      const shifted = isSignedBit(type)
        ? BigInt.asIntN(64, bitValue << leftShift) >> rightShift
        : BigInt.asUintN(64, bitValue << leftShift) >> rightShift;
      bitOffset += bitSize;
      value = Number(shifted);
    }

    if (type !== 'dummy8') out.set(name, value);
  }
  return out;
};

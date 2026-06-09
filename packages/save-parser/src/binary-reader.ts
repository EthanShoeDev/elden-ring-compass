/**
 * Little-endian cursor over an `ArrayBuffer`, purpose-built for the ER save slot walk.
 * Everything in the save is little-endian and byte-packed (no alignment padding — it
 * mirrors deku's sequential reads in the reference parser), so this only needs sequential
 * reads + skips and a couple of absolute reads for fixed-offset structs (PlayerGameData).
 *
 * The reads are **synchronous** and throw a typed {@link SaveTruncatedError} on overrun.
 * They are deliberately *not* per-read Effects: the slot walk does ~50–80k reads per save,
 * and wrapping each in an `Effect` measured ~120× slower (≈194 ms vs ≈1.6 ms) — slower than
 * the WASM parser the TS port replaced. Instead the reader is exposed as an Effect
 * {@link https://effect.website Context.Service} (so `parse-save.ts` resolves it with
 * `yield* BinaryReader`), and `parseSave` runs the synchronous walk inside a single
 * `Effect.try`, turning any thrown {@link SaveTruncatedError} into a typed failure. That
 * keeps the Effect-native surface (service + tagged errors + Effect entrypoint) at native
 * speed. The per-buffer cursor state is captured in the closure built by
 * {@link makeBinaryReader}.
 *
 * NOTE: the extractor has its own reader (`packages/extractor/src/formats/binary-reader.ts`) and
 * they are deliberately kept separate. That one is build-time tooling over trusted game files: it
 * does no bounds checking, supports configurable endianness + string codecs + a stepIn/stepOut
 * stack, and is a plain mutable class for speed. This one is the opposite — LE-only, strict
 * bounds-checked, typed-failure, Effect-service — because it parses untrusted user save data. The
 * only real overlap is the ~10 trivial numeric reads; sharing would force one package's policy on
 * the other.
 */
import { Context, Schema } from 'effect';

/** Raised when a read or seek would run past the end of the save buffer. */
export class SaveTruncatedError extends Schema.TaggedErrorClass<SaveTruncatedError>()(
  'save-parser/SaveTruncatedError',
  {
    /** Cursor position the read started at. */
    at: Schema.Number,
    /** Number of bytes the read needed. */
    need: Schema.Number,
    /** Total length of the save buffer. */
    length: Schema.Number,
  },
) {}

/** The resolved {@link BinaryReader} service value (its synchronous read surface). */
export interface BinaryReaderApi {
  /** Current cursor position (does not move). */
  pos(): number;
  /** Move the cursor to an absolute position (bounds-checked). */
  seek(pos: number): void;
  /** Advance the cursor by `n` bytes (bounds-checked). */
  skip(n: number): void;

  u8(): number;
  u16(): number;
  u32(): number;
  i32(): number;
  f32(): number;
  /** Reads a u64 and returns it as a decimal string (JS-safe; steam ids overflow Number). */
  u64String(): string;
  /** A 4-byte fixed array (e.g. `MapId`), copied so it detaches from the backing buffer. */
  byteTuple4(): [number, number, number, number];

  /** Absolute u32 read (does not move the cursor) — for fixed-offset struct fields. */
  u32At(absPos: number): number;
  /** Absolute single-byte read (does not move the cursor). */
  byteAt(absPos: number): number;
  /** Absolute zero-copy view of `len` bytes (does not move the cursor) — char name. */
  subarrayAt(absPos: number, len: number): Uint8Array;
  /** A view (zero-copy) over the next `n` bytes — used for the large event-flag bitfield. */
  bytesView(n: number): Uint8Array;
}

/**
 * Effect Context.Service tag for the cursor. Provide a concrete reader for a buffer with
 * `Effect.provideService(BinaryReader, makeBinaryReader(buffer))`.
 */
export class BinaryReader extends Context.Service<
  BinaryReader,
  BinaryReaderApi
>()('save-parser/BinaryReader') {}

/** Builds a {@link BinaryReader} service value backed by a private, mutable cursor over `buffer`. */
export const makeBinaryReader = (buffer: ArrayBuffer): BinaryReaderApi => {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let pos = 0;

  // Reserve `n` bytes at the cursor, advancing it; throw if that runs past the end.
  // Returns the start offset of the reserved span. Used by every sequential read.
  const take = (n: number): number => {
    const at = pos;
    if (at + n > bytes.length) {
      throw new SaveTruncatedError({ at, need: n, length: bytes.length });
    }
    pos = at + n;
    return at;
  };

  // Absolute bounds check that does NOT move the cursor.
  const checkAbs = (absPos: number, n: number): number => {
    if (absPos < 0 || absPos + n > bytes.length) {
      throw new SaveTruncatedError({
        at: absPos,
        need: n,
        length: bytes.length,
      });
    }
    return absPos;
  };

  return {
    pos: () => pos,

    seek: (to) => {
      if (to < 0 || to > bytes.length) {
        throw new SaveTruncatedError({ at: to, need: 0, length: bytes.length });
      }
      pos = to;
    },

    skip: (n) => {
      take(n);
    },

    u8: () => view.getUint8(take(1)),
    u16: () => view.getUint16(take(2), true),
    u32: () => view.getUint32(take(4), true),
    i32: () => view.getInt32(take(4), true),
    f32: () => view.getFloat32(take(4), true),
    u64String: () => view.getBigUint64(take(8), true).toString(),
    byteTuple4: () => {
      const at = take(4);
      return [
        view.getUint8(at),
        view.getUint8(at + 1),
        view.getUint8(at + 2),
        view.getUint8(at + 3),
      ];
    },

    u32At: (absPos) => view.getUint32(checkAbs(absPos, 4), true),
    byteAt: (absPos) => view.getUint8(checkAbs(absPos, 1)),
    subarrayAt: (absPos, len) => {
      checkAbs(absPos, len);
      return bytes.subarray(absPos, absPos + len);
    },
    bytesView: (n) => {
      const at = take(n);
      return bytes.subarray(at, at + n);
    },
  };
};

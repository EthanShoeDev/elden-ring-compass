/**
 * Minimal little-endian cursor over an `ArrayBuffer`, purpose-built for the ER save
 * slot walk. Everything in the save is little-endian and byte-packed (no alignment
 * padding — it mirrors deku's sequential reads in the reference parser), so this only
 * needs sequential reads + skips and a couple of absolute reads for fixed-offset
 * structs (PlayerGameData). Reads are bounds-checked so a truncated/garbage save
 * throws rather than silently reading zeros.
 */
export class BinaryReader {
  readonly view: DataView;
  readonly bytes: Uint8Array;
  pos = 0;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
    this.bytes = new Uint8Array(buffer);
  }

  private ensure(n: number): number {
    const at = this.pos;
    if (at + n > this.bytes.length) {
      throw new RangeError(
        `BinaryReader: read of ${n} byte(s) at ${at} exceeds buffer length ${this.bytes.length}`,
      );
    }
    this.pos = at + n;
    return at;
  }

  seek(pos: number): void {
    if (pos < 0 || pos > this.bytes.length) {
      throw new RangeError(`BinaryReader: seek to ${pos} out of bounds`);
    }
    this.pos = pos;
  }

  skip(n: number): void {
    this.ensure(n);
  }

  u8(): number {
    return this.view.getUint8(this.ensure(1));
  }

  u16(): number {
    return this.view.getUint16(this.ensure(2), true);
  }

  u32(): number {
    return this.view.getUint32(this.ensure(4), true);
  }

  i32(): number {
    return this.view.getInt32(this.ensure(4), true);
  }

  f32(): number {
    return this.view.getFloat32(this.ensure(4), true);
  }

  /** Reads a u64 and returns it as a decimal string (JS-safe; steam ids overflow Number). */
  u64String(): string {
    return this.view.getBigUint64(this.ensure(8), true).toString();
  }

  /** Absolute u32 read (does not move the cursor) — for fixed-offset struct fields. */
  u32At(absPos: number): number {
    if (absPos + 4 > this.bytes.length) {
      throw new RangeError(`BinaryReader: u32At(${absPos}) out of bounds`);
    }
    return this.view.getUint32(absPos, true);
  }

  /** A 4-byte fixed array (e.g. `MapId`), copied so it detaches from the backing buffer. */
  byteTuple4(): [number, number, number, number] {
    const at = this.ensure(4);
    const b = this.bytes;
    return [b[at]!, b[at + 1]!, b[at + 2]!, b[at + 3]!];
  }

  /** A view (zero-copy) over the next `n` bytes — used for the large event-flag bitfield. */
  bytesView(n: number): Uint8Array {
    const at = this.ensure(n);
    return this.bytes.subarray(at, at + n);
  }
}

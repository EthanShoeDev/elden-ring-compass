/**
 * Small endian-aware binary reader for the From formats (BND4/FMG/…). Positions
 * are byte offsets; `stepIn`/`stepOut` save/restore the cursor for jumping to an
 * absolute offset and coming back (mirrors SoulsFormats `BinaryReaderEx`).
 */

/** Reverse the 8 bits of a byte (SoulsFormats `EndianHelper.ReverseBits`). */
export function reverseBits(v: number): number {
  return (
    ((v & 0b0000_0001) << 7) |
    ((v & 0b0000_0010) << 5) |
    ((v & 0b0000_0100) << 3) |
    ((v & 0b0000_1000) << 1) |
    ((v & 0b0001_0000) >> 1) |
    ((v & 0b0010_0000) >> 3) |
    ((v & 0b0100_0000) >> 5) |
    ((v & 0b1000_0000) >> 7)
  );
}

export class BinaryReader {
  pos = 0;
  /** Little-endian when true (set from the format's endian flag). */
  little = true;
  /** When true, `varint()` reads 8 bytes instead of 4 (DS3+/ER FMGs). */
  varintLong = false;
  private readonly dv: DataView;
  private readonly stack: number[] = [];

  constructor(public readonly buf: Uint8Array) {
    this.dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  get length(): number {
    return this.buf.length;
  }

  byteAt(offset: number): number {
    return this.buf[offset]!;
  }

  skip(n: number): void {
    this.pos += n;
  }

  stepIn(offset: number): void {
    this.stack.push(this.pos);
    this.pos = offset;
  }

  stepOut(): void {
    this.pos = this.stack.pop() ?? this.pos;
  }

  u8(): number {
    return this.buf[this.pos++]!;
  }

  i8(): number {
    const v = this.dv.getInt8(this.pos);
    this.pos += 1;
    return v;
  }

  bool(): boolean {
    return this.u8() !== 0;
  }

  u16(): number {
    const v = this.dv.getUint16(this.pos, this.little);
    this.pos += 2;
    return v;
  }

  i16(): number {
    const v = this.dv.getInt16(this.pos, this.little);
    this.pos += 2;
    return v;
  }

  i32(): number {
    const v = this.dv.getInt32(this.pos, this.little);
    this.pos += 4;
    return v;
  }

  u32(): number {
    const v = this.dv.getUint32(this.pos, this.little);
    this.pos += 4;
    return v;
  }

  f32(): number {
    const v = this.dv.getFloat32(this.pos, this.little);
    this.pos += 4;
    return v;
  }

  f64(): number {
    const v = this.dv.getFloat64(this.pos, this.little);
    this.pos += 8;
    return v;
  }

  bytes(n: number): Uint8Array {
    const v = this.buf.subarray(this.pos, this.pos + n);
    this.pos += n;
    return v;
  }

  /** Null-terminated UTF-16 read inline (advances by `byteLen`). */
  fixStrW(byteLen: number): string {
    const raw = this.buf.subarray(this.pos, this.pos + byteLen);
    this.pos += byteLen;
    let end = 0;
    while (end + 1 < raw.length && !(raw[end] === 0 && raw[end + 1] === 0))
      end += 2;
    return new TextDecoder(this.little ? 'utf-16le' : 'utf-16be').decode(
      raw.subarray(0, end),
    );
  }

  /** Null-terminated Shift-JIS read inline (advances by `byteLen`). */
  fixStr(byteLen: number): string {
    const raw = this.buf.subarray(this.pos, this.pos + byteLen);
    this.pos += byteLen;
    let end = 0;
    while (end < raw.length && raw[end] !== 0) end++;
    return new TextDecoder('shift_jis').decode(raw.subarray(0, end));
  }

  i64(): number {
    const v = this.dv.getBigInt64(this.pos, this.little);
    this.pos += 8;
    return Number(v);
  }

  /** Varint: 8 bytes if `varintLong`, else 4. */
  varint(): number {
    return this.varintLong ? this.i64() : this.i32();
  }

  /** Fixed-length ASCII, advancing the cursor by exactly `n`. */
  ascii(n: number): string {
    const s = new TextDecoder('latin1').decode(
      this.buf.subarray(this.pos, this.pos + n),
    );
    this.pos += n;
    return s;
  }

  /** Slice `n` bytes at an absolute offset (does not move cursor). */
  getBytes(offset: number, n: number): Uint8Array {
    return this.buf.subarray(offset, offset + n);
  }

  /** u32 at an absolute offset (does not move cursor). */
  getU32(offset: number): number {
    return this.dv.getUint32(offset, this.little);
  }

  /** i64 at an absolute offset, narrowed to number (does not move cursor). */
  getI64(offset: number): number {
    return Number(this.dv.getBigInt64(offset, this.little));
  }

  /** f32 at an absolute offset (does not move cursor). */
  getF32(offset: number): number {
    return this.dv.getFloat32(offset, this.little);
  }

  /** Null-terminated UTF-16 string at an absolute offset (does not move cursor). */
  getUTF16(offset: number): string {
    let end = offset;
    while (
      end + 1 < this.buf.length &&
      !(this.buf[end] === 0 && this.buf[end + 1] === 0)
    ) {
      end += 2;
    }
    return new TextDecoder(this.little ? 'utf-16le' : 'utf-16be').decode(
      this.buf.subarray(offset, end),
    );
  }

  /** Null-terminated Shift-JIS string at an absolute offset (does not move cursor). */
  getShiftJIS(offset: number): string {
    let end = offset;
    while (end < this.buf.length && this.buf[end] !== 0) end++;
    return new TextDecoder('shift_jis').decode(this.buf.subarray(offset, end));
  }
}

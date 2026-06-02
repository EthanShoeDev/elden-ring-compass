import { createDecipheriv } from 'node:crypto';

/**
 * BHD5 — the header format of From's dvdbnd (split `.bhd`/`.bdt`) archives.
 * Ported from SoulsFormatsNEXT `Formats/BHD5.cs` (EldenRing branch). The input
 * must already be DECRYPTED (see ../crypto/rsa.ts) — it starts with `BHD5`.
 *
 * Filenames are not stored, only a 64-bit path hash (see ./path-hash.ts). The
 * per-file AES key + encrypted byte ranges live INSIDE this header, so nothing
 * AES-related is an external constant.
 */

export interface AesInfo {
  readonly key: Uint8Array; // 16 bytes (AES-128)
  readonly ranges: ReadonlyArray<readonly [start: number, end: number]>;
}

export interface Bhd5FileHeader {
  readonly hash: bigint;
  readonly paddedSize: number; // size of the data slab in the .bdt
  readonly unpaddedSize: number; // real size after decryption (-1 if unknown)
  readonly offset: number; // start of file data in the .bdt
  readonly aes?: AesInfo;
}

// Minimal little-endian binary reader.
class Reader {
  pos = 0;
  private dv: DataView;
  constructor(public buf: Uint8Array) {
    this.dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  ascii(n: number): string {
    const s = new TextDecoder().decode(
      this.buf.subarray(this.pos, this.pos + n),
    );
    this.pos += n;
    return s;
  }
  u8(): number {
    return this.buf[this.pos++]!;
  }
  i32(): number {
    const v = this.dv.getInt32(this.pos, true);
    this.pos += 4;
    return v;
  }
  i64(): bigint {
    const v = this.dv.getBigInt64(this.pos, true);
    this.pos += 8;
    return v;
  }
  u64(): bigint {
    const v = this.dv.getBigUint64(this.pos, true);
    this.pos += 8;
    return v;
  }
}

/** Parse a decrypted Elden Ring BHD5 header into its flat list of file entries. */
export function parseBhd5(buf: Uint8Array): Bhd5FileHeader[] {
  const r = new Reader(buf);
  if (r.ascii(4) !== 'BHD5') {
    throw new Error(
      'not a BHD5 header (bad magic — wrong key or not decrypted?)',
    );
  }
  r.u8(); // 0 or -1 endian flag (ER is little-endian)
  r.u8(); // Unk05
  r.u8();
  r.u8(); // padding
  r.i32(); // == 1
  r.i32(); // file size

  // 64-bit field detection (BHD5.cs): peek the two int32s at 0x14 + 0x1C.
  const save = r.pos;
  r.pos = 0x14;
  const test0 = r.i32();
  r.i32();
  const test1 = r.i32();
  r.pos = save;
  const is64 = test0 === 0 && test1 === 0;

  const bucketCount = is64 ? Number(r.i64()) : r.i32();
  const bucketsOffset = is64 ? Number(r.i64()) : r.i32();
  const saltLen = r.i32();
  r.ascii(saltLen); // salt (unused here)

  // Bucket directory.
  r.pos = bucketsOffset;
  const buckets: Array<readonly [count: number, offset: number]> = [];
  for (let i = 0; i < bucketCount; i++) {
    const count = r.i32();
    if (is64) r.i32(); // == 1
    const off = is64 ? Number(r.i64()) : r.i32();
    buckets.push([count, off]);
  }

  const entries: Bhd5FileHeader[] = [];
  for (const [count, off] of buckets) {
    r.pos = off;
    for (let i = 0; i < count; i++) {
      const hash = r.u64();
      const paddedSize = r.i32();
      const unpaddedSize = r.i32();
      const offset = Number(r.i64());
      r.i64(); // shaHashOffset (unused)
      const aesOff = Number(r.i64());
      let aes: AesInfo | undefined;
      if (aesOff !== 0) {
        const back = r.pos;
        r.pos = aesOff;
        const key = r.buf.slice(r.pos, r.pos + 16);
        r.pos += 16;
        const rangeCount = r.i32();
        const ranges: Array<readonly [number, number]> = [];
        for (let j = 0; j < rangeCount; j++) {
          ranges.push([Number(r.i64()), Number(r.i64())]);
        }
        aes = { key, ranges };
        r.pos = back;
      }
      entries.push({ hash, paddedSize, unpaddedSize, offset, aes });
    }
  }
  return entries;
}

/**
 * Decrypt the AES-encrypted byte ranges of a file slab in place
 * (AES-128-ECB, no padding — BHD5.cs `AESKey.Decrypt`).
 */
export function decryptAesRanges(bytes: Uint8Array, aes: AesInfo): void {
  for (const [start, end] of aes.ranges) {
    if (start === -1 || end === -1 || start === end) continue;
    const len = end - start;
    const decipher = createDecipheriv('aes-128-ecb', aes.key, null);
    decipher.setAutoPadding(false);
    const dec = Buffer.concat([
      decipher.update(bytes.subarray(start, start + len)),
      decipher.final(),
    ]);
    bytes.set(dec, start);
  }
}

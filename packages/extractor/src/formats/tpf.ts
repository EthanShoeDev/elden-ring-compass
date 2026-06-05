import { Data, Effect } from 'effect';

/**
 * TPF — From's texture container (`*.tpf`, usually inside `*.tpf.dcx`). On PC
 * each entry's bytes are a standalone DDS file, so parsing reduces to reading
 * the per-texture header table and slicing out each DDS. Ported from
 * SoulsFormatsNEXT `Formats/TPF/TPF.cs` (PC/`TPFPlatform.PC` path only — the
 * console layouts carry an extra TexHeader block we don't need).
 */

export class TpfError extends Data.TaggedError('TpfError')<{
  readonly detail: string;
}> {}

export interface TpfTexture {
  readonly name: string;
  readonly format: number; // TPF format byte (DXGI hint; the DDS carries the real one)
  readonly dds: Uint8Array; // standalone DDS file bytes
}

export const parseTpf = (
  data: Uint8Array,
): Effect.Effect<TpfTexture[], TpfError> =>
  Effect.try({
    try: () => readTpf(data),
    catch: (cause) => new TpfError({ detail: String(cause) }),
  });

function readTpf(data: Uint8Array): TpfTexture[] {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (new TextDecoder('latin1').decode(data.subarray(0, 4)) !== 'TPF\0') {
    throw new Error('not a TPF (bad magic)');
  }
  const platform = dv.getUint8(0xc);
  if (platform !== 0)
    throw new Error(`only PC TPFs supported (platform=${platform})`);
  const fileCount = dv.getInt32(8, true);
  const encoding = dv.getUint8(0xe);

  const textures: TpfTexture[] = [];
  let p = 0x10;
  for (let i = 0; i < fileCount; i++) {
    const fileOffset = dv.getUint32(p, true);
    const fileSize = dv.getInt32(p + 4, true);
    const format = dv.getUint8(p + 8);
    const flags1 = dv.getUint8(p + 0x0b);
    p += 12; // fileOffset(4) + fileSize(4) + format(1) + type(1) + mips(1) + flags1(1)
    const nameOffset = dv.getUint32(p, true);
    const hasFloatStruct = dv.getInt32(p + 4, true) === 1;
    p += 8;
    if (hasFloatStruct) {
      const len = dv.getInt32(p + 4, true); // Unk00(4) + length(4) + floats
      p += 8 + len;
    }
    if (flags1 === 2 || flags1 === 3) {
      // DCP_EDGE-compressed inner texture; not seen on ER PC. Skip rather than
      // emit a corrupt DDS.
      continue;
    }
    const dds = data.subarray(fileOffset, fileOffset + fileSize);
    let end = nameOffset;
    if (encoding === 1) {
      while (end + 1 < data.length && !(data[end] === 0 && data[end + 1] === 0))
        end += 2;
    } else {
      while (end < data.length && data[end] !== 0) end++;
    }
    const name = new TextDecoder(
      encoding === 1 ? 'utf-16le' : 'shift_jis',
    ).decode(data.subarray(nameOffset, end));
    textures.push({ name, format, dds });
  }
  return textures;
}

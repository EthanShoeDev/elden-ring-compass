import { dlopen, FFIType, ptr, toArrayBuffer } from 'bun:ffi';
import { Data, Effect } from 'effect';

/**
 * BCn DDS → PNG via the `er-image-codec` Rust cdylib (bun:ffi, same pattern as
 * Oodle). Bun has no native image codec and the ER textures are mostly BC7, so
 * decoding + PNG encoding happen in Rust (`image_dds` + `image`); see
 * `packages/extractor/native/image-codec`. Build it with `bun run build:image-codec`.
 */

export class ImageCodecError extends Data.TaggedError('ImageCodecError')<{
  readonly detail: string;
}> {}

// Resolved relative to this module so it's independent of the process cwd:
// packages/extractor/src/external → packages/extractor/native/image-codec/target/release.
const DLL_URL = new URL(
  '../../native/image-codec/target/release/er_image_codec.dll',
  import.meta.url,
);

const open = (dllPath: string) =>
  dlopen(dllPath, {
    dds_to_png: {
      args: [FFIType.ptr, FFIType.u64, FFIType.ptr],
      returns: FFIType.ptr,
    },
    free_buf: { args: [FFIType.ptr, FFIType.u64], returns: FFIType.void },
  });

let symbols: ReturnType<typeof open>['symbols'] | null = null;
const loadSymbols = (): ReturnType<typeof open>['symbols'] => {
  if (!symbols) symbols = open(Bun.fileURLToPath(DLL_URL)).symbols;
  return symbols;
};

/** Decode a standalone DDS buffer (BC1/BC7/…) to PNG bytes. */
export const ddsToPng = (
  dds: Uint8Array,
): Effect.Effect<Uint8Array, ImageCodecError> =>
  Effect.try({
    try: () => {
      const sym = loadSymbols();
      const outLen = new BigUint64Array(1);
      const resultPtr = sym.dds_to_png(
        ptr(dds),
        BigInt(dds.length),
        ptr(outLen),
      );
      const len = Number(outLen[0]);
      if (!resultPtr || len === 0)
        throw new Error('decode returned empty (unsupported format?)');
      // Copy out of Rust-owned memory before freeing it.
      const png = new Uint8Array(toArrayBuffer(resultPtr, 0, len)).slice();
      sym.free_buf(resultPtr, BigInt(len));
      return png;
    },
    catch: (cause) =>
      new ImageCodecError({ detail: `dds_to_png failed: ${String(cause)}` }),
  });

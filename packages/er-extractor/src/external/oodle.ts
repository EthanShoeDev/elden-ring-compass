import { Data, Effect } from 'effect';

export class OodleNotImplemented extends Data.TaggedError(
  'OodleNotImplemented',
)<{
  readonly detail: string;
}> {}

/**
 * Decompress an Oodle/Kraken (`DCX_KRAK`) buffer — used by Elden Ring's
 * `msg`/`tpf`/`msb`/`emevd` files. `regulation.bin` is `DCX_ZSTD` and does NOT
 * go through here.
 *
 * DECISION: load the game's own `oo2core_*_win64.dll`, matching soulstruct and
 * WitchyBND. Because `bun:ffi` loads host-OS libraries, **the extractor runs on
 * native Windows** — a Windows DLL cannot be `dlopen`'d from WSL/Linux. (An
 * `ooz`→wasm decoder would lift that restriction; parked as a future option.)
 *
 * Planned implementation (Phase 1 spike): load `oo2core_9_win64.dll` (which
 * ships in the install dir) via `bun:ffi` and call `OodleLZ_Decompress`, e.g.:
 *
 * ```ts
 * import { dlopen, FFIType, ptr } from 'bun:ffi';
 * const { symbols } = dlopen(oo2corePath, {
 *   OodleLZ_Decompress: {
 *     args: [FFIType.ptr, FFIType.i64, FFIType.ptr, FFIType.i64,
 *            FFIType.i32, FFIType.i32, FFIType.i64, FFIType.ptr, FFIType.i64,
 *            FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.i64, FFIType.i32],
 *     returns: FFIType.i64,
 *   },
 * });
 * ```
 */
export const oodleDecompress = (
  _compressed: Uint8Array,
  _rawSize: number,
  _oo2corePath: string,
): Effect.Effect<Uint8Array, OodleNotImplemented> =>
  Effect.fail(
    new OodleNotImplemented({
      detail: 'Oodle decompression is the Phase 1 spike — see plan §5/§9.',
    }),
  );

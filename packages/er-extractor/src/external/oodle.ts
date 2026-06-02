import { dlopen, FFIType, ptr } from 'bun:ffi';
import { Data, Effect } from 'effect';

export class OodleError extends Data.TaggedError('OodleError')<{
  readonly detail: string;
}> {}

/**
 * Decompress an Oodle/Kraken (`DCX_KRAK`) buffer — used by Elden Ring's
 * `msg`/`tpf`/`msb`/`emevd` files. `regulation.bin` is `DCX_ZSTD` and does NOT
 * go through here.
 *
 * DECISION (plan §5): load the game's own `oo2core_*_win64.dll`, matching
 * soulstruct and WitchyBND. Because `bun:ffi` loads host-OS libraries, **the
 * extractor runs on native Windows** — a Windows DLL cannot be `dlopen`'d from
 * WSL/Linux. (An `ooz`→wasm decoder would lift that restriction; parked.)
 *
 * Phase 1a feasibility gate: PROVEN — `bun:ffi` loads `oo2core_6_win64.dll` and
 * runs a Kraken compress→decompress roundtrip (see `spike/oodle-spike.ts`).
 */

/**
 * Locate the game's `oo2core_*_win64.dll` in the install dir (version varies by
 * game: ER ships v6). Returns the absolute path.
 */
export const findOodleDll = (gameRoot: string): Effect.Effect<string, OodleError> =>
  Effect.tryPromise({
    try: async () => {
      const glob = new Bun.Glob('oo2core_*_win64.dll');
      for await (const rel of glob.scan(gameRoot)) return `${gameRoot}/${rel}`;
      throw new Error(`no oo2core_*_win64.dll in ${gameRoot}`);
    },
    catch: (cause) => new OodleError({ detail: `locating Oodle DLL: ${String(cause)}` }),
  });

// Oodle enum values (oodle2.h), matching soulstruct's ctypes wrapper.
const OodleLZ_FuzzSafe_Yes = 1;
const OodleLZ_CheckCRC_No = 0;
const OodleLZ_Verbosity_None = 0;
const OodleLZ_Decode_Unthreaded = 3; // == OodleLZ_Decode_ThreadPhaseAll

// SINTa (intptr) params are i64; the game files are well under 2 GB but the x64
// ABI passes these in 64-bit registers, so model them faithfully.
const openOodle = (dllPath: string) =>
  dlopen(dllPath, {
    OodleLZ_Decompress: {
      args: [
        FFIType.ptr, // compBuf
        FFIType.i64, // compBufSize
        FFIType.ptr, // rawBuf (output)
        FFIType.i64, // rawLen (known uncompressed size)
        FFIType.i32, // fuzzSafe
        FFIType.i32, // checkCRC
        FFIType.i32, // verbosity
        FFIType.ptr, // decBufBase (NULL)
        FFIType.i64, // decBufSize
        FFIType.ptr, // fpCallback (NULL)
        FFIType.ptr, // callbackUserData (NULL)
        FFIType.ptr, // decoderMemory (NULL)
        FFIType.i64, // decoderMemorySize
        FFIType.i32, // threadPhase
      ],
      returns: FFIType.i64,
    },
  });

// Memoize the loaded DLL per path — `dlopen` is expensive and the symbols are
// stateless, so reopening per call would be wasteful.
const cache = new Map<string, ReturnType<typeof openOodle>['symbols']>();

const loadSymbols = (dllPath: string) => {
  let symbols = cache.get(dllPath);
  if (!symbols) {
    symbols = openOodle(dllPath).symbols;
    cache.set(dllPath, symbols);
  }
  return symbols;
};

/**
 * Decompress a Kraken-compressed buffer.
 *
 * @param compressed  the raw `DCX_KRAK` payload (sans DCX header)
 * @param rawSize     the uncompressed size (from the DCX header)
 * @param oo2corePath absolute path to `oo2core_*_win64.dll` (ships in the install dir)
 */
export const oodleDecompress = (
  compressed: Uint8Array,
  rawSize: number,
  oo2corePath: string,
): Effect.Effect<Uint8Array, OodleError> =>
  Effect.try({
    try: () => {
      const symbols = loadSymbols(oo2corePath);
      const out = new Uint8Array(rawSize);
      const written = Number(
        symbols.OodleLZ_Decompress(
          ptr(compressed),
          BigInt(compressed.length),
          ptr(out),
          BigInt(rawSize),
          OodleLZ_FuzzSafe_Yes,
          OodleLZ_CheckCRC_No,
          OodleLZ_Verbosity_None,
          null,
          0n,
          null,
          null,
          null,
          0n,
          OodleLZ_Decode_Unthreaded,
        ),
      );
      if (written !== rawSize) {
        throw new Error(
          `OodleLZ_Decompress wrote ${written} bytes, expected ${rawSize}`,
        );
      }
      return out;
    },
    catch: (cause) =>
      new OodleError({
        detail: `Oodle decompression failed (dll=${oo2corePath}): ${String(cause)}`,
      }),
  });

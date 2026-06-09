import { Effect, FileSystem } from 'effect';

/**
 * Reads the game version from `eldenring.exe`'s PE version resource.
 *
 * Rather than fully parse the PE/`.rsrc` tree, we scan for the
 * `VS_FIXEDFILEINFO` signature (`0xFEEF04BD`) and read the file-version dwords
 * that immediately follow it (`dwFileVersionMS` at +8, `dwFileVersionLS` at
 * +12). This is stable across Steam's DRM wrapper — the version resource sits
 * in the PE header data, which the wrapper leaves intact. Returns e.g.
 * `"1.16.0.0"`, or `null` if the exe or signature can't be found (modded
 * installs, renamed exe), in which case the dataset records an unknown version
 * rather than failing the whole extraction.
 */
export const loadGameVersion = (
  gameRoot: string,
): Effect.Effect<string | null, never, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const exePath = `${gameRoot}/eldenring.exe`;
    const exists = yield* fs
      .exists(exePath)
      .pipe(Effect.orElseSucceed(() => false));
    if (!exists) {
      yield* Effect.logWarning(
        `game-version: ${exePath} not found; version will be unknown`,
      );
      return null;
    }
    const bytes = yield* fs
      .readFile(exePath)
      .pipe(Effect.orElseSucceed(() => new Uint8Array(0)));
    if (bytes.length === 0) {
      yield* Effect.logWarning('game-version: could not read eldenring.exe');
      return null;
    }

    // Find the VS_FIXEDFILEINFO signature 0xFEEF04BD (little-endian on disk).
    const SIG = [0xbd, 0x04, 0xef, 0xfe];
    let sigAt = -1;
    for (let i = 0; i + 4 <= bytes.length; i++) {
      if (
        bytes[i] === SIG[0] &&
        bytes[i + 1] === SIG[1] &&
        bytes[i + 2] === SIG[2] &&
        bytes[i + 3] === SIG[3]
      ) {
        sigAt = i;
        break;
      }
    }
    if (sigAt === -1 || sigAt + 16 > bytes.length) {
      yield* Effect.logWarning(
        'game-version: VS_FIXEDFILEINFO signature not found in eldenring.exe',
      );
      return null;
    }

    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const ms = dv.getUint32(sigAt + 8, true);
    const ls = dv.getUint32(sigAt + 12, true);
    const version = `${ms >>> 16}.${ms & 0xffff}.${ls >>> 16}.${ls & 0xffff}`;
    yield* Effect.logInfo(`game-version: ${version}`);
    return version;
  });

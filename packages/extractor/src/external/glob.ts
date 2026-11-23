import { Array as Arr, Effect, FileSystem } from 'effect';
import type { PlatformError } from 'effect';

/**
 * Paths under `root` matching `pattern` (effect `FileSystem.glob`), joined back
 * onto `root` so callers get openable paths. `glob` visits each directory's
 * entries sorted by name, so single-directory patterns come back sorted.
 */
export const globSorted = <E>(
  pattern: string,
  root: string,
  onError: (cause: PlatformError.PlatformError) => E,
  options: { readonly exclude?: ReadonlyArray<string> } = {},
): Effect.Effect<Array<string>, E, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* fs
      .glob(pattern, { root, exclude: options.exclude })
      .pipe(Effect.mapError(onError));
    return Arr.map(paths, (path) => `${root}/${path}`);
  });

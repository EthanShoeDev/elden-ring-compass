import { Effect, Stream } from 'effect';

/**
 * Absolute paths under `cwd` matching `pattern`, sorted. Effect `FileSystem`
 * only lists and watches directories, so the scan stays on `Bun.Glob`; its
 * async iterator is lifted into a Stream rather than an `async` loop.
 */
export const globSorted = <E>(
  pattern: string,
  cwd: string,
  onError: (cause: unknown) => E,
): Effect.Effect<string[], E> =>
  Stream.fromAsyncIterable(
    new Bun.Glob(pattern).scan({ cwd, absolute: true }),
    onError,
  ).pipe(
    Stream.runCollect,
    Effect.map((paths) => paths.toSorted()),
  );

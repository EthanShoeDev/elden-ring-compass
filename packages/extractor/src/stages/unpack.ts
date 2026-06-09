import { Data, Effect } from 'effect';

import { unpackInstall } from '../archive/dvdbnd.ts';
import { PipelineContext } from '../domain/context.ts';

export class UnpackError extends Data.TaggedError('UnpackError')<{
  readonly detail: string;
}> {}

/**
 * Stage 1 — locate & unpack. Unpacks the encrypted dvdbnd archives
 * (`Data0-3`/`DLC`/`sd`) into the game dir, mirroring UXM's Selective Unpacker
 * (see ../archive/dvdbnd.ts). Idempotent: already-extracted files are skipped
 * and reported; `--clean` forces a fresh re-extract. `regulation.bin` is loose
 * and handled later by the params stage.
 */
export const unpack = Effect.gen(function* () {
  const ctx = yield* PipelineContext;
  yield* Effect.logInfo(
    `dvdbnd → ${ctx.gameRoot}${ctx.clean ? ' (--clean)' : ''}`,
  );
  // The unpacker is Effect-native: it logs via `Effect.logInfo` directly (the
  // `stage` annotation set in pipeline.ts flows through the surrounding context).
  const summary = yield* unpackInstall({
    gameRoot: ctx.gameRoot,
    clean: ctx.clean,
  }).pipe(
    Effect.mapError((cause) => new UnpackError({ detail: String(cause) })),
  );
  if (summary.extracted === 0 && summary.unknown === 0) {
    yield* Effect.logInfo(
      `nothing to do — ${summary.skipped} files already extracted` +
        ` (use --clean to re-extract)`,
    );
  } else {
    yield* Effect.logInfo(
      `done — extracted ${summary.extracted}, skipped ${summary.skipped}` +
        ` already-present, ${summary.unknown} unknown`,
    );
  }
});

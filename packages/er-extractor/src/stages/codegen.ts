import { Effect } from 'effect';

import { PipelineContext } from '../domain/context.ts';

/**
 * Stage 8 — codegen. Deterministically write the site's data files:
 * `apps/web/src/lib/elden-ring-raw-db/*.ts`, `map-db.ts`, and the save-parser's
 * `packages/elden-ring-save-parser/src/db/*.rs`. The single source of truth.
 *
 * We might change the output format up some. The files there now are from the erdb project and we might can streamline and make things easier for the client to consume
 */
export const codegen = Effect.gen(function* () {
  const ctx = yield* PipelineContext;
  yield* Effect.logInfo(
    `TODO: emit raw-db .ts + parser .rs from ${ctx.outDir}`,
  );
});

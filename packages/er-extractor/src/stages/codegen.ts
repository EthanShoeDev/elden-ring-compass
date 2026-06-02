import { Effect } from 'effect';

import type { PipelineContext } from '../domain/context.ts';

/**
 * Stage 8 — codegen. Deterministically write the site's data files:
 * `apps/web/src/lib/elden-ring-raw-db/*.ts`, `map-db.ts`, and the save-parser's
 * `packages/elden-ring-save-parser/src/db/*.rs`. The single source of truth.
 */
export const codegen = (ctx: PipelineContext) =>
  Effect.logInfo(
    `[8/8 codegen] TODO: emit raw-db .ts + parser .rs from ${ctx.outDir}`,
  );

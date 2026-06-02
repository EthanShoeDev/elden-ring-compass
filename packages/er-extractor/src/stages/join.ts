import { Effect } from 'effect';

import type { PipelineContext } from '../domain/context.ts';

/**
 * Stage 4 — join. Combine param rows ⨝ FMG text into item/equipment records
 * (base + DLC together), the shape the site's raw-db consumes.
 */
export const join = (_ctx: PipelineContext) =>
  Effect.logInfo('[4/8 join] TODO: params ⨝ text → item/equipment records');

import { Effect } from 'effect';

import type { PipelineContext } from '../domain/context.ts';

/**
 * Stage 3 — text (FMG). Extract weapon/protector/goods/accessory/arts/place
 * names + captions (base + `_dlc01`) as id → string maps.
 */
export const text = (_ctx: PipelineContext) =>
  Effect.logInfo('[3/8 text] TODO: parse FMGs → id→name maps (incl. _dlc01)');

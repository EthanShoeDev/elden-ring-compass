import { Effect } from 'effect';

import type { PipelineContext } from '../domain/context.ts';

/**
 * Stage 7 — images. Extract DLC item-icon atlases + the Land of Shadow map
 * image (TPF → DDS → PNG/JPEG, e.g. via `sharp`) into assets/erdb/.
 */
export const images = (_ctx: PipelineContext) =>
  Effect.logInfo(
    '[7/8 images] TODO: TPF→DDS→PNG icons + Land of Shadow map image',
  );

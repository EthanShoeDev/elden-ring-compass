import { Effect } from 'effect';

import type { PipelineContext } from '../domain/context.ts';

/**
 * Stage 2 — params. Parse regulation BND4 → EquipParamWeapon/Protector/Goods/
 * Accessory/Gem, BonfireWarpParam (graces), WorldMapPoint. Rows keyed by id.
 */
export const params = (_ctx: PipelineContext) =>
  Effect.logInfo(
    '[2/8 params] TODO: parse regulation params (EquipParam*, BonfireWarpParam, …)',
  );

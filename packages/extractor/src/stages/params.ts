import { Effect } from 'effect';

import { PipelineContext } from '../domain/context.ts';
import { findOodleDll } from '../external/oodle.ts';
import { parseParam } from '../formats/param.ts';
import { loadRegulationParams } from '../game/regulation.ts';

/**
 * Stage 2 — params. Decrypt/decompress `regulation.bin` → param files
 * (EquipParamWeapon/Protector/Goods/Accessory/Gem, BonfireWarpParam, …).
 * Returns the `name → bytes` map for downstream stages (join, flags).
 */
export const params = Effect.gen(function* () {
  const ctx = yield* PipelineContext;
  const oo2core = yield* findOodleDll(ctx.gameRoot);
  const paramFiles = yield* loadRegulationParams(ctx.gameRoot, oo2core);

  // Phase 1(c) proof: a DLC weapon (Milady, id 67500000) has an EquipParamWeapon row.
  const weaponBytes = paramFiles.get('EquipParamWeapon');
  if (weaponBytes) {
    const weapon = yield* parseParam(weaponBytes);
    const hasMilady = weapon.rows.some((r) => r.id === 67500000);
    yield* Effect.logInfo(
      `regulation: ${paramFiles.size} params; EquipParamWeapon "${weapon.paramType}" ` +
        `${weapon.rows.length} rows; DLC row 67500000: ${hasMilady ? 'present' : 'missing'}`,
    );
  } else {
    yield* Effect.logInfo(
      `regulation: ${paramFiles.size} params (EquipParamWeapon not found)`,
    );
  }
  return paramFiles;
});

import { Effect } from 'effect';

import { decodeRow, parseParam, type RowValue } from '../formats/param.ts';
import { loadParamdef } from '../formats/paramdef.ts';
import type { ItemText } from '../game/item-text.ts';

export interface WeaponRecord {
  readonly id: number;
  readonly name: string;
  readonly weight: number;
  readonly attackPhysical: number;
  readonly reqStrength: number;
  readonly reqDexterity: number;
  readonly reqIntelligence: number;
  readonly reqFaith: number;
  readonly reqArcane: number;
}

const num = (row: Map<string, RowValue>, key: string): number => {
  const v = row.get(key);
  return typeof v === 'number' ? v : 0;
};

/**
 * Stage 4 — join. Pairs `EquipParamWeapon` rows ⨝ `WeaponName` FMG and decodes
 * the stat fields (via the vendored PARAMDEF) into the records the site's raw-db
 * consumes — base + DLC together. Consumes the prior stages' outputs (param files
 * from `params`, name tables from `text`) rather than re-loading.
 */
export const join = (paramFiles: Map<string, Uint8Array>, names: ItemText) =>
  Effect.gen(function* () {
    const weaponBytes = paramFiles.get('EquipParamWeapon');
    if (!weaponBytes) {
      yield* Effect.logInfo('no EquipParamWeapon param; skipping weapon join');
      return [] as WeaponRecord[];
    }
    const param = yield* parseParam(weaponBytes);
    const def = yield* loadParamdef('EquipParamWeapon');
    if (def.dataVersion !== param.dataVersion) {
      // A game patch may have moved past our vendored Paramdex — fields could be
      // misaligned. Run `bun run update-paramdex` (plan §7: log curated boundaries).
      yield* Effect.logWarning(
        `paramdef drift: EquipParamWeapon def v${def.dataVersion} vs regulation v${param.dataVersion}` +
          ` — decoded stats may be wrong; refresh Paramdex (bun run update-paramdex)`,
      );
    }
    const rowsById = new Map(param.rows.map((r) => [r.id, r]));

    const records: WeaponRecord[] = [];
    for (const [id, name] of names.WeaponName) {
      const row = rowsById.get(id);
      if (!row || name.trim().length === 0 || name === '[ERROR]') continue;
      const f = decodeRow(weaponBytes, row.dataOffset, def, param.little);
      records.push({
        id,
        name,
        weight: num(f, 'weight'),
        attackPhysical: num(f, 'attackBasePhysics'),
        reqStrength: num(f, 'properStrength'),
        reqDexterity: num(f, 'properAgility'),
        reqIntelligence: num(f, 'properMagic'),
        reqFaith: num(f, 'properFaith'),
        reqArcane: num(f, 'properLuck'),
      });
    }

    yield* Effect.logInfo(`joined ${records.length} weapons (name ⨝ EquipParamWeapon, stats decoded)`);
    const milady = records.find((r) => r.id === 67500000);
    yield* Effect.logInfo(
      milady
        ? `DLC sample — ${milady.id} ${milady.name}: wt ${milady.weight}, phys ${milady.attackPhysical}, ` +
            `req Str ${milady.reqStrength}/Dex ${milady.reqDexterity}`
        : 'Milady not joined',
    );
    return records;
  });

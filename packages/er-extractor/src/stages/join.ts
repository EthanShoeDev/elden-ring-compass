import { Effect } from 'effect';

import {
  decodeRow,
  type ParamError,
  parseParam,
  type RowValue,
} from '../formats/param.ts';
import { loadParamdef, type ParamdefError } from '../formats/paramdef.ts';
import type { ItemText } from '../game/item-text.ts';

/**
 * Stage 4 — join. Pairs equipment PARAM rows ⨝ their name FMG and decodes the
 * stat fields (via the vendored PARAMDEF) into the records the site consumes —
 * base + DLC together. Consumes the prior stages' outputs (param files from
 * `params`, name tables from `text`) rather than re-loading. Categories whose
 * "stats" are SpEffect-driven (talismans, goods, ashes of war) are emitted as
 * name-only tables by codegen and aren't decoded here.
 */

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

export interface ArmorRecord {
  readonly id: number;
  readonly name: string;
  readonly weight: number;
  // Damage negation %, as the game displays it (ER stores 0 in the legacy
  // defense* fields; negation comes from the *DamageCutRate floats).
  readonly negationPhysical: number;
  readonly negationStrike: number;
  readonly negationSlash: number;
  readonly negationPierce: number;
  readonly negationMagic: number;
  readonly negationFire: number;
  readonly negationLightning: number;
  readonly negationHoly: number;
  // Resistance points (the displayed status-buildup defenses).
  readonly resistPoison: number;
  readonly resistScarletRot: number;
  readonly resistBleed: number;
  readonly resistFrost: number;
  readonly resistSleep: number;
  readonly resistMadness: number;
  readonly resistDeath: number;
  readonly poise: number;
}

export interface EquipmentTables {
  readonly weapons: WeaponRecord[];
  readonly armor: ArmorRecord[];
}

type Row = Map<string, RowValue>;
const num = (row: Row, key: string): number => {
  const v = row.get(key);
  return typeof v === 'number' ? v : 0;
};

/**
 * Decode one equipment category: every named row of `nameTable` whose id has a
 * PARAM row gets its fields decoded and mapped to a record via `build`. Warns on
 * paramdef-vs-regulation dataVersion drift (a patch outran our vendored Paramdex).
 */
const decodeCategory = <T>(
  paramFiles: Map<string, Uint8Array>,
  paramName: string,
  nameTable: Map<number, string>,
  build: (id: number, name: string, row: Row) => T,
): Effect.Effect<T[], ParamError | ParamdefError> =>
  Effect.gen(function* () {
    const bytes = paramFiles.get(paramName);
    if (!bytes) {
      yield* Effect.logWarning(`no ${paramName} param; skipping`);
      return [];
    }
    const param = yield* parseParam(bytes);
    const def = yield* loadParamdef(paramName);
    if (def.dataVersion !== param.dataVersion) {
      yield* Effect.logWarning(
        `paramdef drift: ${paramName} def v${def.dataVersion} vs regulation v${param.dataVersion}` +
          ` — decoded stats may be wrong; refresh Paramdex (bun run update-paramdex)`,
      );
    }
    const rowsById = new Map(param.rows.map((r) => [r.id, r]));
    const out: T[] = [];
    for (const [id, name] of nameTable) {
      const row = rowsById.get(id);
      if (!row || name.trim().length === 0 || name === '[ERROR]') continue;
      out.push(
        build(id, name, decodeRow(bytes, row.dataOffset, def, param.little)),
      );
    }
    return out;
  });

export const join = (
  paramFiles: Map<string, Uint8Array>,
  names: ItemText,
): Effect.Effect<EquipmentTables, ParamError | ParamdefError> =>
  Effect.gen(function* () {
    const weapons = yield* decodeCategory(
      paramFiles,
      'EquipParamWeapon',
      names.WeaponName,
      (id, name, f) => ({
        id,
        name,
        weight: num(f, 'weight'),
        attackPhysical: num(f, 'attackBasePhysics'),
        reqStrength: num(f, 'properStrength'),
        reqDexterity: num(f, 'properAgility'),
        reqIntelligence: num(f, 'properMagic'),
        reqFaith: num(f, 'properFaith'),
        reqArcane: num(f, 'properLuck'),
      }),
    );

    // Negation % = (1 - cutRate) * 100, rounded to 1 dp (the game's display).
    const neg = (f: Row, key: string) =>
      Math.round((1 - num(f, key)) * 1000) / 10;
    const armor = yield* decodeCategory(
      paramFiles,
      'EquipParamProtector',
      names.ProtectorName,
      (id, name, f) => ({
        id,
        name,
        weight: num(f, 'weight'),
        negationPhysical: neg(f, 'neutralDamageCutRate'),
        negationStrike: neg(f, 'blowDamageCutRate'),
        negationSlash: neg(f, 'slashDamageCutRate'),
        negationPierce: neg(f, 'thrustDamageCutRate'),
        negationMagic: neg(f, 'magicDamageCutRate'),
        negationFire: neg(f, 'fireDamageCutRate'),
        negationLightning: neg(f, 'thunderDamageCutRate'),
        negationHoly: neg(f, 'darkDamageCutRate'), // ER renamed Dark → Holy
        resistPoison: num(f, 'resistPoison'),
        resistScarletRot: num(f, 'resistDisease'),
        resistBleed: num(f, 'resistBlood'),
        resistFrost: num(f, 'resistFreeze'),
        resistSleep: num(f, 'resistSleep'),
        resistMadness: num(f, 'resistMadness'),
        resistDeath: num(f, 'resistCurse'),
        poise: Math.round(num(f, 'toughnessCorrectRate') * 1000), // displayed poise
      }),
    );

    yield* Effect.logInfo(
      `joined ${weapons.length} weapons + ${armor.length} armor (stats decoded)`,
    );
    const milady = weapons.find((r) => r.id === 67500000);
    yield* Effect.logInfo(
      milady
        ? `DLC sample — ${milady.id} ${milady.name}: wt ${milady.weight}, phys ${milady.attackPhysical}, ` +
            `req Str ${milady.reqStrength}/Dex ${milady.reqDexterity}`
        : 'Milady not joined',
    );
    return { weapons, armor };
  });

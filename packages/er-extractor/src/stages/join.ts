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
 * Stage 4 — join. Pairs item PARAM rows ⨝ their name FMG and decodes the useful
 * fields (via the vendored PARAMDEF) into the records the site consumes — base +
 * DLC together. Covers weapons, armor, talismans, and goods (the latter tagged
 * with a category from `goodsType`). Consumes the prior stages' outputs (param
 * files from `params`, name tables from `text`) rather than re-loading. Ashes of
 * war + weapon arts stay name-only (codegen emits them straight from `text`).
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

export interface TalismanRecord {
  readonly id: number;
  readonly name: string;
  readonly weight: number;
}

export interface GoodRecord {
  readonly id: number;
  readonly name: string;
  readonly category: string; // derived from EquipParamGoods.goodsType
  readonly weight: number;
  readonly maxHeld: number;
  readonly sellValue: number;
}

export interface ItemTables {
  readonly weapons: WeaponRecord[];
  readonly armor: ArmorRecord[];
  readonly talismans: TalismanRecord[];
  readonly goods: GoodRecord[];
}

// EquipParamGoods.goodsType → display category. Derived empirically by grouping
// the named rows (the enum isn't in the vendored Paramdex Defs). Sorceries and
// incantations each span two types (offensive + utility); spirit ashes span two.
const GOODS_CATEGORY: Record<number, string> = {
  0: 'Consumable',
  1: 'Key Item',
  2: 'Crafting Material',
  3: 'Remembrance',
  5: 'Sorcery',
  7: 'Spirit Ash',
  8: 'Spirit Ash',
  9: 'Wondrous Physick',
  10: 'Crystal Tear',
  11: 'Crafting Tool',
  12: 'Info Item',
  14: 'Upgrade Material',
  15: 'Great Rune',
  16: 'Incantation',
  17: 'Sorcery',
  18: 'Incantation',
};

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
): Effect.Effect<ItemTables, ParamError | ParamdefError> =>
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

    const talismans = yield* decodeCategory(
      paramFiles,
      'EquipParamAccessory',
      names.AccessoryName,
      (id, name, f) => ({ id, name, weight: num(f, 'weight') }),
    );

    const goods = yield* decodeCategory(
      paramFiles,
      'EquipParamGoods',
      names.GoodsName,
      (id, name, f) => ({
        id,
        name,
        category: GOODS_CATEGORY[num(f, 'goodsType')] ?? 'Other',
        weight: num(f, 'weight'),
        maxHeld: num(f, 'maxNum'),
        sellValue: num(f, 'sellValue'),
      }),
    );

    yield* Effect.logInfo(
      `joined ${weapons.length} weapons + ${armor.length} armor + ` +
        `${talismans.length} talismans + ${goods.length} goods (stats decoded)`,
    );
    const byCat = new Map<string, number>();
    for (const g of goods)
      byCat.set(g.category, (byCat.get(g.category) ?? 0) + 1);
    yield* Effect.logInfo(
      `goods categories: ${[...byCat.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([c, n]) => `${c}=${n}`)
        .join(' ')}`,
    );
    return { weapons, armor, talismans, goods };
  });

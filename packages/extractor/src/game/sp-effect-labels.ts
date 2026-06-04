import { Effect, FileSystem, Path } from 'effect';

import {
  decodeRow,
  type ParamError,
  parseParam,
  type RowValue,
} from '../formats/param.ts';
import { loadParamdef, type ParamdefError } from '../formats/paramdef.ts';
import type { ItemText } from './item-text.ts';

/**
 * `sp_effect_id → granting-item label` (#sp-effects). The save's active-effects
 * list (`sp_effects[]`) is just SpEffectParam ids + remaining time — SpEffectParam
 * carries NO name. We label each id by inverting the item→SpEffect references the
 * game already wires up: a consumable's / buff-spell's `EquipParamGoods.refId_default`,
 * a talisman's `refId`, and the resident SpEffects on equipped weapons/armor. The
 * web then renders "Golden Vow", … instead of `#210317000`.
 *
 * ⚠️ KNOWN LIMITATION — nested SpEffect refs (deliberately deferred). The id that
 * shows up *active* in a save is often a **leaf** SpEffect reached only by walking an
 * item's directly-referenced SpEffect through its own ref fields
 * (`cycleOccurrenceSpEffectId`, `applySpEffectId`/conditional sub-effects, or a
 * Bullet→SpEffect chain for offensive/buff spells). We map only the item's
 * **directly-referenced** ids here, so coverage is PARTIAL: timed buffs whose active
 * id is a nested leaf will be unlabeled (the web shows `Effect #<id>`). Closing this
 * needs a recursive SpEffectParam ref-walk — the same "nested-ref" fast-follow noted
 * in `game/effects.ts`. Revisit there + here together. See the data-parity-audit doc.
 *
 * Priority on collision (first wins): spell > consumable > talisman > weapon > armor,
 * so a shared SpEffect is labeled by its most user-recognizable source.
 */

export type SpEffectSource =
  | 'spell'
  | 'consumable'
  | 'talisman'
  | 'weapon'
  | 'armor';

export interface SpEffectLabel {
  readonly id: number; // SpEffectParam row id (matches save `sp_effects[].sp_effect_id`)
  readonly label: string; // granting item / spell name
  readonly source: SpEffectSource;
}

const num = (row: ReadonlyMap<string, RowValue>, key: string): number => {
  const v = row.get(key);
  return typeof v === 'number' ? v : 0;
};

const isName = (n: string | undefined): n is string =>
  !!n && n.trim().length > 0 && n !== '[ERROR]';

export const loadSpEffectLabels = (
  params: Map<string, Uint8Array>,
  names: ItemText,
): Effect.Effect<
  SpEffectLabel[],
  ParamError | ParamdefError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const byId = new Map<number, SpEffectLabel>();
    // first-write-wins, so callers pass sources in priority order
    const add = (id: number, label: string, source: SpEffectSource) => {
      if (id > 0 && !byId.has(id)) byId.set(id, { id, label, source });
    };

    /**
     * Decode `paramName`, and for each named row pull the SpEffect ids in `fields`,
     * labelling them with the row's name from `nameMap`. `gate` can skip a row
     * (e.g. a spell whose ref isn't a SpEffect).
     */
    const scan = (
      paramName: string,
      defName: string,
      nameMap: Map<number, string>,
      fields: readonly string[],
      source:
        | SpEffectSource
        | ((f: ReadonlyMap<string, RowValue>) => SpEffectSource),
    ) =>
      Effect.gen(function* () {
        const bytes = params.get(paramName);
        if (!bytes) return;
        const parsed = yield* parseParam(bytes);
        const def = yield* loadParamdef(defName);
        for (const r of parsed.rows) {
          const name = nameMap.get(r.id);
          if (!isName(name)) continue;
          const f = decodeRow(bytes, r.dataOffset, def, parsed.little);
          const src = typeof source === 'function' ? source(f) : source;
          for (const field of fields) add(num(f, field), name, src);
        }
      });

    // Spells and consumables both live in EquipParamGoods; their applied SpEffect is
    // `refId_default`. Sorcery/incantation goodsTypes are tagged `spell`, the rest
    // `consumable`. (A dedicated Magic-param pass was dropped — its buff SpEffect is a
    // nested leaf, not `Magic.refId`, so it added nothing the direct ref doesn't.)
    const SPELL_GOODS_TYPES = new Set([5, 16, 17, 18]); // sorcery×2, incantation×2
    yield* scan(
      'EquipParamGoods',
      'EquipParamGoods',
      names.GoodsName,
      ['refId_default'],
      (f) =>
        SPELL_GOODS_TYPES.has(num(f, 'goodsType')) ? 'spell' : 'consumable',
    );
    yield* scan(
      'EquipParamAccessory',
      'EquipParamAccessory',
      names.AccessoryName,
      ['refId'],
      'talisman',
    );
    yield* scan(
      'EquipParamWeapon',
      'EquipParamWeapon',
      names.WeaponName,
      ['residentSpEffectId', 'residentSpEffectId1', 'residentSpEffectId2'],
      'weapon',
    );
    yield* scan(
      'EquipParamProtector',
      'EquipParamProtector',
      names.ProtectorName,
      ['residentSpEffectId', 'residentSpEffectId2', 'residentSpEffectId3'],
      'armor',
    );

    return [...byId.values()];
  });

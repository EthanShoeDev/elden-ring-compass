import { Effect, FileSystem, Path } from 'effect';

import {
  decodeRow,
  type ParamError,
  parseParam,
  type RowValue,
} from '../formats/param.ts';
import { loadParamdef, type ParamdefError } from '../formats/paramdef.ts';

/**
 * `ItemLotParam` decoder. Both `ItemLotParam_map` (treasure / world pickups) and
 * `ItemLotParam_enemy` (enemy drops) share the `ITEMLOT_PARAM_ST` layout: 8 slots
 * of `{ lotItemId, lotItemCategory, lotItemNum, lotItemBasePoint, getItemFlagId }`.
 * A slot's drop `chance` is its base point over the lot's total (empty "no-drop"
 * slots carry points too, so the total includes them).
 *
 * `lotItemCategory` (verified empirically against the generated item datasets):
 *   1 goods · 2 weapon · 3 armor · 4 talisman · 5 ash-of-war.
 */

export type ItemType =
  | 'goods'
  | 'weapon'
  | 'armor'
  | 'talisman'
  | 'ash-of-war'
  | 'unknown';

const CATEGORY: Record<number, ItemType> = {
  1: 'goods',
  2: 'weapon',
  3: 'armor',
  4: 'talisman',
  5: 'ash-of-war',
};

export interface LotItem {
  readonly itemId: number;
  readonly itemType: ItemType;
  readonly quantity: number;
  readonly chance: number; // 0..1, basePoint / lot total
  readonly getItemFlagId: number; // pickup event flag (0 if none); save-aware tracking
}

const num = (row: ReadonlyMap<string, RowValue>, key: string): number => {
  const v = row.get(key);
  return typeof v === 'number' ? v : 0;
};

/** Decode an ItemLotParam table into `lotId → non-empty item slots`. */
export const loadItemLots = (
  params: Map<string, Uint8Array>,
  paramName: 'ItemLotParam_map' | 'ItemLotParam_enemy',
): Effect.Effect<
  Map<number, LotItem[]>,
  ParamError | ParamdefError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const out = new Map<number, LotItem[]>();
    const bytes = params.get(paramName);
    if (!bytes) {
      yield* Effect.logWarning(`no ${paramName}; skipping item lots`);
      return out;
    }
    const param = yield* parseParam(bytes);
    const def = yield* loadParamdef('ItemLotParam');

    for (const r of param.rows) {
      const row = decodeRow(bytes, r.dataOffset, def, param.little);
      let total = 0;
      for (let i = 1; i <= 8; i++) {
        total += num(row, `lotItemBasePoint0${i}`);
      }
      const items: LotItem[] = [];
      for (let i = 1; i <= 8; i++) {
        const itemId = num(row, `lotItemId0${i}`);
        if (itemId <= 0) continue;
        const basePoint = num(row, `lotItemBasePoint0${i}`);
        items.push({
          itemId,
          itemType: CATEGORY[num(row, `lotItemCategory0${i}`)] ?? 'unknown',
          quantity: num(row, `lotItemNum0${i}`),
          chance: total > 0 ? basePoint / total : 0,
          getItemFlagId: num(row, `getItemFlagId0${i}`),
        });
      }
      if (items.length > 0) out.set(r.id, items);
    }
    return out;
  });

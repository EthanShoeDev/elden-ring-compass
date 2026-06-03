import { Effect, FileSystem, Path } from 'effect';

import {
  decodeRow,
  type ParamError,
  parseParam,
  type RowValue,
} from '../formats/param.ts';
import { loadParamdef, type ParamdefError } from '../formats/paramdef.ts';
import { type ItemType, loadItemLots } from './item-lots.ts';
import type { ClassifiedMarker } from './marker-classify.ts';

/**
 * Item world-placements (#10) — "this item can be found here". Replaces the
 * wiki-scraped `map-db.ts` item layer with an install-derived dataset.
 *
 * **Enemy / boss drops (this module — fully static):** every enemy marker already
 * carries its `npcParamId`; `NpcParam.itemLotId_enemy → ItemLotParam_enemy` gives
 * the dropped items, and the marker gives the world coords. Bosses are enemy
 * markers too, so their unique drops (remembrances, etc.) flow through here.
 *
 * **Map treasure (deferred, #10b):** `ItemLotParam_map` chests/ground pickups have
 * NO static MSB link to a position — the entity→lot mapping lives in the EMEVD
 * event scripts (item-award instructions). That linkage is a separate effort,
 * grouped with the map-coordinate work (#4). Until it lands, `source` is `'enemy'`.
 */

export interface Placement {
  readonly mapId: string;
  readonly entityId: number; // the dropping entity (enemy) in that map
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly npcParamId: number;
  readonly lotId: number; // ItemLotParam_enemy row
  readonly itemId: number;
  readonly itemType: ItemType;
  readonly quantity: number;
  readonly chance: number; // 0..1 within the lot
  readonly source: 'enemy';
}

const num = (row: ReadonlyMap<string, RowValue>, key: string): number => {
  const v = row.get(key);
  return typeof v === 'number' ? v : 0;
};

export const loadPlacements = (
  params: Map<string, Uint8Array>,
  markers: readonly ClassifiedMarker[],
): Effect.Effect<
  Placement[],
  ParamError | ParamdefError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const enemyLots = yield* loadItemLots(params, 'ItemLotParam_enemy');

    // npcParamId → its enemy item lot (0 = none).
    const enemyLotByNpc = new Map<number, number>();
    const npcBytes = params.get('NpcParam');
    if (npcBytes) {
      const npcParam = yield* parseParam(npcBytes);
      const def = yield* loadParamdef('NpcParam');
      for (const r of npcParam.rows) {
        const row = decodeRow(npcBytes, r.dataOffset, def, npcParam.little);
        const lot = num(row, 'itemLotId_enemy');
        if (lot > 0) enemyLotByNpc.set(r.id, lot);
      }
    }

    const out: Placement[] = [];
    for (const m of markers) {
      if (m.npcParamId === null) continue; // only enemy/dummy-enemy markers carry it
      const lotId = enemyLotByNpc.get(m.npcParamId);
      if (lotId === undefined) continue;
      const items = enemyLots.get(lotId);
      if (items === undefined) continue;
      for (const it of items) {
        out.push({
          mapId: m.mapId,
          entityId: m.entityID,
          x: m.x,
          y: m.y,
          z: m.z,
          npcParamId: m.npcParamId,
          lotId,
          itemId: it.itemId,
          itemType: it.itemType,
          quantity: it.quantity,
          chance: it.chance,
          source: 'enemy',
        });
      }
    }
    return out;
  });

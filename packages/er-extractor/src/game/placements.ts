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
import type { MapTreasure } from './map-markers.ts';

/**
 * Item world-placements (#10) — "this item can be found here". Replaces the
 * wiki-scraped `map-db.ts` item layer with an install-derived dataset. Two sources,
 * both fully static (no EMEVD needed):
 *
 * **Enemy / boss drops (`source: 'enemy'`):** every enemy marker already carries its
 * `npcParamId`; `NpcParam.itemLotId_enemy → ItemLotParam_enemy` gives the dropped
 * items, and the marker gives the world coords. Bosses are enemy markers too, so
 * their unique drops (remembrances, etc.) flow through here.
 *
 * **Map treasure (`source: 'map'`, #10b):** chests / items-on-the-ground. The link
 * is the MSB **Treasure event** (`EventParam.cs` `Event.Treasure`), which names a
 * placed Part (→ coords) and an `ItemLotParam_map` row (→ items). The EMEVD scripts
 * were ruled out (verified: they reference only ~220 of ~5400 map lots, and
 * `Set Asset Treasure State` carries no lot id) — the authoritative link is the MSB.
 */

export interface Placement {
  readonly mapId: string;
  readonly entityId: number; // dropping enemy, or treasure Part entity id (0 if unset)
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly npcParamId: number | null; // enemy source only; null for map treasure
  readonly lotId: number; // ItemLotParam_enemy (enemy) / ItemLotParam_map (map) row
  readonly itemId: number;
  readonly itemType: ItemType;
  readonly quantity: number;
  readonly chance: number; // 0..1 within the lot
  readonly source: 'enemy' | 'map';
}

const num = (row: ReadonlyMap<string, RowValue>, key: string): number => {
  const v = row.get(key);
  return typeof v === 'number' ? v : 0;
};

export const loadPlacements = (
  params: Map<string, Uint8Array>,
  markers: readonly ClassifiedMarker[],
  treasures: readonly MapTreasure[],
): Effect.Effect<
  Placement[],
  ParamError | ParamdefError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const out: Placement[] = [];

    // --- Enemy / boss drops: marker.npcParamId → ItemLotParam_enemy. ---
    const enemyLots = yield* loadItemLots(params, 'ItemLotParam_enemy');
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

    // --- Map treasure: MSB Treasure event (Part coords) → ItemLotParam_map. ---
    const mapLots = yield* loadItemLots(params, 'ItemLotParam_map');
    for (const t of treasures) {
      const items = mapLots.get(t.itemLotId);
      if (items === undefined) continue;
      for (const it of items) {
        out.push({
          mapId: t.mapId,
          entityId: t.entityID,
          x: t.x,
          y: t.y,
          z: t.z,
          npcParamId: null,
          lotId: t.itemLotId,
          itemId: it.itemId,
          itemType: it.itemType,
          quantity: it.quantity,
          chance: it.chance,
          source: 'map',
        });
      }
    }
    return out;
  });

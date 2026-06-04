import { Effect, FileSystem, Path } from 'effect';

import type { DcxError } from '../formats/dcx.ts';
import type { EmedfError } from '../formats/emedf.ts';
import type { EmevdError } from '../formats/emevd.ts';
import { findOodleDll, type OodleError } from '../external/oodle.ts';
import {
  decodeRow,
  type ParamError,
  parseParam,
  type RowValue,
} from '../formats/param.ts';
import { loadParamdef, type ParamdefError } from '../formats/paramdef.ts';
import {
  EventDropError,
  loadEventDropLocations,
  type MarkerCoord,
} from './event-drop-locations.ts';
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
 * placed Part (→ coords) and an `ItemLotParam_map` row (→ items).
 *
 * **Event-awarded overworld lots (`source: 'event'`):** ~hundreds of `ItemLotParam_map`
 * rows are granted by EMEVD scripts on a boss/invader/NPC defeat (e.g. Reduvia from
 * Bloody Finger Nerijus) and so have no MSB Treasure Part. Their row id encodes the
 * overworld tile (`10<col><row><seq>`, validated: 1144/1144 placed m60 lots decode to
 * their tile), so we pin them at that **tile centre** (±1 tile — coarser than the exact
 * Part/enemy coords above). Exact spawn coords would need an EMEVD reader; see
 * `docs/projects/item-placement-coverage.md`.
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
  readonly source: 'enemy' | 'map' | 'event';
}

const num = (row: ReadonlyMap<string, RowValue>, key: string): number => {
  const v = row.get(key);
  return typeof v === 'number' ? v : 0;
};

/**
 * Decode an `ItemLotParam_map` row id into its overworld tile, or `null` if it isn't
 * a 10-digit Lands Between (`m60`) map-lot id. Format `10<col2><row2><seq4>`.
 * (DLC `m61` lots use a different prefix — TODO once verified.)
 */
const decodeMapLotTile = (
  lotId: number,
): { col: number; row: number } | null => {
  const s = lotId.toString();
  if (!/^10\d{8}$/.test(s)) return null;
  return { col: Number(s.slice(2, 4)), row: Number(s.slice(4, 6)) };
};

export const loadPlacements = (
  params: Map<string, Uint8Array>,
  markers: readonly ClassifiedMarker[],
  treasures: readonly MapTreasure[],
  gameRoot: string,
): Effect.Effect<
  Placement[],
  | ParamError
  | ParamdefError
  | EventDropError
  | DcxError
  | OodleError
  | EmevdError
  | EmedfError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const out: Placement[] = [];
    const enemyLots = yield* loadItemLots(params, 'ItemLotParam_enemy');
    const mapLots = yield* loadItemLots(params, 'ItemLotParam_map');
    const usedMapLot = new Set<number>(); // map lots already placed (treasure / NPC)

    // --- Enemy / boss / NPC drops: marker.npcParamId → NpcParam lots → coords. ---
    // NpcParam carries FOUR drop-lot fields: direct (`itemLotId_enemy` → ItemLotParam_enemy)
    // and on-the-ground (`itemLotId_map` → ItemLotParam_map), each with a `sleepCollector`
    // variant. Pull all four so NPC drops that live in the map table aren't missed.
    const NPC_LOT_FIELDS = [
      { field: 'itemLotId_enemy', map: false },
      { field: 'itemLotId_map', map: true },
      { field: 'sleepCollectorItemLotId_enemy', map: false },
      { field: 'sleepCollectorItemLotId_map', map: true },
    ] as const;
    const lotsByNpc = new Map<number, Array<{ lotId: number; map: boolean }>>();
    const npcBytes = params.get('NpcParam');
    if (npcBytes) {
      const npcParam = yield* parseParam(npcBytes);
      const def = yield* loadParamdef('NpcParam');
      for (const r of npcParam.rows) {
        const row = decodeRow(npcBytes, r.dataOffset, def, npcParam.little);
        const lots = NPC_LOT_FIELDS.flatMap(({ field, map }) => {
          const lotId = num(row, field);
          return lotId > 0 ? [{ lotId, map }] : [];
        });
        if (lots.length) lotsByNpc.set(r.id, lots);
      }
    }
    for (const m of markers) {
      if (m.npcParamId === null) continue; // only enemy/dummy-enemy markers carry it
      for (const { lotId, map } of lotsByNpc.get(m.npcParamId) ?? []) {
        const items = (map ? mapLots : enemyLots).get(lotId);
        if (items === undefined) continue;
        if (map) usedMapLot.add(lotId);
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
    }

    // --- Map treasure: MSB Treasure event (Part coords) → ItemLotParam_map. ---
    for (const t of treasures) {
      const items = mapLots.get(t.itemLotId);
      if (items === undefined) continue;
      usedMapLot.add(t.itemLotId);
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

    // --- Event-awarded lots: orphan ItemLotParam_map rows (no Treasure Part, no NpcParam).
    //     Resolve EXACT coords by tracing the EMEVD award→flag→encounter→entity chain
    //     (`event-drop-locations.ts`); fall back to the lot-id tile centre for lots whose
    //     flag has no clean encounter entity (world-state flags, templated invasions).
    // Lots below 1000 are excluded from the EMEVD trace: their ids collide with the
    // ubiquitous small ints in event args (0, counts, slot numbers) and would match
    // spuriously. Real named-item award lots (Reduvia 1042370700, Ruins Greatsword 10830,
    // …) are all larger; sub-1000 map lots are test/default rows with no overworld home.
    const orphanLots = new Set<number>();
    for (const lotId of mapLots.keys()) {
      if (!usedMapLot.has(lotId) && lotId >= 1000) orphanLots.add(lotId);
    }

    const markerCoords = new Map<number, MarkerCoord>();
    for (const m of markers) {
      // Skip unnamed (entity-0) parts: 0 is a ubiquitous event arg, so a 0-keyed marker
      // would make the body-entity scan match constantly.
      if (m.entityID <= 0) continue;
      markerCoords.set(m.entityID, {
        mapId: m.mapId,
        x: m.x,
        y: m.y,
        z: m.z,
        isCharacter: m.kind === 'part' && (m.type === 2 || m.type === 10),
      });
    }
    const oo2corePath = yield* findOodleDll(gameRoot);
    const exact = yield* loadEventDropLocations(
      gameRoot,
      oo2corePath,
      markerCoords,
      orphanLots,
    );

    for (const lotId of orphanLots) {
      const items = mapLots.get(lotId)!;
      const tile = decodeMapLotTile(lotId);
      let loc = exact.get(lotId);
      // Precision guard: when the lot id encodes its tile, the EMEVD-traced entity must
      // land within ±1 of that tile, else it's a spurious match (e.g. an entity id that
      // collides with one in another map). Reject it and fall back to the tile centre.
      if (loc && tile) {
        const m = /^m60_(\d+)_(\d+)_/.exec(loc.mapId);
        const off = m
          ? Math.max(
              Math.abs(Number(m[1]) - tile.col),
              Math.abs(Number(m[2]) - tile.row),
            )
          : Infinity;
        if (off > 1) loc = undefined;
      }
      let mapId: string;
      let x = 0;
      let z = 0;
      let entityId = 0;
      if (loc) {
        mapId = loc.mapId;
        x = loc.x;
        z = loc.z;
        entityId = loc.viaEntity;
      } else {
        if (!tile) continue;
        mapId = `m60_${String(tile.col).padStart(2, '0')}_${String(tile.row).padStart(2, '0')}_00`;
      }
      for (const it of items) {
        out.push({
          mapId,
          entityId,
          x,
          y: 0,
          z,
          npcParamId: null,
          lotId,
          itemId: it.itemId,
          itemType: it.itemType,
          quantity: it.quantity,
          chance: it.chance,
          source: 'event',
        });
      }
    }
    return out;
  });

// Install-derived overworld marker positions, projected to master pixels once at
// module load. These are the SOLE source of map-marker positions — the scraped
// `map-db.ts` wiki coords are no longer used for placement.
//
// Coverage is the overworld (Lands Between → M00, DLC Land of Shadow → M10): field
// graces, field bosses, and overworld item pickups (treasure + enemy drops). Legacy
// dungeons (`m10`/`m12`/…) are now projected too — `overworldMarkerToMasterPixel`
// routes them through `WORLD_MAP_LEGACY_CONV` (dungeon-local → overworld). Anything
// with no overworld tile and no conv entry still projects to `null` and is omitted.
import { BOSSES, GRACES, MAP_MARKERS, PLACEMENTS } from '@elden-ring-compass/data';

import { type MasterPixel, overworldMarkerToMasterPixel } from '../map-affine';

/** A placed item-pickup location with its source/odds (for the popup). */
export interface ItemPin extends MasterPixel {
  source: string; // 'enemy' | 'map' (treasure) | 'event' (EMEVD-awarded)
  chance: number; // drop probability (1 = guaranteed)
  quantity: number;
  // 'event' drops resolved to a real encounter entity are exact; those that fell
  // back to the lot's tile centre (no entityId) are approximate (±1 tile).
  approx: boolean;
}

/** entity id → overworld master pixel (m60/m61-placed entities only). */
const entityPixel = new Map<number, MasterPixel>();
for (const mk of MAP_MARKERS) {
  const p = overworldMarkerToMasterPixel(mk.mapId, mk.x, mk.z);
  if (p) entityPixel.set(mk.entityId, p);
}

/** Grace event-flag id → overworld master pixel (overworld graces only). */
export const graceFlagToPixel: ReadonlyMap<number, MasterPixel> = new Map(
  GRACES.flatMap((g) => {
    const p = entityPixel.get(g.bonfireEntityId);
    return p ? [[g.flagId, p] as const] : [];
  }),
);

/** Boss defeat-flag id → overworld master pixel (overworld field bosses only). */
export const bossFlagToPixel: ReadonlyMap<number, MasterPixel> = new Map(
  BOSSES.flatMap((b) => {
    const p = overworldMarkerToMasterPixel(b.mapId, b.x, b.z);
    return p ? [[b.defeatFlagId, p] as const] : [];
  }),
);

/** A boss pin (its name + overworld position) keyed by its defeat-flag id. */
export interface BossPin extends MasterPixel {
  name: string;
  /** Defeat event-flag id (the map key) — for boss-meta reward/badge lookups. */
  flag: number;
  /** Arena map id (`m10_00_00_00`) — for `bossMapName`/`bossBadges`. */
  mapId: string;
}

/** Boss defeat-flag id → placed pin, for the all-bosses table's map selection. */
export const bossPinByFlag: ReadonlyMap<number, BossPin> = new Map(
  BOSSES.flatMap((b) => {
    const p = overworldMarkerToMasterPixel(b.mapId, b.x, b.z);
    return p
      ? [
          [
            b.defeatFlagId,
            { ...p, name: b.name ?? 'Unknown boss', flag: b.defeatFlagId, mapId: b.mapId },
          ] as const,
        ]
      : [];
  }),
);

/**
 * Boss defeat-flag id → arena map id, for ALL bosses (not just placed ones). Lets
 * pins sourced from the events table — which only know the flag — still enrich with
 * `bossMapName`/`bossBadges` (which need the map id).
 */
export const bossMapIdByFlag: ReadonlyMap<number, string> = new Map(
  BOSSES.map((b) => [b.defeatFlagId, b.mapId] as const),
);

// Item ids are NOT globally unique — each item TYPE (weapon/armor/goods/talisman/
// ash-of-war) has its own id space, so e.g. weapon 1040000 (Reduvia) and armor
// 1040000 are different items. Key pins by `${itemType}:${itemId}` to avoid
// cross-type collisions.
const itemKey = (itemType: string, itemId: number) => `${itemType}:${itemId}`;

/** An {@link ItemPin} that also knows WHICH item it places (for spatial queries). */
export interface PlacedItemPin extends ItemPin {
  itemType: string;
  itemId: number;
}

const { itemPinsByKey, allItemPins } = (() => {
  const map = new Map<string, ItemPin[]>();
  const all: PlacedItemPin[] = [];
  for (const p of PLACEMENTS) {
    const px = overworldMarkerToMasterPixel(p.mapId, p.x, p.z);
    if (!px) continue;
    const pin: PlacedItemPin = {
      ...px,
      itemType: p.itemType,
      itemId: p.itemId,
      source: p.source,
      chance: p.chance,
      quantity: p.quantity,
      approx: p.source === 'event' && p.entityId === 0,
    };
    all.push(pin);
    const k = itemKey(p.itemType, p.itemId);
    const cur = map.get(k);
    if (cur) cur.push(pin);
    else map.set(k, [pin]);
  }
  return { itemPinsByKey: map as ReadonlyMap<string, ItemPin[]>, allItemPins: all };
})();

/** Overworld pickup locations for an item, by its placement type + id. */
export const itemPins = (itemType: string, itemId: number): ItemPin[] =>
  itemPinsByKey.get(itemKey(itemType, itemId)) ?? [];

/**
 * Every placeable item pickup, flat — the spatial-query view of the same data
 * `itemPins` serves per item (one projection pass builds both). Used by the
 * map's "Nearby items" panel to find pickups around the player.
 */
export const ALL_ITEM_PINS: readonly PlacedItemPin[] = allItemPins;

import type { MapEntity } from './map-markers.ts';

/**
 * Marker layer/category classification (#9). Turns raw MSB entities (numeric
 * Part/Region `type`, internal `name`) into the user-facing **layers** the tiled
 * map toggles, and resolves an English **displayName** where a source exists.
 *
 * Classification is a JOIN, not a single field (plan §"Map design"):
 *   - **grace** — `entityID` ∈ the grace bonfire entity ids (`GRACES.bonfireEntityId`).
 *     100% of graces are placed as markers, so this also gives graces their coords.
 *   - **npc** — an Enemy/DummyEnemy part whose `npcParamId → NpcParam.nameId` resolves
 *     to a real `NpcName` (named characters: merchants, questgivers, bosses-as-NPCs).
 *   - **enemy** — Enemy/DummyEnemy with no name (generic mobs).
 *   - **asset / player / collision / map-piece** — other Part subtypes.
 *   - region subtypes (`map-point`, `spawn-point`, `summon-point`, `play-area`,
 *     `invasion-point`, `connection`) — the few user-meaningful RegionTypes; the rest
 *     (sound/sfx/wind/navmesh/weather/…) collapse to `region`.
 *
 * Boss markers are NOT tagged here — the boss layer comes from the `BOSSES` dataset,
 * which carries its own arena coords.
 */

export type MarkerCategory =
  | 'grace'
  | 'npc'
  | 'enemy'
  | 'asset'
  | 'player'
  | 'collision'
  | 'map-piece'
  | 'invasion-point'
  | 'spawn-point'
  | 'summon-point'
  | 'map-point'
  | 'play-area'
  | 'connection'
  | 'region';

export interface ClassifiedMarker extends MapEntity {
  readonly category: MarkerCategory;
  readonly displayName: string | null; // English label where a source exists, else null
}

// MSBE PartType → base category (SoulsFormatsNEXT MSBE/PartsParam.cs).
const PART_CATEGORY: Record<number, MarkerCategory> = {
  0: 'map-piece',
  2: 'enemy',
  4: 'player',
  5: 'collision',
  9: 'asset', // DummyAsset
  10: 'enemy', // DummyEnemy
  11: 'connection', // ConnectCollision
  13: 'asset',
};

// MSBE RegionType → category for the few user-meaningful subtypes (MSBE/PointParam.cs);
// everything else (sound/sfx/wind/weather/navmesh/…) collapses to 'region'.
const REGION_CATEGORY: Record<number, MarkerCategory> = {
  1: 'invasion-point',
  8: 'spawn-point',
  21: 'connection',
  26: 'summon-point',
  33: 'map-point',
  43: 'play-area',
};

export interface MarkerLookups {
  /** Enemy `npcParamId` → English name, only for NPCs with a real `NpcName`. */
  readonly npcNameByParamId: ReadonlyMap<number, string>;
  /** Grace bonfire `entityId` → grace name (`GRACES`). */
  readonly graceNameByEntityId: ReadonlyMap<number, string>;
}

export const classifyMarker = (
  m: MapEntity,
  { npcNameByParamId, graceNameByEntityId }: MarkerLookups,
): ClassifiedMarker => {
  // Grace wins over the raw type (graces are placed as Asset parts).
  const graceName = graceNameByEntityId.get(m.entityID);
  if (graceName !== undefined) {
    return { ...m, category: 'grace', displayName: graceName };
  }

  if (m.kind === 'part') {
    const base = PART_CATEGORY[m.type] ?? 'region';
    if (base === 'enemy' && m.npcParamId !== null) {
      const npcName = npcNameByParamId.get(m.npcParamId);
      if (npcName !== undefined) {
        return { ...m, category: 'npc', displayName: npcName };
      }
    }
    return { ...m, category: base, displayName: null };
  }

  return {
    ...m,
    category: REGION_CATEGORY[m.type] ?? 'region',
    displayName: null,
  };
};

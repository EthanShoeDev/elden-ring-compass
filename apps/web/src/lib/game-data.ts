// Static, in-memory indexes over the install-derived `@elden-ring-compass/data` datasets,
// replacing the legacy `CLEAN_ELDEN_RING_DB` computed object from `elden-ring-raw-db`.
//
// The view-models (`lib/vm/*`) are plain functions (not React hooks), so they read these
// module-level Maps directly — exactly as they read `CLEAN_ELDEN_RING_DB` before. The atom
// layer (`lib/atoms/*`) wraps the same datasets for reactive table rendering.
//
// Name lookups are kept PER ITEM TYPE (matching the legacy `*_NAME` tables) because weapon
// and armor id spaces can overlap numerically; `inventoryDbView` knows the item type from
// the ga-handle and picks the right map. `nameById` is the union of all five (matching the
// legacy merged `inventoryIdMap`) for `equipmentDbView`, which looks up by de-offset id.
import {
  ARCHETYPES,
  ARMOR,
  ASHES_OF_WAR,
  GOODS,
  SP_EFFECT_LABELS,
  TALISMANS,
  WEAPONS,
} from '@elden-ring-compass/data';

const nameMap = (rows: ReadonlyArray<{ id: number; name: string }>) =>
  new Map(rows.map((r) => [r.id, r.name]));

/** Armament id → name (was `WEAPON_NAME`). Keys include affinity variants, base upgrade. */
export const weaponNameById = nameMap(WEAPONS);
/** Protector id → name (was `ARMOR_NAME`). */
export const armorNameById = nameMap(ARMOR);
/** Talisman id → name (was `ACCESSORY_NAME`). */
export const accessoryNameById = nameMap(TALISMANS);
/** Goods id → name (was `ITEM_NAMES`). */
export const itemNameById = nameMap(GOODS);
/** Ash-of-war id → name (was `AOW_NAME`). */
export const aowNameById = nameMap(ASHES_OF_WAR);

/** Union of all five name maps, keyed by id (was `CLEAN_ELDEN_RING_DB.inventoryIdMap`). */
export const nameById: ReadonlyMap<number, string> = new Map<number, string>([
  ...itemNameById,
  ...accessoryNameById,
  ...aowNameById,
  ...armorNameById,
  ...weaponNameById,
]);

/** Starting-class archetype id → label (was `ARCHE_TYPE`). */
export const archetypeNameById: ReadonlyMap<number, string> = new Map(
  ARCHETYPES.map((a) => [a.id, a.name]),
);

/**
 * SpEffect id → granting-item label, for naming a save's active `sp_effects[]`.
 * Coverage is partial (direct item refs only; nested-leaf effects are unlabeled —
 * see `packages/er-extractor/src/game/sp-effect-labels.ts`).
 */
export const spEffectLabelById: ReadonlyMap<number, { label: string; source: string }> = new Map(
  SP_EFFECT_LABELS.map((e) => [e.id, { label: e.label, source: e.source }]),
);

/** Goods looked up by display name (for overview lookups: flasks, bell bearings, materials). */
export const goodsByName: ReadonlyMap<string, (typeof GOODS)[number]> = new Map(
  GOODS.map((g) => [g.name, g]),
);

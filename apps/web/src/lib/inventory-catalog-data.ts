// The pure (react-free) half of the inventory catalog: the `@elden-ring-compass/data`
// datasets grouped into the table categories the inventory UI shows. Split from
// `inventory-catalog.ts` (which joins these rows with the active save via a hook) so
// non-app code — `scripts/wiki-link-check.ts` — can consume the exact same grouping.
import {
  ARMOR,
  ASHES_OF_WAR,
  GOODS,
  SPELLS,
  SPIRIT_ASHES,
  TALISMANS,
  WEAPONS,
} from '@elden-ring-compass/data';

import { enrichWeapon } from './weapon-affinity';

const AMMO_CATEGORIES = new Set(['Arrow', 'Bolt', 'Greatarrow', 'Greatbolt']);
const goodsIn = (category: string) => GOODS.filter((g) => g.category === category);
// Cookbooks are tagged `Key Item` in the dataset, but the game shows them under the
// Tools tab — so we split them out of Key Items and into Tools (see CATALOG below).
const isCookbook = (g: { name: string }) => g.name.includes('Cookbook');

/**
 * The inventory tables, mirroring Elden Ring's own inventory tabs. Equipment categories use the
 * rich datasets; the rest are `GOODS` grouped to match the in-game tabs. The dataset's finer
 * `GOODS.category` split is folded up here: `tools` and `keyItems` each union several categories
 * (every member is a `Good`, so the shapes stay homogeneous). Spirit ashes keep their own tab —
 * the game files them under Tools as "Summons", but their enriched columns (HP/FP cost, summon
 * name) warrant a dedicated table. `spells` unions Sorceries + Incantations (the game's Spells tab).
 */
export const CATALOG = {
  // Enriched with derived affinity fields so the armaments table can collapse the
  // ~13 affinity variants of each weapon to one base row (see weapon-affinity.ts).
  armaments: WEAPONS.filter((w) => !AMMO_CATEGORIES.has(w.category)).map(enrichWeapon),
  ammo: WEAPONS.filter((w) => AMMO_CATEGORIES.has(w.category)),
  armor: ARMOR,
  talismans: TALISMANS,
  ashes: ASHES_OF_WAR,
  spells: SPELLS,
  spirits: SPIRIT_ASHES,
  // Tools tab: flasks/golden runes/multiplayer items/throwing pots (Consumables), the Wondrous
  // Physick + Crystal Tears, crafting tools, and Cookbooks.
  tools: [
    ...goodsIn('Consumable'),
    ...goodsIn('Wondrous Physick'),
    ...goodsIn('Crystal Tear'),
    ...goodsIn('Crafting Tool'),
    ...goodsIn('Key Item').filter(isCookbook),
  ],
  craftingMaterials: goodsIn('Crafting Material'),
  // Bolstering Materials tab in-game (Smithing Stones + Glovewort).
  upgradeMaterials: goodsIn('Upgrade Material'),
  // Key Items tab: quest objectives incl. Maps & Whetblades, plus Remembrances and Great Runes.
  // Cookbooks are excluded here — they live under Tools, matching the game.
  keyItems: [
    ...goodsIn('Key Item').filter((g) => !isCookbook(g)),
    ...goodsIn('Remembrance'),
    ...goodsIn('Great Rune'),
  ],
  infoItems: goodsIn('Info Item'),
  gestures: goodsIn('Gesture'),
} as const;

export type InventoryTableType = keyof typeof CATALOG;

/**
 * Each inventory table's corresponding `PLACEMENTS.itemType` (item ids are only
 * unique WITHIN a type). Spells and spirit ashes are `goods` in the placement data.
 */
export const TABLE_PLACEMENT_TYPE: Record<InventoryTableType, string> = {
  armaments: 'weapon',
  ammo: 'weapon',
  armor: 'armor',
  talismans: 'talisman',
  ashes: 'ash-of-war',
  spells: 'goods',
  spirits: 'goods',
  tools: 'goods',
  craftingMaterials: 'goods',
  upgradeMaterials: 'goods',
  keyItems: 'goods',
  infoItems: 'goods',
  gestures: 'goods',
};

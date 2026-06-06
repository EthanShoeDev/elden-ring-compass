// Inventory catalog — the install-derived replacement for the old `erdb.ts` (`ERDB` +
// `useAllErdb`). Groups the `@elden-ring-compass/data` datasets into the table categories
// the inventory UI shows (the new dataset-native taxonomy), and joins each row with the
// active save's ownership (quantity + weapon upgrade level + map coordinates).
import { useMemo } from 'react';

import {
  ARMOR,
  ASHES_OF_WAR,
  GOODS,
  SPELLS,
  SPIRIT_ASHES,
  TALISMANS,
  WEAPONS,
} from '@elden-ring-compass/data';

import { useSelectedSlot } from '@/stores/slot-selection-store';
import { enrichWeapon } from './weapon-affinity';
import { inventoryDbView } from './vm/inventory';
import { itemPins } from './vm/map-pins';

const AMMO_CATEGORIES = new Set(['Arrow', 'Bolt', 'Greatarrow', 'Greatbolt']);
const goodsIn = (category: string) => GOODS.filter((g) => g.category === category);

/**
 * The inventory tables, each backed by an install-derived dataset. Equipment categories use
 * the rich datasets; the rest are `GOODS` partitioned by its `category` field. Sorceries,
 * incantations, and spirit ashes use the enriched `SPELLS`/`SPIRIT_ASHES` datasets, so those
 * `GOODS` categories are intentionally not also surfaced here (no duplication).
 */
export const CATALOG = {
  // Enriched with derived affinity fields so the armaments table can collapse the
  // ~13 affinity variants of each weapon to one base row (see weapon-affinity.ts).
  armaments: WEAPONS.filter((w) => !AMMO_CATEGORIES.has(w.category)).map(enrichWeapon),
  ammo: WEAPONS.filter((w) => AMMO_CATEGORIES.has(w.category)),
  armor: ARMOR,
  talismans: TALISMANS,
  ashes: ASHES_OF_WAR,
  sorceries: SPELLS.filter((s) => s.category === 'Sorcery'),
  incantations: SPELLS.filter((s) => s.category === 'Incantation'),
  spirits: SPIRIT_ASHES,
  consumables: goodsIn('Consumable'),
  craftingMaterials: goodsIn('Crafting Material'),
  upgradeMaterials: goodsIn('Upgrade Material'),
  keyItems: goodsIn('Key Item'),
  infoItems: goodsIn('Info Item'),
  crystalTears: goodsIn('Crystal Tear'),
  remembrances: goodsIn('Remembrance'),
  greatRunes: goodsIn('Great Rune'),
  craftingTools: goodsIn('Crafting Tool'),
  gestures: goodsIn('Gesture'),
  physick: goodsIn('Wondrous Physick'),
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
  sorceries: 'goods',
  incantations: 'goods',
  spirits: 'goods',
  consumables: 'goods',
  craftingMaterials: 'goods',
  upgradeMaterials: 'goods',
  keyItems: 'goods',
  infoItems: 'goods',
  crystalTears: 'goods',
  remembrances: 'goods',
  greatRunes: 'goods',
  craftingTools: 'goods',
  gestures: 'goods',
  physick: 'goods',
};

/** A catalog row joined with the active save's ownership. */
export type WithOwnership<T> = T & {
  quantity: number;
  weaponUpgradeLevel: number;
  // Whether the item has any extracted overworld pickup location (drives the
  // "Has Coordinates" column + map pinning). The actual pins live in `itemIdToPins`.
  hasCoords: boolean;
};

/** Broad shape every joined row satisfies (used where the category isn't statically known). */
export type InventoryRow = WithOwnership<{
  id: number;
  name: string;
  icon: number;
  rarity: string;
}>;

export type InventoryTableResult = { items: InventoryRow[]; ownedCount: number };

/**
 * Per-category catalog joined with save ownership. Mirrors the old `useAllErdb` contract:
 * `{ items, ownedCount }` per table. Owned quantity sums duplicate stacks; weapons show their
 * highest upgrade level (appended to the name as ` +N`, as before). Items are typed broadly
 * (`InventoryRow`); per-column field access is typed via `CATALOG` in the table definitions.
 */
export function useInventoryTables(): Record<InventoryTableType, InventoryTableResult> {
  const slot = useSelectedSlot();

  return useMemo(() => {
    const owned = new Map<number, { quantity: number; upgradeLevel: number }>();
    if (slot) {
      for (const item of inventoryDbView(slot).items) {
        const cur = owned.get(item.item_id);
        owned.set(item.item_id, {
          quantity: (cur?.quantity ?? 0) + item.quantity,
          upgradeLevel: Math.max(cur?.upgradeLevel ?? 0, item.upgrade_level),
        });
      }
    }

    const join = (
      rows: ReadonlyArray<{ id: number; name: string; icon: number; rarity: string }>,
      placementType: string,
    ): InventoryTableResult => {
      const items: InventoryRow[] = rows.map((row) => {
        const o = owned.get(row.id);
        const weaponUpgradeLevel = o?.upgradeLevel ?? 0;
        return {
          ...row,
          quantity: o?.quantity ?? 0,
          weaponUpgradeLevel,
          name: weaponUpgradeLevel > 0 ? `${row.name} +${weaponUpgradeLevel.toString()}` : row.name,
          hasCoords: itemPins(placementType, row.id).length > 0,
        };
      });
      return { items, ownedCount: items.filter((i) => i.quantity > 0).length };
    };

    return Object.fromEntries(
      Object.entries(CATALOG).map(([key, rows]) => [
        key,
        join(rows, TABLE_PLACEMENT_TYPE[key as InventoryTableType]),
      ]),
    ) as Record<InventoryTableType, InventoryTableResult>;
  }, [slot]);
}

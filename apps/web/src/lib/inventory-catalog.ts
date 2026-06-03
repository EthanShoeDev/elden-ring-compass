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
import { MAP_DB_ITEMS, type MapItem } from './map-db';
import { inventoryDbView } from './vm/inventory';

const AMMO_CATEGORIES = new Set(['Arrow', 'Bolt', 'Greatarrow', 'Greatbolt']);
const goodsIn = (category: string) => GOODS.filter((g) => g.category === category);

/**
 * The inventory tables, each backed by an install-derived dataset. Equipment categories use
 * the rich datasets; the rest are `GOODS` partitioned by its `category` field. Sorceries,
 * incantations, and spirit ashes use the enriched `SPELLS`/`SPIRIT_ASHES` datasets, so those
 * `GOODS` categories are intentionally not also surfaced here (no duplication).
 */
export const CATALOG = {
  armaments: WEAPONS.filter((w) => !AMMO_CATEGORIES.has(w.category)),
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

/** A catalog row joined with the active save's ownership. */
export type WithOwnership<T> = T & {
  quantity: number;
  weaponUpgradeLevel: number;
  map_data: MapItem[] | undefined;
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
    const owned = new Map<
      number,
      { quantity: number; upgradeLevel: number; map_data?: MapItem[] }
    >();
    if (slot) {
      for (const item of inventoryDbView(slot).items) {
        const cur = owned.get(item.item_id);
        owned.set(item.item_id, {
          quantity: (cur?.quantity ?? 0) + item.quantity,
          upgradeLevel: Math.max(cur?.upgradeLevel ?? 0, item.upgrade_level),
          map_data: cur?.map_data ?? item.map_data,
        });
      }
    }

    const join = (
      rows: ReadonlyArray<{ id: number; name: string; icon: number; rarity: string }>,
    ): InventoryTableResult => {
      const items: InventoryRow[] = rows.map((row) => {
        const o = owned.get(row.id);
        const weaponUpgradeLevel = o?.upgradeLevel ?? 0;
        return {
          ...row,
          quantity: o?.quantity ?? 0,
          weaponUpgradeLevel,
          name: weaponUpgradeLevel > 0 ? `${row.name} +${weaponUpgradeLevel.toString()}` : row.name,
          map_data: o?.map_data ?? MAP_DB_ITEMS.get(row.name),
        };
      });
      return { items, ownedCount: items.filter((i) => i.quantity > 0).length };
    };

    return Object.fromEntries(
      Object.entries(CATALOG).map(([key, rows]) => [key, join(rows)]),
    ) as Record<InventoryTableType, InventoryTableResult>;
  }, [slot]);
}

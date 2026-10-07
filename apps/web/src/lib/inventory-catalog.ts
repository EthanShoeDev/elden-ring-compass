// Inventory catalog — the install-derived replacement for the old `erdb.ts` (`ERDB` +
// `useAllErdb`). Joins the catalog rows (the dataset grouping lives in the react-free
// `inventory-catalog-data.ts`) with the active save's ownership (quantity + weapon
// upgrade level + map coordinates).
import { useMemo } from 'react';

import { useSelectedSlot } from '@/stores/slot-selection-store';
import { CATALOG, TABLE_PLACEMENT_TYPE, type InventoryTableType } from './inventory-catalog-data';
import type { Slot } from './save-dto';
import { unlockedGestureGoodsIds } from './vm/gestures';
import { inventoryDbView, type InventoryItemType, ownedItemKey } from './vm/inventory';
import { itemPins } from './vm/map-pins';

export { CATALOG, TABLE_PLACEMENT_TYPE, type InventoryTableType } from './inventory-catalog-data';

/** A catalog row joined with the active save's ownership. */
export type WithOwnership<T> = T & {
  /** Total owned: `heldQuantity + storedQuantity`. */
  quantity: number;
  /** Carried by the character. */
  heldQuantity: number;
  /** Left in the Sorting Chest (storage box at a grace). */
  storedQuantity: number;
  weaponUpgradeLevel: number;
  // Whether the item has any extracted overworld pickup location (drives map
  // pinning via `enableRowSelection`). The actual pins live in `itemIdToPins`.
  hasCoords: boolean;
  // How many overworld pins selecting this row drops on the map — the visible
  // "Locations" column. `hasCoords === (locationCount > 0)`.
  locationCount: number;
};

/** Broad shape every joined row satisfies (used where the category isn't statically known). */
export type InventoryRow = WithOwnership<{
  id: number;
  name: string;
  icon: number;
  rarity: string;
}>;

export type InventoryTableResult = {
  items: InventoryRow[];
  ownedCount: number;
};

/** Which save inventory type each table's ids belong to (ids are only unique within a type). */
const TABLE_ITEM_TYPE: Record<InventoryTableType, InventoryItemType> = {
  armaments: 'WEAPON',
  ammo: 'WEAPON',
  armor: 'ARMOR',
  talismans: 'ACCESSORY',
  ashes: 'AOW',
  spells: 'ITEM',
  spirits: 'ITEM',
  tools: 'ITEM',
  craftingMaterials: 'ITEM',
  upgradeMaterials: 'ITEM',
  keyItems: 'ITEM',
  infoItems: 'ITEM',
  gestures: 'ITEM',
};

/**
 * Per-category catalog joined with save ownership. Mirrors the old `useAllErdb` contract:
 * `{ items, ownedCount }` per table. Owned quantity sums duplicate stacks; weapons show their
 * highest upgrade level (appended to the name as ` +N`, as before). Items are typed broadly
 * (`InventoryRow`); per-column field access is typed via `CATALOG` in the table definitions.
 * Gestures aren't inventory items — they're owned when unlocked in the save's gesture table.
 */
export function inventoryTables(
  slot: Readonly<Slot> | undefined,
): Record<InventoryTableType, InventoryTableResult> {
  const owned = new Map<string, { held: number; stored: number; upgradeLevel: number }>();
  if (slot) {
    for (const item of inventoryDbView(slot).items) {
      const key = ownedItemKey(item.type, item.item_id);
      const cur = owned.get(key);
      const held = (cur?.held ?? 0) + (item.location === 'held' ? item.quantity : 0);
      const stored = (cur?.stored ?? 0) + (item.location === 'storage' ? item.quantity : 0);
      owned.set(key, {
        held,
        stored,
        upgradeLevel: Math.max(cur?.upgradeLevel ?? 0, item.upgrade_level),
      });
    }
    for (const id of unlockedGestureGoodsIds(slot))
      owned.set(ownedItemKey('ITEM', id), { held: 1, stored: 0, upgradeLevel: 0 });
  }

  const join = (
    rows: ReadonlyArray<{
      id: number;
      name: string;
      icon: number;
      rarity: string;
    }>,
    itemType: InventoryItemType,
    placementType: string,
  ): InventoryTableResult => {
    const items: InventoryRow[] = rows
      // Drop the datasets' `[ERROR]Type N` placeholder rows (48 in WEAPONS, 54 in ARMOR,
      // 1 in TALISMANS) — unused item slots that would otherwise render as junk table rows.
      .filter((row) => !row.name.startsWith('[ERROR]'))
      .map((row) => {
        const o = owned.get(ownedItemKey(itemType, row.id));
        const weaponUpgradeLevel = o?.upgradeLevel ?? 0;
        const locationCount = itemPins(placementType, row.id).length;
        const heldQuantity = o?.held ?? 0;
        const storedQuantity = o?.stored ?? 0;
        return {
          ...row,
          quantity: heldQuantity + storedQuantity,
          heldQuantity,
          storedQuantity,
          weaponUpgradeLevel,
          name: weaponUpgradeLevel > 0 ? `${row.name} +${weaponUpgradeLevel.toString()}` : row.name,
          hasCoords: locationCount > 0,
          locationCount,
        };
      });
    return { items, ownedCount: items.filter((i) => i.quantity > 0).length };
  };

  return Object.fromEntries(
    Object.entries(CATALOG).map(([key, rows]) => {
      const table = key as InventoryTableType;
      return [table, join(rows, TABLE_ITEM_TYPE[table], TABLE_PLACEMENT_TYPE[table])];
    }),
  ) as Record<InventoryTableType, InventoryTableResult>;
}

/** {@link inventoryTables} for the selected save slot. */
export function useInventoryTables(): Record<InventoryTableType, InventoryTableResult> {
  const slot = useSelectedSlot();
  return useMemo(() => inventoryTables(slot), [slot]);
}

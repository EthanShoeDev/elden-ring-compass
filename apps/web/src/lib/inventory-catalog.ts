// Inventory catalog — the install-derived replacement for the old `erdb.ts` (`ERDB` +
// `useAllErdb`). Joins the catalog rows (the dataset grouping lives in the react-free
// `inventory-catalog-data.ts`) with the active save's ownership (quantity + weapon
// upgrade level + map coordinates).
import { Array as Arr, Record as Rec, String as Str } from 'effect';
import { useMemo } from 'react';

import { useSelectedSlot } from '@/stores/slot-selection-store';

import { type DlcScope, inDlcScope } from './dlc';
import { useDlcScope } from './dlc-scope';
import {
  CATALOG,
  TABLE_PLACEMENT_TYPE,
  type InventoryTableType,
} from './inventory-catalog-data';
import { realmLabels } from './map-affine';
import type { Slot } from './save-dto';
import { equippedItemKeys } from './vm/equipement';
import { unlockedGestureGoodsIds } from './vm/gestures';
import {
  inventoryDbView,
  type InventoryItemType,
  ownedItemKey,
} from './vm/inventory';
import { itemPins } from './vm/map-pins';

export {
  CATALOG,
  TABLE_PLACEMENT_TYPE,
  type InventoryTableType,
} from './inventory-catalog-data';

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
  /** A copy is equipped (weapon/armor/talisman slot, quick slot or pouch, memorized spell). */
  equipped: boolean;
  /** Where your copies are — see {@link ItemStatus}. `['Missing']` when you have none. */
  status: readonly ItemStatus[];
  /** Realms of the item's pickup locations (`realmLabels`), `['Not on map']` when none. */
  realms: readonly string[];
};

/**
 * Where a character's copies of an item are. One item can be several at once —
 * equipped ⊂ carried, and a stack can be split between your pockets and the
 * Sorting Chest (the storage box at a Site of Grace). Gestures aren't items: an
 * unlocked one is just `Unlocked`.
 */
export const ITEM_STATUS = [
  'Equipped',
  'Carried',
  'Sorting Chest',
  'Unlocked',
  'Missing',
] as const;
export type ItemStatus = (typeof ITEM_STATUS)[number];
/** Every status that means "you have it". */
export const OWNED_STATUSES: readonly ItemStatus[] = Arr.filter(
  ITEM_STATUS,
  (s) => s !== 'Missing',
);

const itemStatus = (
  o: { held: number; stored: number } | undefined,
  equipped: boolean,
  isGesture: boolean,
): ItemStatus[] => {
  if (isGesture) return o ? ['Unlocked'] : ['Missing'];
  const status: ItemStatus[] = [];
  if (equipped) status.push('Equipped');
  if ((o?.held ?? 0) > 0) status.push('Carried');
  if ((o?.stored ?? 0) > 0) status.push('Sorting Chest');
  return status.length > 0 ? status : ['Missing'];
};

/** Broad shape every joined row satisfies (used where the category isn't statically known). */
export type InventoryRow = WithOwnership<{
  id: number;
  name: string;
  icon: number;
  rarity: string;
  /** Added by Shadow of the Erdtree (install-derived). */
  isDlc: boolean;
}>;

export type InventoryTableResult = {
  items: InventoryRow[];
  ownedCount: number;
};

/**
 * The game's "nothing equipped" sentinels: the engine fills an empty slot with
 * these fixed param rows ("Bare head with no armor equipped.", "No armament
 * equipped."), so every character holds them. They aren't collectible and the
 * game ships no menu icon for most of them (1097–1099 are absent from the icon
 * binder; Legs' 1100 is another item's art), so listing them only adds
 * icon-less "Held" rows and inflates the owned counts.
 */
const EMPTY_SLOT_ITEMS: ReadonlySet<string> = new Set([
  ownedItemKey('WEAPON', 110_000), // Unarmed
  ownedItemKey('ARMOR', 10_000), // Head
  ownedItemKey('ARMOR', 10_100), // Body
  ownedItemKey('ARMOR', 10_200), // Arms
  ownedItemKey('ARMOR', 10_300), // Legs
]);

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
 * Rows outside `scope` (base game / DLC) are left out, so `ownedCount` follows it too.
 */
export function inventoryTables(
  slot: Readonly<Slot> | undefined,
  scope: DlcScope = 'all',
): Record<InventoryTableType, InventoryTableResult> {
  const owned = new Map<
    string,
    { held: number; stored: number; upgradeLevel: number }
  >();
  const equipped = new Set<string>();
  if (slot) {
    for (const item of inventoryDbView(slot).items) {
      const key = ownedItemKey(item.type, item.item_id);
      const cur = owned.get(key);
      const held =
        (cur?.held ?? 0) + (item.location === 'held' ? item.quantity : 0);
      const stored =
        (cur?.stored ?? 0) + (item.location === 'storage' ? item.quantity : 0);
      owned.set(key, {
        held,
        stored,
        upgradeLevel: Math.max(cur?.upgradeLevel ?? 0, item.upgrade_level),
      });
    }
    for (const k of equippedItemKeys(slot)) equipped.add(k);
    for (const id of unlockedGestureGoodsIds(slot))
      owned.set(ownedItemKey('ITEM', id), {
        held: 1,
        stored: 0,
        upgradeLevel: 0,
      });
  }

  const join = (
    rows: ReadonlyArray<{
      id: number;
      name: string;
      icon: number;
      rarity: string;
      isDlc: boolean;
    }>,
    itemType: InventoryItemType,
    placementType: string,
    isGesture: boolean,
  ): InventoryTableResult => {
    const items: InventoryRow[] = Arr.map(
      // Drop the datasets' `[ERROR]Type N` placeholder rows (48 in WEAPONS, 54 in ARMOR,
      // 1 in TALISMANS) — unused item slots that would otherwise render as junk table rows
      // — and the empty-slot sentinels (see EMPTY_SLOT_ITEMS).
      Arr.filter(
        rows,
        (row) =>
          !Str.startsWith('[ERROR]')(row.name) &&
          !EMPTY_SLOT_ITEMS.has(ownedItemKey(itemType, row.id)) &&
          inDlcScope(scope, row.isDlc),
      ),
      (row) => {
        const key = ownedItemKey(itemType, row.id);
        const o = owned.get(key);
        const weaponUpgradeLevel = o?.upgradeLevel ?? 0;
        const pins = itemPins(placementType, row.id);
        const locationCount = pins.length;
        // Goods count as equipped only when carried: a flask's quick slot holds
        // the base flask id (1001), not the upgraded one you actually have. An
        // Ash of War attached to an equipped weapon has no stack of its own, so
        // equipped alone is enough for it.
        const isEquipped =
          equipped.has(key) && (itemType !== 'ITEM' || (o?.held ?? 0) > 0);
        const heldQuantity = o?.held ?? 0;
        const storedQuantity = o?.stored ?? 0;
        return {
          ...row,
          quantity: heldQuantity + storedQuantity,
          heldQuantity,
          storedQuantity,
          weaponUpgradeLevel,
          name:
            weaponUpgradeLevel > 0
              ? `${row.name} +${weaponUpgradeLevel.toString()}`
              : row.name,
          hasCoords: locationCount > 0,
          locationCount,
          equipped: isEquipped,
          status: itemStatus(o, isEquipped, isGesture),
          realms: realmLabels(Arr.map(pins, (p) => p.master)),
        };
      },
    );
    return {
      items,
      ownedCount: Arr.filter(items, (i) => !i.status.includes('Missing'))
        .length,
    };
  };

  return Rec.fromEntries(
    Arr.map(Rec.toEntries(CATALOG), ([table, rows]) => [
      table,
      join(
        rows,
        TABLE_ITEM_TYPE[table],
        TABLE_PLACEMENT_TYPE[table],
        table === 'gestures',
      ),
    ]),
  ) as Record<InventoryTableType, InventoryTableResult>;
}

/**
 * {@link inventoryTables} for the selected save slot, limited to the global
 * content scope — or to `scopeOverride` (data tables pass `'all'`: their
 * Content filter mirrors the scope instead, so every option stays listed).
 */
export function useInventoryTables(
  scopeOverride?: DlcScope,
): Record<InventoryTableType, InventoryTableResult> {
  const slot = useSelectedSlot();
  const { scope: globalScope } = useDlcScope();
  const scope = scopeOverride ?? globalScope;
  return useMemo(() => inventoryTables(slot, scope), [slot, scope]);
}

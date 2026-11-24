import { SPIRIT_ASHES } from '@elden-ring-compass/data';
import { Array as Arr } from 'effect';

import {
  accessoryNameById,
  aowNameById,
  armorNameById,
  itemNameById,
  weaponNameById,
} from '../game-data';
import type { EquipInventoryData, GaItem, Slot } from '../save-dto';

// For converting gaitem.item_id to item
export const InventoryItemTypeToOffset = {
  EMPTY: -1,
  WEAPON: 0x0,
  ARMOR: 0x10000000,
  ACCESSORY: 0x20000000,
  ITEM: 0x40000000,
  AOW: 0x80000000,
} as const;
// For finding the type of commonItem
export const InventoryGaItemTypeToOffset = {
  EMPTY: -1,
  WEAPON: 0x80000000,
  ARMOR: 0x90000000,
  ACCESSORY: 0xa0000000,
  ITEM: 0xb0000000,
  AOW: 0xc0000000,
} as const;

const SPIRIT_ASH_IDS: ReadonlySet<number> = new Set(
  Arr.map(SPIRIT_ASHES, (s) => s.id),
);

/**
 * Goods id → catalog id + upgrade level. Spirit ashes are one goods row per
 * upgrade level (Mimic Tear Ashes +8 = 207008) while the catalog lists only the
 * +0 id, so an upgraded ash would never match its row. Other goods pass through.
 */
export function normalizeGoodsId(id: number): {
  id: number;
  upgradeLevel: number;
} {
  const level = id % 100;
  return level > 0 && SPIRIT_ASH_IDS.has(id - level)
    ? { id: id - level, upgradeLevel: level }
    : { id, upgradeLevel: 0 };
}

/** Where an inventory stack lives: carried by the character, or in the Sorting Chest at a grace. */
export type InventoryLocation = 'held' | 'storage';

export function inventoryDbView(slot: Readonly<Slot>) {
  function itemTypeFromGaHandle(
    gaHandle: number,
  ): keyof typeof InventoryGaItemTypeToOffset {
    const itemType = (gaHandle & 0xf0000000) >>> 0;

    if (itemType === -1) return 'EMPTY';
    if (itemType === InventoryGaItemTypeToOffset.WEAPON) return 'WEAPON';
    if (itemType === InventoryGaItemTypeToOffset.ARMOR) return 'ARMOR';
    if (itemType === InventoryGaItemTypeToOffset.ACCESSORY) return 'ACCESSORY';
    if (itemType === InventoryGaItemTypeToOffset.ITEM) return 'ITEM';
    if (itemType === InventoryGaItemTypeToOffset.AOW) return 'AOW';
    return 'EMPTY';
  }
  // Wont need this function, its mostly for writing to save
  function getNextItemIndexes(slot: Readonly<Slot>) {
    // Handle empty ga_items (e.g., shared view data)
    if (slot.ga_items.length === 0) {
      return {
        next_gaitem_handle: 0,
        part_gaitem_handle: 0,
        next_aow_index: 0,
        next_armament_or_armor_index: 0,
      };
    }

    let next_gaitem_handle = 0;
    let part_gaitem_handle = 0;
    let next_aow_index = 0;
    let next_armament_or_armor_index = 0;
    for (const [index, gaitem] of slot.ga_items.entries()) {
      if (itemTypeFromGaHandle(gaitem.gaitem_handle) === 'AOW') {
        next_aow_index = index;
      }
      if ((gaitem.gaitem_handle & 0xffff) >>> 0 > part_gaitem_handle) {
        next_gaitem_handle = (gaitem.gaitem_handle & 0xffff) >>> 0;
        next_armament_or_armor_index = index;
      }
    }
    const firstGaItem = slot.ga_items[0];
    if (firstGaItem) {
      part_gaitem_handle = ((firstGaItem.gaitem_handle >> 16) & 0xff) >>> 0;
    }

    next_gaitem_handle += 1;
    next_aow_index += 1;
    next_armament_or_armor_index += 1;

    return {
      next_gaitem_handle,
      part_gaitem_handle,
      next_aow_index,
      next_armament_or_armor_index,
    };
  }

  const gaItemMap = new Map<number, GaItem>(
    Arr.map(slot.ga_items, (i) => [i.gaitem_handle, i]),
  );
  // Both halves of an inventory: newer saves keep Crystal Tears, Great Runes and crafting tools
  // in the key-item list, so reading only `common_items` drops them. Key items take equip
  // indexes 0..0x17F; common items start at 0x180.
  const fill_storage_type = (
    inventory_data: EquipInventoryData,
    location: InventoryLocation,
  ) => [
    ...resolve_items(inventory_data.common_items, 0x180, location),
    ...resolve_items(inventory_data.key_items, 0, location),
  ];
  const resolve_items = (
    items: EquipInventoryData['common_items'],
    equip_index_base: number,
    location: InventoryLocation,
  ) =>
    Arr.filter(
      Arr.map(items, (commonItem, idx) => {
        const itemType = itemTypeFromGaHandle(commonItem.ga_item_handle);
        const equip_index = idx + equip_index_base;

        const gaitem: GaItem | undefined = [
          'ACCESSORY',
          'ITEM',
          'EMPTY',
        ].includes(itemType)
          ? {
              gaitem_handle: 0,
              item_id: 0,
              gem_gaitem_handle: 0,
            }
          : gaItemMap.get(commonItem.ga_item_handle);

        // For shared view data, ga_items may be empty - skip items that can't be resolved
        if (!gaitem) {
          return null;
        }

        const rawId = ['ACCESSORY', 'ITEM', 'EMPTY'].includes(itemType)
          ? commonItem.ga_item_handle ^ InventoryGaItemTypeToOffset[itemType]
          : gaitem.item_id ^ InventoryItemTypeToOffset[itemType];
        // Upgraded spirit ashes: keep the +0 id plus the level, like weapons.
        const goods =
          itemType === 'ITEM'
            ? normalizeGoodsId(rawId)
            : { id: rawId, upgradeLevel: 0 };
        const itemId = goods.id + goods.upgradeLevel;

        const upgrade_level =
          itemType === 'WEAPON' ? gaitem.item_id % 100 : goods.upgradeLevel;
        const itemName = (() => {
          if (itemType === 'WEAPON') {
            const baseId = itemId - upgrade_level;
            const weaponName =
              weaponNameById.get(baseId) ?? `[UNKOWN_${baseId.toString()}]`;

            return upgrade_level > 0
              ? `${weaponName} +${upgrade_level.toString()}`
              : weaponName;
          } else if (itemType === 'ARMOR') {
            return armorNameById.get(itemId) ?? `[UNKOWN_${itemId.toString()}]`;
          } else if (itemType === 'ACCESSORY') {
            return (
              accessoryNameById.get(itemId) ?? `[UNKOWN_${itemId.toString()}]`
            );
          } else if (itemType === 'ITEM') {
            const name =
              itemNameById.get(goods.id) ?? `[UNKOWN_${goods.id.toString()}]`;
            return upgrade_level > 0
              ? `${name} +${upgrade_level.toString()}`
              : name;
          } else if (itemType === 'AOW') {
            return aowNameById.get(itemId) ?? `[UNKOWN_${itemId.toString()}]`;
          }
          return 'Unknown';
        })();

        return {
          ga_item_handle: commonItem.ga_item_handle,
          item_id: itemId - upgrade_level,
          item_name: itemName,
          quantity: commonItem.quantity,
          inventory_index: commonItem.inventory_index,
          equip_index,
          type: itemType,
          upgrade_level,
          location,
        };
      }),
      (i): i is NonNullable<typeof i> =>
        i !== null && i.item_id !== -1 && i.item_id !== 0,
    );

  const equip_inventory = fill_storage_type(slot.equip_inventory_data, 'held');
  const storage_inventory = fill_storage_type(
    slot.storage_inventory_data,
    'storage',
  );

  const userInventory = {
    ...getNextItemIndexes(slot),
    items: [...equip_inventory, ...storage_inventory],
  };

  return userInventory;
}

export type InventoryItemType = keyof typeof InventoryGaItemTypeToOffset;

/**
 * Ownership key for an inventory item. Item ids are only unique WITHIN a type (talisman 1000 is
 * Crimson Amber Medallion, goods 1000 is a Flask of Crimson Tears), so every ownership lookup
 * must key on type + id — never the bare id.
 */
export const ownedItemKey = (type: InventoryItemType, id: number) =>
  `${type}:${id.toString()}`;

/** Goods (consumables, key items, tears, gestures...) held across inventory + storage: id -> total quantity. */
export function goodsQuantityById(slot: Readonly<Slot>): Map<number, number> {
  const quantities = new Map<number, number>();
  for (const item of inventoryDbView(slot).items) {
    if (item.type !== 'ITEM') continue;
    quantities.set(
      item.item_id,
      (quantities.get(item.item_id) ?? 0) + item.quantity,
    );
  }
  return quantities;
}

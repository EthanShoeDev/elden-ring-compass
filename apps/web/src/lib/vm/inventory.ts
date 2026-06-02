import { RAW_ELDEN_RING_DB } from '../elden-ring-raw-db/er-raw-db';
import { MAP_DB_ITEMS } from '../map-db';
import { EquipInventoryData, GaItem, Slot, StorageInventoryData } from '../wasm-wrapper';

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
export type InventoryItemType = keyof typeof InventoryItemTypeToOffset;

export const inventoryItemTypes: Array<string> = Object.keys(InventoryItemTypeToOffset);

export function inventoryDbView(slot: Readonly<Slot>) {
  function itemTypeFromGaHandle(gaHandle: number): keyof typeof InventoryGaItemTypeToOffset {
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
    if (!slot.ga_items || slot.ga_items.length === 0) {
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

    next_gaitem_handle = next_gaitem_handle + 1;
    next_aow_index = next_aow_index + 1;
    next_armament_or_armor_index = next_armament_or_armor_index + 1;

    return {
      next_gaitem_handle,
      part_gaitem_handle,
      next_aow_index,
      next_armament_or_armor_index,
    };
  }

  const gaItemMap = new Map<number, GaItem>((slot.ga_items || []).map((i) => [i.gaitem_handle, i]));
  const fill_storage_type = (inventory_data: EquipInventoryData | StorageInventoryData) => {
    return inventory_data.common_items
      .map((commonItem, idx) => {
        const itemType = itemTypeFromGaHandle(commonItem.ga_item_handle);
        const equip_index = idx + 0x180;

        const gaitem: GaItem | undefined = ['ACCESSORY', 'ITEM', 'EMPTY'].includes(itemType)
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

        const itemId = ['ACCESSORY', 'ITEM', 'EMPTY'].includes(itemType)
          ? commonItem.ga_item_handle ^ InventoryGaItemTypeToOffset[itemType]
          : gaitem.item_id ^ InventoryItemTypeToOffset[itemType];

        const upgrade_level = itemType === 'WEAPON' ? gaitem.item_id % 100 : 0;
        const itemName = (() => {
          if (itemType === 'WEAPON') {
            const idStr = (itemId - upgrade_level).toString();
            const weaponName = RAW_ELDEN_RING_DB.WEAPON_NAME[idStr] ?? `[UNKOWN_${idStr}]`;

            return upgrade_level > 0 ? `${weaponName} +${upgrade_level.toString()}` : weaponName;
          } else if (itemType === 'ARMOR') {
            return (
              RAW_ELDEN_RING_DB.ARMOR_NAME[itemId.toString()] ?? `[UNKOWN_${itemId.toString()}]`
            );
          } else if (itemType === 'ACCESSORY') {
            return (
              RAW_ELDEN_RING_DB.ACCESSORY_NAME[itemId.toString()] ?? `[UNKOWN_${itemId.toString()}]`
            );
          } else if (itemType === 'ITEM') {
            return (
              RAW_ELDEN_RING_DB.ITEM_NAMES[itemId.toString()] ?? `[UNKOWN_${itemId.toString()}]`
            );
          } else if (itemType === 'AOW') {
            return RAW_ELDEN_RING_DB.AOW_NAME[itemId.toString()] ?? `[UNKOWN_${itemId.toString()}]`;
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
          map_data: MAP_DB_ITEMS.get(itemName),
        };
      })
      .filter((i): i is NonNullable<typeof i> => i !== null && i.item_id != -1 && i.item_id != 0);
  };

  const equip_inventory = fill_storage_type(slot.equip_inventory_data);
  const storage_inventory = fill_storage_type(slot.storage_inventory_data);

  const userInventory = {
    ...getNextItemIndexes(slot),
    items: [...equip_inventory, ...storage_inventory],
  };

  return userInventory;
}
export type UserInventoryDbView = ReturnType<typeof inventoryDbView>;

import { RAW_ELDEN_RING_DB } from '../elden-ring-raw-db/er-raw-db';
import {
  EquipInventoryData,
  GaItem,
  Slot,
  StorageInventoryData,
} from '../wasm-wrapper';

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

export const inventoryItemTypes: string[] = Object.keys(
  InventoryItemTypeToOffset
);

export function inventoryDbView(slot: Readonly<Slot>) {
  function itemTypeFromGaHandle(
    gaHandle: number
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
    part_gaitem_handle = ((slot.ga_items[0].gaitem_handle >> 16) & 0xff) >>> 0;

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

  const fill_storage_type = (
    inventory_data: EquipInventoryData | StorageInventoryData
  ) => {
    return inventory_data.common_items.map((commonItem, idx) => {
      const itemType = itemTypeFromGaHandle(commonItem.ga_item_handle);
      const equip_index = idx + 0x180;

      const gaitem: GaItem | undefined = [
        'ACCESSORY',
        'ITEM',
        'EMPTY',
      ].includes(itemType)
        ? {
            gaitem_handle: 0,
            item_id: 0,
            unk2: -1,
            unk3: -1,
            aow_gaitem_handle: 0xffffffff, // u32::MAX
            unk5: 0,
          }
        : slot.ga_items.find(
            (item) => item.gaitem_handle === commonItem.ga_item_handle
          );

      if (!gaitem)
        throw new Error(
          `Could not find gaitem for common item: ${commonItem.ga_item_handle.toString()}`
        );

      const itemInfo: {
        itemId: number;
        itemName: string;
      } = (() => {
        const id = gaitem.item_id ^ InventoryItemTypeToOffset[itemType];
        const idStr = id.toString();

        if (itemType === 'WEAPON') {
          const upgrade_level = gaitem.item_id % 100;
          const idStr = (id - upgrade_level).toString();
          const weaponName =
            RAW_ELDEN_RING_DB.WEAPON_NAME[idStr] ?? `[UNKOWN_${idStr}]`;

          return {
            itemId: gaitem.item_id,
            itemName:
              upgrade_level > 0
                ? `${weaponName} +${upgrade_level.toString()}`
                : weaponName,
          };
        } else if (itemType === 'ARMOR') {
          return {
            itemId: id,
            itemName:
              RAW_ELDEN_RING_DB.ARMOR_NAME[idStr] ?? `[UNKOWN_${idStr}]`,
          };
        } else if (itemType === 'ACCESSORY') {
          return {
            itemId: id,
            itemName:
              RAW_ELDEN_RING_DB.ACCESSORY_NAME[idStr] ?? `[UNKOWN_${idStr}]`,
          };
        } else if (itemType === 'ITEM') {
          return {
            itemId: id,
            itemName:
              RAW_ELDEN_RING_DB.ITEM_NAMES[idStr] ?? `[UNKOWN_${idStr}]`,
          };
        } else if (itemType === 'AOW') {
          return {
            itemId: id,
            itemName: RAW_ELDEN_RING_DB.AOW_NAME[idStr] ?? `[UNKOWN_${idStr}]`,
          };
        }
        return {
          itemId: 0,
          itemName: 'Unknown',
        };
      })();

      return {
        ga_item_handle: commonItem.ga_item_handle,
        item_id: itemInfo.itemId,
        item_name: itemInfo.itemName,
        quantity: commonItem.quantity,
        inventory_index: commonItem.inventory_index,
        equip_index,
        type: itemType,
      };
    });
  };

  const equip_inventory = fill_storage_type(slot.equip_inventory_data);
  const storage_inventory = fill_storage_type(slot.storage_inventory_data);

  const userInventory = {
    ...getNextItemIndexes(slot),
    items: [...equip_inventory, ...storage_inventory].filter(
      (i) => i.item_id != 0
    ),
  };

  return userInventory;
}
export type UserInventoryDbView = ReturnType<typeof inventoryDbView>;

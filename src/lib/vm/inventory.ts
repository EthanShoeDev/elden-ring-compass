import { RAW_ELDEN_RING_DB } from '../elden-ring-raw-db/er-raw-db';
import {
  CommonItem,
  EquipInventoryData,
  GaItem,
  Slot,
  StorageInventoryData,
} from '../wasm-wrapper';

export const InventoryItemTypeToOffset = {
  EMPTY: -1,
  WEAPON: 0x0,
  ARMOR: 0x10000000,
  ACCESSORY: 0x20000000,
  ITEM: 0x40000000,
  AOW: 0x80000000,
} as const;
export const InventoryGaitemTypeToOffset = {
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
  ): keyof typeof InventoryGaitemTypeToOffset {
    const itemType = (gaHandle & 0xf0000000) >>> 0;

    if (itemType === -1) return 'EMPTY';
    if (itemType === InventoryGaitemTypeToOffset.WEAPON) return 'WEAPON';
    if (itemType === InventoryGaitemTypeToOffset.ARMOR) return 'ARMOR';
    if (itemType === InventoryGaitemTypeToOffset.ACCESSORY) return 'ACCESSORY';
    if (itemType === InventoryGaitemTypeToOffset.ITEM) return 'ITEM';
    if (itemType === InventoryGaitemTypeToOffset.AOW) return 'AOW';
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
  function getWeaponNameFromId(id: number): string {
    const idStr = id.toString();
    return RAW_ELDEN_RING_DB.WEAPON_NAME[idStr] ?? `[UNKOWN_${idStr}]`;
  }

  function get_item_type_specific({
    item_info,
    gaitem,
    gaitem_type,
    equip_index,
  }: {
    item_info: CommonItem;
    equip_index: number;
    gaitem: GaItem;
    gaitem_type: keyof typeof InventoryGaitemTypeToOffset;
  }) {
    let item_type_specific: [number, string] = [0, ''];
    if (gaitem_type === 'WEAPON') {
      const id = Math.round(gaitem.item_id);
      const upgrade_level = gaitem.item_id % 100;
      const weaponName = getWeaponNameFromId(id - upgrade_level);

      item_type_specific = [
        gaitem.item_id,
        upgrade_level > 0
          ? `${weaponName} +${upgrade_level.toString()}`
          : weaponName,
      ];
    } else if (gaitem_type === 'ARMOR') {
      const id = gaitem.item_id ^ InventoryItemTypeToOffset.ARMOR;
      const idStr = id.toString();
      const armorName =
        RAW_ELDEN_RING_DB.ARMOR_NAME[idStr] ?? `[UNKOWN_${idStr}]`;
      item_type_specific = [id, armorName];
    } else if (gaitem_type === 'ACCESSORY') {
      const id =
        item_info.ga_item_handle ^ InventoryGaitemTypeToOffset.ACCESSORY;
      const idStr = id.toString();
      const accessoryName =
        RAW_ELDEN_RING_DB.ACCESSORY_NAME[idStr] ?? `[UNKOWN_${idStr}]`;
      item_type_specific = [id, accessoryName];
    } else if (gaitem_type === 'ITEM') {
      const id = item_info.ga_item_handle ^ InventoryGaitemTypeToOffset.ITEM;
      const idStr = id.toString();
      const itemName =
        RAW_ELDEN_RING_DB.ITEM_NAMES[idStr] ?? `[UNKOWN_${idStr}]`;
      item_type_specific = [id, itemName];
    } else if (gaitem_type === 'AOW') {
      const id = gaitem.item_id ^ InventoryItemTypeToOffset.AOW;
      const idStr = id.toString();
      const aowName = RAW_ELDEN_RING_DB.AOW_NAME[idStr] ?? `[UNKOWN_${idStr}]`;
      item_type_specific = [id, aowName];
    }

    return {
      ga_item_handle: item_info.ga_item_handle,
      item_id: item_type_specific[0],
      item_name: item_type_specific[1],
      quantity: item_info.quantity,
      inventory_index: item_info.inventory_index,
      equip_index,
      type: gaitem_type,
    };
  }

  function get_inventory_vm_item_from_save({
    commonItem,
    inventory_gaitem_type,
    equip_index,
  }: {
    commonItem: CommonItem;
    inventory_gaitem_type: keyof typeof InventoryGaitemTypeToOffset;
    equip_index: number;
  }) {
    const gaitem = ['ACCESSORY', 'ITEM', 'EMPTY'].includes(
      inventory_gaitem_type
    )
      ? default_gaitem
      : slot.ga_items.find(
          (item) => item.gaitem_handle === commonItem.ga_item_handle
        );
    if (!gaitem)
      throw new Error(
        `Could not find gaitem for common item: ${commonItem.ga_item_handle.toString()}`
      );
    return get_item_type_specific({
      item_info: commonItem,
      gaitem: gaitem,
      gaitem_type: inventory_gaitem_type,
      equip_index,
    });
  }

  const default_gaitem: GaItem = {
    gaitem_handle: 0,
    item_id: 0,
    unk2: -1,
    unk3: -1,
    aow_gaitem_handle: 0xffffffff, // u32::MAX
    unk5: 0,
  };

  const fill_storage_type = (
    inventory_data: EquipInventoryData | StorageInventoryData
  ) => {
    return inventory_data.common_items.map((item, idx) => {
      const inventory_gaitem_type = itemTypeFromGaHandle(item.ga_item_handle);
      const equip_index = idx + 0x180;

      return get_inventory_vm_item_from_save({
        commonItem: item,
        inventory_gaitem_type,
        equip_index,
      });
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

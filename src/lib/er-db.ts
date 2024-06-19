import { ACCESSORY_NAME } from './elden-ring-db/ACCESSORY_NAME';
import { AOWS } from './elden-ring-db/AOWS';
import { AOW_NAME } from './elden-ring-db/AOW_NAME';
import { ARCHE_TYPE } from './elden-ring-db/ARCHE_TYPE';
import { ARMORS } from './elden-ring-db/ARMORS';
import { ARMOR_NAME } from './elden-ring-db/ARMOR_NAME';
import { BOSSES } from './elden-ring-db/BOSSES';
import { COLOSSEUMS } from './elden-ring-db/COLOSSEUMS';
import { COOKBOOKS } from './elden-ring-db/COOKBOOKS';
import { EVENT_FLAGS } from './elden-ring-db/EVENT_FLAGS';
import { GRACES } from './elden-ring-db/GRACES';
import { ITEMS } from './elden-ring-db/ITEMS';
import { ITEM_NAMES } from './elden-ring-db/ITEM_NAMES';
import { MAPS } from './elden-ring-db/MAPS';
import { MAP_NAMES } from './elden-ring-db/MAP_NAMES';
import { REGIONS } from './elden-ring-db/REGIONS';
import { STARTING_CLASSES } from './elden-ring-db/STARTING_CLASSES';
import * as STATS from './elden-ring-db/STATS';
import { SUMMONING_POOLS } from './elden-ring-db/SUMMONING_POOLS';
import { TALISMANS } from './elden-ring-db/TALISMANS';
import { WEAPONS } from './elden-ring-db/WEAPONS';
import { WEAPON_NAME } from './elden-ring-db/WEAPON_NAME';
import { WHETBLADES } from './elden-ring-db/WHETBLADES';
import {
  CommonItem,
  EquipInventoryData,
  GaItem,
  Slot,
  StorageInventoryData,
} from './wasm-wrapper';

export const RAW_ELDEN_RING_DB = {
  ACCESSORY_NAME, // itemId -> name
  AOWS, //
  AOW_NAME,
  ARCHE_TYPE,
  ARMORS,
  ARMOR_NAME,
  BOSSES,
  COLOSSEUMS,
  COOKBOOKS,
  EVENT_FLAGS,
  GRACES,
  ITEMS,
  ITEM_NAMES,
  MAPS,
  MAP_NAMES,
  REGIONS,
  STARTING_CLASSES,
  STATS,
  SUMMONING_POOLS,
  TALISMANS,
  WEAPONS,
  WEAPON_NAME,
  WHETBLADES,
};

const InventoryItemType = {
  NONE: -1,
  WEAPON: 0x0,
  ARMOR: 0x10000000,
  ACCESSORY: 0x20000000,
  ITEM: 0x40000000,
  AOW: 0x80000000,
};
const InventoryGaitemType = {
  EMPTY: -1,
  WEAPON: 0x80000000,
  ARMOR: 0x90000000,
  ACCESSORY: 0xa0000000,
  ITEM: 0xb0000000,
  AOW: 0xc0000000,
};

function itemTypeFromGaHandle(
  gaHandle: number
): keyof typeof InventoryGaitemType {
  const itemType = (gaHandle & 0xf0000000) >>> 0;

  if (itemType === -1) return 'EMPTY';
  if (itemType === InventoryGaitemType.WEAPON) return 'WEAPON';
  if (itemType === InventoryGaitemType.ARMOR) return 'ARMOR';
  if (itemType === InventoryGaitemType.ACCESSORY) return 'ACCESSORY';
  if (itemType === InventoryGaitemType.ITEM) return 'ITEM';
  if (itemType === InventoryGaitemType.AOW) return 'AOW';
  return 'EMPTY';
}

export function inventoryDbView(slot: Readonly<Slot>) {
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

  function getWeaponNameFromId(id: number): string {
    const idStr = id.toString();
    return WEAPON_NAME[idStr] ?? `[UNKOWN_${idStr}]`;
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
    gaitem_type: keyof typeof InventoryGaitemType;
  }) {
    let item_type_specific: [number, string] = [0, ''];
    if (gaitem_type === 'WEAPON') {
      const id = (gaitem.item_id / 100) * 100;
      const upgrade_level = gaitem.item_id % 100;
      const weaponName = getWeaponNameFromId(id);

      item_type_specific = [
        gaitem.item_id,
        upgrade_level > 0
          ? `${weaponName} +${upgrade_level.toString()}`
          : weaponName,
      ];
    } else if (gaitem_type === 'ARMOR') {
      const id = gaitem.item_id ^ InventoryItemType.ARMOR;
      const idStr = id.toString();
      const armorName = ARMOR_NAME[idStr] ?? `[UNKOWN_${idStr}]`;
      item_type_specific = [id, armorName];
    } else if (gaitem_type === 'ACCESSORY') {
      const id = item_info.ga_item_handle ^ InventoryGaitemType.ACCESSORY;
      const idStr = id.toString();
      const accessoryName = ACCESSORY_NAME[idStr] ?? `[UNKOWN_${idStr}]`;
      item_type_specific = [id, accessoryName];
    } else if (gaitem_type === 'ITEM') {
      const id = item_info.ga_item_handle ^ InventoryGaitemType.ITEM;
      const idStr = id.toString();
      const itemName = ITEM_NAMES[idStr] ?? `[UNKOWN_${idStr}]`;
      item_type_specific = [id, itemName];
    } else if (gaitem_type === 'AOW') {
      const id = gaitem.item_id ^ InventoryItemType.AOW;
      const idStr = id.toString();
      const aowName = AOW_NAME[idStr] ?? `[UNKOWN_${idStr}]`;
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

  const default_gaitem: GaItem = {
    gaitem_handle: 0,
    item_id: 0,
    unk2: -1,
    unk3: -1,
    // aow_gaitem_handle: u32::MAX,
    aow_gaitem_handle: 0xffffffff,
    unk5: 0,
  };

  function get_inventory_vm_item_from_save({
    commonItem,
    inventory_gaitem_type,
    equip_index,
  }: {
    commonItem: CommonItem;
    inventory_gaitem_type: keyof typeof InventoryGaitemType;
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
    next_gaitem_handle,
    part_gaitem_handle,
    next_aow_index,
    next_armament_or_armor_index,
    items: [...equip_inventory, ...storage_inventory],
  };

  return userInventory;
}

export type UserInventoryDbView = ReturnType<typeof inventoryDbView>;

export function playerNameBytesToString(bytes: Readonly<number[]>) {
  return bytes
    .map((i) => String.fromCharCode(i))
    .join('')
    .replaceAll(String.fromCharCode(0), ' ')
    .trimEnd()
    .toLowerCase();
}

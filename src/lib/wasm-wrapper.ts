/* eslint-disable @typescript-eslint/no-unsafe-return */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { parse_save_internal_rust } from 'elden-ring-save-parser';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function prettyPrint(obj: object) {
  const prettyArray = (arr: any[]) => {
    if (arr.length < 3) return arr;
    return arr
      .slice(0, 3)
      .map((i) =>
        typeof i === 'object'
          ? traverseObject(i as object)
          : typeof i === 'bigint'
            ? '// BigInt'
            : i
      );
  };

  const traverseObject = (obj: object): object =>
    Object.fromEntries(
      Object.entries(obj).map(([k, v]) => {
        if (Array.isArray(v)) return [k, prettyArray(v)];
        if (typeof v === 'bigint') return [k, '// BigInt'];
        if (typeof v === 'object') return [k, traverseObject(v as object)];
        return [k, v];
      })
    );

  return traverseObject(obj);
}

export function parse_save_wasm(save_data: Uint8Array) {
  // console.profile('parse_save_wasm_profile');
  console.time('parse_save_wasm');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const result = parse_save_internal_rust(save_data) as WasmEldenRingSave;
  console.timeEnd('parse_save_wasm');
  // console.profileEnd('parse_save_wasm_profile');

  // const pretty = prettyPrint(result);
  // const prettyJson = JSON.stringify(pretty, undefined, 2);
  // console.log(pretty);
  // console.log(prettyJson);
  return result;
}

export type WasmEldenRingSave = {
  global_steam_id: string;
  character_steam_ids: string[];
  profile_summaries: ProfileSummary[];
  regulation: number[];
  slots: Slot[];
  user_data_11: UserData11;
};

export type ProfileSummary = {
  character_name: number[];
  level: number;
  _0x28: number;
  _0x2c: number;
  _0x30: number;
  _0x34: number;
  _0x38_0x150: number;
  equipment_gaitem: EquipmentGaitem;
  equipment_item: EquipmentItem;
  _0x290: number;
  _0x291: number;
  _0x292: number;
  _0x293: number;
  _0x294: number;
  _0x295: number;
  _0x298: number;
};

export type EquipmentGaitem = {
  unk: number;
  unk1: number;
  arm_style: number;
  left_hand_active_slot: number;
  right_hand_active_slot: number;
  left_arrow_active_slot: number;
  right_arrow_active_slot: number;
  left_bolt_active_slot: number;
  right_bolt_active_slot: number;
  left_hand_armaments: number[];
  right_hand_armaments: number[];
  arrows: number[];
  bolts: number[];
  _0x4: number;
  head: number;
  chest: number;
  arms: number;
  legs: number;
  _0x4_2: number;
  talismans: number[];
  _0x4_3: number;
};

export type EquipmentItem = {
  left_hand_armaments: number[];
  right_hand_armaments: number[];
  _0x4: number;
  arrows: number[];
  bolts: number[];
  _0x8: string;
  head: number;
  chest: number;
  arms: number;
  legs: number;
  _0x4_2: number;
  talismans: number[];
  _0x4_3: number[];
};

export type Slot = {
  ver: number;
  map_id: number[];
  ga_items: GaItem[];
  player_game_data: PlayerGameData;
  equip_data: EquipData;
  chr_asm: ChrAsm;
  chr_asm2: ChrAsm2;
  equip_inventory_data: EquipInventoryData;
  equip_magic_data: EquipMagicData;
  equip_item_data: EquipItemData;
  equip_gesture_data: number[];
  equip_projectile_data: EquipProjectileData;
  equipped_items: EquippedItems;
  equip_physics_data: EquipPhysicsData;
  _0x4: number;
  storage_inventory_data: StorageInventoryData;
  gesture_game_data: number[];
  regions: Regions;
  ride_game_data: RideGameData;
  _0x1: number;
  _0x4_1: number;
  _0x4_2: number;
  _0x4_3: number;
  ga_item_data: GaItemData;
  event_flags: EventFlags;
  _0x1_1: number;
  _unk_lists: UnkList[];
  player_coords: PlayerCoords;
  _0x1_2: number;
  _cs_net_data_chunks: number[];
  world_area_weather: WorldAreaWeather;
  world_area_time: WorldAreaTime;
  steam_id: string;
  _rest: number[];
};

export type GaItem = {
  gaitem_handle: number;
  item_id: number;
  unk2: number;
  unk3: number;
  aow_gaitem_handle: number;
  unk5: number;
};

export type PlayerGameData = {
  _0x4: number;
  _0x4_1: number;
  health: number;
  max_health: number;
  base_max_health: number;
  fp: number;
  max_fp: number;
  base_max_fp: number;
  _0x4_2: number;
  sp: number;
  max_sp: number;
  base_max_sp: number;
  _0x4_3: number;
  vigor: number;
  mind: number;
  endurance: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  faith: number;
  arcane: number;
  _0x4_4: number;
  _0x4_5: number;
  _0x4_6: number;
  level: number;
  souls: number;
  soulsmemory: number;
  character_name: number[];
  gender: number;
  arche_type: number;
  gift: number;
  match_making_wpn_lvl: number;
  password: number[];
  group_password1: number[];
  group_password2: number[];
  group_password3: number[];
  group_password4: number[];
  group_password5: number[];
};

export type EquipData = {
  left_hand_armaments: number[];
  right_hand_armaments: number[];
  arrows: number[];
  bolts: number[];
  _0x4: number;
  _0x4_1: number;
  head: number;
  chest: number;
  arms: number;
  legs: number;
  _0x4_2: number;
  talismans: number[];
  unk: number;
};

export type ChrAsm = {
  arm_style: number;
  left_hand_active_slot: number;
  right_hand_active_slot: number;
  left_arrow_active_slot: number;
  right_arrow_active_slot: number;
  left_bolt_active_slot: number;
  right_bolt_active_slot: number;
  left_hand_armaments: number[];
  right_hand_armaments: number[];
  arrows: number[];
  bolts: number[];
  _0x4: number;
  _0x4_1: number;
  head: number;
  chest: number;
  arms: number;
  legs: number;
  _0x4_2: number;
  talismans: number[];
  unk: number;
};

export type ChrAsm2 = {
  left_hand_armaments: number[];
  right_hand_armaments: number[];
  arrows: number[];
  bolts: number[];
  _unk0: number;
  _unk1: number;
  head: number;
  chest: number;
  arms: number;
  legs: number;
  _unk2: number;
  talismans: number[];
  _unk3: number;
};

export type EquipInventoryData = {
  common_inventory_items_distinct_count: number;
  common_items: CommonItem[];
  key_inventory_items_distinct_count: number;
  key_items: KeyItem[];
  next_equip_index: number;
  next_acquisition_sort_id: number;
};

export type CommonItem = {
  ga_item_handle: number;
  quantity: number;
  inventory_index: number;
};

export type KeyItem = {
  ga_item_handle: number;
  quantity: number;
  inventory_index: number;
};

export type EquipMagicData = {
  equip_magic_spells: EquipMagicSpell[];
  _0x10: number[];
  active_slot: number;
};

export type EquipMagicSpell = {
  spell_id: number;
  unk: number;
};

export type EquipItemData = {
  quick_slot_items: QuickSlotItem[];
  active_slot: number;
  pouch_items: PouchItem[];
  _0x8: number[];
};

export type QuickSlotItem = {
  item_id: number;
  equipment_index: number;
};

export type PouchItem = {
  item_id: number;
  equipment_index: number;
};

export type EquipProjectileData = {
  projectile_count: number;
  projectiles: Projectile[];
};

export type Projectile = {
  projectile_id: number;
  unk: number;
};

export type EquippedItems = {
  left_hand_armaments: number[];
  right_hand_armaments: number[];
  arrows: number[];
  bolts: number[];
  _unk1: number;
  _unk2: number;
  head: number;
  chest: number;
  arms: number;
  legs: number;
  _unk3: number;
  talismans: number[];
  _unk4: number;
  quickitems: number[];
  pouch: number[];
  _padding17: number;
};

export type EquipPhysicsData = {
  slot1: number;
  slot2: number;
};

export type StorageInventoryData = {
  common_inventory_items_distinct_count: number;
  common_items: CommonItem2[];
  key_inventory_items_distinct_count: number;
  key_items: KeyItem2[];
  next_equip_index: number;
  next_acquisition_sort_id: number;
};

export type CommonItem2 = {
  ga_item_handle: number;
  quantity: number;
  inventory_index: number;
};

export type KeyItem2 = {
  ga_item_handle: number;
  quantity: number;
  inventory_index: number;
};

export type Regions = {
  unlocked_regions_count: number;
  unlocked_regions: number[];
};

export type RideGameData = {
  horse_coords: number[];
  _0x4: number;
  _0x10: number[];
  horse_hp: number;
  _0x4_1: number;
};

export type GaItemData = {
  distinct_aquired_items_count: number;
  unk1: number;
  ga_items: GaItem2[];
};

export type GaItem2 = {
  id: number;
  unk: number;
  reinforce_type: number;
  unk1: number;
};

export type EventFlags = {
  flags: number[];
};

export type UnkList = {
  length: number;
  elements: number[];
};

export type PlayerCoords = {
  player_coords: number[];
  map_id: number[];
  _0x11: number[];
  player_coords2: number[];
  _0x10: number[];
};

export type WorldAreaWeather = {
  unk0: number;
  unk1: number;
  unk2: number;
};

export type WorldAreaTime = {
  unk0: number;
  unk1: number;
  unk2: number;
};

export type UserData11 = {
  unk: number[];
  regulation: number[];
  rest: number[];
};

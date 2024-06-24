import { parse_save_internal_rust } from 'elden-ring-save-parser';

// function prettyPrint(obj: object) {
//   const prettyArray = (arr: any[]) => {
//     if (arr.length < 3) return arr;
//     return arr
//       .slice(0, 3)
//       .map((i) =>
//         typeof i === 'object'
//           ? traverseObject(i as object)
//           : typeof i === 'bigint'
//             ? '// BigInt'
//             : i
//       );
//   };

//   const traverseObject = (obj: object): object =>
//     Object.fromEntries(
//       Object.entries(obj).map(([k, v]) => {
//         if (Array.isArray(v)) return [k, prettyArray(v)];
//         if (typeof v === 'bigint') return [k, '// BigInt'];
//         if (typeof v === 'object') return [k, traverseObject(v as object)];
//         return [k, v];
//       })
//     );

//   return traverseObject(obj);
// }

export function parse_save_wasm(save_data: Uint8Array) {
  // console.profile('parse_save_wasm_profile');
  console.time('parse_save_wasm');
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
  global_steam_id: Readonly<string>;
  character_steam_ids: Readonly<string[]>;
  profile_summaries: Readonly<ProfileSummary[]>;
  regulation: Readonly<number[]>;
  slots: Readonly<Slot[]>;
  user_data_11: Readonly<UserData11>;
};

export type ProfileSummary = {
  character_name: Readonly<number[]>;
  level: Readonly<number>;
  _0x28: Readonly<number>;
  _0x2c: Readonly<number>;
  _0x30: Readonly<number>;
  _0x34: Readonly<number>;
  _0x38_0x150: Readonly<number>;
  equipment_gaitem: Readonly<EquipmentGaitem>;
  equipment_item: Readonly<EquipmentItem>;
  _0x290: Readonly<number>;
  _0x291: Readonly<number>;
  _0x292: Readonly<number>;
  _0x293: Readonly<number>;
  _0x294: Readonly<number>;
  _0x295: Readonly<number>;
  _0x298: Readonly<number>;
};

export type EquipmentGaitem = {
  unk: Readonly<number>;
  unk1: Readonly<number>;
  arm_style: Readonly<number>;
  left_hand_active_slot: Readonly<number>;
  right_hand_active_slot: Readonly<number>;
  left_arrow_active_slot: Readonly<number>;
  right_arrow_active_slot: Readonly<number>;
  left_bolt_active_slot: Readonly<number>;
  right_bolt_active_slot: Readonly<number>;
  left_hand_armaments: Readonly<number[]>;
  right_hand_armaments: Readonly<number[]>;
  arrows: Readonly<number[]>;
  bolts: Readonly<number[]>;
  _0x4: Readonly<number>;
  head: Readonly<number>;
  chest: Readonly<number>;
  arms: Readonly<number>;
  legs: Readonly<number>;
  _0x4_2: Readonly<number>;
  talismans: Readonly<number[]>;
  _0x4_3: Readonly<number>;
};

export type EquipmentItem = {
  left_hand_armaments: Readonly<number[]>;
  right_hand_armaments: Readonly<number[]>;
  _0x4: Readonly<number>;
  arrows: Readonly<number[]>;
  bolts: Readonly<number[]>;
  _0x8: Readonly<string>;
  head: Readonly<number>;
  chest: Readonly<number>;
  arms: Readonly<number>;
  legs: Readonly<number>;
  _0x4_2: Readonly<number>;
  talismans: Readonly<number[]>;
  _0x4_3: Readonly<number[]>;
};

export type Slot = {
  ver: Readonly<number>;
  map_id: Readonly<number[]>;
  ga_items: Readonly<GaItem[]>;
  player_game_data: Readonly<PlayerGameData>;
  equip_data: Readonly<EquipData>;
  chr_asm: Readonly<ChrAsm>;
  chr_asm2: Readonly<ChrAsm2>;
  equip_inventory_data: Readonly<EquipInventoryData>;
  equip_magic_data: Readonly<EquipMagicData>;
  equip_item_data: Readonly<EquipItemData>;
  equip_gesture_data: Readonly<number[]>;
  equip_projectile_data: Readonly<EquipProjectileData>;
  equipped_items: Readonly<EquippedItems>;
  equip_physics_data: Readonly<EquipPhysicsData>;
  _0x4: Readonly<number>;
  storage_inventory_data: Readonly<StorageInventoryData>;
  gesture_game_data: Readonly<number[]>;
  regions: Readonly<Regions>;
  ride_game_data: Readonly<RideGameData>;
  _0x1: Readonly<number>;
  _0x4_1: Readonly<number>;
  _0x4_2: Readonly<number>;
  _0x4_3: Readonly<number>;
  ga_item_data: Readonly<GaItemData>;
  event_flags: Readonly<EventFlags>;
  _0x1_1: Readonly<number>;
  _unk_lists: Readonly<UnkList[]>;
  player_coords: Readonly<PlayerCoords>;
  _0x1_2: Readonly<number>;
  _cs_net_data_chunks: Readonly<number[]>;
  world_area_weather: Readonly<WorldAreaWeather>;
  world_area_time: Readonly<WorldAreaTime>;
  steam_id: Readonly<string>;
  _rest: Readonly<number[]>;
};

export type GaItem = {
  gaitem_handle: Readonly<number>;
  item_id: Readonly<number>;
  unk2: Readonly<number>;
  unk3: Readonly<number>;
  aow_gaitem_handle: Readonly<number>;
  unk5: Readonly<number>;
};

export type PlayerGameData = {
  _0x4: Readonly<number>;
  _0x4_1: Readonly<number>;
  health: Readonly<number>;
  max_health: Readonly<number>;
  base_max_health: Readonly<number>;
  fp: Readonly<number>;
  max_fp: Readonly<number>;
  base_max_fp: Readonly<number>;
  _0x4_2: Readonly<number>;
  sp: Readonly<number>;
  max_sp: Readonly<number>;
  base_max_sp: Readonly<number>;
  _0x4_3: Readonly<number>;
  vigor: Readonly<number>;
  mind: Readonly<number>;
  endurance: Readonly<number>;
  strength: Readonly<number>;
  dexterity: Readonly<number>;
  intelligence: Readonly<number>;
  faith: Readonly<number>;
  arcane: Readonly<number>;
  _0x4_4: Readonly<number>;
  _0x4_5: Readonly<number>;
  _0x4_6: Readonly<number>;
  level: Readonly<number>;
  souls: Readonly<number>;
  soulsmemory: Readonly<number>;
  character_name: Readonly<number[]>;
  gender: Readonly<number>;
  arche_type: Readonly<number>;
  gift: Readonly<number>;
  match_making_wpn_lvl: Readonly<number>;
  password: Readonly<number[]>;
  group_password1: Readonly<number[]>;
  group_password2: Readonly<number[]>;
  group_password3: Readonly<number[]>;
  group_password4: Readonly<number[]>;
  group_password5: Readonly<number[]>;
};

export type EquipData = {
  left_hand_armaments: Readonly<number[]>;
  right_hand_armaments: Readonly<number[]>;
  arrows: Readonly<number[]>;
  bolts: Readonly<number[]>;
  _0x4: Readonly<number>;
  _0x4_1: Readonly<number>;
  head: Readonly<number>;
  chest: Readonly<number>;
  arms: Readonly<number>;
  legs: Readonly<number>;
  _0x4_2: Readonly<number>;
  talismans: Readonly<number[]>;
  unk: Readonly<number>;
};

export type ChrAsm = {
  arm_style: Readonly<number>;
  left_hand_active_slot: Readonly<number>;
  right_hand_active_slot: Readonly<number>;
  left_arrow_active_slot: Readonly<number>;
  right_arrow_active_slot: Readonly<number>;
  left_bolt_active_slot: Readonly<number>;
  right_bolt_active_slot: Readonly<number>;
  left_hand_armaments: Readonly<number[]>;
  right_hand_armaments: Readonly<number[]>;
  arrows: Readonly<number[]>;
  bolts: Readonly<number[]>;
  _0x4: Readonly<number>;
  _0x4_1: Readonly<number>;
  head: Readonly<number>;
  chest: Readonly<number>;
  arms: Readonly<number>;
  legs: Readonly<number>;
  _0x4_2: Readonly<number>;
  talismans: Readonly<number[]>;
  unk: Readonly<number>;
};

export type ChrAsm2 = {
  left_hand_armaments: Readonly<number[]>;
  right_hand_armaments: Readonly<number[]>;
  arrows: Readonly<number[]>;
  bolts: Readonly<number[]>;
  _unk0: Readonly<number>;
  _unk1: Readonly<number>;
  head: Readonly<number>;
  chest: Readonly<number>;
  arms: Readonly<number>;
  legs: Readonly<number>;
  _unk2: Readonly<number>;
  talismans: Readonly<number[]>;
  _unk3: Readonly<number>;
};

export type EquipInventoryData = {
  common_inventory_items_distinct_count: Readonly<number>;
  common_items: Readonly<CommonItem[]>;
  key_inventory_items_distinct_count: Readonly<number>;
  key_items: Readonly<KeyItem[]>;
  next_equip_index: Readonly<number>;
  next_acquisition_sort_id: Readonly<number>;
};

export type CommonItem = {
  ga_item_handle: Readonly<number>;
  quantity: Readonly<number>;
  inventory_index: Readonly<number>;
};

export type KeyItem = {
  ga_item_handle: Readonly<number>;
  quantity: Readonly<number>;
  inventory_index: Readonly<number>;
};

export type EquipMagicData = {
  equip_magic_spells: Readonly<EquipMagicSpell[]>;
  _0x10: Readonly<number[]>;
  active_slot: Readonly<number>;
};

export type EquipMagicSpell = {
  spell_id: Readonly<number>;
  unk: Readonly<number>;
};

export type EquipItemData = {
  quick_slot_items: Readonly<QuickSlotItem[]>;
  active_slot: Readonly<number>;
  pouch_items: Readonly<PouchItem[]>;
  _0x8: Readonly<number[]>;
};

export type QuickSlotItem = {
  item_id: Readonly<number>;
  equipment_index: Readonly<number>;
};

export type PouchItem = {
  item_id: Readonly<number>;
  equipment_index: Readonly<number>;
};

export type EquipProjectileData = {
  projectile_count: Readonly<number>;
  projectiles: Readonly<Projectile[]>;
};

export type Projectile = {
  projectile_id: Readonly<number>;
  unk: Readonly<number>;
};

export type EquippedItems = {
  left_hand_armaments: Readonly<number[]>;
  right_hand_armaments: Readonly<number[]>;
  arrows: Readonly<number[]>;
  bolts: Readonly<number[]>;
  _unk1: Readonly<number>;
  _unk2: Readonly<number>;
  head: Readonly<number>;
  chest: Readonly<number>;
  arms: Readonly<number>;
  legs: Readonly<number>;
  _unk3: Readonly<number>;
  talismans: Readonly<number[]>;
  _unk4: Readonly<number>;
  quickitems: Readonly<number[]>;
  pouch: Readonly<number[]>;
  _padding17: Readonly<number>;
};

export type EquipPhysicsData = {
  slot1: Readonly<number>;
  slot2: Readonly<number>;
};

export type StorageInventoryData = {
  common_inventory_items_distinct_count: Readonly<number>;
  common_items: Readonly<CommonItem2[]>;
  key_inventory_items_distinct_count: Readonly<number>;
  key_items: Readonly<KeyItem2[]>;
  next_equip_index: Readonly<number>;
  next_acquisition_sort_id: Readonly<number>;
};

export type CommonItem2 = {
  ga_item_handle: Readonly<number>;
  quantity: Readonly<number>;
  inventory_index: Readonly<number>;
};

export type KeyItem2 = {
  ga_item_handle: Readonly<number>;
  quantity: Readonly<number>;
  inventory_index: Readonly<number>;
};

export type Regions = {
  unlocked_regions_count: Readonly<number>;
  unlocked_regions: Readonly<number[]>;
};

export type RideGameData = {
  horse_coords: Readonly<number[]>;
  _0x4: Readonly<number>;
  _0x10: Readonly<number[]>;
  horse_hp: Readonly<number>;
  _0x4_1: Readonly<number>;
};

export type GaItemData = {
  distinct_aquired_items_count: Readonly<number>;
  unk1: Readonly<number>;
  ga_items: Readonly<GaItem2[]>;
};

export type GaItem2 = {
  id: Readonly<number>;
  unk: Readonly<number>;
  reinforce_type: Readonly<number>;
  unk1: Readonly<number>;
};

export type EventFlags = {
  flags: Readonly<number[]>;
};

export type UnkList = {
  length: Readonly<number>;
  elements: Readonly<number[]>;
};

export type PlayerCoords = {
  player_coords: Readonly<number[]>;
  map_id: Readonly<number[]>;
  _0x11: Readonly<number[]>;
  player_coords2: Readonly<number[]>;
  _0x10: Readonly<number[]>;
};

export type WorldAreaWeather = {
  unk0: Readonly<number>;
  unk1: Readonly<number>;
  unk2: Readonly<number>;
};

export type WorldAreaTime = {
  unk0: Readonly<number>;
  unk1: Readonly<number>;
  unk2: Readonly<number>;
};

export type UserData11 = {
  unk: Readonly<number[]>;
  regulation: Readonly<number[]>;
  rest: Readonly<number[]>;
};

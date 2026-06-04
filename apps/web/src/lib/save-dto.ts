// The lean, web-facing save DTO the app consumes. Produced by the pure-TS parser
// (`@elden-ring-compass/save-parser-ts`, `parseSave`) — see `er-save-parser.ts`. These types
// mirror that parser's `LeanSave` (kept here so the app's view-models import a stable shape;
// the historical `Wasm*`/`Slot` names predate the TS port and are unchanged to avoid churn).
export type WasmEldenRingSave = {
  global_steam_id: Readonly<string>;
  character_steam_ids: ReadonlyArray<string>;
  slots: ReadonlyArray<Slot>;
};

export type Slot = {
  steam_id: Readonly<string>;
  map_id: ReadonlyArray<number>;
  player_game_data: Readonly<PlayerGameData>;
  player_coords: Readonly<PlayerCoords>;
  regions: Readonly<Regions>;
  event_flags: Readonly<EventFlags>;
  /** Non-empty gaitem-map entries: item instance handle -> param item_id (+ attached AoW). */
  ga_items: ReadonlyArray<GaItem>;
  /** Currently-equipped item instance handles (resolve via `ga_items`). */
  chr_asm2: Readonly<ChrAsm2>;
  equip_inventory_data: Readonly<EquipInventoryData>;
  storage_inventory_data: Readonly<StorageInventoryData>;
  equip_item_data: Readonly<EquipItemData>;
  sp_effects: ReadonlyArray<SpEffect>;
};

export type PlayerGameData = {
  character_name: Readonly<string>;
  vigor: Readonly<number>;
  mind: Readonly<number>;
  endurance: Readonly<number>;
  strength: Readonly<number>;
  dexterity: Readonly<number>;
  intelligence: Readonly<number>;
  faith: Readonly<number>;
  arcane: Readonly<number>;
  level: Readonly<number>;
  /** Held runes. */
  souls: Readonly<number>;
  /** Lifetime runes / rune memory. */
  soulsmemory: Readonly<number>;
  gender: Readonly<number>;
  /** Starting class / archetype id. */
  arche_type: Readonly<number>;
  match_making_wpn_lvl: Readonly<number>;
};

export type PlayerCoords = {
  /** [x, y, z] */
  player_coords: ReadonlyArray<number>;
  map_id: ReadonlyArray<number>;
};

export type Regions = {
  unlocked_regions_count: Readonly<number>;
  unlocked_regions: ReadonlyArray<number>;
};

export type EventFlags = {
  /** Raw event-flag bitfield, trailing zeros trimmed. Read via `flags[byteOffset] & (1 << bit)`. */
  flags: Readonly<Uint8Array>;
};

export type GaItem = {
  gaitem_handle: Readonly<number>;
  item_id: Readonly<number>;
  /** For weapons: handle of the attached Ash of War / gem (0 if none). Resolve via `ga_items`. */
  gem_gaitem_handle: Readonly<number>;
};

export type ChrAsm2 = {
  left_hand_armaments: ReadonlyArray<number>;
  right_hand_armaments: ReadonlyArray<number>;
  arrows: ReadonlyArray<number>;
  bolts: ReadonlyArray<number>;
  head: Readonly<number>;
  chest: Readonly<number>;
  arms: Readonly<number>;
  legs: Readonly<number>;
  talismans: ReadonlyArray<number>;
};

export type CommonItem = {
  ga_item_handle: Readonly<number>;
  quantity: Readonly<number>;
  inventory_index: Readonly<number>;
};

export type EquipInventoryData = {
  common_inventory_items_distinct_count: Readonly<number>;
  common_items: ReadonlyArray<CommonItem>;
  key_inventory_items_distinct_count: Readonly<number>;
  key_items: ReadonlyArray<CommonItem>;
};

export type StorageInventoryData = EquipInventoryData;

export type EquipItem = {
  /** Item instance handle (named `item_id` for historical compatibility). Resolve via `ga_items`. */
  item_id: Readonly<number>;
};

export type EquipItemData = {
  quick_slot_items: ReadonlyArray<EquipItem>;
  pouch_items: ReadonlyArray<EquipItem>;
};

export type SpEffect = {
  sp_effect_id: Readonly<number>;
  remaining_time: Readonly<number>;
};

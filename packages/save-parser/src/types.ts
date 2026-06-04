/**
 * The lean, web-facing DTO produced by the parser. Shape-identical to the WASM
 * parser's `LeanSave` (see `packages/er-save-lib/src/api/web_export.rs` and the web
 * app's `WasmEldenRingSave` in `apps/web/src/lib/wasm-wrapper.ts`) so this is a
 * drop-in backend swap: the website's view-models read the same fields unchanged.
 *
 * Field names intentionally keep the WASM/serde snake_case (e.g. `souls`,
 * `arche_type`, `map_id`) — they are the contract the web app already consumes.
 */

export type LeanSave = {
  /** Account steam id (from UserData10), stringified (overflows JS Number). */
  global_steam_id: string;
  /** Per active-slot steam id, parallel to `slots`. */
  character_steam_ids: string[];
  /** Only the active character slots. */
  slots: LeanSlot[];
};

export type LeanSlot = {
  steam_id: string;
  map_id: [number, number, number, number];
  player_game_data: LeanPlayerGameData;
  player_coords: LeanPlayerCoords;
  regions: LeanRegions;
  event_flags: LeanEventFlags;
  /** Non-empty gaitem-map entries: item instance handle -> param item_id. */
  ga_items: LeanGaItem[];
  /** Currently-equipped item instance handles (resolve via `ga_items`). */
  chr_asm2: LeanChrAsm;
  equip_inventory_data: LeanInventory;
  storage_inventory_data: LeanInventory;
  equip_item_data: LeanEquipItemData;
  /** Active SpEffect buffs/statuses (empty/cleared slots filtered out). */
  sp_effects: LeanSpEffect[];
};

export type LeanPlayerGameData = {
  character_name: string;
  vigor: number;
  mind: number;
  endurance: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  faith: number;
  arcane: number;
  level: number;
  /** Held runes (the site historically calls this `souls`). */
  souls: number;
  /** Lifetime runes / rune memory (historically `soulsmemory`). */
  soulsmemory: number;
  gender: number;
  /** Starting class / archetype (historically `arche_type`). */
  arche_type: number;
  match_making_wpn_lvl: number;
};

export type LeanPlayerCoords = {
  player_coords: [number, number, number];
  map_id: [number, number, number, number];
};

export type LeanRegions = {
  unlocked_regions_count: number;
  unlocked_regions: number[];
};

export type LeanEventFlags = {
  /** Raw event-flag bitfield with trailing zero bytes trimmed (byte offsets preserved). */
  flags: Uint8Array;
};

export type LeanGaItem = {
  gaitem_handle: number;
  item_id: number;
  /** Weapon's attached Ash of War / gem gaitem handle (0 if none). */
  gem_gaitem_handle: number;
};

export type LeanSpEffect = {
  sp_effect_id: number;
  remaining_time: number;
};

export type LeanChrAsm = {
  left_hand_armaments: [number, number, number];
  right_hand_armaments: [number, number, number];
  arrows: [number, number];
  bolts: [number, number];
  head: number;
  chest: number;
  arms: number;
  legs: number;
  talismans: [number, number, number, number];
};

export type LeanInventoryItem = {
  ga_item_handle: number;
  quantity: number;
  inventory_index: number;
};

export type LeanInventory = {
  common_inventory_items_distinct_count: number;
  common_items: LeanInventoryItem[];
  key_inventory_items_distinct_count: number;
  key_items: LeanInventoryItem[];
};

export type LeanEquipItem = {
  /** Item instance handle for a quick-slot / pouch entry (resolve via `ga_items`). */
  item_id: number;
};

export type LeanEquipItemData = {
  quick_slot_items: LeanEquipItem[];
  pouch_items: LeanEquipItem[];
};

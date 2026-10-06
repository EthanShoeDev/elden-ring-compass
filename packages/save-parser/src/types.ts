/**
 * The lean, web-facing save DTO — defined as effect `Schema`s, with the TypeScript types
 * derived from them (each `export const X = Schema.Struct(...)` is paired with
 * `export type X = typeof X.Type`, so the schema and the type can never drift). The schemas
 * are the single source of truth: the parser constructs values of these types, and the worker
 * boundary validates messages with `LeanSave` (see `apps/web/src/lib/er-save-parser.protocol.ts`).
 * The web app re-exports these types as the historical `Wasm*`/`Slot` names
 * (`apps/web/src/lib/save-dto.ts`).
 *
 * The original fields are shape-identical to the retired WASM parser's `LeanSave` (the
 * ER-Save-Lib fork's `api/web_export.rs`); M2 added everything non-opaque the er-save-manager
 * reference reads (resources, buildups, flasks, online/cosmetic flags, equipped spells/gestures,
 * the gesture unlock list, active weapon slots, physick, projectiles, Torrent/bloodstain world
 * state, world time/weather, deaths, playtime, DLC). Opaque blobs (face data, net/geom/render
 * caches, character presets, the gaitem game-data table, the integrity hash) are skipped.
 *
 * Field names keep the original serde snake_case where a name predates the port (e.g. `souls`,
 * `arche_type`, `map_id`); fields added in M2 use clear snake_case.
 */
import { Schema } from 'effect';

/**
 * A raw IEEE-754 f32 read straight from the save (coords, angles, timers). Every
 * other numeric field is an integer read (`Schema.Int`). NaN/±Infinity are
 * representable here and deliberately allowed: the worker boundary should pass a
 * bad coordinate through rather than reject the whole save.
 */
// oxlint-disable-next-line effecttsgo/schema-number -- raw save floats may be non-finite; see above
const RawF32 = Schema.Number.annotate({
  description: 'raw f32 from the save (may be non-finite)',
});

export const LeanStatusBuildup = Schema.Struct({
  poison: Schema.Int,
  rot: Schema.Int,
  bleed: Schema.Int,
  death: Schema.Int,
  frost: Schema.Int,
  sleep: Schema.Int,
  madness: Schema.Int,
});
export type LeanStatusBuildup = typeof LeanStatusBuildup.Type;

export const LeanPlayerGameData = Schema.Struct({
  character_name: Schema.String,
  vigor: Schema.Int,
  mind: Schema.Int,
  endurance: Schema.Int,
  strength: Schema.Int,
  dexterity: Schema.Int,
  intelligence: Schema.Int,
  faith: Schema.Int,
  arcane: Schema.Int,
  level: Schema.Int,
  /** Held runes (the site historically calls this `souls`). */
  souls: Schema.Int,
  /** Lifetime runes / rune memory (historically `soulsmemory`). */
  soulsmemory: Schema.Int,
  gender: Schema.Int,
  /** Starting class / archetype (historically `arche_type`). */
  arche_type: Schema.Int,
  match_making_wpn_lvl: Schema.Int,
  /** Current / current-max / base-max HP. */
  hp: Schema.Int,
  max_hp: Schema.Int,
  base_max_hp: Schema.Int,
  /** Current / current-max / base-max FP. */
  fp: Schema.Int,
  max_fp: Schema.Int,
  base_max_fp: Schema.Int,
  /** Current / current-max / base-max stamina (the reference calls these `sp`). */
  stamina: Schema.Int,
  max_stamina: Schema.Int,
  base_max_stamina: Schema.Int,
  /** Status-effect buildup meters on the player. */
  buildup: LeanStatusBuildup,
  /** Character-creation voice pitch / starting gift (Keepsake) ids. */
  voice_type: Schema.Int,
  gift: Schema.Int,
  /** Talisman pouch slots unlocked beyond the first (0–3). */
  additional_talisman_slot_count: Schema.Int,
  /** Summon spirit (Mimic Tear / Spirit Ashes) level. */
  summon_spirit_level: Schema.Int,
  /** Co-op / invasion availability toggles. */
  furl_calling_finger_on: Schema.Boolean,
  white_cipher_ring_on: Schema.Boolean,
  blue_cipher_ring_on: Schema.Boolean,
  great_rune_on: Schema.Boolean,
  /** Max charges of the crimson (HP) and cerulean (FP) flasks. */
  max_crimson_flask_count: Schema.Int,
  max_cerulean_flask_count: Schema.Int,
});
export type LeanPlayerGameData = typeof LeanPlayerGameData.Type;

export const LeanActiveWeaponSlots = Schema.Struct({
  arm_style: Schema.Int,
  left_hand: Schema.Int,
  right_hand: Schema.Int,
  left_arrow: Schema.Int,
  right_arrow: Schema.Int,
  left_bolt: Schema.Int,
  right_bolt: Schema.Int,
});
export type LeanActiveWeaponSlots = typeof LeanActiveWeaponSlots.Type;

export const LeanPlayerCoords = Schema.Struct({
  player_coords: Schema.Tuple([RawF32, RawF32, RawF32]),
  map_id: Schema.Tuple([Schema.Int, Schema.Int, Schema.Int, Schema.Int]),
  /** Facing direction as a quaternion `[x, y, z, w]`. */
  angle: Schema.Tuple([RawF32, RawF32, RawF32, RawF32]),
});
export type LeanPlayerCoords = typeof LeanPlayerCoords.Type;

export const LeanHorse = Schema.Struct({
  coords: Schema.Tuple([RawF32, RawF32, RawF32]),
  map_id: Schema.Tuple([Schema.Int, Schema.Int, Schema.Int, Schema.Int]),
  hp: Schema.Int,
  /** Raw RideGameData state (0 = inactive, 3 = dead, 13 = active). */
  state: Schema.Int,
});
export type LeanHorse = typeof LeanHorse.Type;

export const LeanBloodStain = Schema.Struct({
  coords: Schema.Tuple([RawF32, RawF32, RawF32]),
  map_id: Schema.Tuple([Schema.Int, Schema.Int, Schema.Int, Schema.Int]),
  /** Runes recoverable at the bloodstain. */
  runes: Schema.Int,
});
export type LeanBloodStain = typeof LeanBloodStain.Type;

export const LeanWorldTime = Schema.Struct({
  hour: Schema.Int,
  minute: Schema.Int,
  second: Schema.Int,
});
export type LeanWorldTime = typeof LeanWorldTime.Type;

export const LeanWorldWeather = Schema.Struct({
  area_id: Schema.Int,
  weather_type: Schema.Int,
  timer: Schema.Int,
});
export type LeanWorldWeather = typeof LeanWorldWeather.Type;

export const LeanBaseVersion = Schema.Struct({
  base_version: Schema.Int,
  /** Non-zero when the slot was written by the latest known game build. */
  is_latest_version: Schema.Int,
});
export type LeanBaseVersion = typeof LeanBaseVersion.Type;

export const LeanDlc = Schema.Struct({
  /** True once the character has entered the Shadow of the Erdtree area. */
  shadow_of_erdtree: Schema.Boolean,
  preorder_the_ring: Schema.Boolean,
  preorder_ring_of_miquella: Schema.Boolean,
});
export type LeanDlc = typeof LeanDlc.Type;

export const LeanRegions = Schema.Struct({
  unlocked_regions_count: Schema.Int,
  unlocked_regions: Schema.Array(Schema.Int),
});
export type LeanRegions = typeof LeanRegions.Type;

export const LeanEventFlags = Schema.Struct({
  /** Raw event-flag bitfield with trailing zero bytes trimmed (byte offsets preserved). */
  flags: Schema.Uint8Array,
});
export type LeanEventFlags = typeof LeanEventFlags.Type;

export const LeanGaItem = Schema.Struct({
  gaitem_handle: Schema.Int,
  item_id: Schema.Int,
  /** Weapon's attached Ash of War / gem gaitem handle (0 if none). */
  gem_gaitem_handle: Schema.Int,
});
export type LeanGaItem = typeof LeanGaItem.Type;

export const LeanSpEffect = Schema.Struct({
  sp_effect_id: Schema.Int,
  remaining_time: RawF32,
});
export type LeanSpEffect = typeof LeanSpEffect.Type;

export const LeanChrAsm = Schema.Struct({
  left_hand_armaments: Schema.Tuple([Schema.Int, Schema.Int, Schema.Int]),
  right_hand_armaments: Schema.Tuple([Schema.Int, Schema.Int, Schema.Int]),
  arrows: Schema.Tuple([Schema.Int, Schema.Int]),
  bolts: Schema.Tuple([Schema.Int, Schema.Int]),
  head: Schema.Int,
  chest: Schema.Int,
  arms: Schema.Int,
  legs: Schema.Int,
  talismans: Schema.Tuple([Schema.Int, Schema.Int, Schema.Int, Schema.Int]),
});
export type LeanChrAsm = typeof LeanChrAsm.Type;

export const LeanInventoryItem = Schema.Struct({
  ga_item_handle: Schema.Int,
  quantity: Schema.Int,
  inventory_index: Schema.Int,
});
export type LeanInventoryItem = typeof LeanInventoryItem.Type;

export const LeanInventory = Schema.Struct({
  common_inventory_items_distinct_count: Schema.Int,
  common_items: Schema.Array(LeanInventoryItem),
  key_inventory_items_distinct_count: Schema.Int,
  key_items: Schema.Array(LeanInventoryItem),
});
export type LeanInventory = typeof LeanInventory.Type;

export const LeanEquipItem = Schema.Struct({
  /** Item instance handle for a quick-slot / pouch entry (resolve via `ga_items`). */
  item_id: Schema.Int,
});
export type LeanEquipItem = typeof LeanEquipItem.Type;

export const LeanEquipItemData = Schema.Struct({
  quick_slot_items: Schema.Array(LeanEquipItem),
  pouch_items: Schema.Array(LeanEquipItem),
});
export type LeanEquipItemData = typeof LeanEquipItemData.Type;

export const LeanSlot = Schema.Struct({
  steam_id: Schema.String,
  /** UserDataX format version for this slot. */
  version: Schema.Int,
  /** Playtime in seconds (from UserData10's ProfileSummary for this slot). */
  seconds_played: Schema.Int,
  map_id: Schema.Tuple([Schema.Int, Schema.Int, Schema.Int, Schema.Int]),
  player_game_data: LeanPlayerGameData,
  player_coords: LeanPlayerCoords,
  regions: LeanRegions,
  event_flags: LeanEventFlags,
  /** Non-empty gaitem-map entries: item instance handle -> param item_id. */
  ga_items: Schema.Array(LeanGaItem),
  /** Currently-equipped item instance handles (resolve via `ga_items`). */
  chr_asm2: LeanChrAsm,
  /** Which of the multi-slot weapon/ammo sets is active (the "active hand" indices). */
  active_weapon_slots: LeanActiveWeaponSlots,
  equip_inventory_data: LeanInventory,
  storage_inventory_data: LeanInventory,
  equip_item_data: LeanEquipItemData,
  /** 14 memorized spell param ids (sorceries/incantations); 0 = empty slot. */
  equipped_spells: Schema.Array(Schema.Int),
  /** 6 equipped gesture param ids (the quick-gesture wheel); 0 = empty slot. */
  equipped_gestures: Schema.Array(Schema.Int),
  /** Full 64-slot gesture table (the unlock list); 0 / 0xFFFFFFFE mark empty entries. */
  gestures: Schema.Array(Schema.Int),
  /** Equipped Wondrous Physick tear item ids `[slot1, slot2]` (0 = empty). */
  equipped_physics: Schema.Tuple([Schema.Int, Schema.Int]),
  /** Acquired projectile (arrow/bolt/pot) param ids. */
  acquired_projectiles: Schema.Array(Schema.Int),
  /** Active SpEffect buffs/statuses (empty/cleared slots filtered out). */
  sp_effects: Schema.Array(LeanSpEffect),
  /** Torrent state (position, hp, alive/dead). */
  horse: LeanHorse,
  /** Last-death bloodstain (where dropped runes can be recovered). */
  blood_stain: LeanBloodStain,
  /** In-game time of day. */
  world_time: LeanWorldTime,
  /** Current area weather. */
  world_weather: LeanWorldWeather,
  /** Game build / patch version this slot was last written by. */
  base_version: LeanBaseVersion,
  /** Total deaths for this character. */
  deaths: Schema.Int,
  /** Entity id of the grace last rested at. */
  last_rested_grace: Schema.Int,
  /** Entity id of the current spawn point. */
  spawn_point_entity_id: Schema.Int,
  /** Shadow of the Erdtree DLC entry + pre-order gesture flags. */
  dlc: LeanDlc,
});
export type LeanSlot = typeof LeanSlot.Type;

export const LeanSave = Schema.Struct({
  /** Account steam id (from UserData10), stringified (overflows JS Number). */
  global_steam_id: Schema.String,
  /** Per active-slot steam id, parallel to `slots`. */
  character_steam_ids: Schema.Array(Schema.String),
  /** Only the active character slots. */
  slots: Schema.Array(LeanSlot),
});
export type LeanSave = typeof LeanSave.Type;

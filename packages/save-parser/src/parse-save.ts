/**
 * Pure-TypeScript Elden Ring save (`.sl2`) parser — read-only, PC saves.
 *
 * Ported field-for-field from the verified Rust reference — our ER-Save-Lib fork's
 * `save/user_data_x.rs` + `user_data_10.rs`, projected by `api/web_export.rs` (that fork +
 * WASM build have since been retired from the repo; this parser replaced them — see
 * docs/projects/typescript-save-parser-port.md). The byte layout is sequential and
 * little-endian; we walk the
 * whole slot, capturing only the fields the lean DTO needs and advancing past the
 * rest by their exact byte size. Where a section is length-prefixed (`field_area`,
 * `world_area`, the two `world_geom_man`s, `rend_man`, the menu/tutorial blobs) we
 * read its leading size and skip; the inventories read their full fixed capacity.
 *
 * The reference's PlayerGameDataHash, MD5 checksums, and the PS/Switch byte layout
 * are intentionally NOT ported — they're write-path / platform concerns the website
 * never needs. See `docs/projects/typescript-save-parser-port.md`.
 */
import { BinaryReader } from './binary-reader.ts';
import type {
  LeanChrAsm,
  LeanEquipItemData,
  LeanGaItem,
  LeanInventory,
  LeanInventoryItem,
  LeanSave,
  LeanSlot,
  LeanSpEffect,
} from './types.ts';

// PC save framing (mirrors `Save::read` sizes for the non-PS branch).
const PC_MAGIC = [0x42, 0x4e, 0x44, 0x34]; // "BND4"
const HEADER_SIZE = 0x2fc;
const SLOT_SIZE = 0x280010; // per-slot stride (0x10 MD5 + 0x280000 data)
const SLOT_CHECKSUM = 0x10;
const SLOTS_START = PC_MAGIC.length + HEADER_SIZE; // 0x300
const SLOT_COUNT = 10;
const USER_DATA_10_START = SLOTS_START + SLOT_SIZE * SLOT_COUNT; // 0x19003A0

// Fixed sub-struct sizes (bytes) we skip past — names match the reference structs.
const EVENT_FLAGS_LEN = 0x1bf99f;
const PLAYER_GAME_DATA_LEN = 0x1b0;
const EQUIP_SLOTS_LEN = 0x58; // EquippedItemsEquipIndex / ItemIds (22 × u32)
const ACTIVE_WEAPON_SLOTS_LEN = 0x1c;
const EQUIPPED_SPELLS_LEN = 0x74;
const EQUIPPED_GESTURES_LEN = 0x18;
const EQUIPPED_ARMAMENTS_AND_ITEMS_LEN = 0x9c;
const EQUIPPED_PHYSICS_LEN = 0xc;
const FACE_DATA_LEN = 0x12f; // slot context (303); 0x120 in profile context
const GESTURES_LEN = 0x100;
const HORSE_LEN = 0x28;
const BLOOD_STAIN_LEN = 0x44;
const TROPHY_EQUIP_LEN = 0x34;
const GAITEM_GAME_DATA_LEN = 8 + 7000 * 16; // i64 count + 7000 entries
const NET_MAN_LEN = 0x20004;
const WORLD_AREA_WEATHER_LEN = 0xc;
const WORLD_AREA_TIME_LEN = 0xc;
const BASE_VERSION_LEN = 0x10;

// PlayerGameData field offsets (within its 0x1B0 block) — see the reference + spec table.
const PGD = {
  vigor: 0x34,
  mind: 0x38,
  endurance: 0x3c,
  strength: 0x40,
  dexterity: 0x44,
  intelligence: 0x48,
  faith: 0x4c,
  arcane: 0x50,
  level: 0x60,
  runes: 0x64,
  runes_memory: 0x68,
  character_name: 0x94, // 32 bytes UTF-16LE
  gender: 0xb6,
  archetype: 0xb7,
  matchmaking_weapon_level: 0xda,
} as const;
const CHARACTER_NAME_BYTES = 32;

const utf16le = new TextDecoder('utf-16le');

export class SaveParseError extends Error {
  override name = 'SaveParseError';
}

/** Parse a PC `.sl2` save buffer into the lean DTO (active slots only). */
export function parseSave(buffer: ArrayBuffer): LeanSave {
  const r = new BinaryReader(buffer);

  for (let i = 0; i < PC_MAGIC.length; i++) {
    if (r.bytes[i] !== PC_MAGIC[i]) {
      throw new SaveParseError(
        'Not a PC Elden Ring save (expected "BND4" magic). PS/Switch saves are not supported.',
      );
    }
  }

  const { globalSteamId, activeProfiles } = readUserData10(r);

  const slots: LeanSlot[] = [];
  const characterSteamIds: string[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    if (!activeProfiles[i]) continue;
    r.seek(SLOTS_START + SLOT_SIZE * i + SLOT_CHECKSUM);
    const slot = readSlot(r);
    slots.push(slot);
    characterSteamIds.push(slot.steam_id);
  }

  return {
    global_steam_id: globalSteamId,
    character_steam_ids: characterSteamIds,
    slots,
  };
}

/** Reads UserData10 just far enough for the global steam id + the active-profile mask. */
function readUserData10(r: BinaryReader): {
  globalSteamId: string;
  activeProfiles: boolean[];
} {
  const start = USER_DATA_10_START;
  r.seek(start + 0x10); // skip checksum
  r.skip(4); // version
  const globalSteamId = r.u64String();
  r.skip(0x140); // Settings (fixed 0x140)
  // MenuSystemSaveLoad: u16 + u16 + size:u32 + data[size]
  r.skip(4);
  const menuSize = r.u32();
  r.skip(menuSize);
  // ProfileSummary.active_profiles: [bool; 10]
  const activeProfiles: boolean[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) activeProfiles.push(r.u8() !== 0);
  return { globalSteamId, activeProfiles };
}

/** Reads one UserDataX slot; `r` must be positioned at the slot's `version` field. */
function readSlot(r: BinaryReader): LeanSlot {
  const version = r.u32();
  const mapId = r.byteTuple4();
  r.skip(8); // unk0x8
  r.skip(0x10); // unk0x10

  // --- Gaitem map (variable per-entry; count depends on version) ---
  const gaitemCount = version <= 81 ? 0x13fe : 0x1400;
  const gaItems: LeanGaItem[] = [];
  for (let n = 0; n < gaitemCount; n++) {
    const g = readGaitem(r);
    if (g) gaItems.push(g);
  }

  // --- PlayerGameData (fixed 0x1B0; read needed fields by offset) ---
  const pgdStart = r.pos;
  const playerGameData = {
    character_name: readCharacterName(r, pgdStart + PGD.character_name),
    vigor: r.u32At(pgdStart + PGD.vigor),
    mind: r.u32At(pgdStart + PGD.mind),
    endurance: r.u32At(pgdStart + PGD.endurance),
    strength: r.u32At(pgdStart + PGD.strength),
    dexterity: r.u32At(pgdStart + PGD.dexterity),
    intelligence: r.u32At(pgdStart + PGD.intelligence),
    faith: r.u32At(pgdStart + PGD.faith),
    arcane: r.u32At(pgdStart + PGD.arcane),
    level: r.u32At(pgdStart + PGD.level),
    souls: r.u32At(pgdStart + PGD.runes),
    soulsmemory: r.u32At(pgdStart + PGD.runes_memory),
    gender: r.bytes[pgdStart + PGD.gender]!,
    arche_type: r.bytes[pgdStart + PGD.archetype]!,
    match_making_wpn_lvl: r.bytes[pgdStart + PGD.matchmaking_weapon_level]!,
  };
  r.seek(pgdStart + PLAYER_GAME_DATA_LEN);

  // --- SPEffects (13 × 16 bytes) ---
  const spEffects: LeanSpEffect[] = [];
  for (let n = 0; n < 0xd; n++) {
    const id = r.i32();
    const remaining = r.f32();
    r.skip(8); // unk0x8, unk0x10
    if (id !== 0 && id !== -1)
      spEffects.push({ sp_effect_id: id, remaining_time: remaining });
  }

  r.skip(EQUIP_SLOTS_LEN); // equipped_items_equip_index
  r.skip(ACTIVE_WEAPON_SLOTS_LEN); // active_weapon_slots_and_arm_style
  r.skip(EQUIP_SLOTS_LEN); // equipped_items_item_id

  // --- equipped_items_gaitem_handle -> chr_asm2 ---
  const chrAsm = readChrAsm(r);

  // --- inventory_held (capacities 0xA80 common / 0x180 key) ---
  const equipInventory = readInventory(r, 0xa80, 0x180);

  r.skip(EQUIPPED_SPELLS_LEN); // equipped_spells

  // --- equipped_items -> equip_item_data (10 quick + 6 pouch) ---
  const equipItemData = readEquipItemData(r);

  r.skip(EQUIPPED_GESTURES_LEN); // equipped_gestures

  // acquired_projectiles: count:u32 + count × 8
  const projectileCount = r.u32();
  r.skip(projectileCount * 8);

  r.skip(EQUIPPED_ARMAMENTS_AND_ITEMS_LEN);
  r.skip(EQUIPPED_PHYSICS_LEN);
  r.skip(FACE_DATA_LEN);

  // --- inventory_storage_box (capacities 0x780 common / 0x80 key) ---
  const storageInventory = readInventory(r, 0x780, 0x80);

  r.skip(GESTURES_LEN); // gestures

  // --- unlocked_regions ---
  const regionCount = r.u32();
  const regionIds: number[] = new Array(regionCount);
  for (let n = 0; n < regionCount; n++) regionIds[n] = r.u32();

  r.skip(HORSE_LEN);
  r.skip(1); // control_byte_maybe
  r.skip(BLOOD_STAIN_LEN);
  r.skip(8); // unk_gamedataman_0x120 + unk_gamedataman_0x88

  // menu_profile_save_load: u16 + u16 + size:u32 + data[size]
  r.skip(4);
  r.skip(r.u32());

  r.skip(TROPHY_EQUIP_LEN);
  r.skip(GAITEM_GAME_DATA_LEN);

  // tutorial_data: u16 + u16 + size:u32 + chunk { count:u32 [+ ids when count != 0] }
  r.skip(4);
  const tutorialSize = r.u32();
  const tutorialCount = r.u32();
  if (tutorialCount !== 0) r.skip(tutorialSize - 4);

  r.skip(3); // gameman_0x8c / 0x8d / 0x8e
  r.skip(8); // total_deaths_count + character_type
  r.skip(1); // in_online_session_flag (u8)
  r.skip(4); // character_type_online
  r.skip(4); // last_rested_grace
  r.skip(1); // not_alone_flag (u8)
  r.skip(4); // in_game_countdown_timer
  r.skip(4); // unk_gamedataman_0x124_or_0x134

  // --- Event flags (raw bitfield) + terminator ---
  const rawFlags = r.bytesView(EVENT_FLAGS_LEN);
  r.skip(1); // event_flags_terminator (u8)

  // Length-prefixed world sections: read i32 size, skip that many bytes.
  r.skip(r.i32()); // field_area
  r.skip(r.i32()); // world_area
  r.skip(r.i32()); // world_geom_man
  r.skip(r.i32()); // world_geom_man2
  r.skip(r.i32()); // rend_man

  // --- player_coordinates (coords + map_id needed; rest skipped) ---
  const playerCoords: [number, number, number] = [r.f32(), r.f32(), r.f32()];
  const coordsMapId = r.byteTuple4();
  r.skip(16); // angle (FloatVector4)
  r.skip(1); // game_man_0xbf0
  r.skip(12); // unk_coordinates (FloatVector3)
  r.skip(16); // unk_angle (FloatVector4)

  r.skip(2); // game_man_0x5be + 0x5bf
  r.skip(4); // spawn_point_entity_id
  r.skip(4); // game_man_0xb64
  if (version >= 65) r.skip(4); // temp_spawn_point_entity_id
  if (version >= 66) r.skip(1); // game_man_0xcb3 (u8)
  r.skip(NET_MAN_LEN);
  r.skip(WORLD_AREA_WEATHER_LEN);
  r.skip(WORLD_AREA_TIME_LEN);
  r.skip(BASE_VERSION_LEN);

  const steamId = r.u64String();

  return {
    steam_id: steamId,
    map_id: mapId,
    player_game_data: playerGameData,
    player_coords: { player_coords: playerCoords, map_id: coordsMapId },
    regions: {
      unlocked_regions_count: regionCount,
      unlocked_regions: regionIds,
    },
    event_flags: { flags: trimTrailingZeros(rawFlags) },
    ga_items: gaItems,
    chr_asm2: chrAsm,
    equip_inventory_data: equipInventory,
    storage_inventory_data: storageInventory,
    equip_item_data: equipItemData,
    sp_effects: spEffects,
  };
}

/**
 * Reads one Gaitem entry. Layout is data-dependent (matches the reference's `skip`
 * conditions): always handle:u32 + item_id:u32, then +8 (unk0x10/0x14) unless the
 * handle is 0 or 0xC-class, then +5 (gem handle:i32 + unk0x1c:u8) only for 0x8-class
 * handles. Returns null for empty (handle == 0) entries; the lean DTO drops those.
 */
function readGaitem(r: BinaryReader): LeanGaItem | null {
  const handle = r.u32();
  const itemId = r.u32();
  if (handle === 0) return null;
  const masked = (handle & 0xf0000000) >>> 0; // top-nibble class, unsigned (& yields int32)
  const is8Class = masked === 0x80000000;
  if (masked !== 0xc0000000) r.skip(8); // unk0x10 + unk0x14
  let gem = 0;
  if (is8Class) {
    gem = r.u32(); // gem_gaitem_handle (i32 in Rust; reused as u32 in the DTO)
    r.skip(1); // unk0x1c
  }
  return { gaitem_handle: handle, item_id: itemId, gem_gaitem_handle: gem };
}

function readCharacterName(r: BinaryReader, absPos: number): string {
  const raw = r.bytes.subarray(absPos, absPos + CHARACTER_NAME_BYTES);
  // Cut at the first UTF-16 NUL (0x0000).
  let end = 0;
  while (end + 1 < raw.length && !(raw[end] === 0 && raw[end + 1] === 0)) end += 2;
  return utf16le.decode(raw.subarray(0, end)).trimEnd();
}

function readChrAsm(r: BinaryReader): LeanChrAsm {
  const lh1 = r.u32();
  const rh1 = r.u32();
  const lh2 = r.u32();
  const rh2 = r.u32();
  const lh3 = r.u32();
  const rh3 = r.u32();
  const arrows1 = r.u32();
  const bolts1 = r.u32();
  const arrows2 = r.u32();
  const bolts2 = r.u32();
  r.skip(8); // unk0x44 + unk48
  const head = r.u32();
  const chest = r.u32();
  const arms = r.u32();
  const legs = r.u32();
  r.skip(4); // unk5c
  const talisman1 = r.u32();
  const talisman2 = r.u32();
  const talisman3 = r.u32();
  const talisman4 = r.u32();
  r.skip(4); // unk0x54
  return {
    left_hand_armaments: [lh1, lh2, lh3],
    right_hand_armaments: [rh1, rh2, rh3],
    arrows: [arrows1, arrows2],
    bolts: [bolts1, bolts2],
    head,
    chest,
    arms,
    legs,
    talismans: [talisman1, talisman2, talisman3, talisman4],
  };
}

/** Inventory: count:u32 + capacity × {handle,quantity,acq_index} (twice: common, key). */
function readInventory(
  r: BinaryReader,
  commonCapacity: number,
  keyCapacity: number,
): LeanInventory {
  const commonCount = r.u32();
  const commonItems = readInventoryItems(r, commonCapacity, commonCount);
  const keyCount = r.u32();
  const keyItems = readInventoryItems(r, keyCapacity, keyCount);
  r.skip(8); // equip_index_counter + aquistion_index_counter
  return {
    common_inventory_items_distinct_count: commonCount,
    common_items: commonItems,
    key_inventory_items_distinct_count: keyCount,
    key_items: keyItems,
  };
}

function readInventoryItems(
  r: BinaryReader,
  capacity: number,
  keep: number,
): LeanInventoryItem[] {
  const items: LeanInventoryItem[] = [];
  for (let i = 0; i < capacity; i++) {
    const handle = r.u32();
    const quantity = r.u32();
    const acqIndex = r.u32();
    if (i < keep)
      items.push({
        ga_item_handle: handle,
        quantity,
        inventory_index: acqIndex,
      });
  }
  return items;
}

/** EquippedItems: 10 quick + active_index + 6 pouch + 2 unk; DTO keeps the gaitem handles. */
function readEquipItemData(r: BinaryReader): LeanEquipItemData {
  const quick: { item_id: number }[] = [];
  for (let i = 0; i < 0xa; i++) {
    quick.push({ item_id: r.u32() });
    r.skip(4); // equip_index
  }
  r.skip(4); // active_quick_item_index
  const pouch: { item_id: number }[] = [];
  for (let i = 0; i < 0x6; i++) {
    pouch.push({ item_id: r.u32() });
    r.skip(4); // equip_index
  }
  r.skip(8); // unk0x84 + unk0x88
  return { quick_slot_items: quick, pouch_items: pouch };
}

function trimTrailingZeros(bytes: Uint8Array): Uint8Array {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end--;
  // Copy so the trimmed result detaches from the 28 MB save buffer.
  return bytes.slice(0, end);
}

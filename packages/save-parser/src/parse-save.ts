/**
 * Pure-TypeScript Elden Ring save (`.sl2`) parser — read-only, PC saves.
 *
 * Ported field-for-field from the verified Rust reference — our ER-Save-Lib fork's
 * `save/user_data_x.rs` + `user_data_10.rs`, projected by `api/web_export.rs` (that fork +
 * WASM build have since been retired from the repo; this parser replaced them — see
 * docs/projects/typescript-save-parser-port.md). The byte layout is sequential and
 * little-endian; we walk the whole slot, capturing the fields the DTO needs and advancing
 * past the rest by their exact byte size. Where a section is length-prefixed (`field_area`,
 * `world_area`, the two `world_geom_man`s, `rend_man`, the menu/tutorial blobs) we read its
 * leading size and skip; the inventories read their full fixed capacity. Offsets/sizes match
 * the er-save-manager Python reference (`parser/{character,equipment,world,user_data_x,
 * user_data_10}.py`); every `r.skip(N)` we turned into a read consumes exactly `N` bytes, so
 * the cumulative walk — and the original fields' byte-for-byte parity — is preserved.
 *
 * Effect-native surface, native speed: the cursor is the {@link BinaryReader} Context.Service,
 * but the walk itself is a synchronous routine (see `binary-reader.ts` for why per-read Effects
 * are too slow). `parseSave` resolves the reader, runs the walk inside a single `Effect.try`,
 * and surfaces a truncated/garbage save as a typed {@link SaveTruncatedError} (or
 * {@link SaveMagicMismatchError} for a non-PC save). Callers run the returned Effect —
 * `Effect.runSync(parseSave(buffer))`.
 *
 * Opaque blobs (face data, net/geom/render caches, character presets, the gaitem game-data
 * table, the integrity hash) and a few redundant/transient/internal scalars
 * (EquippedArmamentsAndItems — a duplicate of the equip data by item_id; the unk world
 * coordinate/quaternion pair; the online-session/countdown bookkeeping bytes) are intentionally
 * still skipped. See `docs/projects/typescript-save-parser-port.md`.
 */
import { Effect, Schema } from 'effect';

import {
  BinaryReader,
  type BinaryReaderApi,
  makeBinaryReader,
  SaveTruncatedError,
} from './binary-reader.ts';
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
const EQUIPPED_ARMAMENTS_AND_ITEMS_LEN = 0x9c;
const FACE_DATA_LEN = 0x12f; // slot context (303); 0x120 in profile context
const TROPHY_EQUIP_LEN = 0x34;
const GAITEM_GAME_DATA_LEN = 8 + 7000 * 16; // i64 count + 7000 entries
const NET_MAN_LEN = 0x20004;
const PS5_ACTIVITY_LEN = 0x20; // sits between steam_id and DLC (present on PC too)

// UserData10 ProfileSummary: 10 fixed-size Profile records carry per-slot playtime.
const PROFILE_LEN = 0x24c;
const PROFILE_SECONDS_PLAYED_OFFSET = 0x26; // name(0x20) + terminator(2) + level(4)

// PlayerGameData field offsets (within its 0x1B0 block) — see the reference + spec table.
const PGD = {
  hp: 0x08,
  max_hp: 0x0c,
  base_max_hp: 0x10,
  fp: 0x14,
  max_fp: 0x18,
  base_max_fp: 0x1c,
  stamina: 0x24,
  max_stamina: 0x28,
  base_max_stamina: 0x2c,
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
  poison_buildup: 0x70,
  rot_buildup: 0x74,
  bleed_buildup: 0x78,
  death_buildup: 0x7c,
  frost_buildup: 0x80,
  sleep_buildup: 0x84,
  madness_buildup: 0x88,
  character_name: 0x94, // 32 bytes UTF-16LE
  gender: 0xb6,
  archetype: 0xb7,
  voice_type: 0xba,
  gift: 0xbb,
  additional_talisman_slot_count: 0xbe,
  summon_spirit_level: 0xbf,
  furl_calling_finger_on: 0xd8,
  matchmaking_weapon_level: 0xda,
  white_cipher_ring_on: 0xdb,
  blue_cipher_ring_on: 0xdc,
  great_rune_on: 0xf7,
  max_crimson_flask_count: 0xf9,
  max_cerulean_flask_count: 0xfa,
} as const;
const CHARACTER_NAME_BYTES = 32;

const utf16le = new TextDecoder('utf-16le');

/** Raised when the buffer is not a PC Elden Ring save (missing the "BND4" magic). */
export class SaveMagicMismatchError extends Schema.TaggedErrorClass<SaveMagicMismatchError>()(
  'save-parser/SaveMagicMismatchError',
  {},
) {}

/** All failures `parseSave` can produce. */
export type SaveParseError = SaveMagicMismatchError | SaveTruncatedError;

/**
 * Tag-based guard (via the error schemas, not `instanceof`) for the values the synchronous
 * walk throws. Used at the `Effect.try` seam to lift them into the typed error channel —
 * anything else that surfaces there is a genuine bug and stays a defect.
 */
const isSaveParseError: (u: unknown) => u is SaveParseError = Schema.is(
  Schema.Union([SaveMagicMismatchError, SaveTruncatedError]),
);

/** Parse a PC `.sl2` save buffer into the lean DTO (active slots only). */
export const parseSave = (
  buffer: ArrayBuffer,
): Effect.Effect<LeanSave, SaveParseError> =>
  Effect.gen(function* () {
    const r = yield* BinaryReader;
    // The walk is synchronous (hot path); a single `Effect.try` lifts the thrown tagged
    // error (truncation / bad magic) into the typed error channel via a tag-based guard
    // (no cast, no `instanceof`), re-raising any genuinely-unexpected throw as a defect.
    return yield* Effect.try({
      try: () => walkSave(r),
      catch: (cause) => {
        if (isSaveParseError(cause)) return cause;
        throw cause;
      },
    });
  }).pipe(Effect.provideService(BinaryReader, makeBinaryReader(buffer)));

/** Synchronous slot walk over the resolved reader (throws {@link SaveParseError} on failure). */
function walkSave(r: BinaryReaderApi): LeanSave {
  for (let i = 0; i < PC_MAGIC.length; i++) {
    if (r.byteAt(i) !== PC_MAGIC[i]) {
      throw new SaveMagicMismatchError();
    }
  }

  const { globalSteamId, activeProfiles, secondsPlayed } = readUserData10(r);

  const slots: LeanSlot[] = [];
  const characterSteamIds: string[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    if (!activeProfiles[i]) continue;
    r.seek(SLOTS_START + SLOT_SIZE * i + SLOT_CHECKSUM);
    const slot = readSlot(r, secondsPlayed[i] ?? 0);
    slots.push(slot);
    characterSteamIds.push(slot.steam_id);
  }

  return {
    global_steam_id: globalSteamId,
    character_steam_ids: characterSteamIds,
    slots,
  };
}

/**
 * Reads UserData10 for the global steam id, the active-profile mask, and the per-slot
 * playtime from ProfileSummary (10 fixed `Profile` records after the active-profile flags).
 */
function readUserData10(r: BinaryReaderApi): {
  globalSteamId: string;
  activeProfiles: boolean[];
  secondsPlayed: number[];
} {
  r.seek(USER_DATA_10_START + 0x10); // skip checksum
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
  // ProfileSummary.profiles: [Profile; 10] — read seconds_played, skip the rest of each.
  const secondsPlayed: number[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const profileStart = r.pos();
    secondsPlayed[i] = r.u32At(profileStart + PROFILE_SECONDS_PLAYED_OFFSET);
    r.seek(profileStart + PROFILE_LEN);
  }
  return { globalSteamId, activeProfiles, secondsPlayed };
}

/** Reads one UserDataX slot; `r` must be positioned at the slot's `version` field. */
function readSlot(r: BinaryReaderApi, secondsPlayed: number): LeanSlot {
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
  const pgdStart = r.pos();
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
    gender: r.byteAt(pgdStart + PGD.gender),
    arche_type: r.byteAt(pgdStart + PGD.archetype),
    match_making_wpn_lvl: r.byteAt(pgdStart + PGD.matchmaking_weapon_level),
    hp: r.u32At(pgdStart + PGD.hp),
    max_hp: r.u32At(pgdStart + PGD.max_hp),
    base_max_hp: r.u32At(pgdStart + PGD.base_max_hp),
    fp: r.u32At(pgdStart + PGD.fp),
    max_fp: r.u32At(pgdStart + PGD.max_fp),
    base_max_fp: r.u32At(pgdStart + PGD.base_max_fp),
    stamina: r.u32At(pgdStart + PGD.stamina),
    max_stamina: r.u32At(pgdStart + PGD.max_stamina),
    base_max_stamina: r.u32At(pgdStart + PGD.base_max_stamina),
    buildup: {
      poison: r.u32At(pgdStart + PGD.poison_buildup),
      rot: r.u32At(pgdStart + PGD.rot_buildup),
      bleed: r.u32At(pgdStart + PGD.bleed_buildup),
      death: r.u32At(pgdStart + PGD.death_buildup),
      frost: r.u32At(pgdStart + PGD.frost_buildup),
      sleep: r.u32At(pgdStart + PGD.sleep_buildup),
      madness: r.u32At(pgdStart + PGD.madness_buildup),
    },
    voice_type: r.byteAt(pgdStart + PGD.voice_type),
    gift: r.byteAt(pgdStart + PGD.gift),
    additional_talisman_slot_count: r.byteAt(
      pgdStart + PGD.additional_talisman_slot_count,
    ),
    summon_spirit_level: r.byteAt(pgdStart + PGD.summon_spirit_level),
    furl_calling_finger_on:
      r.byteAt(pgdStart + PGD.furl_calling_finger_on) !== 0,
    white_cipher_ring_on: r.byteAt(pgdStart + PGD.white_cipher_ring_on) !== 0,
    blue_cipher_ring_on: r.byteAt(pgdStart + PGD.blue_cipher_ring_on) !== 0,
    great_rune_on: r.byteAt(pgdStart + PGD.great_rune_on) !== 0,
    max_crimson_flask_count: r.byteAt(pgdStart + PGD.max_crimson_flask_count),
    max_cerulean_flask_count: r.byteAt(pgdStart + PGD.max_cerulean_flask_count),
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

  // --- active_weapon_slots_and_arm_style (0x1C) ---
  const activeWeaponSlots = {
    arm_style: r.u32(),
    left_hand: r.u32(),
    right_hand: r.u32(),
    left_arrow: r.u32(),
    right_arrow: r.u32(),
    left_bolt: r.u32(),
    right_bolt: r.u32(),
  };

  r.skip(EQUIP_SLOTS_LEN); // equipped_items_item_id

  // --- equipped_items_gaitem_handle -> chr_asm2 ---
  const chrAsm = readChrAsm(r);

  // --- inventory_held (capacities 0xA80 common / 0x180 key) ---
  const equipInventory = readInventory(r, 0xa80, 0x180);

  // --- equipped_spells (0x74): 14 × {spell_id, unk} + active_index ---
  const equippedSpells: number[] = [];
  for (let n = 0; n < 14; n++) {
    equippedSpells[n] = r.u32();
    r.skip(4); // unk0x4
  }
  r.skip(4); // active_index

  // --- equipped_items -> equip_item_data (10 quick + 6 pouch) ---
  const equipItemData = readEquipItemData(r);

  // --- equipped_gestures (0x18): 6 gesture ids ---
  const equippedGestures: number[] = [];
  for (let n = 0; n < 6; n++) equippedGestures[n] = r.u32();

  // acquired_projectiles: count:u32 + count × {id, unk}
  const projectileCount = r.u32();
  const acquiredProjectiles: number[] = [];
  for (let n = 0; n < projectileCount; n++) {
    acquiredProjectiles[n] = r.u32();
    r.skip(4); // unk0x4
  }

  r.skip(EQUIPPED_ARMAMENTS_AND_ITEMS_LEN); // redundant item_id mirror of equip data

  // --- equipped_physics (0xC): 2 Wondrous Physick tear ids + unk ---
  const physick1 = r.u32();
  const physick2 = r.u32();
  r.skip(4); // unk0x8

  r.skip(FACE_DATA_LEN); // face_data (opaque)

  // --- inventory_storage_box (capacities 0x780 common / 0x80 key) ---
  const storageInventory = readInventory(r, 0x780, 0x80);

  // --- gestures (0x100): full 64-slot gesture table ---
  const gestures: number[] = [];
  for (let n = 0; n < 64; n++) gestures[n] = r.u32();

  // --- unlocked_regions ---
  const regionCount = r.u32();
  const regionIds: number[] = [];
  for (let n = 0; n < regionCount; n++) regionIds[n] = r.u32();

  // --- horse / RideGameData (0x28) ---
  const horseCoords: [number, number, number] = [r.f32(), r.f32(), r.f32()];
  const horseMapId = r.byteTuple4();
  r.skip(16); // angle (FloatVector4)
  const horseHp = r.i32();
  const horseState = r.u32();

  r.skip(1); // control_byte_maybe

  // --- blood_stain (0x44) ---
  const bloodCoords: [number, number, number] = [r.f32(), r.f32(), r.f32()];
  r.skip(16); // angle (FloatVector4)
  r.skip(20); // unk0x1c..unk0x2c (5 × u32)
  r.skip(4); // unk0x30 (i32) — mirrors `runes` as -1 when no bloodstain is set
  const bloodRunes = r.i32();
  const bloodMapId = r.byteTuple4();
  r.skip(8); // unk0x3c + unk0x38

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
  const deaths = r.u32(); // total_deaths_count
  r.skip(4); // character_type (i32)
  r.skip(1); // in_online_session_flag (u8)
  r.skip(4); // character_type_online
  const lastRestedGrace = r.u32();
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

  // --- player_coordinates (coords + map_id + facing angle needed; rest skipped) ---
  const playerCoords: [number, number, number] = [r.f32(), r.f32(), r.f32()];
  const coordsMapId = r.byteTuple4();
  const coordsAngle: [number, number, number, number] = [
    r.f32(),
    r.f32(),
    r.f32(),
    r.f32(),
  ];
  r.skip(1); // game_man_0xbf0
  r.skip(12); // unk_coordinates (FloatVector3)
  r.skip(16); // unk_angle (FloatVector4)

  r.skip(2); // game_man_0x5be + 0x5bf
  const spawnPointEntityId = r.u32();
  r.skip(4); // game_man_0xb64
  if (version >= 65) r.skip(4); // temp_spawn_point_entity_id
  if (version >= 66) r.skip(1); // game_man_0xcb3 (u8)
  r.skip(NET_MAN_LEN);

  // --- world_area_weather (0xC) ---
  const weatherAreaId = r.u16();
  const weatherType = r.u16();
  const weatherTimer = r.u32();
  r.skip(4); // padding

  // --- world_area_time (0xC) ---
  const timeHour = r.u32();
  const timeMinute = r.u32();
  const timeSecond = r.u32();

  // --- base_version (0x10) ---
  r.skip(4); // base_version_copy
  const baseVersion = r.u32();
  const isLatestVersion = r.u32();
  r.skip(4); // unk0xc

  const steamId = r.u64String();

  // --- PS5Activity (0x20) then DLC (0x32) ---
  r.skip(PS5_ACTIVITY_LEN);
  const dlcPreorderTheRing = r.u8() !== 0;
  const dlcShadowOfErdtree = r.u8() !== 0;
  const dlcPreorderRingOfMiquella = r.u8() !== 0;

  return {
    steam_id: steamId,
    version,
    seconds_played: secondsPlayed,
    map_id: mapId,
    player_game_data: playerGameData,
    player_coords: {
      player_coords: playerCoords,
      map_id: coordsMapId,
      angle: coordsAngle,
    },
    regions: {
      unlocked_regions_count: regionCount,
      unlocked_regions: regionIds,
    },
    event_flags: { flags: trimTrailingZeros(rawFlags) },
    ga_items: gaItems,
    chr_asm2: chrAsm,
    active_weapon_slots: activeWeaponSlots,
    equip_inventory_data: equipInventory,
    storage_inventory_data: storageInventory,
    equip_item_data: equipItemData,
    equipped_spells: equippedSpells,
    equipped_gestures: equippedGestures,
    gestures,
    equipped_physics: [physick1, physick2],
    acquired_projectiles: acquiredProjectiles,
    sp_effects: spEffects,
    horse: {
      coords: horseCoords,
      map_id: horseMapId,
      hp: horseHp,
      state: horseState,
    },
    blood_stain: {
      coords: bloodCoords,
      map_id: bloodMapId,
      runes: bloodRunes,
    },
    world_time: { hour: timeHour, minute: timeMinute, second: timeSecond },
    world_weather: {
      area_id: weatherAreaId,
      weather_type: weatherType,
      timer: weatherTimer,
    },
    base_version: {
      base_version: baseVersion,
      is_latest_version: isLatestVersion,
    },
    deaths,
    last_rested_grace: lastRestedGrace,
    spawn_point_entity_id: spawnPointEntityId,
    dlc: {
      shadow_of_erdtree: dlcShadowOfErdtree,
      preorder_the_ring: dlcPreorderTheRing,
      preorder_ring_of_miquella: dlcPreorderRingOfMiquella,
    },
  };
}

/**
 * Reads one Gaitem entry. Layout is data-dependent (matches the reference's `skip`
 * conditions): always handle:u32 + item_id:u32, then +8 (unk0x10/0x14) unless the
 * handle is 0 or 0xC-class, then +5 (gem handle:i32 + unk0x1c:u8) only for 0x8-class
 * handles. Returns null for empty (handle == 0) entries; the lean DTO drops those.
 */
function readGaitem(r: BinaryReaderApi): LeanGaItem | null {
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

function readCharacterName(r: BinaryReaderApi, absPos: number): string {
  const raw = r.subarrayAt(absPos, CHARACTER_NAME_BYTES);
  // Cut at the first UTF-16 NUL (0x0000).
  let end = 0;
  while (end + 1 < raw.length && !(raw[end] === 0 && raw[end + 1] === 0))
    end += 2;
  return utf16le.decode(raw.subarray(0, end)).trimEnd();
}

function readChrAsm(r: BinaryReaderApi): LeanChrAsm {
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
  r: BinaryReaderApi,
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
  r: BinaryReaderApi,
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
function readEquipItemData(r: BinaryReaderApi): LeanEquipItemData {
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

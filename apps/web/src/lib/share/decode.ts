import LZString from 'lz-string';
import { EVENT_FLAGS } from '@/lib/elden-ring-raw-db/EVENT_FLAGS';
import type { Slot } from '@/lib/wasm-wrapper';
import { type ShareableProgression, SHAREABLE_VERSION } from './types';

/**
 * Decode and decompress shareable data from URL query param.
 */
export function decodeFromUrl(encoded: string): ShareableProgression | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;

    const data = JSON.parse(json) as ShareableProgression;

    // Validate version
    if (data.v !== SHAREABLE_VERSION) {
      console.warn(`Unknown share data version: ${String(data.v)}`);
      return null;
    }

    return data;
  } catch (e) {
    console.error('Failed to decode shared data:', e);
    return null;
  }
}

/**
 * Create a lookup map from event ID to [byteOffset, bitPos].
 */
const eventIdToOffsetMap = new Map(EVENT_FLAGS.map(([id, offset]) => [id, offset]));

/**
 * Reconstruct a partial Slot object from shareable data.
 * This allows existing view models to consume the data.
 */
export function reconstructSlot(data: ShareableProgression): Partial<Slot> {
  // Reconstruct event_flags Uint8Array from delta-encoded IDs
  const flags = new Uint8Array(2048);
  let currentId = 0;

  for (const delta of data.ef) {
    currentId += delta;
    const mapping = eventIdToOffsetMap.get(currentId);
    if (mapping) {
      const [byteOffset, bitPos] = mapping;
      flags[byteOffset] = (flags[byteOffset] ?? 0) | (1 << bitPos);
    }
  }

  // Reconstruct character name as byte array
  const characterNameBytes: number[] = [];
  for (let i = 0; i < data.n.length && i < 16; i++) {
    characterNameBytes.push(data.n.charCodeAt(i));
  }
  // Pad with zeros
  while (characterNameBytes.length < 16) {
    characterNameBytes.push(0);
  }

  // Reconstruct inventory items
  const commonItems = data.inv.map(([handle, qty], i) => ({
    ga_item_handle: handle,
    quantity: qty,
    inventory_index: i,
  }));

  // Reconstruct GA items
  const gaItems = data.ga.map(([id, reinforceType]) => ({
    id,
    reinforce_type: reinforceType,
    unk: 0,
    unk1: 0,
  }));

  // Return partial slot that matches the Slot interface
  // The view models need to handle potentially missing fields
  return {
    ver: 0,
    map_id: [],
    ga_items: [],
    player_game_data: {
      _0x4: 0,
      _0x4_1: 0,
      health: 0,
      max_health: 0,
      base_max_health: 0,
      fp: 0,
      max_fp: 0,
      base_max_fp: 0,
      _0x4_2: 0,
      sp: 0,
      max_sp: 0,
      base_max_sp: 0,
      _0x4_3: 0,
      vigor: data.s.v,
      mind: data.s.m,
      endurance: data.s.e,
      strength: data.s.st,
      dexterity: data.s.d,
      intelligence: data.s.i,
      faith: data.s.f,
      arcane: data.s.a,
      _0x4_4: 0,
      _0x4_5: 0,
      _0x4_6: 0,
      level: data.s.l,
      souls: data.s.r,
      soulsmemory: data.s.rm,
      character_name: characterNameBytes,
      gender: data.g,
      arche_type: data.at,
      gift: 0,
      match_making_wpn_lvl: data.wl,
      password: [],
      group_password1: [],
      group_password2: [],
      group_password3: [],
      group_password4: [],
      group_password5: [],
    },
    equip_data: {
      left_hand_armaments: [],
      right_hand_armaments: [],
      arrows: [],
      bolts: [],
      _0x4: 0,
      _0x4_1: 0,
      head: 0,
      chest: 0,
      arms: 0,
      legs: 0,
      _0x4_2: 0,
      talismans: [],
      unk: 0,
    },
    chr_asm: {
      arm_style: 0,
      left_hand_active_slot: 0,
      right_hand_active_slot: 0,
      left_arrow_active_slot: 0,
      right_arrow_active_slot: 0,
      left_bolt_active_slot: 0,
      right_bolt_active_slot: 0,
      left_hand_armaments: [],
      right_hand_armaments: [],
      arrows: [],
      bolts: [],
      _0x4: 0,
      _0x4_1: 0,
      head: 0,
      chest: 0,
      arms: 0,
      legs: 0,
      _0x4_2: 0,
      talismans: [],
      unk: 0,
    },
    chr_asm2: {
      left_hand_armaments: [],
      right_hand_armaments: [],
      arrows: [],
      bolts: [],
      _unk0: 0,
      _unk1: 0,
      head: 0,
      chest: 0,
      arms: 0,
      legs: 0,
      _unk2: 0,
      talismans: [],
      _unk3: 0,
    },
    equip_inventory_data: {
      common_inventory_items_distinct_count: commonItems.length,
      common_items: commonItems,
      key_inventory_items_distinct_count: 0,
      key_items: [],
      next_equip_index: 0,
      next_acquisition_sort_id: 0,
    },
    equip_magic_data: {
      equip_magic_spells: [],
      _0x10: [],
      active_slot: 0,
    },
    equip_item_data: {
      quick_slot_items: [],
      active_slot: 0,
      pouch_items: [],
      _0x8: [],
    },
    equip_gesture_data: [],
    equip_projectile_data: {
      projectile_count: 0,
      projectiles: [],
    },
    equipped_items: {
      left_hand_armaments: [],
      right_hand_armaments: [],
      arrows: [],
      bolts: [],
      _unk1: 0,
      _unk2: 0,
      head: 0,
      chest: 0,
      arms: 0,
      legs: 0,
      _unk3: 0,
      talismans: [],
      _unk4: 0,
      quickitems: [],
      pouch: [],
      _padding17: 0,
    },
    equip_physics_data: {
      slot1: 0,
      slot2: 0,
    },
    _0x4: 0,
    storage_inventory_data: {
      common_inventory_items_distinct_count: 0,
      common_items: [],
      key_inventory_items_distinct_count: 0,
      key_items: [],
      next_equip_index: 0,
      next_acquisition_sort_id: 0,
    },
    gesture_game_data: [],
    regions: {
      unlocked_regions_count: data.ur.length,
      unlocked_regions: data.ur,
    },
    ride_game_data: {
      horse_coords: [],
      _0x4: 0,
      _0x10: [],
      horse_hp: 0,
      _0x4_1: 0,
    },
    _0x1: 0,
    _0x4_1: 0,
    _0x4_2: 0,
    _0x4_3: 0,
    ga_item_data: {
      distinct_aquired_items_count: gaItems.length,
      unk1: 0,
      ga_items: gaItems,
    },
    event_flags: {
      flags: flags,
    },
    _0x1_1: 0,
    _unk_lists: [],
    player_coords: {
      player_coords: [],
      map_id: [],
      _0x11: [],
      player_coords2: [],
      _0x10: [],
    },
    _0x1_2: 0,
    _cs_net_data_chunks: [],
    world_area_weather: {
      unk0: 0,
      unk1: 0,
      unk2: 0,
    },
    world_area_time: {
      unk0: 0,
      unk1: 0,
      unk2: 0,
    },
    steam_id: '',
    _rest: [],
  } as Slot;
}

/**
 * Check if decoded data is valid.
 */
export function isValidShareData(data: unknown): data is ShareableProgression {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    d.v === SHAREABLE_VERSION &&
    typeof d.n === 'string' &&
    typeof d.s === 'object' &&
    Array.isArray(d.ef) &&
    Array.isArray(d.ur) &&
    Array.isArray(d.inv) &&
    Array.isArray(d.ga)
  );
}

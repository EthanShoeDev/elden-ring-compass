import LZString from 'lz-string';
import { eventFlagOffset } from '@elden-ring-compass/data';
import type { Slot } from '@/lib/wasm-wrapper';
import { MAX_EVENT_BYTE_OFFSET } from './shareable-events';
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
 * Reconstruct a partial Slot (new lean shape) from shareable data so the existing
 * view-models can consume a shared link. Only the fields the VMs read are populated.
 */
export function reconstructSlot(data: ShareableProgression): Partial<Slot> {
  // Reconstruct event_flags Uint8Array from delta-encoded IDs.
  const flags = new Uint8Array(MAX_EVENT_BYTE_OFFSET + 1);
  let currentId = 0;
  for (const delta of data.ef) {
    currentId += delta;
    const offset = eventFlagOffset(currentId);
    if (offset) {
      const [byteOffset, bitPos] = offset;
      flags[byteOffset] = (flags[byteOffset] ?? 0) | (1 << bitPos);
    }
  }

  // Reconstruct inventory items (equip storage only; weapons can't be shown without ga_items).
  const commonItems = data.inv.map(([handle, qty], i) => ({
    ga_item_handle: handle,
    quantity: qty,
    inventory_index: i,
  }));

  return {
    steam_id: '',
    map_id: [],
    player_game_data: {
      character_name: data.n,
      vigor: data.s.v,
      mind: data.s.m,
      endurance: data.s.e,
      strength: data.s.st,
      dexterity: data.s.d,
      intelligence: data.s.i,
      faith: data.s.f,
      arcane: data.s.a,
      level: data.s.l,
      souls: data.s.r,
      soulsmemory: data.s.rm,
      gender: data.g,
      arche_type: data.at,
      match_making_wpn_lvl: data.wl,
    },
    player_coords: { player_coords: [], map_id: [] },
    regions: {
      unlocked_regions_count: data.ur.length,
      unlocked_regions: data.ur,
    },
    event_flags: { flags },
    ga_items: [],
    chr_asm2: {
      left_hand_armaments: [],
      right_hand_armaments: [],
      arrows: [],
      bolts: [],
      head: 0,
      chest: 0,
      arms: 0,
      legs: 0,
      talismans: [],
    },
    equip_inventory_data: {
      common_inventory_items_distinct_count: commonItems.length,
      common_items: commonItems,
      key_inventory_items_distinct_count: 0,
      key_items: [],
    },
    storage_inventory_data: {
      common_inventory_items_distinct_count: 0,
      common_items: [],
      key_inventory_items_distinct_count: 0,
      key_items: [],
    },
    equip_item_data: { quick_slot_items: [], pouch_items: [] },
    sp_effects: [],
  } satisfies Partial<Slot>;
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

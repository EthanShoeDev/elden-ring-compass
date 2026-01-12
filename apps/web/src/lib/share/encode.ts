import LZString from 'lz-string';
import { EVENT_FLAGS } from '@/lib/elden-ring-raw-db/EVENT_FLAGS';
import { playerNameBytesToString } from '@/lib/elden-ring-raw-db/er-raw-db';
import type { Slot } from '@/lib/wasm-wrapper';
import { type ShareableProgression, SHAREABLE_VERSION } from './types';

function get_bit(byte: number, bit_pos: number): boolean {
  return (byte & (1 << bit_pos)) !== 0;
}

/**
 * Extract minimal shareable data from a save slot.
 */
export function extractShareableData(slot: Readonly<Slot>): ShareableProgression {
  // Extract completed event IDs
  const completedEventIds: number[] = [];
  for (const [eventId, [byteOffset, bitPos]] of EVENT_FLAGS) {
    if (get_bit(slot.event_flags.flags[byteOffset], bitPos)) {
      completedEventIds.push(eventId);
    }
  }

  // Sort and delta-encode for better compression
  completedEventIds.sort((a, b) => a - b);
  const deltaEncodedEvents = completedEventIds.map((id, i) =>
    i === 0 ? id : id - completedEventIds[i - 1],
  );

  // Extract inventory (combine equip + storage)
  const inventoryItems: [number, number][] = [
    ...slot.equip_inventory_data.common_items.map(
      (item) => [item.ga_item_handle, item.quantity] as [number, number],
    ),
    ...slot.storage_inventory_data.common_items.map(
      (item) => [item.ga_item_handle, item.quantity] as [number, number],
    ),
  ];

  // Extract GA items for upgrade levels
  const gaItems: [number, number][] = slot.ga_item_data.ga_items.map(
    (g) => [g.id, g.reinforce_type] as [number, number],
  );

  // Extract unlocked region IDs
  const unlockedRegions: number[] = [];
  for (let i = 0; i < slot.regions.unlocked_regions_count; i++) {
    unlockedRegions.push(slot.regions.unlocked_regions[i]);
  }

  return {
    v: SHAREABLE_VERSION,
    n: playerNameBytesToString(slot.player_game_data.character_name),
    s: {
      l: slot.player_game_data.level,
      v: slot.player_game_data.vigor,
      m: slot.player_game_data.mind,
      e: slot.player_game_data.endurance,
      st: slot.player_game_data.strength,
      d: slot.player_game_data.dexterity,
      i: slot.player_game_data.intelligence,
      f: slot.player_game_data.faith,
      a: slot.player_game_data.arcane,
      r: slot.player_game_data.souls,
      rm: slot.player_game_data.soulsmemory,
    },
    g: slot.player_game_data.gender,
    at: slot.player_game_data.arche_type,
    wl: slot.player_game_data.match_making_wpn_lvl,
    ef: deltaEncodedEvents,
    ur: unlockedRegions,
    inv: inventoryItems,
    ga: gaItems,
  };
}

/**
 * Compress and encode shareable data for URL query param.
 */
export function encodeToUrl(data: ShareableProgression): string {
  const json = JSON.stringify(data);
  return LZString.compressToEncodedURIComponent(json);
}

/**
 * Generate the full share URL.
 */
export function generateShareUrl(slot: Readonly<Slot>): string {
  const data = extractShareableData(slot);
  const encoded = encodeToUrl(data);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/share?d=${encoded}`;
}

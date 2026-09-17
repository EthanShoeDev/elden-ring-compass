import LZString from 'lz-string';
import { eventFlagOffset } from '@elden-ring-compass/data';
import { Effect, Schema } from 'effect';
import { logError, logWarning } from '@/lib/runtime/log';
import type { Slot } from '@/lib/save-dto';
import { GZIP_PREFIX } from './encode';
import { MAX_EVENT_BYTE_OFFSET } from './shareable-events';
import {
  LEGACY_SHAREABLE_VERSION,
  ShareCodecError,
  type ShareableProgression,
  ShareableProgressionSchema,
  SHAREABLE_VERSION,
} from './types';

const ShareableProgressionJson = Schema.fromJsonString(ShareableProgressionSchema);

function base64UrlToBytes(encoded: string): Uint8Array {
  const base64 = encoded.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary =
    typeof atob === 'function' ? atob(padded) : Buffer.from(padded, 'base64').toString('binary');
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function parseShareableProgressionJson(json: string): ShareableProgression | null {
  const decoded = Schema.decodeExit(ShareableProgressionJson)(json);
  if (decoded._tag === 'Failure') return null;
  return decoded.value;
}

const gunzip = Effect.fn('gunzip')(function* (bytes: Uint8Array) {
  if (typeof DecompressionStream !== 'function' || typeof Blob.prototype.stream !== 'function') {
    return bytes;
  }
  const stream = new Blob([bytes.buffer as ArrayBuffer])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  const buffer = yield* Effect.tryPromise({
    try: () => new Response(stream).arrayBuffer(),
    catch: (cause) => new ShareCodecError({ cause }),
  });
  return new Uint8Array(buffer);
});

/**
 * Decode and decompress shareable data from URL query param.
 */
export function decodeFromUrl(encoded: string): ShareableProgression | null {
  try {
    if (encoded.startsWith(GZIP_PREFIX)) {
      logWarning('Tried to synchronously decode async gzip share data');
      return null;
    }

    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;

    return parseShareableProgressionJson(json);
  } catch (e) {
    logError('Failed to decode shared data:', e);
    return null;
  }
}

export const decodeFromUrlEffect = Effect.fn('decodeFromUrlEffect')(function* (encoded: string) {
  if (!encoded) return null;
  if (!encoded.startsWith(GZIP_PREFIX)) return decodeFromUrl(encoded);

  const compressed = base64UrlToBytes(encoded.slice(GZIP_PREFIX.length));
  const json = new TextDecoder().decode(yield* gunzip(compressed));
  return parseShareableProgressionJson(json);
});

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

  if (data.v === 2) {
    const inventory = (items: ReadonlyArray<readonly [number, number, number]>) =>
      items.map(([handle, quantity, inventoryIndex]) => ({
        ga_item_handle: handle,
        quantity,
        inventory_index: inventoryIndex,
      }));

    return {
      steam_id: '',
      version: 0,
      seconds_played: data.sp,
      map_id: data.mid,
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
        hp: data.s.hp,
        max_hp: data.s.mhp,
        base_max_hp: data.s.bhp,
        fp: data.s.fp,
        max_fp: data.s.mfp,
        base_max_fp: data.s.bfp,
        stamina: data.s.sta,
        max_stamina: data.s.msta,
        base_max_stamina: data.s.bsta,
        buildup: {
          poison: data.s.b.p,
          rot: data.s.b.ro,
          bleed: data.s.b.bl,
          death: data.s.b.de,
          frost: data.s.b.fr,
          sleep: data.s.b.sl,
          madness: data.s.b.ma,
        },
        voice_type: data.s.vt,
        gift: data.s.gf,
        additional_talisman_slot_count: data.s.tal,
        summon_spirit_level: data.s.ash,
        furl_calling_finger_on: data.s.fcf,
        white_cipher_ring_on: data.s.wcr,
        blue_cipher_ring_on: data.s.bcr,
        great_rune_on: data.s.gr,
        max_crimson_flask_count: data.s.mcf,
        max_cerulean_flask_count: data.s.mcef,
      },
      player_coords: {
        player_coords: data.pc.c,
        map_id: data.pc.m,
        angle: data.pc.a,
      },
      regions: {
        unlocked_regions_count: data.ur.length,
        unlocked_regions: data.ur,
      },
      event_flags: { flags },
      ga_items: data.ga.map(([gaitem_handle, item_id, gem_gaitem_handle]) => ({
        gaitem_handle,
        item_id,
        gem_gaitem_handle,
      })),
      chr_asm2: {
        left_hand_armaments: data.ca.l,
        right_hand_armaments: data.ca.r,
        arrows: data.ca.a,
        bolts: data.ca.b,
        head: data.ca.h,
        chest: data.ca.c,
        arms: data.ca.ar,
        legs: data.ca.le,
        talismans: data.ca.t,
      },
      active_weapon_slots: {
        arm_style: data.aw.as,
        left_hand: data.aw.l,
        right_hand: data.aw.r,
        left_arrow: data.aw.la,
        right_arrow: data.aw.ra,
        left_bolt: data.aw.lb,
        right_bolt: data.aw.rb,
      },
      equip_inventory_data: {
        common_inventory_items_distinct_count: data.ei.c.length,
        common_items: inventory(data.ei.c),
        key_inventory_items_distinct_count: data.ei.k.length,
        key_items: inventory(data.ei.k),
      },
      storage_inventory_data: {
        common_inventory_items_distinct_count: data.si.c.length,
        common_items: inventory(data.si.c),
        key_inventory_items_distinct_count: data.si.k.length,
        key_items: inventory(data.si.k),
      },
      equip_item_data: {
        quick_slot_items: data.eq.q.map((item_id) => ({ item_id })),
        pouch_items: data.eq.p.map((item_id) => ({ item_id })),
      },
      equipped_spells: data.esp,
      equipped_gestures: data.eg,
      gestures: data.ges,
      equipped_physics: data.eph,
      acquired_projectiles: data.ap,
      sp_effects: data.se.map(([sp_effect_id, remaining_time]) => ({
        sp_effect_id,
        remaining_time,
      })),
      horse: { coords: [0, 0, 0], map_id: [0, 0, 0, 0], hp: 0, state: 0 },
      blood_stain: { coords: [0, 0, 0], map_id: [0, 0, 0, 0], runes: 0 },
      world_time: { hour: 0, minute: 0, second: 0 },
      world_weather: { area_id: 0, weather_type: 0, timer: 0 },
      base_version: { base_version: 0, is_latest_version: 0 },
      deaths: data.d,
      last_rested_grace: data.lr,
      spawn_point_entity_id: data.spe,
      dlc: {
        shadow_of_erdtree: data.dlc.s,
        preorder_the_ring: data.dlc.p,
        preorder_ring_of_miquella: data.dlc.m,
      },
    } satisfies Partial<Slot>;
  }

  // Reconstruct inventory items (equip storage only; weapons can't be shown without ga_items).
  const commonItems = data.inv.map(([handle, qty], i) => ({
    ga_item_handle: handle,
    quantity: qty,
    inventory_index: i,
  }));

  // Fields a shared link doesn't carry (coords, equipment) use zero-filled placeholders of
  // the right arity — the DTO's fixed tuples (map_id is 4 bytes, etc.) make the shape explicit.
  return {
    steam_id: '',
    version: 0,
    seconds_played: 0,
    map_id: [0, 0, 0, 0],
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
      // Not carried by a shared link — zero placeholders (the VMs reading a shared slot
      // only consume the stats above).
      hp: 0,
      max_hp: 0,
      base_max_hp: 0,
      fp: 0,
      max_fp: 0,
      base_max_fp: 0,
      stamina: 0,
      max_stamina: 0,
      base_max_stamina: 0,
      buildup: {
        poison: 0,
        rot: 0,
        bleed: 0,
        death: 0,
        frost: 0,
        sleep: 0,
        madness: 0,
      },
      voice_type: 0,
      gift: 0,
      additional_talisman_slot_count: 0,
      summon_spirit_level: 0,
      furl_calling_finger_on: false,
      white_cipher_ring_on: false,
      blue_cipher_ring_on: false,
      great_rune_on: false,
      max_crimson_flask_count: 0,
      max_cerulean_flask_count: 0,
    },
    player_coords: {
      player_coords: [0, 0, 0],
      map_id: [0, 0, 0, 0],
      angle: [0, 0, 0, 0],
    },
    regions: {
      unlocked_regions_count: data.ur.length,
      unlocked_regions: data.ur,
    },
    event_flags: { flags },
    ga_items: [],
    chr_asm2: {
      left_hand_armaments: [0, 0, 0],
      right_hand_armaments: [0, 0, 0],
      arrows: [0, 0],
      bolts: [0, 0],
      head: 0,
      chest: 0,
      arms: 0,
      legs: 0,
      talismans: [0, 0, 0, 0],
    },
    active_weapon_slots: {
      arm_style: 0,
      left_hand: 0,
      right_hand: 0,
      left_arrow: 0,
      right_arrow: 0,
      left_bolt: 0,
      right_bolt: 0,
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
    equipped_spells: [],
    equipped_gestures: [],
    gestures: [],
    equipped_physics: [0, 0],
    acquired_projectiles: [],
    sp_effects: [],
    horse: { coords: [0, 0, 0], map_id: [0, 0, 0, 0], hp: 0, state: 0 },
    blood_stain: { coords: [0, 0, 0], map_id: [0, 0, 0, 0], runes: 0 },
    world_time: { hour: 0, minute: 0, second: 0 },
    world_weather: { area_id: 0, weather_type: 0, timer: 0 },
    base_version: { base_version: 0, is_latest_version: 0 },
    deaths: 0,
    last_rested_grace: 0,
    spawn_point_entity_id: 0,
    dlc: {
      shadow_of_erdtree: false,
      preorder_the_ring: false,
      preorder_ring_of_miquella: false,
    },
  } satisfies Partial<Slot>;
}

/**
 * Check if decoded data is valid.
 */
export function isValidShareData(data: unknown): data is ShareableProgression {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (d.v === SHAREABLE_VERSION) {
    return (
      typeof d.n === 'string' &&
      typeof d.s === 'object' &&
      Array.isArray(d.ef) &&
      Array.isArray(d.ur) &&
      Array.isArray(d.ga) &&
      typeof d.pc === 'object'
    );
  }
  return (
    d.v === LEGACY_SHAREABLE_VERSION &&
    typeof d.n === 'string' &&
    typeof d.s === 'object' &&
    Array.isArray(d.ef) &&
    Array.isArray(d.ur) &&
    Array.isArray(d.inv) &&
    Array.isArray(d.ga)
  );
}

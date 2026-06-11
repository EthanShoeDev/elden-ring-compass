import LZString from 'lz-string';
import { eventFlagOffset } from '@elden-ring-compass/data';
import { Effect, Schema } from 'effect';
import type { Slot } from '@/lib/save-dto';
import { SHAREABLE_EVENT_IDS } from './shareable-events';
import { ShareCodecError, type ShareableProgression, ShareableProgressionSchema } from './types';

const GZIP_PREFIX = 'gz.';
const ShareableProgressionJson = Schema.fromJsonString(ShareableProgressionSchema);

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(bytes).toString('base64');
  return base64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

const gzip = Effect.fn('gzip')(function* (bytes: Uint8Array) {
  if (typeof CompressionStream !== 'function' || typeof Blob.prototype.stream !== 'function') {
    return bytes;
  }
  const stream = new Blob([bytes.buffer as ArrayBuffer])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  const buffer = yield* Effect.tryPromise({
    try: () => new Response(stream).arrayBuffer(),
    catch: (cause) => new ShareCodecError({ cause }),
  });
  return new Uint8Array(buffer);
});

/**
 * Compress and encode shareable data for URL query param.
 */
export const encodeToUrl = Effect.fn('encodeToUrl')(function* (data: ShareableProgression) {
  const json = yield* Schema.encodeUnknownEffect(ShareableProgressionJson)(data);
  if (data.v === 2) {
    const encodedJson = new TextEncoder().encode(json);
    const compressed = yield* gzip(encodedJson);
    if (compressed === encodedJson) return LZString.compressToEncodedURIComponent(json);
    return `${GZIP_PREFIX}${bytesToBase64Url(compressed)}`;
  }
  return LZString.compressToEncodedURIComponent(json);
});

function isEventFlagSet(flags: Uint8Array, id: number): boolean {
  const offset = eventFlagOffset(id);
  if (!offset) return false;
  const [byteOffset, bitPos] = offset;
  return ((flags[byteOffset] ?? 0) & (1 << bitPos)) !== 0;
}

function deltaEncode(sortedIds: number[]): number[] {
  let previous = 0;
  return sortedIds.map((id) => {
    const delta = id - previous;
    previous = id;
    return delta;
  });
}

const invItems = (items: Slot['equip_inventory_data']['common_items']) =>
  items.map((item) => [item.ga_item_handle, item.quantity, item.inventory_index] as const);

export function slotToShareableProgression(slot: Slot): ShareableProgression {
  const p = slot.player_game_data;
  const eventIds = SHAREABLE_EVENT_IDS.filter((id) => isEventFlagSet(slot.event_flags.flags, id));

  return {
    v: 2,
    n: p.character_name,
    s: {
      l: p.level,
      v: p.vigor,
      m: p.mind,
      e: p.endurance,
      st: p.strength,
      d: p.dexterity,
      i: p.intelligence,
      f: p.faith,
      a: p.arcane,
      r: p.souls,
      rm: p.soulsmemory,
      hp: p.hp,
      mhp: p.max_hp,
      bhp: p.base_max_hp,
      fp: p.fp,
      mfp: p.max_fp,
      bfp: p.base_max_fp,
      sta: p.stamina,
      msta: p.max_stamina,
      bsta: p.base_max_stamina,
      b: {
        p: p.buildup.poison,
        ro: p.buildup.rot,
        bl: p.buildup.bleed,
        de: p.buildup.death,
        fr: p.buildup.frost,
        sl: p.buildup.sleep,
        ma: p.buildup.madness,
      },
      vt: p.voice_type,
      gf: p.gift,
      tal: p.additional_talisman_slot_count,
      ash: p.summon_spirit_level,
      fcf: p.furl_calling_finger_on,
      wcr: p.white_cipher_ring_on,
      bcr: p.blue_cipher_ring_on,
      gr: p.great_rune_on,
      mcf: p.max_crimson_flask_count,
      mcef: p.max_cerulean_flask_count,
    },
    g: p.gender,
    at: p.arche_type,
    wl: p.match_making_wpn_lvl,
    ef: deltaEncode(eventIds.toSorted((a, b) => a - b)),
    ur: slot.regions.unlocked_regions,
    mid: slot.map_id,
    pc: {
      c: slot.player_coords.player_coords,
      m: slot.player_coords.map_id,
      a: slot.player_coords.angle,
    },
    ga: slot.ga_items.map((item) => [item.gaitem_handle, item.item_id, item.gem_gaitem_handle]),
    ca: {
      l: slot.chr_asm2.left_hand_armaments,
      r: slot.chr_asm2.right_hand_armaments,
      a: slot.chr_asm2.arrows,
      b: slot.chr_asm2.bolts,
      h: slot.chr_asm2.head,
      c: slot.chr_asm2.chest,
      ar: slot.chr_asm2.arms,
      le: slot.chr_asm2.legs,
      t: slot.chr_asm2.talismans,
    },
    aw: {
      as: slot.active_weapon_slots.arm_style,
      l: slot.active_weapon_slots.left_hand,
      r: slot.active_weapon_slots.right_hand,
      la: slot.active_weapon_slots.left_arrow,
      ra: slot.active_weapon_slots.right_arrow,
      lb: slot.active_weapon_slots.left_bolt,
      rb: slot.active_weapon_slots.right_bolt,
    },
    ei: {
      c: invItems(slot.equip_inventory_data.common_items),
      k: invItems(slot.equip_inventory_data.key_items),
    },
    si: {
      c: invItems(slot.storage_inventory_data.common_items),
      k: invItems(slot.storage_inventory_data.key_items),
    },
    eq: {
      q: slot.equip_item_data.quick_slot_items.map((item) => item.item_id),
      p: slot.equip_item_data.pouch_items.map((item) => item.item_id),
    },
    esp: slot.equipped_spells,
    eg: slot.equipped_gestures,
    ges: slot.gestures,
    eph: slot.equipped_physics,
    ap: slot.acquired_projectiles,
    se: slot.sp_effects.map((effect) => [effect.sp_effect_id, effect.remaining_time]),
    sp: slot.seconds_played,
    d: slot.deaths,
    lr: slot.last_rested_grace,
    spe: slot.spawn_point_entity_id,
    dlc: {
      s: slot.dlc.shadow_of_erdtree,
      p: slot.dlc.preorder_the_ring,
      m: slot.dlc.preorder_ring_of_miquella,
    },
  };
}

export { GZIP_PREFIX };

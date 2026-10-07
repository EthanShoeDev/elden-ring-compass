import { GOODS } from '@elden-ring-compass/data';

import type { Slot } from '@/lib/save-dto';
import { goodsQuantityById } from './inventory';

/** Golden Seeds raise the shared crimson + cerulean allocation from 4 up to 14 charges. */
export const MAX_FLASK_CHARGES = 14;

// Each flask is two goods per upgrade level: `base + 2·level` is the empty flask and
// `base + 2·level + 1` the filled one (same name, different icon). Only one level is ever held.
const CRIMSON_BASE_ID = 1000;
const CERULEAN_BASE_ID = 1050;
const MAX_FLASK_LEVEL = 12;

const goodsById = new Map(GOODS.map((g) => [g.id, g]));

export type FlaskInfo = {
  /** The filled flask's goods row at the held upgrade level (name carries the `+N`). */
  item: (typeof GOODS)[number] | undefined;
  level: number;
  /** Charges allocated to this flask at a grace (not the charges left right now). */
  charges: number;
};

function flaskInfo(quantities: Map<number, number>, baseId: number, charges: number): FlaskInfo {
  let level = 0;
  for (let l = 0; l <= MAX_FLASK_LEVEL; l++) {
    const empty = baseId + 2 * l;
    if ((quantities.get(empty) ?? 0) > 0 || (quantities.get(empty + 1) ?? 0) > 0) level = l;
  }
  return { item: goodsById.get(baseId + 2 * level + 1), level, charges };
}

/**
 * Goods ids of the Crystal Tears mixed into the Flask of Wondrous Physick. The save stores
 * them with the goods param-type nibble (`0x4…` + id); an empty slot reads `0xFFFFFFFF`.
 * Mixed tears stay in the inventory, so this is extra detail, not ownership.
 */
export function mixedPhysickTearIds(slot: Readonly<Slot>): number[] {
  return slot.equipped_physics
    .filter((v) => (v & 0xf0000000) >>> 0 === 0x40000000)
    .map((v) => (v & 0x0fffffff) >>> 0);
}

/** Crimson/Cerulean flask upgrade levels and charge allocation for a save slot. */
export function flasksView(slot: Readonly<Slot>) {
  const quantities = goodsQuantityById(slot);
  const crimson = flaskInfo(
    quantities,
    CRIMSON_BASE_ID,
    slot.player_game_data.max_crimson_flask_count,
  );
  const cerulean = flaskInfo(
    quantities,
    CERULEAN_BASE_ID,
    slot.player_game_data.max_cerulean_flask_count,
  );
  return { crimson, cerulean, totalCharges: crimson.charges + cerulean.charges };
}

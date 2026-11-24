import { GOODS } from '@elden-ring-compass/data';
import { Array as Arr } from 'effect';

import type { Slot } from '@/lib/save-dto';

import { goodsQuantityById } from './inventory';

/** Golden Seeds raise the shared crimson + cerulean allocation from 4 up to 14 charges. */
export const MAX_FLASK_CHARGES = 14;

// Each flask is two goods per upgrade level: `base + 2·level` is the empty flask and
// `base + 2·level + 1` the filled one (same name, different icon). Only one level is ever held.
const CRIMSON_BASE_ID = 1000;
const CERULEAN_BASE_ID = 1050;
/** Sacred Tears raise both flasks together, one level each, up to +12. */
export const MAX_FLASK_LEVEL = 12;

/** Every character starts with 4 charges; each Golden Seed step adds one. */
const BASE_FLASK_CHARGES = 4;
/** Seeds the Nth extra charge costs (1,1,2,2,…,5,5 → 30 for all ten). */
const GOLDEN_SEED_COST = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5] as const;
const sum = (xs: readonly number[]) => Arr.reduce(xs, 0, (a, b) => a + b);
export const TOTAL_GOLDEN_SEEDS = sum(GOLDEN_SEED_COST);

/** Golden Seeds already spent to reach `totalCharges` (spent seeds leave the inventory). */
export const goldenSeedsSpent = (totalCharges: number) =>
  sum(
    Arr.take(GOLDEN_SEED_COST, Math.max(0, totalCharges - BASE_FLASK_CHARGES)),
  );

/** Extra charges the held Golden Seeds could still buy at a grace, on top of `totalCharges`. */
export function chargesAffordable(totalCharges: number, seedsHeld: number) {
  let seeds = seedsHeld;
  let extra = 0;
  for (const cost of Arr.drop(
    GOLDEN_SEED_COST,
    Math.max(0, totalCharges - BASE_FLASK_CHARGES),
  )) {
    if (cost > seeds) break;
    seeds -= cost;
    extra++;
  }
  return extra;
}

const goodsById = new Map(Arr.map(GOODS, (g) => [g.id, g]));

export type FlaskInfo = {
  /** The filled flask's goods row at the held upgrade level (name carries the `+N`). */
  item: (typeof GOODS)[number] | undefined;
  level: number;
  /** Charges allocated to this flask at a grace (not the charges left right now). */
  charges: number;
};

function flaskInfo(
  quantities: Map<number, number>,
  baseId: number,
  charges: number,
): FlaskInfo {
  let level = 0;
  for (let l = 0; l <= MAX_FLASK_LEVEL; l++) {
    const empty = baseId + 2 * l;
    if (
      (quantities.get(empty) ?? 0) > 0 ||
      (quantities.get(empty + 1) ?? 0) > 0
    )
      level = l;
  }
  return { item: goodsById.get(baseId + 2 * level + 1), level, charges };
}

/**
 * Goods ids of the Crystal Tears mixed into the Flask of Wondrous Physick. The save stores
 * them with the goods param-type nibble (`0x4…` + id); an empty slot reads `0xFFFFFFFF`.
 * Mixed tears stay in the inventory, so this is extra detail, not ownership.
 */
export function mixedPhysickTearIds(slot: Readonly<Slot>): number[] {
  return Arr.map(
    Arr.filter(
      slot.equipped_physics,
      (v) => (v & 0xf0000000) >>> 0 === 0x40000000,
    ),
    (v) => (v & 0x0fffffff) >>> 0,
  );
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
  return {
    crimson,
    cerulean,
    totalCharges: crimson.charges + cerulean.charges,
    /** Flask upgrade level = Sacred Tears already spent (both flasks share it). */
    level: Math.max(crimson.level, cerulean.level),
  };
}

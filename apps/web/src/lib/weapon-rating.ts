// Reusable Attack-Rating ranking over the whole armament dataset, shared by the
// Weapon AR table and the Build Doctor advisors so the "best weapon for you"
// answer is computed in exactly one place. See docs/projects/calculator.md.
import { WEAPONS } from '@elden-ring-compass/data';

import {
  arCalculator,
  type Attributes,
  maxUpgradeFor,
  type WeaponScaling,
  weaponScalingById,
} from '@/lib/ar';
import { baseIdOf, enrichWeapon } from '@/lib/atoms/weapons';

// Non-armament placeholders that have an AR row but aren't real weapons:
// "DLC dummy" (id 1000, absurd all-element scaling) and "Unarmed" (110000).
const EXCLUDED_WEAPON_IDS = new Set([1000, 110000]);

export interface RatedWeapon {
  readonly id: number;
  readonly baseId: number;
  readonly name: string;
  /** Affinity-0 sibling's name ("Dagger" for "Heavy Dagger") — the wiki page name. */
  readonly baseName: string;
  readonly affinity: string;
  readonly category: string;
  readonly icon: number;
  readonly ar: number;
  readonly physical: number;
  readonly magic: number;
  readonly fire: number;
  readonly lightning: number;
  readonly holy: number;
  readonly level: number;
  readonly wieldable: boolean;
  readonly owned: boolean;
  /** The AR scaling row (which stats it scales with, for archetype filtering). */
  readonly scaling: WeaponScaling;
}

/**
 * Rate every armament that has an AR scaling row, at the given attributes and a
 * (per-weapon clamped) upgrade level. `ownedById` maps weapon id → owned, so the
 * caller can partition by ownership.
 */
export function rateWeapons(
  attrs: Attributes,
  upgrade: number,
  twoHanding: boolean,
  ownedById: ReadonlyMap<number, number>,
): RatedWeapon[] {
  const rated: RatedWeapon[] = [];
  for (const w of WEAPONS) {
    if (EXCLUDED_WEAPON_IDS.has(w.id)) continue;
    const scaling = weaponScalingById.get(w.id);
    if (!scaling) continue; // ammo / no-damage items have no AR
    const level = Math.min(upgrade, maxUpgradeFor(scaling));
    const ar = arCalculator.compute(scaling, attrs, level, { twoHanding });
    const e = enrichWeapon(w);
    rated.push({
      id: w.id,
      baseId: baseIdOf(w.id),
      name: e.affinityIndex === 0 ? e.baseName : `${e.affinity} ${e.baseName}`,
      baseName: e.baseName,
      affinity: e.affinity,
      category: w.category,
      icon: w.icon,
      ar: Math.round(ar.total),
      physical: Math.round(ar.damage.physical ?? 0),
      magic: Math.round(ar.damage.magic ?? 0),
      fire: Math.round(ar.damage.fire ?? 0),
      lightning: Math.round(ar.damage.lightning ?? 0),
      holy: Math.round(ar.damage.holy ?? 0),
      level,
      wieldable: !ar.ineffective,
      owned: ownedById.has(w.id),
      scaling,
    });
  }
  return rated;
}

/** Collapse to the single best-AR affinity per base weapon (the affinity recommender). */
export function bestAffinityPerWeapon(rated: readonly RatedWeapon[]): RatedWeapon[] {
  const best = new Map<number, RatedWeapon>();
  for (const r of rated) {
    const cur = best.get(r.baseId);
    if (!cur || r.ar > cur.ar) best.set(r.baseId, r);
  }
  return [...best.values()];
}

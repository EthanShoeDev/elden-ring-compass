// Resolve the player's *active* right-hand armament from a save slot into the AR
// scaling row, so the Build Doctor can reason about "the weapon you're actually
// wielding" (respec mismatch, current AR). See docs/projects/calculator.md §0b.
import { type WeaponScaling, weaponScalingById } from '@/lib/ar';
import { enrichWeapon } from '@/lib/atoms/weapons';
import type { Slot } from '@/lib/save-dto';
import { WEAPONS, type Weapon } from '@elden-ring-compass/data';

import { equipmentDbView } from './equipement';

const weaponById = new Map<number, Weapon>(WEAPONS.map((w) => [w.id, w]));

export interface EquippedWeaponInfo {
  /** Base param id (affinity-bearing, upgrade stripped) matching the WEAPONS dataset. */
  readonly paramId: number;
  readonly name: string;
  readonly affinity: string;
  readonly icon: number;
  readonly upgradeLevel: number;
  readonly scaling: WeaponScaling;
}

/**
 * The active right-hand weapon (the one the player swings), or null when nothing
 * usable is equipped / its AR row is unknown (e.g. a torch or bare fists).
 */
export function equippedWeaponInfo(slot: Readonly<Slot>): EquippedWeaponInfo | null {
  const equip = equipmentDbView(slot);
  const arms = equip.right_hand_armaments;
  const activeIdx = slot.active_weapon_slots.right_hand;

  // Prefer the active slot; fall back to the first non-empty armament.
  const ordered = [arms[activeIdx], ...arms].filter((a) => a && a.id);
  for (const arm of ordered) {
    const fullId = arm?.id;
    if (!fullId) continue;
    const upgradeLevel = fullId % 100;
    const paramId = fullId - upgradeLevel;
    const scaling = weaponScalingById.get(paramId);
    const weapon = weaponById.get(paramId);
    if (!scaling || !weapon) continue;
    const e = enrichWeapon(weapon);
    return {
      paramId,
      name: e.affinityIndex === 0 ? e.baseName : `${e.affinity} ${e.baseName}`,
      affinity: e.affinity,
      icon: weapon.icon,
      upgradeLevel,
      scaling,
    };
  }
  return null;
}

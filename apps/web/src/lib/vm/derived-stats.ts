import { ARMOR, TALISMANS, WEAPONS } from '@elden-ring-compass/data';

import { equipLoad } from '@/lib/build-stats';
import type { Slot } from '@/lib/save-dto';
import { equipmentDbView } from './equipement';

const weaponById = new Map(WEAPONS.map((w) => [w.id, w]));
const armorById = new Map(ARMOR.map((a) => [a.id, a]));
const talismanById = new Map(TALISMANS.map((t) => [t.id, t]));

type Effect = { attribute: string; value: number; model: string };

/** Product of the multiplicative `attribute` effects (×1 when none apply). */
const multiplier = (effects: ReadonlyArray<Effect>, attribute: string) =>
  effects
    .filter((e) => e.attribute === attribute && e.model === 'multiplicative' && e.value > 0)
    .reduce((m, e) => m * e.value, 1);

/** Sum of the additive `attribute` effects. */
const additive = (effects: ReadonlyArray<Effect>, attribute: string) =>
  effects
    .filter((e) => e.attribute === attribute && e.model === 'additive')
    .reduce((s, e) => s + e.value, 0);

/** Equip-load bands, as fractions of max load (the game's light / medium / heavy rolls). */
export type EquipLoadRoll = 'Light' | 'Medium' | 'Heavy' | 'Overloaded';
const rollFor = (ratio: number): EquipLoadRoll =>
  ratio < 0.3 ? 'Light' : ratio < 0.7 ? 'Medium' : ratio <= 1 ? 'Heavy' : 'Overloaded';

/**
 * Derived character stats for the Overview. HP / FP / stamina are the save's own values
 * (`max_*` already include talismans, armor and buffs active when the game saved); the rest
 * are computed from the equipped loadout:
 *  - Equip load: summed weight of equipped armaments, armor and talismans. The max is
 *    the approximate Endurance curve from `build-stats` (the exact curve lives in the game
 *    executable, not regulation.bin) times equipped load multipliers (Great-Jar's Arsenal…).
 *  - Poise: summed armor poise × Bull-Goat's Talisman.
 *  - Discovery: 100 + Arcane + additive item-discovery effects (Silver Scarab).
 */
export function derivedStatsView(slot: Readonly<Slot>) {
  const p = slot.player_game_data;
  const eq = equipmentDbView(slot);
  const asm = slot.chr_asm2;
  const gaItemId = new Map(slot.ga_items.map((g) => [g.gaitem_handle, g.item_id]));

  // Weapon gaitem ids carry the upgrade level in `% 100`; WEAPONS is keyed by the +0 id.
  const weaponWeight = (handle: number) => {
    const id = gaItemId.get(handle);
    if (id === undefined || id === 0) return 0;
    return weaponById.get(id - (id % 100))?.weight ?? 0;
  };
  // Ammo is weightless in game even though its param row carries a weight, so only the six
  // armament slots count.
  const weapons = [...asm.left_hand_armaments, ...asm.right_hand_armaments];

  const armor = [eq.head, eq.chest, eq.arms, eq.legs]
    .map((a) => armorById.get(a.id))
    .filter((a) => a !== undefined);
  const talismans = eq.talismans.map((t) => talismanById.get(t.id)).filter((t) => t !== undefined);
  const effects = [...armor, ...talismans].flatMap((i) => i.effects);

  const currentLoad =
    weapons.reduce((s, h) => s + weaponWeight(h), 0) +
    armor.reduce((s, a) => s + a.weight, 0) +
    talismans.reduce((s, t) => s + t.weight, 0);
  const maxLoad = equipLoad(p.endurance) * multiplier(effects, 'Maximum Equip Load');
  const ratio = maxLoad > 0 ? currentLoad / maxLoad : 0;

  return {
    hp: { max: p.max_hp, base: p.base_max_hp },
    fp: { max: p.max_fp, base: p.base_max_fp },
    stamina: { max: p.max_stamina, base: p.base_max_stamina },
    equipLoad: {
      current: Math.round(currentLoad * 10) / 10,
      max: Math.round(maxLoad * 10) / 10,
      ratio,
      roll: rollFor(ratio),
    },
    poise: Math.floor(armor.reduce((s, a) => s + a.poise, 0) * multiplier(effects, 'Poise')),
    discovery: 100 + p.arcane + additive(effects, 'Item Discovery'),
  };
}

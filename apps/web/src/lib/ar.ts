// Web-side Attack Rating helpers: a single calculator instance built from the
// generated AR scaling datasets, plus lookups the calculator UI needs. The pure
// formula lives in `@elden-ring-compass/data/ar`; this just wires it to the
// bundled data and memoizes the graph evaluation once at module load.
import {
  ATTACK_ELEMENT_CORRECTS,
  CALC_CORRECT_GRAPHS,
  REINFORCE_TYPES,
  WEAPON_SCALING,
} from '@elden-ring-compass/data';
import {
  type Attributes,
  createArCalculator,
  type WeaponScaling,
} from '@elden-ring-compass/data/ar';

export type { Attributes, WeaponScaling };

export const arCalculator = createArCalculator({
  reinforceTypes: REINFORCE_TYPES,
  attackElementCorrects: ATTACK_ELEMENT_CORRECTS,
  calcCorrectGraphs: CALC_CORRECT_GRAPHS,
});

/** weapon id → its AR scaling row (ids match the WEAPONS dataset). */
export const weaponScalingById = new Map<number, WeaponScaling>(
  WEAPON_SCALING.map((w) => [w.id, w]),
);

const reinforceLevelCountById = new Map(REINFORCE_TYPES.map((r) => [r.id, r.levels.length]));

/**
 * Max upgrade level (+N) for a weapon = its reinforce chain length − 1
 * (10 for Somber stones, 25 for regular). Falls back to 0 if unknown.
 */
export const maxUpgradeFor = (w: WeaponScaling): number =>
  Math.max(0, (reinforceLevelCountById.get(w.reinforceTypeId) ?? 1) - 1);

/** The largest +N any armament reaches (25) — the upgrade slider's ceiling. */
export const MAX_UPGRADE_LEVEL = Math.max(
  0,
  ...[...reinforceLevelCountById.values()].map((n) => n - 1),
);

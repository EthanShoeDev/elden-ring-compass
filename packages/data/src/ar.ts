// Attack Rating (AR) calculator — the runtime formula that consumes the AR
// scaling datasets emitted by `@elden-ring-compass/extractor`
// (`WEAPON_SCALING`, `REINFORCE_TYPES`, `ATTACK_ELEMENT_CORRECTS`,
// `CALC_CORRECT_GRAPHS` under ./generated).
//
// Ported faithfully from ThomasJClark's elden-ring-weapon-calculator
// (`getWeaponAttack` / `evaluateCalcCorrectGraph`) — the community-canonical
// model. This module is hand-written (not generated) and self-contained: its
// input interfaces are structurally compatible with the generated dataset rows,
// so callers pass those straight in.
//
// The formula, per damage type:
//   totalScaling = 1
//   for each attribute that corrects this damage type:
//     if a requirement for it is unmet → totalScaling = 1 − 0.4 (the penalty), stop
//     else → totalScaling += calcCorrectGraph[statValue] × scaling[upgradeLevel]
//   AR_type = baseAttack[upgradeLevel] × totalScaling

export type DamageType = 'physical' | 'magic' | 'fire' | 'lightning' | 'holy';
export type ScalingAttr = 'str' | 'dex' | 'int' | 'fai' | 'arc';

export const DAMAGE_TYPES: readonly DamageType[] = [
  'physical',
  'magic',
  'fire',
  'lightning',
  'holy',
];
export const SCALING_ATTRS: readonly ScalingAttr[] = [
  'str',
  'dex',
  'int',
  'fai',
  'arc',
];

// Index of each attr/damage-type in the ReinforceLevel rate arrays.
const SCALE_IDX: Record<ScalingAttr, number> = {
  str: 0,
  dex: 1,
  int: 2,
  fai: 3,
  arc: 4,
};
const DMG_IDX: Record<DamageType, number> = {
  physical: 0,
  magic: 1,
  fire: 2,
  lightning: 3,
  holy: 4,
};

/** Penalty multiplier applied to a damage type when an attribute requirement is unmet. */
export const INEFFECTIVE_PENALTY = 0.4;
const DEFAULT_DAMAGE_CALC_CORRECT_GRAPH_ID = 0;

// --- Input shapes (structurally match the generated dataset rows) ------------

export interface WeaponScaling {
  readonly id: number;
  readonly reinforceTypeId: number;
  readonly attackElementCorrectId: number;
  readonly requirements: Readonly<Partial<Record<ScalingAttr, number>>>;
  readonly baseAttack: Readonly<Partial<Record<DamageType, number>>>;
  readonly scaling: Readonly<Partial<Record<ScalingAttr, number>>>;
  readonly calcCorrectIds: Readonly<Partial<Record<DamageType, number>>>;
}
export interface ReinforceLevel {
  readonly attack: readonly number[];
  readonly scaling: readonly number[];
}
export interface ReinforceType {
  readonly id: number;
  readonly levels: readonly ReinforceLevel[];
}
export interface AttackElementCorrect {
  readonly id: number;
  readonly correct: {
    readonly [damageType: string]: { readonly [attr: string]: number | true };
  };
}
export interface CalcCorrectStage {
  readonly maxVal: number;
  readonly maxGrowVal: number;
  readonly adjPt: number;
}
export interface CalcCorrectGraph {
  readonly id: number;
  readonly stages: readonly CalcCorrectStage[];
}

export interface ArTables {
  readonly reinforceTypes: readonly ReinforceType[];
  readonly attackElementCorrects: readonly AttackElementCorrect[];
  readonly calcCorrectGraphs: readonly CalcCorrectGraph[];
}

export type Attributes = Record<ScalingAttr, number>;

export interface AttackRating {
  /** Sum of every damage type's AR. */
  readonly total: number;
  /** Per-damage-type AR (only types the weapon deals). */
  readonly damage: Readonly<Partial<Record<DamageType, number>>>;
  /** True if any requirement was unmet (the penalty hit ≥1 damage type). */
  readonly ineffective: boolean;
}

/**
 * Pre-evaluate a CalcCorrectGraph into an array of growth values indexed by stat
 * value (1..148). The saturation/soft-cap curve: piecewise across 5 stages, with
 * a per-segment exponent (`adjPt`).
 */
export function evaluateCalcCorrectGraph(
  stages: readonly CalcCorrectStage[],
): number[] {
  const arr: number[] = [];
  for (let i = 1; i < stages.length; i++) {
    const prev = stages[i - 1];
    const stage = stages[i];
    if (!prev || !stage) continue;
    const lo = i === 1 ? 1 : prev.maxVal + 1;
    const hi = i === stages.length - 1 ? 148 : stage.maxVal;
    for (let v = lo; v <= hi; v++) {
      if (arr[v] != null) continue;
      let ratio = (v - prev.maxVal) / (stage.maxVal - prev.maxVal);
      if (prev.adjPt > 0) ratio = ratio ** prev.adjPt;
      else if (prev.adjPt < 0) ratio = 1 - (1 - ratio) ** -prev.adjPt;
      arr[v] = prev.maxGrowVal + (stage.maxGrowVal - prev.maxGrowVal) * ratio;
    }
  }
  return arr;
}

/**
 * Build an AR calculator from the shared lookup tables. Pre-indexes the
 * reinforce/element-correct tables and pre-evaluates every calc-correct graph
 * once, then `compute` rates a weapon at given stats/upgrade level cheaply.
 */
export function createArCalculator(tables: ArTables): {
  compute: (
    weapon: WeaponScaling,
    attributes: Attributes,
    upgradeLevel: number,
    options?: { twoHanding?: boolean },
  ) => AttackRating;
} {
  const graphById = new Map(
    tables.calcCorrectGraphs.map((g) => [
      g.id,
      evaluateCalcCorrectGraph(g.stages),
    ]),
  );
  const aecById = new Map(tables.attackElementCorrects.map((a) => [a.id, a]));
  const reinforceById = new Map(tables.reinforceTypes.map((r) => [r.id, r]));

  const compute = (
    weapon: WeaponScaling,
    attributes: Attributes,
    upgradeLevel: number,
    options?: { twoHanding?: boolean },
  ): AttackRating => {
    const reinforce = reinforceById.get(weapon.reinforceTypeId);
    const aec = aecById.get(weapon.attackElementCorrectId);
    const level = reinforce?.levels[upgradeLevel];
    if (!reinforce || !aec || !level) {
      return { total: 0, damage: {}, ineffective: false };
    }

    // Two-handing adds 50% Strength (floored). Paired weapons and bows/ballistae
    // are exceptions the caller must handle (the AR dataset doesn't carry those
    // flags); for them, pass twoHanding: false / true respectively.
    const attrs: Attributes = options?.twoHanding
      ? { ...attributes, str: Math.floor(attributes.str * 1.5) }
      : attributes;

    const ineffectiveAttrs = new Set<ScalingAttr>();
    for (const a of SCALING_ATTRS) {
      const req = weapon.requirements[a];
      if (req != null && attrs[a] < req) ineffectiveAttrs.add(a);
    }

    const damage: Partial<Record<DamageType, number>> = {};
    let total = 0;
    let ineffective = false;

    for (const dt of DAMAGE_TYPES) {
      const base = weapon.baseAttack[dt];
      if (!base) continue;
      const baseUpgraded = base * (level.attack[DMG_IDX[dt]] ?? 0);
      const corr = aec.correct[dt] ?? {};

      let totalScaling = 1;
      const typeIneffective = SCALING_ATTRS.some(
        (a) => corr[a] && ineffectiveAttrs.has(a),
      );
      if (typeIneffective) {
        totalScaling = 1 - INEFFECTIVE_PENALTY;
        ineffective = true;
      } else {
        const graph = graphById.get(
          weapon.calcCorrectIds[dt] ?? DEFAULT_DAMAGE_CALC_CORRECT_GRAPH_ID,
        );
        if (graph) {
          for (const a of SCALING_ATTRS) {
            const attributeCorrect = corr[a];
            if (!attributeCorrect) continue;
            const baseScaling = weapon.scaling[a] ?? 0;
            const scalingUpgraded =
              baseScaling * (level.scaling[SCALE_IDX[a]] ?? 0);
            const scaling =
              attributeCorrect === true
                ? scalingUpgraded
                : (attributeCorrect * scalingUpgraded) / baseScaling;
            if (scaling) {
              const idx = Math.max(1, Math.min(148, attrs[a]));
              totalScaling += (graph[idx] ?? 0) * scaling;
            }
          }
        }
      }

      const value = baseUpgraded * totalScaling;
      damage[dt] = value;
      total += value;
    }

    return { total, damage, ineffective };
  };

  return { compute };
}

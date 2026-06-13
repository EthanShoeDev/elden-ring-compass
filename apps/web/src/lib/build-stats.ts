// The shared character-attribute model behind the Calculator / Build Doctor.
// Both the Build Planner section and the archetype presets read from this so
// there's a single source of truth for the 8 attributes, their soft caps, the
// derived-stat curves, and the rune-cost math. See docs/projects/calculator.md.
import type { Attributes } from '@/lib/ar';
import type { Slot } from '@/lib/save-dto';

export type Attr8Key =
  | 'vigor'
  | 'mind'
  | 'endurance'
  | 'strength'
  | 'dexterity'
  | 'intelligence'
  | 'faith'
  | 'arcane';

export type Attrs8 = Record<Attr8Key, number>;

/** The 5 AR-scaling attributes, in display order. */
export const OFFENSIVE_KEYS: readonly Attr8Key[] = [
  'strength',
  'dexterity',
  'intelligence',
  'faith',
  'arcane',
];

/**
 * The 8 attributes with their community soft-cap breakpoints (where returns
 * visibly diminish). Ticks on each slider mark these. Note the AR formula's real
 * soft-cap behaviour lives in the calc-correct graphs — these breakpoints are a
 * communication aid, not the math (see docs/projects/calculator.md §A.1).
 */
export const ATTR_META: ReadonlyArray<{
  key: Attr8Key;
  label: string;
  softCaps: ReadonlyArray<number>;
}> = [
  { key: 'vigor', label: 'Vigor', softCaps: [40, 60] },
  { key: 'mind', label: 'Mind', softCaps: [50, 60] },
  { key: 'endurance', label: 'Endurance', softCaps: [50, 60] },
  { key: 'strength', label: 'Strength', softCaps: [20, 55, 80] },
  { key: 'dexterity', label: 'Dexterity', softCaps: [20, 55, 80] },
  { key: 'intelligence', label: 'Intelligence', softCaps: [20, 55, 80] },
  { key: 'faith', label: 'Faith', softCaps: [20, 55, 80] },
  { key: 'arcane', label: 'Arcane', softCaps: [20, 55, 80] },
];

// Vagabond starting stats (level 9) — a sensible default when no save is loaded.
export const VAGABOND: Attrs8 = {
  vigor: 15,
  mind: 10,
  endurance: 11,
  strength: 14,
  dexterity: 13,
  intelligence: 9,
  faith: 9,
  arcane: 7,
};

export const attrs8FromSlot = (slot: Readonly<Slot>): Attrs8 => ({
  vigor: slot.player_game_data.vigor,
  mind: slot.player_game_data.mind,
  endurance: slot.player_game_data.endurance,
  strength: slot.player_game_data.strength,
  dexterity: slot.player_game_data.dexterity,
  intelligence: slot.player_game_data.intelligence,
  faith: slot.player_game_data.faith,
  arcane: slot.player_game_data.arcane,
});

/** The 5 attributes the AR formula reads, projected from the 8-attribute model. */
export const arAttrsFromAttrs8 = (a: Attrs8): Attributes => ({
  str: a.strength,
  dex: a.dexterity,
  int: a.intelligence,
  fai: a.faith,
  arc: a.arcane,
});

// --- Derived-stat curves -----------------------------------------------------
// Piecewise-linear interpolation of the in-game derived-stat curves (HP←Vigor,
// FP←Mind, stamina/equip-load←Endurance), anchored to the wiki tables.
//
// NOTE: ER's HP/FP/stamina/equip-load growth curves are NOT in regulation.bin
// (verified — none of the ~194 ER params carry HP/stamina growth fields); they're
// hardcoded in the game executable, which is why every calculator hardcodes them.
// So they can't be extracted like the AR params. These lerps are therefore a
// last-resort fallback only: for a *connected* character the Build Doctor uses the
// save's EXACT `base_max_hp/fp/stamina` instead (see build-planner.tsx), and only
// falls back to these curves for a hypothetical target stat the user has dragged
// away from their save (or when no save is loaded). Do NOT hardcode the wiki's
// exact per-level tables here — that breaks the extractor-derived rule.
// See docs/projects/calculator.md "Known gap".
type Anchor = readonly [stat: number, value: number];
function lerpCurve(anchors: ReadonlyArray<Anchor>, x: number): number {
  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  if (!first || !last) return 0;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (!a || !b) continue;
    const [x0, y0] = a;
    const [x1, y1] = b;
    if (x >= x0 && x <= x1) return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
  }
  return last[1];
}

const HP_C: ReadonlyArray<Anchor> = [
  [1, 300],
  [10, 442],
  [20, 633],
  [25, 800],
  [30, 968],
  [40, 1450],
  [50, 1645],
  [60, 1900],
  [99, 2138],
];
const FP_C: ReadonlyArray<Anchor> = [
  [1, 50],
  [10, 75],
  [15, 95],
  [20, 106],
  [35, 220],
  [50, 350],
  [55, 355],
  [60, 365],
  [99, 458],
];
const ST_C: ReadonlyArray<Anchor> = [
  [1, 80],
  [8, 96],
  [15, 105],
  [30, 130],
  [50, 155],
  [99, 170],
];
const EQ_C: ReadonlyArray<Anchor> = [
  [1, 45],
  [8, 52],
  [25, 72],
  [30, 79],
  [60, 120],
  [99, 160],
];

export const HP_MAX = 2138;
export const FP_MAX = 458;
export const STAMINA_MAX = 170;
export const EQUIP_LOAD_MAX = 160;

export const hp = (v: number) => Math.round(lerpCurve(HP_C, v));
export const fp = (v: number) => Math.round(lerpCurve(FP_C, v));
export const stamina = (v: number) => Math.round(lerpCurve(ST_C, v));
export const equipLoad = (v: number) => Math.round(lerpCurve(EQ_C, v) * 10) / 10;

// --- Rune / level math -------------------------------------------------------

/**
 * Exact FromSoft rune cost to advance from `level` to `level + 1`.
 *
 * This curve is hardcoded in the game executable (it is NOT a regulation.bin
 * param, so the extractor can't derive it) — these constants are the
 * community-reverse-engineered values, which reproduce the in-game table
 * exactly: runeForLevel(1) === 673, runeForLevel(10) === 829, and the full
 * 1→713 sum lands on the documented 1,692,558,415 total.
 *
 * Source: https://eldenring.wiki.fextralife.com/Level
 *   x = max(0, ((level + 81) − 92) · 0.02)        // note (level+81)−92 ≡ level−11
 *   cost = floor((x + 0.1) · (level + 81)² + 1)
 */
const runeForLevel = (level: number) =>
  Math.floor((Math.max(0, (level - 11) * 0.02) + 0.1) * (level + 81) ** 2 + 1);

/**
 * Total runes to go from level `a` to level `b`. Since runeForLevel(L) is the
 * cost of the single L→L+1 step, the a→b cost is the sum of steps
 * runeForLevel(a) … runeForLevel(b − 1).
 */
export function runesBetween(a: number, b: number): number {
  if (b <= a) return 0;
  let total = 0;
  for (let lvl = a; lvl < b; lvl++) total += runeForLevel(lvl);
  return total;
}

/**
 * Rune Level = sum of the 8 attributes − 79 (Wretch starts at level 1 with all
 * 10s → 80 − 79). Exact for Elden Ring.
 */
export const levelFromAttrs8 = (a: Attrs8): number =>
  Math.max(1, ATTR_META.reduce((s, m) => s + a[m.key], 0) - 79);

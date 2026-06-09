// Build-archetype presets — the playstyle menu behind the Calculator / Build
// Doctor. Each preset is curated data: the offensive stats that define it, a
// target stat spread to commit to (~level 150 meta build), and a short exemplar
// list used only for labelling (the *scoring* is always our AR formula). See
// docs/projects/calculator.md §0a.
//
// NB: distinct from the generated `ARCHETYPES` (the 10 starting classes) — these
// are *build* archetypes, hence the `BUILD_` prefix.
import {
  DropletIcon,
  FlameIcon,
  type LucideIcon,
  ScaleIcon,
  SparklesIcon,
  SunIcon,
  SwordIcon,
  WandSparklesIcon,
  WindIcon,
  ZapIcon,
} from 'lucide-react';

import type { ScalingAttr, WeaponScaling } from '@/lib/ar';
import { type Attr8Key, type Attrs8, VAGABOND } from '@/lib/build-stats';

export type BuildArchetypeKey =
  | 'strength'
  | 'dexterity'
  | 'quality'
  | 'sorcery'
  | 'faith'
  | 'arcane'
  | 'intFaith'
  | 'strFaith'
  | 'bleed';

/** Offensive 8-attribute key → the AR formula's scaling-attribute key. */
export const OFFENSIVE_TO_SCALING: Record<
  Extract<Attr8Key, 'strength' | 'dexterity' | 'intelligence' | 'faith' | 'arcane'>,
  ScalingAttr
> = {
  strength: 'str',
  dexterity: 'dex',
  intelligence: 'int',
  faith: 'fai',
  arcane: 'arc',
};

export interface BuildArchetype {
  readonly key: BuildArchetypeKey;
  readonly label: string;
  /** One-line "plays like" blurb. */
  readonly blurb: string;
  readonly icon: LucideIcon;
  /** The 8-attribute keys that define this build (drives detection + level-up advice). */
  readonly primary: ReadonlyArray<Attr8Key>;
  /** The AR scaling attributes a relevant weapon must scale with (for filtering the table). */
  readonly scaleAttrs: ReadonlyArray<ScalingAttr>;
  /** Target stat spread to commit to (a clean ~level-150 build). */
  readonly target: Attrs8;
  /** Exemplar S-tier armaments — for labelling/sanity only, not scoring. */
  readonly exemplars: ReadonlyArray<string>;
}

// A shared survival floor most builds want; presets override the offensive stats.
const base = (over: Partial<Attrs8>): Attrs8 => ({
  vigor: 60,
  mind: 16,
  endurance: 28,
  strength: 12,
  dexterity: 12,
  intelligence: 9,
  faith: 9,
  arcane: 7,
  ...over,
});

export const BUILD_ARCHETYPES: readonly BuildArchetype[] = [
  {
    key: 'strength',
    label: 'Strength',
    blurb: 'Big poise-breaking hits. Two-handing scales Strength ×1.5.',
    icon: SwordIcon,
    primary: ['strength'],
    scaleAttrs: ['str'],
    target: base({ strength: 60, endurance: 30, dexterity: 14 }),
    exemplars: ['Giant-Crusher', 'Greatsword', 'Ancient Meteoric Ore Greatsword'],
  },
  {
    key: 'dexterity',
    label: 'Dexterity',
    blurb: 'Fast, precise, high attack speed.',
    icon: WindIcon,
    primary: ['dexterity'],
    scaleAttrs: ['dex'],
    target: base({ dexterity: 70, endurance: 30, strength: 16 }),
    exemplars: ['Nagakiba', 'Hand of Malenia', 'Bolt of Gransax'],
  },
  {
    key: 'quality',
    label: 'Quality',
    blurb: 'Even Str/Dex — lower peak, but wields almost everything.',
    icon: ScaleIcon,
    primary: ['strength', 'dexterity'],
    scaleAttrs: ['str', 'dex'],
    target: base({ strength: 55, dexterity: 55, endurance: 30 }),
    exemplars: ['Most Str/Dex weapons at Quality affinity'],
  },
  {
    key: 'sorcery',
    label: 'Sorcery / Int',
    blurb: 'Ranged sorceries — kill before they reach you.',
    icon: WandSparklesIcon,
    primary: ['intelligence'],
    scaleAttrs: ['int'],
    target: base({ intelligence: 70, mind: 40, endurance: 20 }),
    exemplars: ['Dark Moon Greatsword', 'Moonveil', 'Carian Regal Scepter'],
  },
  {
    key: 'faith',
    label: 'Faith',
    blurb: 'Incantations plus Faith-scaling melee — ranged + melee.',
    icon: SunIcon,
    primary: ['faith'],
    scaleAttrs: ['fai'],
    target: base({ faith: 70, mind: 40, endurance: 20 }),
    exemplars: ['Blasphemous Blade', 'Golden Order weapons'],
  },
  {
    key: 'arcane',
    label: 'Arcane',
    blurb: 'Status procs (Bleed/Poison/Rot) — Arcane scales buildup.',
    icon: SparklesIcon,
    primary: ['arcane', 'dexterity'],
    scaleAttrs: ['arc'],
    target: base({ arcane: 60, dexterity: 40, endurance: 25 }),
    exemplars: ["Mohgwyn's Sacred Spear", "Bloodfiend's Arm", "Eleonora's Poleblade"],
  },
  {
    key: 'intFaith',
    label: 'Int / Faith',
    blurb: 'Hybrid caster — Death & elemental crossover weapons.',
    icon: ZapIcon,
    primary: ['intelligence', 'faith'],
    scaleAttrs: ['int', 'fai'],
    target: base({ intelligence: 55, faith: 55, mind: 35, endurance: 20 }),
    exemplars: ['Sword of Night and Flame', 'Dark Moon Greatsword'],
  },
  {
    key: 'strFaith',
    label: 'Str / Faith',
    blurb: 'Heavy Faith bruiser — Blasphemous Blade is the poster child.',
    icon: FlameIcon,
    primary: ['strength', 'faith'],
    scaleAttrs: ['str', 'fai'],
    target: base({ strength: 55, faith: 55, endurance: 28 }),
    exemplars: ['Blasphemous Blade', 'Coded Sword', 'Golden Order Greatsword'],
  },
  {
    key: 'bleed',
    label: 'Bleed (Dex/Arc)',
    blurb: 'Bleed-focused Arcane subset — the deadliest meta build.',
    icon: DropletIcon,
    primary: ['dexterity', 'arcane'],
    scaleAttrs: ['dex', 'arc'],
    target: base({ dexterity: 50, arcane: 45, endurance: 30 }),
    exemplars: ['Rivers of Blood', 'Uchigatana (Blood)', 'Hand of Malenia'],
  },
];

export const buildArchetypeByKey: ReadonlyMap<BuildArchetypeKey, BuildArchetype> = new Map(
  BUILD_ARCHETYPES.map((a) => [a.key, a]),
);

/** Custom = the player's own slider build (no preset). */
export const DEFAULT_ARCHETYPE_KEY: BuildArchetypeKey = 'strength';

/**
 * Infer the player's *current* build archetype from their stat spread, so the
 * picker can pre-select it and the respec advisor can spot a mismatch. Heuristic:
 * find the offensive stats they've actually leveled into (above a baseline), then
 * match the hybrid/pure archetype that fits.
 */
export function detectArchetype(attrs: Attrs8): BuildArchetypeKey {
  const INVESTED = 25; // "they leveled into it"
  const s = attrs.strength;
  const d = attrs.dexterity;
  const i = attrs.intelligence;
  const f = attrs.faith;
  const a = attrs.arcane;

  const big = (v: number) => v >= INVESTED;
  // Two-stat hybrids first (most specific).
  if (big(i) && big(f)) return 'intFaith';
  if (big(s) && big(f)) return 'strFaith';
  if (big(d) && big(a)) return 'bleed';
  if (big(a)) return 'arcane';
  if (big(s) && big(d) && Math.abs(s - d) <= 12) return 'quality';
  if (big(i)) return 'sorcery';
  if (big(f)) return 'faith';

  // Otherwise the single dominant offensive stat.
  const ranked = (
    [
      ['strength', s],
      ['dexterity', d],
      ['intelligence', i],
      ['faith', f],
      ['arcane', a],
    ] as ReadonlyArray<[Attr8Key, number]>
  ).toSorted((x, y) => y[1] - x[1]);
  const topKey = ranked[0]?.[0];
  switch (topKey) {
    case 'dexterity':
      return 'dexterity';
    case 'intelligence':
      return 'sorcery';
    case 'faith':
      return 'faith';
    case 'arcane':
      return 'arcane';
    default:
      return 'strength';
  }
}

/**
 * Does a weapon fit this archetype — i.e. does it scale with **every** stat the
 * build is named for? `.every` (not `.some`) is deliberate: a Bleed (Dex/Arc)
 * build wants weapons that scale with Dex *and* Arc (blood/occult armaments), not
 * every Dex weapon in the game; Quality wants Str *and* Dex; Int/Faith wants both.
 * Single-stat archetypes (Strength, Sorcery…) are unaffected.
 */
export function weaponScalesWith(weapon: WeaponScaling, arche: BuildArchetype): boolean {
  return arche.scaleAttrs.every((s) => (weapon.scaling[s] ?? 0) > 0);
}

/** Status-driven builds whose AR-only ranking is knowingly incomplete (bleed/rot not modelled yet). */
export const STATUS_ARCHETYPES: ReadonlySet<BuildArchetypeKey> = new Set(['arcane', 'bleed']);

/** A near-empty "starting point" spread for the Custom option (when no save). */
export const CUSTOM_DEFAULT: Attrs8 = VAGABOND;

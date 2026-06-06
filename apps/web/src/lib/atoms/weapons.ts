import { Atom } from 'effect/unstable/reactivity';
import { WEAPONS, type Weapon } from '@elden-ring-compass/data';

// First dataset wired through effect-atom (client-side-db Phase A). The weapons
// table is bundled directly for now; large datasets move to lazy JSON fetches
// later (see docs/projects/client-side-db.md). This file is the reference
// pattern: a base atom holding the dataset + derived atoms that express
// live "queries" (filter/sort) over it, consumed via `useAtomValue`.

export type { Weapon };

// Affinity is encoded in the weapon id (ER convention): `[baseGroup][affinity][upgrade]`,
// e.g. 1000000 Dagger / 1000100 Heavy Dagger / 1001200 Occult Dagger. We derive it
// here (no extractor change needed) so the table can collapse the ~13 affinity variants
// of each infusable weapon down to one base row by default. See
// docs/projects/future/coalesce-items-with-affinities.md.
const AFFINITY_LABELS = [
  'Standard',
  'Heavy',
  'Keen',
  'Quality',
  'Fire',
  'Flame Art',
  'Lightning',
  'Sacred',
  'Magic',
  'Cold',
  'Poison',
  'Blood',
  'Occult',
] as const;

export type Affinity = (typeof AFFINITY_LABELS)[number];

export type EnrichedWeapon = Weapon & {
  /** 0 = Standard (the base/unique row), 1..12 = an infused variant. */
  readonly affinityIndex: number;
  /** Human-readable affinity label, e.g. "Heavy". */
  readonly affinity: string;
  /** id of the affinity-0 sibling that all variants of this weapon share. */
  readonly baseId: number;
  /** Name of the affinity-0 sibling (e.g. "Dagger" for "Heavy Dagger"). */
  readonly baseName: string;
};

export const affinityIndexOf = (id: number) => Math.floor(id / 100) % 100;
export const baseIdOf = (id: number) => Math.floor(id / 10000) * 10000;

// Map each base group to its affinity-0 name so variants can show their base name
// (more robust than string-stripping prefixes like "Flame Art").
const baseNameById = new Map<number, string>();
for (const w of WEAPONS) {
  if (affinityIndexOf(w.id) === 0) baseNameById.set(w.id, w.name);
}

export const enrichWeapon = (w: Weapon): EnrichedWeapon => {
  const rawAffinity = affinityIndexOf(w.id);
  const baseId = baseIdOf(w.id);
  const baseName = baseNameById.get(baseId);
  // Only treat a row as an infused variant when its affinity-0 sibling actually
  // exists. A few rows don't follow the `[baseGroup][affinity][upgrade]` scheme
  // (e.g. id 1000 "DLC dummy", which would otherwise read as "Poison"); those are
  // left as standalone Standard rows so they stay visible and correctly labeled.
  const isVariant = rawAffinity !== 0 && baseName !== undefined;
  return {
    ...w,
    affinityIndex: isVariant ? rawAffinity : 0,
    affinity: isVariant ? (AFFINITY_LABELS[rawAffinity] ?? 'Special') : 'Standard',
    baseId: isVariant ? baseId : w.id,
    baseName: isVariant ? baseName : w.name,
  };
};

/** Base atom: the full weapons dataset (enriched with derived affinity fields) held in memory. */
export const weaponsAtom = Atom.make<readonly EnrichedWeapon[]>(WEAPONS.map(enrichWeapon));

/** Writable atom: the user's search query for the weapons table. */
export const weaponSearchAtom = Atom.make('');

/**
 * Writable atom: whether to show every affinity variant. Off by default so the
 * table collapses to one row per base weapon (Standard / unique rows only),
 * turning ~3333 rows into ~548. Toggle on for the full per-affinity list.
 */
export const showAffinityVariantsAtom = Atom.make(false);

/**
 * Derived "query": weapons filtered by the current search string (matches name
 * or id) and, unless `showAffinityVariantsAtom` is on, collapsed to affinity-0
 * (base/unique) rows. Recomputes only when its inputs change, and only
 * re-renders subscribers whose result actually changed.
 */
export const filteredWeaponsAtom = Atom.make((get) => {
  const query = get(weaponSearchAtom).trim().toLowerCase();
  const showVariants = get(showAffinityVariantsAtom);
  const weapons = get(weaponsAtom);
  return weapons.filter((w) => {
    if (!showVariants && w.affinityIndex !== 0) return false;
    if (query === '') return true;
    return w.name.toLowerCase().includes(query) || String(w.id).includes(query);
  });
});

/** Count of affinity-variant rows hidden when the collapse toggle is off (for the toolbar hint). */
export const affinityVariantCountAtom = Atom.make(
  (get) => get(weaponsAtom).filter((w) => w.affinityIndex !== 0).length,
);

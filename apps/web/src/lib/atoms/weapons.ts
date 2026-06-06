import { Atom } from 'effect/unstable/reactivity';
import { WEAPONS, type Weapon } from '@elden-ring-compass/data';
import { enrichWeapon, type EnrichedWeapon } from '@/lib/weapon-affinity';

// First dataset wired through effect-atom (client-side-db Phase A). The weapons
// table is bundled directly for now; large datasets move to lazy JSON fetches
// later (see docs/projects/client-side-db.md). This file is the reference
// pattern: a base atom holding the dataset + derived atoms that express
// live "queries" (filter/sort) over it, consumed via `useAtomValue`.
//
// Affinity derivation (collapse the ~13 affinity variants of each weapon) lives in
// `@/lib/weapon-affinity` so the save-driven inventory catalog can share it. See
// docs/projects/future/coalesce-items-with-affinities.md.

export type { Weapon };
export {
  type EnrichedWeapon,
  type Affinity,
  affinityIndexOf,
  baseIdOf,
  enrichWeapon,
} from '@/lib/weapon-affinity';

/** Base atom: the full weapons dataset (enriched with derived affinity fields) held in memory. */
export const weaponsAtom = Atom.make<readonly EnrichedWeapon[]>(WEAPONS.map(enrichWeapon));

/** Writable atom: the user's search query for the weapons table. */
export const weaponSearchAtom = Atom.make('');

/**
 * Writable atom: whether to show every affinity variant. Off by default so the
 * weapons/armaments tables collapse to one row per base weapon (Standard / unique
 * rows only). Shared across the weapons browser and the inventory armaments table.
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

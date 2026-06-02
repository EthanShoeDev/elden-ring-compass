import { Atom } from 'effect/unstable/reactivity';
import { WEAPONS, type Weapon } from '@elden-ring-compass/data';

// First dataset wired through effect-atom (client-side-db Phase A). The weapons
// table is bundled directly for now; large datasets move to lazy JSON fetches
// later (see docs/projects/client-side-db.md). This file is the reference
// pattern: a base atom holding the dataset + derived atoms that express
// live "queries" (filter/sort) over it, consumed via `useAtomValue`.

export type { Weapon };

/** Base atom: the full weapons dataset held in memory. */
export const weaponsAtom = Atom.make<readonly Weapon[]>(WEAPONS);

/** Writable atom: the user's search query for the weapons table. */
export const weaponSearchAtom = Atom.make('');

/**
 * Derived "query": weapons filtered by the current search string (matches name
 * or id). Recomputes only when the search or the dataset changes, and only
 * re-renders subscribers whose result actually changed.
 */
export const filteredWeaponsAtom = Atom.make((get) => {
  const query = get(weaponSearchAtom).trim().toLowerCase();
  const weapons = get(weaponsAtom);
  if (query === '') return weapons;
  return weapons.filter(
    (w) => w.name.toLowerCase().includes(query) || String(w.id).includes(query),
  );
});

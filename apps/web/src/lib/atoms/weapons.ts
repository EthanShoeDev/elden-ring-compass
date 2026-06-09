import { Atom } from 'effect/unstable/reactivity';

// Affinity derivation (collapse the ~13 affinity variants of each weapon) lives in
// `@/lib/weapon-affinity` so the save-driven inventory catalog can share it. See
// docs/projects/future/coalesce-items-with-affinities.md.
export { affinityIndexOf, baseIdOf, enrichWeapon } from '@/lib/weapon-affinity';

/**
 * Writable atom: whether to show every affinity variant. Off by default so the
 * armaments tables collapse to one row per base weapon (Standard / unique rows
 * only). Consumed by the inventory armaments table.
 */
export const showAffinityVariantsAtom = Atom.make(false);

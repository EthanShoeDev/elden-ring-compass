import { WEAPONS, type Weapon } from '@elden-ring-compass/data';

// Affinity is encoded in the weapon id (ER convention): `[baseGroup][affinity][upgrade]`,
// e.g. 1000000 Dagger / 1000100 Heavy Dagger / 1001200 Occult Dagger. We derive it here
// (no extractor change needed) so the inventory/weapons tables can collapse the ~13 affinity
// variants of each infusable weapon down to one base row by default. See
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

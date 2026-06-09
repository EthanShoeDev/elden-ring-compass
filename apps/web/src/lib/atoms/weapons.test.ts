import { describe, it, expect } from 'vitest';
import { WEAPONS } from '@elden-ring-compass/data';
import { affinityIndexOf, baseIdOf, enrichWeapon } from './weapons';

// Affinity collapsing (Option A/B in docs/projects/future/coalesce-items-with-affinities.md)
// relies on the ER weapon-id convention `[baseGroup][affinity][upgrade]`. These tests pin that
// convention so a future `bun run extract` that changes the id scheme fails loudly here rather
// than silently mis-grouping the table.
describe('weapon affinity id convention', () => {
  it('derives the affinity index from the hundreds digits', () => {
    expect(affinityIndexOf(1000000)).toBe(0); // Dagger (Standard)
    expect(affinityIndexOf(1000100)).toBe(1); // Heavy Dagger
    expect(affinityIndexOf(1001200)).toBe(12); // Occult Dagger
  });

  it('derives the shared base id for every affinity of a weapon', () => {
    expect(baseIdOf(1000000)).toBe(1000000);
    expect(baseIdOf(1000100)).toBe(1000000);
    expect(baseIdOf(1001200)).toBe(1000000);
    expect(baseIdOf(1020100)).toBe(1020000); // Heavy Parrying Dagger → Parrying Dagger
  });

  it('only ever produces affinity indices 0..12', () => {
    for (const w of WEAPONS) {
      const aff = affinityIndexOf(w.id);
      expect(aff, `weapon ${w.id} (${w.name})`).toBeGreaterThanOrEqual(0);
      expect(aff, `weapon ${w.id} (${w.name})`).toBeLessThanOrEqual(12);
    }
  });
});

describe('enrichWeapon', () => {
  const byId = new Map(WEAPONS.map((w) => [w.id, w]));
  const enrich = (id: number) => {
    const w = byId.get(id);
    if (!w) throw new Error(`fixture weapon ${id} not found`);
    return enrichWeapon(w);
  };

  it('labels an infused variant and points it at its base weapon', () => {
    const heavy = enrich(1000100);
    expect(heavy.affinity).toBe('Heavy');
    expect(heavy.affinityIndex).toBe(1);
    expect(heavy.baseId).toBe(1000000);
    expect(heavy.baseName).toBe('Dagger'); // not "Heavy Dagger"
  });

  it('treats the affinity-0 row as its own standard base', () => {
    const dagger = enrich(1000000);
    expect(dagger.affinity).toBe('Standard');
    expect(dagger.affinityIndex).toBe(0);
    expect(dagger.baseId).toBe(1000000);
    expect(dagger.baseName).toBe('Dagger');
  });

  it('leaves convention-breaking rows (no affinity-0 sibling) as standalone Standard rows', () => {
    // id 1000 "DLC dummy": baseId resolves to 0 with no sibling, so it must NOT be
    // mislabeled "Poison" (raw affinity 10) nor hidden by the collapse toggle.
    const dummy = enrich(1000);
    expect(dummy.affinityIndex).toBe(0);
    expect(dummy.affinity).toBe('Standard');
    expect(dummy.baseId).toBe(1000);
    expect(dummy.baseName).toBe(dummy.name);
  });

  it('never leaves a non-standard row without a real base weapon', () => {
    const baseIds = new Set(WEAPONS.map((w) => w.id));
    const orphans = WEAPONS.map(enrichWeapon).filter(
      (w) => w.affinityIndex !== 0 && !baseIds.has(w.baseId),
    );
    expect(orphans.map((w) => `${w.id} ${w.name}`)).toEqual([]);
  });
});

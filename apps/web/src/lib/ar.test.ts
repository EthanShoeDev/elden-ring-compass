import { describe, expect, it } from 'vitest';

import { MAX_UPGRADE_LEVEL, upgradeLevelFor, weaponScalingById } from './ar';

// Dagger (regular, +25 chain) vs. Bloodhound's Fang (somber, +10 chain).
const regular = weaponScalingById.get(1000000);
const somber = weaponScalingById.get(9040000);

describe('upgradeLevelFor', () => {
  it('leaves regular-stone weapons on the slider level', () => {
    expect(regular && upgradeLevelFor(regular, 13)).toBe(13);
    expect(regular && upgradeLevelFor(regular, MAX_UPGRADE_LEVEL)).toBe(25);
  });

  it('maps the slider onto the shorter somber chain instead of clamping', () => {
    // +13 regular is roughly halfway, so the somber weapon sits at +5 — not the
    // maxed +10 the old clamp produced.
    expect(somber && upgradeLevelFor(somber, 13)).toBe(5);
    expect(somber && upgradeLevelFor(somber, MAX_UPGRADE_LEVEL)).toBe(10);
    expect(somber && upgradeLevelFor(somber, 0)).toBe(0);
  });
});

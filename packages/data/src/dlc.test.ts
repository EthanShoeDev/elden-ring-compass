import { Array as Arr, Option, String as Str } from 'effect';
import { describe, expect, it } from 'vitest';

import preDlc from '../test/fixtures/pre-dlc-item-ids.json' with { type: 'json' };
import {
  ARMOR,
  ASHES_OF_WAR,
  BOSSES,
  GOODS,
  GRACES,
  SPELLS,
  SPIRIT_ASHES,
  TALISMANS,
  WEAPONS,
} from './index.ts';

// `isDlc` is derived by the extractor from the install (item names only in a
// `_dlcNN` FMG; boss/grace maps shipped in DLC.bdt). These pin it against an
// independent pre-Shadow-of-the-Erdtree snapshot and a few known answers.

interface DlcRow {
  readonly id: number;
  readonly name: string;
  readonly isDlc: boolean;
}

const categories: readonly (readonly [
  string,
  readonly DlcRow[],
  readonly number[],
])[] = [
  ['weapons', WEAPONS, preDlc.weapons],
  ['armor', ARMOR, preDlc.armor],
  ['talismans', TALISMANS, preDlc.talismans],
  ['spells', SPELLS, preDlc.spells],
  ['spirit ashes', SPIRIT_ASHES, preDlc.spiritAshes],
  ['ashes of war', ASHES_OF_WAR, preDlc.ashesOfWar],
  ['goods', GOODS, preDlc.goods],
];

const byName = <T extends { readonly name: string | null }>(
  rows: readonly T[],
  name: string,
) => Option.getOrUndefined(Arr.findFirst(rows, (r) => r.name === name));

describe('isDlc', () => {
  it.each(categories)(
    'flags no %s item that existed before the DLC',
    (_, rows, before) => {
      const pre = new Set<number>(before);
      const wrong = Arr.filter(rows, (r) => r.isDlc && pre.has(r.id));
      expect(Arr.map(wrong, (r) => `${r.id} ${r.name}`)).toEqual([]);
    },
  );

  it.each(categories)('flags some %s as DLC', (_, rows) => {
    expect(Arr.some(rows, (r) => r.isDlc)).toBe(true);
  });

  it('knows a few items either way', () => {
    expect(byName(WEAPONS, 'Milady')?.isDlc).toBe(true);
    expect(byName(TALISMANS, 'Two-Headed Turtle Talisman')?.isDlc).toBe(true);
    expect(byName(WEAPONS, 'Moonveil')?.isDlc).toBe(false);
    expect(byName(SPIRIT_ASHES, 'Black Knife Tiche')?.isDlc).toBe(false);
  });

  it('places the Shadow Keep bosses in Shadow Keep, not the Haligtree', () => {
    // Their GameAreaParam rows are clones of Malenia's (m15); the MSB placement wins.
    for (const [flag, mapId] of [
      [21000850, 'm21_00_00_00'], // Golden Hippopotamus
      [21010800, 'm21_01_00_00'], // Base Serpent Messmer
    ] as const) {
      const boss = Arr.findFirst(BOSSES, (b) => b.defeatFlagId === flag);
      expect(Option.map(boss, (b) => [b.mapId, b.isDlc])).toEqual(
        Option.some([mapId, true]),
      );
    }
  });

  it('matches the overworld a boss or grace is in', () => {
    for (const b of BOSSES) {
      if (Str.startsWith('m61_')(b.mapId)) expect(b.isDlc).toBe(true);
      if (Str.startsWith('m60_')(b.mapId)) expect(b.isDlc).toBe(false);
    }
    for (const g of GRACES) {
      if (g.mapArea === 61) expect(g.isDlc).toBe(true);
      if (g.mapArea === 60) expect(g.isDlc).toBe(false);
    }
    expect(byName(BOSSES, 'Malenia, Blade of Miquella')?.isDlc).toBe(false);
    expect(byName(BOSSES, 'Bayle the Dread')?.isDlc).toBe(true);
  });
});

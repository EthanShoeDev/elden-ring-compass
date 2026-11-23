import { NodeServices } from '@effect/platform-node';
import { it } from '@effect/vitest';
import { BOSSES } from '@elden-ring-compass/data';
import { Array as Arr, Effect, Option, Record as Rec } from 'effect';
import { expect } from 'vitest';

import { readFixtureSave } from '@/test/fixture-save';

import { BOSS_GALLERY } from './boss-meta';
import { completionMilestones } from './completion';
import { inDlcScope } from './dlc';
import { parseEldenRingData } from './er-save-parser';
import { inventoryTables } from './inventory-catalog';
import type { Slot } from './save-dto';
import { hasStartedDlc } from './vm/dlc-progress';
import { eventsDbView } from './vm/events';

// Base game / DLC scoping (issue #12), against the committed ER0000.sl2 fixture:
// "sam" has entered the Land of Shadow, the other four characters have not.

const loadSlots = Effect.gen(function* () {
  const buffer = yield* readFixtureSave;
  const save = parseEldenRingData(buffer);
  return (name: string): Slot =>
    Option.getOrThrowWith(
      Arr.findFirst(
        save.slots,
        (s) => s.player_game_data.character_name === name,
      ),
      () => new Error(`fixture slot ${name} not found`),
    );
});

it('inDlcScope keeps the right rows', () => {
  expect(inDlcScope('all', true) && inDlcScope('all', false)).toBe(true);
  expect([inDlcScope('base', false), inDlcScope('base', true)]).toEqual([
    true,
    false,
  ]);
  expect([inDlcScope('dlc', true), inDlcScope('dlc', false)]).toEqual([
    true,
    false,
  ]);
});

it('marks each curated gallery group the same way the extracted bosses are', () => {
  const extracted = new Map(Arr.map(BOSSES, (b) => [b.defeatFlagId, b.isDlc]));
  const mismatched = Arr.flatMap(BOSS_GALLERY, (group) =>
    Arr.filter(group.bosses, (b) => {
      const isDlc = extracted.get(b.flag);
      return isDlc !== undefined && isDlc !== group.isDlc;
    }),
  );
  expect(Arr.map(mismatched, (b) => b.name)).toEqual([]);
});

it.layer(NodeServices.layer)('DLC scope on a real save', (it) => {
  it.effect('reads whether a character has started the DLC', () =>
    Effect.gen(function* () {
      const byName = yield* loadSlots;
      expect(hasStartedDlc(byName('sam'))).toBe(true);
      expect(hasStartedDlc(byName('Yager'))).toBe(false);
      expect(hasStartedDlc(byName('vagbond dlc prep'))).toBe(false);
    }),
  );

  it.effect('splits every inventory table into base + DLC', () =>
    Effect.gen(function* () {
      const sam = (yield* loadSlots)('sam');
      const all = inventoryTables(sam, 'all');
      const base = inventoryTables(sam, 'base');
      const dlc = inventoryTables(sam, 'dlc');
      for (const [table, { items }] of Rec.toEntries(all)) {
        expect(Arr.some(base[table].items, (r) => r.isDlc)).toBe(false);
        expect(Arr.every(dlc[table].items, (r) => r.isDlc)).toBe(true);
        expect(base[table].items.length + dlc[table].items.length).toBe(
          items.length,
        );
        expect(base[table].ownedCount + dlc[table].ownedCount).toBe(
          all[table].ownedCount,
        );
      }
      expect(dlc.armaments.items.length).toBeGreaterThan(0);
    }),
  );

  it.effect('keeps DLC bosses and graces out of the base game view', () =>
    Effect.gen(function* () {
      const yager = (yield* loadSlots)('Yager');
      const base = eventsDbView(yager, 'base');
      const all = eventsDbView(yager);
      expect(Arr.some(base, (e) => e.isDlc)).toBe(false);
      expect(Arr.some(all, (e) => e.isDlc)).toBe(true);
      expect(
        Arr.some(base, (e) => e.name === 'Malenia, Blade of Miquella'),
      ).toBe(true);
      expect(Arr.some(base, (e) => e.name === 'Bayle the Dread')).toBe(false);
    }),
  );

  it.effect('counts Remembrances per scope', () =>
    Effect.gen(function* () {
      const yager = (yield* loadSlots)('Yager');
      const total = (scope: 'base' | 'dlc' | 'all') =>
        Option.map(
          Arr.findFirst(
            completionMilestones(yager, scope),
            (m) => m.key === 'remembrances',
          ),
          (m) => m.total,
        );
      // 15 base-game Remembrances, 10 more in Shadow of the Erdtree.
      expect(total('base')).toEqual(Option.some(15));
      expect(total('dlc')).toEqual(Option.some(10));
      expect(total('all')).toEqual(Option.some(25));
    }),
  );
});

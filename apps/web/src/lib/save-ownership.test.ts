import { NodeServices } from '@effect/platform-node';
import { it } from '@effect/vitest';
import { GOODS } from '@elden-ring-compass/data';
import { Array as Arr, Effect, Option, pipe, Record as Rec } from 'effect';
import { expect } from 'vitest';

import { readFixtureSave } from '@/test/fixture-save';

import { completionMilestones } from './completion';
import { parseEldenRingData } from './er-save-parser';
import { inventoryTables } from './inventory-catalog';
import type { Slot } from './save-dto';
import { derivedStatsView } from './vm/derived-stats';
import { equipmentDbView } from './vm/equipement';
import { flasksView, mixedPhysickTearIds } from './vm/flasks';
import { inventoryDbView } from './vm/inventory';

// Regression tests for issue #11 ("Incorrect data imported from save file"): the save parsed
// fine, but the view-models that turn it into ownership / equipment / flask numbers were wrong.
// Each case pins values read from the committed ER0000.sl2 fixture (5 characters; "sam" is a
// DLC-era save, "vagbond dlc prep" a fresh level-10 character).

const loadSlots = Effect.gen(function* () {
  const buffer = yield* readFixtureSave;
  const save = parseEldenRingData(buffer);
  const byName = (name: string): Slot =>
    Option.getOrThrowWith(
      Arr.findFirst(
        save.slots,
        (s) => s.player_game_data.character_name === name,
      ),
      () => new Error(`fixture slot ${name} not found`),
    );
  return { slots: save.slots, byName };
});

const goodsIdsOfCategory = (category: string) =>
  new Set(
    Arr.map(
      Arr.filter(GOODS, (g) => g.category === category),
      (g) => g.id,
    ),
  );
const crystalTearIds = goodsIdsOfCategory('Crystal Tear');
const greatRuneIds = goodsIdsOfCategory('Great Rune');

/** Field of the first row matching `predicate`, or undefined when none matches. */
const findField = <A, B>(
  rows: ReadonlyArray<A>,
  predicate: (row: A) => boolean,
  field: (row: A) => B,
) =>
  pipe(
    Arr.findFirst(rows, predicate),
    Option.map(field),
    Option.getOrUndefined,
  );

it.layer(NodeServices.layer)('save ownership view-models (issue #11)', (it) => {
  it.effect(
    'ownership is keyed by item type: no row is owned via another type sharing its id',
    () =>
      Effect.gen(function* () {
        const { slots } = yield* loadSlots;
        const typedTables = [
          ['armaments', 'WEAPON'],
          ['ammo', 'WEAPON'],
          ['armor', 'ARMOR'],
          ['talismans', 'ACCESSORY'],
          ['ashes', 'AOW'],
        ] as const;
        for (const slot of slots) {
          const items = Arr.filter(
            inventoryDbView(slot).items,
            (i) => i.quantity > 0,
          );
          const tables = inventoryTables(slot);
          for (const [table, type] of typedTables) {
            const ownedOfType = new Set(
              Arr.map(
                Arr.filter(items, (i) => i.type === type),
                (i) => i.item_id,
              ),
            );
            for (const row of Arr.filter(
              tables[table].items,
              (r) => r.quantity > 0,
            ))
              expect(
                ownedOfType,
                `${slot.player_game_data.character_name}: ${row.name}`,
              ).toContain(row.id);
          }
        }
      }),
  );

  it.effect(
    'a held flask no longer marks the talisman with the same id as owned',
    () =>
      Effect.gen(function* () {
        const { byName } = yield* loadSlots;
        // Yager holds Flask of Crimson Tears +10 (goods 1021) but no talisman 1021.
        const tables = inventoryTables(byName('Yager'));
        expect(
          findField(
            tables.tools.items,
            (r) => r.id === 1021,
            (r) => r.quantity,
          ),
        ).toBeGreaterThan(0);
        expect(
          findField(
            tables.talismans.items,
            (r) => r.id === 1021,
            (r) => r.quantity,
          ) ?? 0,
        ).toBe(0);
      }),
  );

  it.effect(
    'key items are read: Crystal Tears and Great Runes in the key-item list count',
    () =>
      Effect.gen(function* () {
        const { byName } = yield* loadSlots;
        const ownedTears = (name: string) =>
          Arr.filter(
            inventoryTables(byName(name)).tools.items,
            (r) => crystalTearIds.has(r.id) && r.quantity > 0,
          ).length;
        // "sam" and "shoe" store their tears as key items; "Yager" (older save) as common items.
        expect(ownedTears('sam')).toBe(9);
        expect(ownedTears('shoe')).toBe(2);
        expect(ownedTears('Yager')).toBe(23);
        const ownedGreatRunes = Arr.filter(
          inventoryTables(byName('sam')).keyItems.items,
          (r) => greatRuneIds.has(r.id) && r.quantity > 0,
        ).length;
        expect(ownedGreatRunes).toBe(1);
      }),
  );

  it.effect(
    'gestures count only unlocked (odd) entries of the gesture table',
    () =>
      Effect.gen(function* () {
        const { slots, byName } = yield* loadSlots;
        for (const slot of slots) {
          const { gestures } = inventoryTables(slot);
          expect(gestures.ownedCount).toBeLessThanOrEqual(
            gestures.items.length,
          );
        }
        // "sam"'s table has 57 entries (all gestures, locked + unlocked) — 25 are unlocked.
        expect(inventoryTables(byName('sam')).gestures.ownedCount).toBe(25);
        expect(
          inventoryTables(byName('vagbond dlc prep')).gestures.ownedCount,
        ).toBe(13);
      }),
  );

  it.effect(
    'equipped upgraded weapons resolve to a name; talismans resolve from their handle',
    () =>
      Effect.gen(function* () {
        const { byName } = yield* loadSlots;
        const eq = equipmentDbView(byName('sam'));
        const rightHand = eq.right_hand_armaments[0];
        // Gaitem id 2140008 = an armament at +8; the id keeps its upgrade level for AR math.
        expect(rightHand?.id).toBe(2140008);
        expect(rightHand?.name).not.toBe('Unknown');
        expect(rightHand?.name).toMatch(/ \+8$/);
        for (const talisman of eq.talismans) {
          expect(talisman.id).toBeGreaterThan(0);
          expect(talisman.name).not.toMatch(/^(Empty|Unknown)$/);
        }
        // Quick slots are goods handles too: sam's first quick item is a Flask of Crimson Tears.
        expect(eq.quickslots[0]?.name).toBe('Flask of Crimson Tears');
      }),
  );

  it.effect('flasks report upgrade level and allocated charges', () =>
    Effect.gen(function* () {
      const { byName } = yield* loadSlots;
      const sam = flasksView(byName('sam'));
      expect(sam.crimson.item?.name).toBe('Flask of Crimson Tears +7');
      expect(sam.crimson.charges).toBe(10);
      expect(sam.cerulean.item?.name).toBe('Flask of Cerulean Tears +7');
      expect(sam.cerulean.charges).toBe(2);
      expect(sam.totalCharges).toBe(12);

      // All 14 charges on crimson: the cerulean flask is held empty (+10, 0 charges).
      const yager = flasksView(byName('Yager'));
      expect(yager.crimson.item?.name).toBe('Flask of Crimson Tears +10');
      expect(yager.crimson.charges).toBe(14);
      expect(yager.cerulean.item?.name).toBe('Flask of Cerulean Tears +10');
      expect(yager.cerulean.charges).toBe(0);

      // A +1 flask (the old lookup skipped +1 entirely).
      expect(flasksView(byName('shoe')).crimson.item?.name).toBe(
        'Flask of Crimson Tears +1',
      );
    }),
  );

  it.effect('the Wondrous Physick reports the two tears mixed into it', () =>
    Effect.gen(function* () {
      const { byName } = yield* loadSlots;
      // Opaline Bubbletear + Magic-Shrouding Cracked Tear; mixed tears stay in the inventory.
      expect(mixedPhysickTearIds(byName('sam'))).toEqual([11029, 11008]);
      expect(mixedPhysickTearIds(byName('shoe'))).toEqual([]);
    }),
  );

  it.effect('owned quantities split into held and Sorting Chest storage', () =>
    Effect.gen(function* () {
      const { slots, byName } = yield* loadSlots;
      for (const slot of slots)
        for (const table of Rec.values(inventoryTables(slot)))
          for (const row of table.items)
            expect(row.quantity).toBe(row.heldQuantity + row.storedQuantity);

      const yager = inventoryTables(byName('Yager'));
      const daggers = Option.getOrUndefined(
        Arr.findFirst(yager.tools.items, (r) => r.name === 'Throwing Dagger'),
      );
      expect([daggers?.heldQuantity, daggers?.storedQuantity]).toEqual([
        40, 600,
      ]);
      const rollo = Option.getOrUndefined(
        Arr.findFirst(
          yager.spirits.items,
          (r) => r.name === 'Omenkiller Rollo',
        ),
      );
      expect([rollo?.heldQuantity, rollo?.storedQuantity]).toEqual([1, 1]);
    }),
  );

  it.effect(
    'derived stats: save HP/FP/stamina, equipped weight, poise and discovery',
    () =>
      Effect.gen(function* () {
        const { byName } = yield* loadSlots;
        const sam = derivedStatsView(byName('sam'));
        expect(sam.hp).toEqual({ max: 1402, base: 1402 });
        expect(sam.fp).toEqual({ max: 109, base: 100 });
        // END 20, no load talismans: 45 + 27·(20−8)/17 = 64.06.
        expect(sam.equipLoad.max).toBe(64.1);
        // 2× Sword of Night and Flame, Longbow, Sentry's Torch, Zamor set, Imp Head, 4 talismans
        // (equipped arrows don't count: ammo is weightless).
        expect(sam.equipLoad.current).toBe(44.7);
        expect(sam.equipLoad.roll).toBe('Medium');
        expect(sam.discovery).toBe(108); // 100 + 8 Arcane

        // Bull-Goat + Maliketh armor; Erdtree's Favor +2 raises max load ×1.08.
        const yager = derivedStatsView(byName('Yager'));
        expect(yager.poise).toBe(63);
        expect(yager.equipLoad.max).toBe(92.3);
        expect(yager.discovery).toBe(144); // 100 + 44 Arcane
      }),
  );

  it.effect(
    'Great Runes count unrestored copies; Remembrances count defeated bosses',
    () =>
      Effect.gen(function* () {
        const { byName } = yield* loadSlots;
        const milestone = (name: string, key: string) =>
          findField(
            completionMilestones(byName(name)),
            (m) => m.key === key,
            (m) => m.owned,
          );
        // sam holds 1 restored Great Rune + 3 not yet restored at their Divine Towers.
        expect(milestone('sam', 'greatRunes')).toBe(4);
        expect(milestone('sam', 'remembrances')).toBe(6);
        expect(milestone('Yager', 'greatRunes')).toBe(3);
        expect(milestone('Yager', 'remembrances')).toBe(11);
        expect(milestone('vagbond dlc prep', 'remembrances')).toBe(0);
      }),
  );
});

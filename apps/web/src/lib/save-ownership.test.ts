import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { NodeServices } from '@effect/platform-node';
import { it } from '@effect/vitest';
import { Effect, FileSystem } from 'effect';
import { expect } from 'vitest';
import { GOODS } from '@elden-ring-compass/data';
import { parseEldenRingData } from './er-save-parser';
import { inventoryTables } from './inventory-catalog';
import type { Slot } from './save-dto';
import { equipmentDbView } from './vm/equipement';
import { flasksView } from './vm/flasks';
import { inventoryDbView } from './vm/inventory';

// Regression tests for issue #11 ("Incorrect data imported from save file"): the save parsed
// fine, but the view-models that turn it into ownership / equipment / flask numbers were wrong.
// Each case pins values read from the committed ER0000.sl2 fixture (5 characters; "sam" is a
// DLC-era save, "vagbond dlc prep" a fresh level-10 character).

const REPO_ROOT = (() => {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, 'turbo.jsonc'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
})();

const loadSlots = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const bytes = yield* fs.readFile(
    join(REPO_ROOT, 'packages', 'save-parser', 'test', 'fixtures', 'ER0000.sl2'),
  );
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const save = parseEldenRingData(buffer);
  const byName = (name: string): Slot => {
    const slot = save.slots.find((s) => s.player_game_data.character_name === name);
    if (!slot) throw new Error(`fixture slot ${name} not found`);
    return slot;
  };
  return { slots: save.slots, byName };
});

const crystalTearIds = new Set(GOODS.filter((g) => g.category === 'Crystal Tear').map((g) => g.id));
const greatRuneIds = new Set(GOODS.filter((g) => g.category === 'Great Rune').map((g) => g.id));

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
          const items = inventoryDbView(slot).items.filter((i) => i.quantity > 0);
          const tables = inventoryTables(slot);
          for (const [table, type] of typedTables) {
            const ownedOfType = new Set(items.filter((i) => i.type === type).map((i) => i.item_id));
            for (const row of tables[table].items.filter((r) => r.quantity > 0))
              expect(ownedOfType, `${slot.player_game_data.character_name}: ${row.name}`).toContain(
                row.id,
              );
          }
        }
      }),
  );

  it.effect('a held flask no longer marks the talisman with the same id as owned', () =>
    Effect.gen(function* () {
      const { byName } = yield* loadSlots;
      // Yager holds Flask of Crimson Tears +10 (goods 1021) but no talisman 1021.
      const tables = inventoryTables(byName('Yager'));
      expect(tables.tools.items.find((r) => r.id === 1021)?.quantity).toBeGreaterThan(0);
      expect(tables.talismans.items.find((r) => r.id === 1021)?.quantity ?? 0).toBe(0);
    }),
  );

  it.effect('key items are read: Crystal Tears and Great Runes in the key-item list count', () =>
    Effect.gen(function* () {
      const { byName } = yield* loadSlots;
      const ownedTears = (name: string) =>
        inventoryTables(byName(name)).tools.items.filter(
          (r) => crystalTearIds.has(r.id) && r.quantity > 0,
        ).length;
      // "sam" and "shoe" store their tears as key items; "Yager" (older save) as common items.
      expect(ownedTears('sam')).toBe(9);
      expect(ownedTears('shoe')).toBe(2);
      expect(ownedTears('Yager')).toBe(23);
      const ownedGreatRunes = inventoryTables(byName('sam')).keyItems.items.filter(
        (r) => greatRuneIds.has(r.id) && r.quantity > 0,
      ).length;
      expect(ownedGreatRunes).toBe(1);
    }),
  );

  it.effect('gestures count only unlocked (odd) entries of the gesture table', () =>
    Effect.gen(function* () {
      const { slots, byName } = yield* loadSlots;
      for (const slot of slots) {
        const { gestures } = inventoryTables(slot);
        expect(gestures.ownedCount).toBeLessThanOrEqual(gestures.items.length);
      }
      // "sam"'s table has 57 entries (all gestures, locked + unlocked) — 25 are unlocked.
      expect(inventoryTables(byName('sam')).gestures.ownedCount).toBe(25);
      expect(inventoryTables(byName('vagbond dlc prep')).gestures.ownedCount).toBe(13);
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
      expect(flasksView(byName('shoe')).crimson.item?.name).toBe('Flask of Crimson Tears +1');
    }),
  );
});

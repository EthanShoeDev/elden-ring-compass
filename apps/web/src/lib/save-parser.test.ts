import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { NodeServices } from '@effect/platform-node';
import { it } from '@effect/vitest';
import { Data, Effect, FileSystem } from 'effect';
import { expect } from 'vitest';
import { MATCHMAKING_REGION_IDS, REGIONS } from '@elden-ring-compass/data';
import { parseEldenRingData } from './er-save-parser';
import type { Slot, WasmEldenRingSave } from './save-dto';

// Runtime-verification of the lean-DTO save parser against a real `.sl2`: structural sanity of the
// web-facing DTO (stats, event flags, ga_items, regions) through the app's `parseEldenRingData`
// (the pure-TS parser). Byte-exact correctness is pinned separately by the parser package's parity
// test (packages/save-parser/test/parity.test.ts).
//
// Why no browser / fetch / DOM: `parseEldenRingData` is pure compute (bytes in -> JS object out).
//
// Why @effect/platform-node: vitest's worker pool runs on Node even when launched via `bun run`;
// `NodeServices.layer` is the matching FileSystem provider. (This used to verify the Rust/WASM
// parser; that's been retired in favor of the byte-identical TS port.)

class SaveParseError extends Data.TaggedError('SaveParseError')<{
  readonly message: string;
  readonly cause: unknown;
}> {}

// Resolve the repo root by walking up for `turbo.jsonc`, NOT from `process.cwd()` or
// `import.meta.url`: the test runs both per-package (cwd = apps/web) and via the root
// vitest config (cwd = repo root), and in the jsdom env `import.meta.url` isn't a
// `file://` URL. Walking up to a known root marker is stable across all of these.
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

const savePaths = Effect.sync(() => ({
  // A committed base-game save shipped in public/. (DLC fixtures can join this list once a
  // committed `.sl2` lives in the repo.)
  baseSave: join(REPO_ROOT, 'packages', 'save-parser', 'test', 'fixtures', 'ER0000.sl2'),
}));

/** Read a save fixture and parse it into the lean DTO, as a typed-failure Effect. */
const parseFixture = (absPath: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const bytes = yield* fs.readFile(absPath);
    // Tighten to an exact-size ArrayBuffer (the FileSystem view may sit in a larger buffer).
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    return yield* Effect.try({
      try: () => parseEldenRingData(buffer),
      catch: (cause) => new SaveParseError({ message: 'TS parse failed', cause }),
    });
  });

/** A slot is "occupied" when it has a character name; empty slots are skipped for value checks. */
const occupiedSlots = (save: WasmEldenRingSave): readonly Slot[] =>
  save.slots.filter((s) => s.player_game_data.character_name.length > 0);

it.layer(NodeServices.layer)('TS save parser — lean DTO (ER0000.sl2)', (it) => {
  it.effect('parses without throwing and yields the top-level shape', () =>
    Effect.gen(function* () {
      const { baseSave } = yield* savePaths;
      const save = yield* parseFixture(baseSave);
      expect(typeof save.global_steam_id).toBe('string');
      expect(save.global_steam_id).toMatch(/^\d+$/);
      expect(Array.isArray(save.slots)).toBe(true);
      expect(save.slots.length).toBeGreaterThan(0);
      expect(Array.isArray(save.character_steam_ids)).toBe(true);
      expect(occupiedSlots(save).length).toBeGreaterThan(0);
    }),
  );

  it.effect('player_game_data: name + stats are sane for every occupied slot', () =>
    Effect.gen(function* () {
      const { baseSave } = yield* savePaths;
      const save = yield* parseFixture(baseSave);
      for (const slot of occupiedSlots(save)) {
        const p = slot.player_game_data;
        expect(p.character_name.length).toBeGreaterThan(0);
        expect(p.level).toBeGreaterThanOrEqual(1);
        expect(p.level).toBeLessThanOrEqual(999);
        const stats = [
          p.vigor,
          p.mind,
          p.endurance,
          p.strength,
          p.dexterity,
          p.intelligence,
          p.faith,
          p.arcane,
        ];
        for (const stat of stats) {
          expect(stat).toBeGreaterThanOrEqual(1);
          expect(stat).toBeLessThanOrEqual(99);
        }
        // Level can't exceed the summed attributes (each level buys exactly one attribute point).
        const statSum = stats.reduce((a, b) => a + b, 0);
        expect(statSum).toBeGreaterThanOrEqual(p.level);
        expect(p.souls).toBeGreaterThanOrEqual(0);
        expect(p.soulsmemory).toBeGreaterThanOrEqual(p.souls);
      }
    }),
  );

  it.effect('event_flags: ships the trailing-trimmed bitfield (large, byte-addressable)', () =>
    Effect.gen(function* () {
      const { baseSave } = yield* savePaths;
      const save = yield* parseFixture(baseSave);
      const slot = occupiedSlots(save)[0];
      if (slot === undefined) throw new Error('expected an occupied slot');
      const flags = slot.event_flags.flags;
      // ~1.77 MB region minus trailing zeros; far larger than any accidental small buffer.
      expect(flags.length).toBeGreaterThan(100_000);
    }),
  );

  it.effect('ga_items: non-empty entries carry numeric instance handle + item id', () =>
    Effect.gen(function* () {
      const { baseSave } = yield* savePaths;
      const save = yield* parseFixture(baseSave);
      const slot = occupiedSlots(save)[0];
      if (slot === undefined) throw new Error('expected an occupied slot');
      const items = slot.ga_items;
      expect(items.length).toBeGreaterThan(0);
      for (const gaItem of items) {
        expect(Number.isInteger(gaItem.gaitem_handle)).toBe(true);
        expect(Number.isInteger(gaItem.item_id)).toBe(true);
        expect(Number.isInteger(gaItem.gem_gaitem_handle)).toBe(true);
      }
    }),
  );

  it.effect('chr_asm2: equipped-handle block is present', () =>
    Effect.gen(function* () {
      const { baseSave } = yield* savePaths;
      const save = yield* parseFixture(baseSave);
      const slot = occupiedSlots(save)[0];
      if (slot === undefined) throw new Error('expected an occupied slot');
      expect(slot.chr_asm2).toBeDefined();
    }),
  );

  // The audit's highest-risk assumption — `REGIONS.id == save.unlocked_regions` — RESOLVED
  // (2026-06-03). The earlier "~47% coverage" was NOT a data gap: `unlocked_regions` interleaves
  // two PlayRegionParam kinds — *placed* regions (areaNo!=0 → REGIONS) and *matchmaking* siblings
  // (areaNo==0, multiplayer/invasion plumbing → MATCHMAKING_REGION_IDS), which the game activates
  // as the player moves but which aren't user-facing places. So every unlocked id should classify
  // as placed OR matchmaking, except a tiny set of non-PlayRegionParam outliers. See
  // docs/projects/data-parity-audit.md. This asserts the full classification (no silent gap).
  //
  // KNOWN_OUTLIERS: ids in unlocked_regions that aren't in PlayRegionParam at all (different
  // id-space — likely special/global region ids). Left unclassified pending investigation.
  const KNOWN_OUTLIERS = new Set([600000, 3106004, 3413000]);
  it.effect(
    'regions: every unlocked id is a placed region, a matchmaking sibling, or a known outlier',
    () =>
      Effect.gen(function* () {
        const { baseSave } = yield* savePaths;
        const save = yield* parseFixture(baseSave);
        const regionIds = new Set(REGIONS.map((r) => r.id));
        let sawPlaced = false;
        const unclassified: number[] = [];
        for (const slot of occupiedSlots(save)) {
          for (const id of slot.regions.unlocked_regions) {
            expect(Number.isInteger(id)).toBe(true);
            expect(id).toBeGreaterThanOrEqual(0);
            if (regionIds.has(id)) sawPlaced = true;
            else if (!MATCHMAKING_REGION_IDS.has(id) && !KNOWN_OUTLIERS.has(id))
              unclassified.push(id);
          }
        }
        // Some placed regions must resolve (a total miss would mean an encoding/id-space bug)...
        expect(sawPlaced).toBe(true);
        // ...and nothing should fall outside placed ∪ matchmaking ∪ known-outliers (no silent gap).
        expect(unclassified).toEqual([]);
      }),
  );
});

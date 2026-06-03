import { NodeServices } from '@effect/platform-node';
import { it } from '@effect/vitest';
import { Data, Effect, FileSystem, Path } from 'effect';
import { expect } from 'vitest';
import { MATCHMAKING_REGION_IDS, REGIONS } from '@elden-ring-compass/data';
import { initSync } from '@elden-ring-compass/save-parser';
import { parseEldenRingData } from './er-save-parser';
import type { Slot, WasmEldenRingSave } from './wasm-wrapper';

// Runtime-verification of the lean-DTO WASM save parser (ER-Save-Lib fork) against a real
// `.sl2`, replacing the manual browser check. See docs/projects/wasm-save-parser-rewrite.md (#15).
//
// Why no browser / fetch / DOM: the parser is pure compute (bytes in -> JS object out). The
// `--target web` wasm only couples to the browser via its default `fetch(import.meta.url)` init;
// we sidestep that with `initSync(bytes)`, which compiles via `new WebAssembly.Module()` —
// identical in Node, Bun, and the browser. So plain (non-browser-mode) vitest is sufficient.
//
// Why @effect/platform-node (not -bun): vitest's worker pool runs on Node even when launched via
// `bun run` (verified: worker execPath is node.exe). `@effect/platform-bun` needs the Bun runtime
// and is reserved for the er-extractor CLI; `NodeServices.layer` is the matching FileSystem + Path
// provider for tests. The wasm itself is runtime-neutral.

class SaveParseError extends Data.TaggedError('SaveParseError')<{
  readonly message: string;
  readonly cause: unknown;
}> {}

/** Resolve repo fixture paths via the Path service (cwd = apps/web under vitest). */
const savePaths = Effect.gen(function* () {
  const path = yield* Path.Path;
  const appRoot = process.cwd();
  const repoRoot = path.resolve(appRoot, '..', '..');
  return {
    wasm: path.join(
      repoRoot,
      'packages',
      'elden-ring-save-parser',
      'pkg',
      'elden_ring_save_parser_bg.wasm',
    ),
    // A committed base-game save shipped in public/. (DLC fixtures can join this list once a
    // committed `.sl2` lives in the repo — packages/er-save-lib/test/* is a submodule, not relied on.)
    baseSave: path.join(appRoot, 'public', 'ER0000.sl2'),
  };
});

/**
 * Initialise the wasm singleton from disk bytes (idempotent — `initSync` returns early once set).
 * `parseEldenRingData` -> `parse_save_wasm` -> `parse_save` all share this instance, so the real
 * app code path is exercised.
 */
const ensureParser = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const { wasm } = yield* savePaths;
  const bytes = yield* fs.readFile(wasm);
  initSync({ module: bytes });
});

/** Read a save fixture and parse it into the lean DTO, as a typed-failure Effect. */
const parseFixture = (absPath: string) =>
  Effect.gen(function* () {
    yield* ensureParser;
    const fs = yield* FileSystem.FileSystem;
    const bytes = yield* fs.readFile(absPath);
    // Tighten to an exact-size ArrayBuffer (the FileSystem view may sit in a larger buffer).
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    return yield* Effect.try({
      try: () => parseEldenRingData(buffer),
      catch: (cause) => new SaveParseError({ message: 'wasm parse failed', cause }),
    });
  });

/** A slot is "occupied" when it has a character name; empty slots are skipped for value checks. */
const occupiedSlots = (save: WasmEldenRingSave): readonly Slot[] =>
  save.slots.filter((s) => s.player_game_data.character_name.length > 0);

it.layer(NodeServices.layer)('WASM save parser — lean DTO (ER0000.sl2)', (it) => {
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
      const flags = occupiedSlots(save)[0]!.event_flags.flags;
      // ~1.77 MB region minus trailing zeros; far larger than any accidental small buffer.
      expect(flags.length).toBeGreaterThan(100_000);
    }),
  );

  it.effect('ga_items: non-empty entries carry numeric instance handle + item id', () =>
    Effect.gen(function* () {
      const { baseSave } = yield* savePaths;
      const save = yield* parseFixture(baseSave);
      const items = occupiedSlots(save)[0]!.ga_items;
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
      expect(occupiedSlots(save)[0]!.chr_asm2).toBeDefined();
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

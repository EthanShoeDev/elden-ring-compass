import { Effect, FileSystem, Path } from 'effect';

import {
  decodeRow,
  type ParamError,
  parseParam,
  type RowValue,
} from '../formats/param.ts';
import { loadParamdef, type ParamdefError } from '../formats/paramdef.ts';
import type { BossArea } from './bosses.ts';
import type { Grace } from './graces.ts';

/**
 * Play-regions — what the save's `unlocked_regions` list tracks. Each entry is a
 * `PlayRegionParam` rowId; the param splits cleanly into two kinds:
 *
 *   - **Placed regions** (`areaNo != 0`): a real spot in the world (`posX/Y/Z` set).
 *     These are the user-facing "regions" — emitted as `REGIONS`, named from the
 *     site of grace (`mapMenuUnlockEventId` → grace flag) and, when a region has no
 *     grace, from its boss arena (`bossAreaId` → `BossArea.defeatFlagId`, e.g. the
 *     Chapel of Anticipation → "Grafted Scion"). Both name sources are install-
 *     derived; no curated table is needed.
 *   - **Matchmaking regions** (`areaNo == 0`): multiplayer/invasion plumbing —
 *     no coords, no grace, no name, packed with sign/invasion limit flags. Each is a
 *     1:1 sibling of a placed region (e.g. `1000000` ↔ placed `1000001`). The game
 *     activates them as the player moves, so they DO appear in `unlocked_regions`,
 *     but they aren't places to show. We emit their ids as `MATCHMAKING_REGION_IDS`
 *     so the app can classify an unlocked id as placed / matchmaking / unknown
 *     rather than treating the matchmaking siblings as a coverage gap.
 *
 * Classification: only `isOpenWorld` is cleanly derivable (`areaNo` 60/61 = the
 * overworld map blocks); everything else is an interior area (`isDungeon`). We do
 * NOT derive an `isBoss` flag — `bossAreaId` is set for nearly every region (it's
 * "which boss arena this belongs to", not "this is a boss arena"), so naming a
 * region from its boss is only a *fallback* when no grace names it.
 */

export interface Region {
  readonly id: number; // PlayRegionParam rowId == save unlocked_regions entry
  readonly name: string; // site-of-grace name, or boss name as a fallback
  readonly area: string | null; // broad region label (e.g. "Limgrave"); null when boss-named
  readonly isOpenWorld: boolean;
  readonly isDungeon: boolean; // interior area (not the overworld)
}

export interface RegionData {
  readonly regions: readonly Region[];
  /** `areaNo == 0` rowIds — matchmaking siblings the app should ignore, not show. */
  readonly matchmakingRegionIds: readonly number[];
}

const num = (row: ReadonlyMap<string, RowValue>, key: string): number => {
  const v = row.get(key);
  return typeof v === 'number' ? v : 0;
};

export const loadRegions = (
  params: Map<string, Uint8Array>,
  graces: readonly Grace[],
  bosses: readonly BossArea[],
): Effect.Effect<
  RegionData,
  ParamError | ParamdefError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const bytes = params.get('PlayRegionParam');
    if (!bytes) {
      yield* Effect.logWarning('no PlayRegionParam; skipping regions');
      return { regions: [], matchmakingRegionIds: [] };
    }
    const param = yield* parseParam(bytes);
    const def = yield* loadParamdef('PlayRegionParam');
    const graceByFlag = new Map(graces.map((g) => [g.flagId, g]));
    const bossByFlag = new Map(bosses.map((b) => [b.defeatFlagId, b]));

    const out: Region[] = [];
    const matchmakingRegionIds: number[] = [];
    for (const r of param.rows) {
      const row = decodeRow(bytes, r.dataOffset, def, param.little);
      const areaNo = num(row, 'areaNo');
      if (areaNo === 0) {
        // Unplaced multiplayer/invasion sibling — track the id, don't emit a region.
        matchmakingRegionIds.push(r.id);
        continue;
      }
      const grace = graceByFlag.get(num(row, 'mapMenuUnlockEventId'));
      const boss = bossByFlag.get(num(row, 'bossAreaId'));
      // Prefer the site-of-grace name; fall back to the boss arena for placed
      // regions with no grace (e.g. the tutorial Chapel of Anticipation).
      const name = grace?.name ?? boss?.name ?? null;
      if (name === null) continue; // placed but unnameable from the install (rare)
      const isOpenWorld = areaNo === 60 || areaNo === 61;
      out.push({
        id: r.id,
        name,
        area: grace?.region ?? null,
        isOpenWorld,
        isDungeon: !isOpenWorld,
      });
    }
    return { regions: out, matchmakingRegionIds };
  });

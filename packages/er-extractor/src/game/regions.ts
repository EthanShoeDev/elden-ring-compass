import { Effect } from 'effect';

import {
  decodeRow,
  type ParamError,
  parseParam,
  type RowValue,
} from '../formats/param.ts';
import { loadParamdef, type ParamdefError } from '../formats/paramdef.ts';
import type { Grace } from './graces.ts';

/**
 * Discoverable play-regions — what the save's `unlocked_regions` list tracks.
 *
 * Fully install-derived: `PlayRegionParam` rows carry the region id (== the save's
 * `unlocked_regions` entry), its map `areaNo`, a `bossAreaId`, and a
 * `mapMenuUnlockEventId` — which is the **grace flag** for the region's site of
 * grace. We name each region from that grace (and reuse the grace's broad region
 * label), so no curated name table is needed (208/210 placed regions resolve).
 * Classification: only `isOpenWorld` is cleanly derivable (`areaNo` 60/61 = the
 * overworld map blocks); everything else is an interior area (`isDungeon`). We do
 * NOT derive an `isBoss` flag — `bossAreaId` is set for nearly every region (it's
 * "which boss arena this belongs to", not "this is a boss arena"), so it's not a
 * usable signal.
 */

export interface Region {
  readonly id: number; // PlayRegionParam rowId == save unlocked_regions entry
  readonly name: string; // site-of-grace name at this region
  readonly area: string | null; // broad region label (e.g. "Limgrave")
  readonly isOpenWorld: boolean;
  readonly isDungeon: boolean; // interior area (not the overworld)
}

const num = (row: ReadonlyMap<string, RowValue>, key: string): number => {
  const v = row.get(key);
  return typeof v === 'number' ? v : 0;
};

export const loadRegions = (
  params: Map<string, Uint8Array>,
  graces: readonly Grace[],
): Effect.Effect<Region[], ParamError | ParamdefError> =>
  Effect.gen(function* () {
    const bytes = params.get('PlayRegionParam');
    if (!bytes) {
      yield* Effect.logWarning('no PlayRegionParam; skipping regions');
      return [];
    }
    const param = yield* parseParam(bytes);
    const def = yield* loadParamdef('PlayRegionParam');
    const graceByFlag = new Map(graces.map((g) => [g.flagId, g]));

    const out: Region[] = [];
    for (const r of param.rows) {
      const row = decodeRow(bytes, r.dataOffset, def, param.little);
      const areaNo = num(row, 'areaNo');
      if (areaNo === 0) continue; // unplaced multiplayer/invasion regions
      const grace = graceByFlag.get(num(row, 'mapMenuUnlockEventId'));
      if (!grace) continue; // only emit regions we can name from a grace
      const isOpenWorld = areaNo === 60 || areaNo === 61;
      out.push({
        id: r.id,
        name: grace.name,
        area: grace.region,
        isOpenWorld,
        isDungeon: !isOpenWorld,
      });
    }
    return out;
  });

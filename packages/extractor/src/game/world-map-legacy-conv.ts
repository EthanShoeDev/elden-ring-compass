import { Data, Effect, FileSystem, Path } from 'effect';

import {
  decodeRow,
  type ParamError,
  parseParam,
  type RowValue,
} from '../formats/param.ts';
import { loadParamdef, type ParamdefError } from '../formats/paramdef.ts';

/**
 * Dungeon-local → overworld projection (`WorldMapLegacyConvParam`).
 *
 * Legacy dungeons (`m10`/`m11`/…) store their entities in a LOCAL coordinate frame
 * with its own origin, so their markers/placements can't go straight onto the
 * overworld tile-pyramid the way `m60`/`m61` overworld tiles can. The game ships
 * `WorldMapLegacyConvParam` precisely to bridge them: each row pairs a reference
 * point in a source map (`srcAreaNo/srcGridXNo/srcGridZNo` + `srcPos*`) with the
 * SAME physical point expressed in a destination overworld map (`dstAreaNo/…` +
 * `dstPos*`). There is **no rotation field** — `isBasePoint` marks the one canonical
 * connection point per source map — so the transform is a pure **translation**:
 *
 *     overworldWorld = dungeonLocal − srcPos + dstWorld
 *
 * where `dstWorld` is the destination reference point's ABSOLUTE overworld world
 * coordinate (`dstGrid*tile + tile/2 + dstPos`, the same `col*size + size/2 + local`
 * convention `map-affine.ts` uses for overworld tiles). We collapse that to a single
 * offset `add = dstWorld − srcPos` per base point, so the web only does
 * `overworldWorld = dungeonLocal + add` and then reuses the exact overworld affine.
 *
 * Most dungeons have ONE base point (a single translation). A few large/multi-zone
 * dungeons (Leyndell, Belurat, …) ship SEVERAL base points with DIFFERENT offsets —
 * a piecewise-constant approximation of a warped mapping. We keep each base point's
 * source-local `srcX/srcZ` so the web can pick the NEAREST one per marker; for the
 * common single-point case that's just the one offset.
 *
 * Emitted as `WORLD_MAP_LEGACY_CONV` (one row per base point) and applied in
 * `apps/web/src/lib/map-affine.ts`. See
 * `docs/projects/item-placement-coverage.md` (Phase 3) +
 * `docs/projects/tiled-map-image-viewer-interactive.md` (step 3 follow-up).
 */

export class LegacyConvError extends Data.TaggedError('LegacyConvError')<{
  readonly detail: string;
}> {}

/** Which tile-pyramid master a dungeon projects onto. */
export type MasterId = 'M00' | 'M10';

/**
 * One base point of a legacy dungeon's projection onto the overworld. Apply the
 * world-space translation to a dungeon LOCAL (x, z), then project as an overworld
 * point: `overworldWorldX = localX + addX`, `overworldWorldZ = localZ + addZ`.
 * `srcX/srcZ` is this base point's dungeon-local reference position — when a dungeon
 * has several base points, pick the one whose `srcX/srcZ` is nearest the marker.
 */
export interface LegacyConv {
  /** Source dungeon block id, suffix-stripped: `m10_00_00`. */
  readonly srcMapId: string;
  readonly master: MasterId;
  readonly srcX: number;
  readonly srcZ: number;
  readonly addX: number;
  readonly addZ: number;
}

const num = (row: ReadonlyMap<string, RowValue>, key: string): number => {
  const v = row.get(key);
  return typeof v === 'number' ? v : 0;
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Overworld destination tile edge (world-units) for the `dstGrid*No` coords. The
 * destination grid indexes the m60/m61 SMALL-tile grid (256 units) — the same grid
 * `map-affine.ts` projects overworld markers in, where the tile CENTER is local
 * (0,0,0). (Validated: with 256 the projected dungeon graces land in-bounds and in
 * their dungeon's expected overworld neighbourhood — see the Stormveil check.)
 */
const DST_TILE = 256;

export const loadLegacyConv = (
  params: Map<string, Uint8Array>,
): Effect.Effect<
  LegacyConv[],
  LegacyConvError | ParamError | ParamdefError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const bytes = params.get('WorldMapLegacyConvParam');
    if (!bytes) {
      return yield* new LegacyConvError({
        detail: 'WorldMapLegacyConvParam missing from regulation',
      });
    }
    const param = yield* parseParam(bytes);
    const def = yield* loadParamdef('WorldMapLegacyConvParam');

    const out: LegacyConv[] = [];
    const seen = new Set<string>(); // collapse exactly-duplicated base-point rows
    for (const r of param.rows) {
      const row = decodeRow(bytes, r.dataOffset, def, param.little);
      // Connection points flagged as the dungeon's base (≥1 per source dungeon).
      if (num(row, 'isBasePoint') !== 1) continue;
      const dstArea = num(row, 'dstAreaNo');
      // Destination must be an overworld master (Lands Between m60 → M00, DLC
      // Land of Shadow m61 → M10); anything else has no tile pyramid to land on.
      if (dstArea !== 60 && dstArea !== 61) continue;

      const srcX = num(row, 'srcPosX');
      const srcZ = num(row, 'srcPosZ');
      const dstWorldX =
        num(row, 'dstGridXNo') * DST_TILE + DST_TILE / 2 + num(row, 'dstPosX');
      const dstWorldZ =
        num(row, 'dstGridZNo') * DST_TILE + DST_TILE / 2 + num(row, 'dstPosZ');
      // 1 world-unit ≈ 1 master pixel, so sub-unit precision is meaningless for
      // pins — round to integers. This also collapses f32→f64 subtraction noise
      // (otherwise dup base points differ in the ~9th digit and escape the dedup).
      const conv: LegacyConv = {
        srcMapId: `m${pad2(num(row, 'srcAreaNo'))}_${pad2(num(row, 'srcGridXNo'))}_${pad2(num(row, 'srcGridZNo'))}`,
        master: dstArea === 60 ? 'M00' : 'M10',
        srcX: Math.round(srcX),
        srcZ: Math.round(srcZ),
        addX: Math.round(dstWorldX - srcX),
        addZ: Math.round(dstWorldZ - srcZ),
      };
      const key = `${conv.srcMapId}|${srcX}|${srcZ}|${conv.addX}|${conv.addZ}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(conv);
    }
    return out;
  });

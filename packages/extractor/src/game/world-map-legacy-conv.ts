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

/** Which tile-pyramid master a dungeon projects onto (surface M00/M10 or underground M01/M11). */
export type MasterId = 'M00' | 'M01' | 'M10' | 'M11';

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
 * Source areas that render on an UNDERGROUND world map instead of the surface. The
 * conv param only carries the coordinate transform (its `dstArea` is the surface,
 * 60/61); which *display* map an area uses is a structural game fact — the same kind
 * of thing as `m60`=overworld / `m61`=DLC — observed from the install via grace
 * regions. The underground masters share the surface's X/Z frame (same 10496²), so
 * the projection math is identical; only the master differs.
 *   - area 12 = the Eternal Cities / Rivers (Ainsel, Siofra, Nokron, Nokstella,
 *     Lake of Rot, Deeproot Depths) → Lands Between Underground (M01).
 * (DLC underground M11 is not mapped yet — no confirmed legacy-conv source block.)
 */
const UNDERGROUND_AREA: Record<number, MasterId> = { 12: 'M01' };

/**
 * Overworld destination tile edge (world-units) for the `dstGrid*No` coords. The
 * destination grid indexes the m60/m61 SMALL-tile grid (256 units) — the same grid
 * `map-affine.ts` projects overworld markers in, where the tile CENTER is local
 * (0,0,0). (Validated: with 256 the projected dungeon graces land in-bounds and in
 * their dungeon's expected overworld neighbourhood — see the Stormveil check.)
 */
const DST_TILE = 256;

/** A single base-point connection between a source map block and a destination block. */
interface Edge {
  readonly srcArea: number;
  readonly srcBlock: string;
  readonly srcX: number;
  readonly srcZ: number;
  readonly dstArea: number;
  readonly dstBlock: string;
  readonly dstX: number;
  readonly dstZ: number;
  readonly dstGridX: number;
  readonly dstGridZ: number;
}

const blockId = (area: number, gx: number, gz: number): string =>
  `m${pad2(area)}_${pad2(gx)}_${pad2(gz)}`;

/** Is this destination the overworld surface frame (Lands Between m60 / DLC m61)? */
const isSurface = (area: number): boolean => area === 60 || area === 61;

/** Absolute surface-world coords of a terminal edge's destination reference point. */
const dstSurfaceWorld = (e: Edge): { x: number; z: number } => ({
  x: e.dstGridX * DST_TILE + DST_TILE / 2 + e.dstX,
  z: e.dstGridZ * DST_TILE + DST_TILE / 2 + e.dstZ,
});

/**
 * Follow base-point edges from `start` until one lands on the overworld surface,
 * composing the pure-translation offsets along the way. Most dungeons reach the
 * surface in one hop; some only connect to ANOTHER dungeon that connects onward —
 * e.g. Deeproot Depths `m12_03 → m35 (Shunning-Grounds) → m11 (Leyndell) → m60`.
 * Returns the cumulative `add` (so `surfaceWorld = sourceLocal + add`) and the
 * terminal area (60/61), or `null` if no surface is reachable (dead end / cycle).
 * Depth-capped; prefers a terminal edge, else the first unvisited lateral hop.
 */
const resolveToSurface = (
  start: Edge,
  edgesByBlock: ReadonlyMap<string, readonly Edge[]>,
): { addX: number; addZ: number; area: number } | null => {
  if (isSurface(start.dstArea)) {
    const w = dstSurfaceWorld(start);
    return {
      addX: w.x - start.srcX,
      addZ: w.z - start.srcZ,
      area: start.dstArea,
    };
  }
  // Accumulated source-local → current-block-local translation.
  let tx = start.dstX - start.srcX;
  let tz = start.dstZ - start.srcZ;
  let block = start.dstBlock;
  const visited = new Set<string>([start.srcBlock, block]);
  for (let depth = 0; depth < 8; depth++) {
    const outs = edgesByBlock.get(block) ?? [];
    const term = outs.find((e) => isSurface(e.dstArea));
    if (term) {
      const w = dstSurfaceWorld(term);
      return {
        addX: tx - term.srcX + w.x,
        addZ: tz - term.srcZ + w.z,
        area: term.dstArea,
      };
    }
    const next = outs.find((e) => !visited.has(e.dstBlock));
    if (!next) return null;
    tx += next.dstX - next.srcX;
    tz += next.dstZ - next.srcZ;
    visited.add(next.dstBlock);
    block = next.dstBlock;
  }
  return null;
};

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

    // Collect every base-point connection edge, indexed by source block for the walk.
    const edges: Edge[] = [];
    for (const r of param.rows) {
      const row = decodeRow(bytes, r.dataOffset, def, param.little);
      if (num(row, 'isBasePoint') !== 1) continue; // base points only
      edges.push({
        srcArea: num(row, 'srcAreaNo'),
        srcBlock: blockId(
          num(row, 'srcAreaNo'),
          num(row, 'srcGridXNo'),
          num(row, 'srcGridZNo'),
        ),
        srcX: num(row, 'srcPosX'),
        srcZ: num(row, 'srcPosZ'),
        dstArea: num(row, 'dstAreaNo'),
        dstBlock: blockId(
          num(row, 'dstAreaNo'),
          num(row, 'dstGridXNo'),
          num(row, 'dstGridZNo'),
        ),
        dstX: num(row, 'dstPosX'),
        dstZ: num(row, 'dstPosZ'),
        dstGridX: num(row, 'dstGridXNo'),
        dstGridZ: num(row, 'dstGridZNo'),
      });
    }
    const edgesByBlock = new Map<string, Edge[]>();
    for (const e of edges) {
      const cur = edgesByBlock.get(e.srcBlock);
      if (cur) cur.push(e);
      else edgesByBlock.set(e.srcBlock, [e]);
    }

    // Resolve each base point to the surface (following chains), emitting one row per
    // base point. 1 world-unit ≈ 1 master pixel, so round to integers — that also
    // collapses f32→f64 subtraction noise (else dup base points differ in the ~9th
    // digit and escape the dedup).
    const out: LegacyConv[] = [];
    const seen = new Set<string>();
    for (const e0 of edges) {
      const r = resolveToSurface(e0, edgesByBlock);
      if (!r) continue;
      const conv: LegacyConv = {
        srcMapId: e0.srcBlock,
        master: UNDERGROUND_AREA[e0.srcArea] ?? (r.area === 60 ? 'M00' : 'M10'),
        srcX: Math.round(e0.srcX),
        srcZ: Math.round(e0.srcZ),
        addX: Math.round(r.addX),
        addZ: Math.round(r.addZ),
      };
      const key = `${conv.srcMapId}|${conv.srcX}|${conv.srcZ}|${conv.addX}|${conv.addZ}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(conv);
    }
    return out;
  });

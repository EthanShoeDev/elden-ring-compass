/**
 * Map projection — extracted MSB world coords → master pixel on the tile pyramid.
 * This is the SOLE marker projection; the old scraped-wiki affine is gone.
 *
 * Derivation + validation: `scripts/map-calibrate.ts` (run with `bun`). Summary:
 *
 * The native-zoom master is a 41×256 = 10496² north-up stitch of `MENU_MapTile`
 * L0 tiles. That menu grid IS the m60 small-tile grid: 256 px == 256 world-units,
 * related by an integer tile offset (menu_col = m60col − 33, menu_row = m60row − 25)
 * plus the north-up Y flip — proven by a 154/154 grace-on-existing-tile occupancy
 * match, all-in-bounds, correct N/S/E/W extremes, and isotropy with an independent
 * wiki-coord fit. So extracted overworld coords project EXACTLY (1 px = 1 world-unit,
 * no floating scale).
 *
 * Per the soulsmodding "Map Overview" reference, m60 is a SW-origin (col,row) grid;
 * small tiles `_00` = 256u, medium `_01` = 512u, big `_02` = 1024u; each tile's
 * CENTER is local (0,0,0); +col = east (+X), +row = north (+Z). The From horizontal
 * plane is (x, z) — `y` is elevation and is ignored for placement.
 *
 * Legacy dungeons (`m10`/`m12`/…) live in their own local frame; we project them
 * onto the overworld first via `WORLD_MAP_LEGACY_CONV` (extractor-derived from
 * `WorldMapLegacyConvParam` — a pure translation, no rotation), then reuse the exact
 * overworld affine. See `packages/extractor/src/game/world-map-legacy-conv.ts`.
 */
import { type LegacyConv, WORLD_MAP_LEGACY_CONV } from '@elden-ring-compass/data';

/** Native (z6) master edge in px: 41 tiles × 256. Pins live in this space; Leaflet unprojects at `maxNativeZoom`. */
export const MASTER_PX = 10496;

/**
 * Absolute world→master-pixel offsets: `px = worldX + OFFSET_X`, `py = OFFSET_Y − worldZ`.
 * Scale is exactly 1 px = 1 world-unit, and the offset is an exact INTEGER number of
 * 256px tiles (both grids are 256-aligned 1:1). It can't be derived from data alone —
 * the map art has large unknown ocean margins (occupancy/bbox ambiguous by ±8 tiles) and
 * the game's WorldMap* params use a different stylized image projection — so it's pinned
 * from ONE ground-truth Calibrate click, rounded to the nearest tile (so click error
 * <128px is irrelevant). TODO: move this into the extractor manifest (`worldToPixelAffine`).
 *
 * Anchor — Claymore @ Castle Morne (m60_43_31_00): world (11142.3, 8036.3) ⇒ clicked
 * master pixel (3978, 8596) ⇒ OFFSET_X = round((3978−11142.3)/256)·256 = −7168,
 * OFFSET_Y = round((8596+8036.3)/256)·256 = 16640.
 */
const OFFSET_X = -7168;
const OFFSET_Y = 16640;

/** Which tile-pyramid master a pin belongs to. */
export type MasterId = 'M00' | 'M10';

/** A pin resolved to a specific master + master pixel. */
export interface MasterPixel {
  master: MasterId;
  px: number;
  py: number;
}

/** Absolute overworld world coords → master pixel (the exact 1px = 1 world-unit affine). */
function worldToMasterPixel(master: MasterId, worldX: number, worldZ: number): MasterPixel {
  return { master, px: worldX + OFFSET_X, py: OFFSET_Y - worldZ };
}

/** Legacy-dungeon base points grouped by their block id (`m10_00_00`). */
const legacyConvByBlock: ReadonlyMap<string, readonly LegacyConv[]> = (() => {
  const m = new Map<string, LegacyConv[]>();
  for (const c of WORLD_MAP_LEGACY_CONV) {
    const cur = m.get(c.srcMapId);
    if (cur) cur.push(c);
    else m.set(c.srcMapId, [c]);
  }
  return m;
})();

/** A dungeon mapId (`m10_00_00_00`) → its conv block key (`m10_00_00`), or `null`. */
function dungeonBlock(mapId: string): string | null {
  const m = /^(m\d\d_\d\d_\d\d)_/.exec(mapId);
  return m?.[1] ?? null;
}

/**
 * Legacy-dungeon marker → master pixel, or `null` if the dungeon has no conv data.
 * The dungeon's LOCAL (x, z) is translated by the NEAREST base point's offset (most
 * dungeons have one; large multi-zone dungeons have several, approximating a warped
 * mapping piecewise), then projected as an overworld point.
 */
function dungeonMarkerToMasterPixel(mapId: string, x: number, z: number): MasterPixel | null {
  const block = dungeonBlock(mapId);
  if (block === null) return null;
  const points = legacyConvByBlock.get(block);
  if (!points || points.length === 0) return null;
  let best: LegacyConv | null = null;
  let bestDist = Infinity;
  for (const p of points) {
    const dx = x - p.srcX;
    const dz = z - p.srcZ;
    const d = dx * dx + dz * dz;
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  if (best === null) return null;
  return worldToMasterPixel(best.master, x + best.addX, z + best.addZ);
}

/**
 * Extracted marker → its master + master pixel, or `null` if `mapId` can't be
 * placed. `x`,`z` are the marker's MSB-local horizontal coords (`y`/elevation is
 * ignored).
 *
 * Overworld tiles (`m60_*` → M00 Lands Between, `m61_*` → M10 DLC Land of Shadow)
 * project EXACTLY via the same affine (verified — `scripts/map-calibrate.ts` finds
 * offset (−33,−25) for both). The tile suffix is two digits `LT`: `T` (last) is the
 * size-tier (0 small / 1 medium / 2 big), `L` (first) is an elevation layer that
 * shares the horizontal grid. Suffixes whose size-tier > 2 (skybox/cutscene LODs,
 * e.g. `_99`) are skipped.
 *
 * Legacy dungeons (`m10`/`m12`/…) are routed through `WORLD_MAP_LEGACY_CONV` first
 * (dungeon-local → overworld translation). Anything with no overworld tile and no
 * conv entry returns `null`.
 */
export function overworldMarkerToMasterPixel(
  mapId: string,
  x: number,
  z: number,
): MasterPixel | null {
  const m = /^m(60|61)_(\d+)_(\d+)_\d(\d)$/.exec(mapId);
  if (m) {
    const tier = Number(m[4]); // last digit of the 2-digit suffix = size-tier
    if (tier > 2) return null;
    const size = 256 * 2 ** tier;
    const worldX = Number(m[2]) * size + size / 2 + x;
    const worldZ = Number(m[3]) * size + size / 2 + z;
    return worldToMasterPixel(m[1] === '60' ? 'M00' : 'M10', worldX, worldZ);
  }
  return dungeonMarkerToMasterPixel(mapId, x, z);
}

/**
 * The save's current player position (`player_coords`: local [x, y(elevation), z];
 * `map_id`: 4 raw bytes) → master pixel, or `null` if the position can't be placed.
 * Works in overworld tiles and now also inside legacy dungeons (projected via
 * `WORLD_MAP_LEGACY_CONV`). The byte order of `map_id` is unknown, so both orders are
 * tried; only the one that forms a placeable id projects (the other returns null).
 */
export function playerToMasterPixel(
  mapId: ReadonlyArray<number>,
  coords: ReadonlyArray<number>,
): MasterPixel | null {
  if (mapId.length < 4 || coords.length < 3) return null;
  const [a, b, c, d] = mapId as [number, number, number, number];
  const [x, , z] = coords as readonly [number, number, number];
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    overworldMarkerToMasterPixel(`m${pad(a)}_${pad(b)}_${pad(c)}_${pad(d)}`, x, z) ??
    overworldMarkerToMasterPixel(`m${pad(d)}_${pad(c)}_${pad(b)}_${pad(a)}`, x, z)
  );
}

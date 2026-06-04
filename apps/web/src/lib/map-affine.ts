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
 */

/** Native (z6) master edge in px: 41 tiles × 256. Pins live in this space; Leaflet unprojects at `maxNativeZoom`. */
export const MASTER_PX = 10496;

/** Which tile-pyramid master a pin belongs to. */
export type MasterId = 'M00' | 'M10';

/** A pin resolved to a specific master + master pixel. */
export interface MasterPixel {
  master: MasterId;
  px: number;
  py: number;
}

/**
 * Extracted overworld marker → its master + master pixel, or `null` if `mapId`
 * is not an overworld tile we can place. `x`,`z` are the marker's MSB-local
 * horizontal coords (`y`/elevation is ignored).
 *
 * Both overworld worlds use the SAME projection (verified — `scripts/map-calibrate.ts`
 * finds offset (−33,−25) for both): the Lands Between (`m60_*` → M00) and the DLC
 * Land of Shadow (`m61_*` → M10). The tile suffix is two digits `LT`: `T` (last)
 * is the size-tier (0 small / 1 medium / 2 big), `L` (first) is an elevation layer
 * that shares the horizontal grid (so it doesn't affect placement). Suffixes whose
 * size-tier > 2 (skybox/cutscene LODs, e.g. `_99`) are skipped.
 *
 * NOT handled (returns `null`): legacy dungeons (`m10`/`m12`/…) — those need
 * `WorldMapLegacyConvParam` to convert dungeon-local coords to overworld first.
 */
export function overworldMarkerToMasterPixel(
  mapId: string,
  x: number,
  z: number,
): MasterPixel | null {
  const m = /^m(60|61)_(\d+)_(\d+)_\d(\d)$/.exec(mapId);
  if (!m) return null;
  const tier = Number(m[4]); // last digit of the 2-digit suffix = size-tier
  if (tier > 2) return null;
  const size = 256 * 2 ** tier;
  const worldX = Number(m[2]) * size + size / 2 + x;
  const worldZ = Number(m[3]) * size + size / 2 + z;
  return { master: m[1] === '60' ? 'M00' : 'M10', px: worldX - 8448, py: 16896 - worldZ };
}

/**
 * World → master-pixel affine for the overworld map (M00).
 *
 * Marker coordinates in `map-db.ts` are game-world (x, y) (originally scraped).
 * These constants are the hand-calibrated affine that placed them on erdb's
 * overworld JPEG. That JPEG was stitched by erdb from the *same* game map tiles
 * starting at tile (0,0); the affine was assumed to carry onto our 10496² L0
 * master, but the master size differs (10496² vs erdb 9728×9216), so this NEEDS
 * recalibration against the new tile pyramid (see the map-tile-fragments project).
 *
 * Anchor (for re-calibration): Isolated Divine Tower — world (x = -134.453125,
 * y = 156.395274) → master pixel ≈ (456.13, 364.37).
 *
 * TODO: fold these constants into the extractor manifest (`worldToPixelAffine`),
 * derived from MSB map calibration, once Phase 5 lands. For now they live here and
 * can be nudged via the map's calibration readout (see leaflet-map.tsx).
 */
export interface WorldAffine {
  /** px = y * dx + bx */
  dx: number;
  bx: number;
  /** py = -x * dy + by */
  dy: number;
  by: number;
}

export const M00_AFFINE: WorldAffine = {
  dx: (456.126816621 - -46.5) / 156.395274, // ≈ 3.21384
  bx: -46.5,
  dy: (364.36796875 - -65.5) / 134.453125, // ≈ 3.19714
  by: -65.5,
};

/** game-world (x, y) → master pixel [px, py]. */
export const worldToMasterPixel = (
  a: WorldAffine,
  x: number,
  y: number,
): [px: number, py: number] => [y * a.dx + a.bx, -x * a.dy + a.by];

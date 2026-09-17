/**
 * URL prefix the map-tile pyramid (+ `manifest.json` / `tile-index.json`) is served under:
 * `/map-tiles/{version}`. Injected at build time by the `erDataTiles()` Vite plugin
 * (`vite-plugins/er-data-tiles.ts`) as a content hash of the tile tree, so the whole prefix can
 * be cached `immutable` and still bust when the extractor regenerates tiles.
 */
export const MAP_TILES_BASE: string = __ER_MAP_TILES_BASE__;

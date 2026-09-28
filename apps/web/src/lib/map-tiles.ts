import { Effect, Schema } from 'effect';
import { HttpClient, HttpClientResponse } from 'effect/http';
import { Atom } from 'effect/reactivity';

import { appRuntime } from '@/lib/atoms/runtime';

/**
 * URL prefix the map-tile pyramid (+ `manifest.json` / `tile-index.json`) is served under:
 * `/map-tiles/{version}`. Injected at build time by the `erDataTiles()` Vite plugin
 * (`vite-plugins/er-data-tiles.ts`) as a content hash of the tile tree, so the whole prefix can
 * be cached `immutable` and still bust when the extractor regenerates tiles.
 */
export const MAP_TILES_BASE: string = __ER_MAP_TILES_BASE__;

const MapLayer = Schema.Struct({
  id: Schema.String,
  base: Schema.Boolean,
  tileCount: Schema.Number,
});
const MapEntry = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  worldToPixelAffine: Schema.Null,
  layers: Schema.Array(MapLayer),
});

/** `manifest.json`: tile geometry + the list of maps (masters) and their layers. */
export const MapManifest = Schema.Struct({
  tileSize: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
  maxNativeZoom: Schema.Number,
  format: Schema.String,
  tileUrlTemplate: Schema.String,
  maps: Schema.Array(MapEntry),
});
export type MapManifest = typeof MapManifest.Type;

/**
 * Existence index from `tile-index.json` (derived from the on-disk pyramid by the
 * `er-data-tiles` Vite plugin): `{ [mapId]: { [zoom]: [x0, y0, x1, y1, …] } }`.
 * The extractor drops blank tiles, so this lets us skip requesting them.
 */
export const TileIndex = Schema.Record(
  Schema.String,
  Schema.Record(Schema.String, Schema.Array(Schema.Number)),
);
export type TileIndex = typeof TileIndex.Type;

const getJson = <S extends Schema.Top>(path: string, schema: S) =>
  HttpClient.get(`${MAP_TILES_BASE}/${path}`).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)),
  );

// Both files sit under the content-hashed, immutable MAP_TILES_BASE, so they are fetched once
// per page load (keepAlive) and never on the server (the relative URL only resolves in the
// browser; SSR renders the loading state).

/** The tile manifest; the map cannot render without it. */
export const mapManifestAtom = appRuntime
  .atom(getJson('manifest.json', MapManifest))
  .pipe(Atom.keepAlive, Atom.withServerValueInitial);

/**
 * The tile existence index. Best-effort: if it fails the map still works (it just
 * falls back to requesting every tile, blank ones included).
 */
export const mapTileIndexAtom = appRuntime
  .atom(getJson('tile-index.json', TileIndex))
  .pipe(Atom.keepAlive, Atom.withServerValueInitial);

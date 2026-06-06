/**
 * Client-only react-leaflet map over the extractor-generated tile pyramid.
 *
 * This module imports `leaflet` (which touches `window` at import) and the
 * leaflet CSS, so it must only ever be loaded via a dynamic `import()` on the
 * client — see `map-section.tsx`, which lazy-loads it behind a mounted guard.
 *
 * Geometry: tiles are a power-of-2 `{z}/{y}/{x}` pyramid (google layout) over a
 * `width×height` master. We use `CRS.Simple` and inline the tiny
 * leaflet-rastercoords projection — pixel↔latlng via `unproject(px, nativeZoom)`,
 * where `nativeZoom = ceil(log2(maxDim/tileSize))` (== manifest.maxNativeZoom).
 *
 * Markers are precomputed master-pixel pins (`MapPin`) — extracted overworld
 * coords (graces / field bosses) or the corrected wiki fallback — unprojected at
 * native zoom. See `map-affine.ts` for the projection and its derivation.
 */
import 'leaflet/dist/leaflet.css';

import {
  CRS,
  divIcon,
  GridLayer,
  type LatLngBounds,
  latLngBounds,
  TileLayer as LeafletTileLayer,
} from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';

/** A map pin already resolved to a specific master (`M00`/`M10`) + master pixel. */
export interface MapPin {
  name: string;
  category: string;
  description: string;
  master: string;
  px: number;
  py: number;
}

export interface MapLayer {
  id: string;
  base: boolean;
  tileCount: number;
}
export interface MapEntry {
  id: string;
  name: string;
  worldToPixelAffine: null;
  layers: MapLayer[];
}
export interface MapManifest {
  tileSize: number;
  width: number;
  height: number;
  maxNativeZoom: number;
  format: string;
  tileUrlTemplate: string;
  maps: MapEntry[];
}

/**
 * Existence index from `tile-index.json` (derived from the on-disk pyramid by the
 * `er-data-tiles` Vite plugin): `{ [mapId]: { [zoom]: [x0, y0, x1, y1, …] } }`.
 * The extractor drops blank tiles, so this lets us skip requesting them.
 */
export type TileIndex = Record<string, Record<string, number[]>>;

const BASE_LAYER = 'base';

/** Pack a tile coord into one int key (x, y < 2^16 — far above any zoom's grid). */
const tileKey = (x: number, y: number) => (x << 16) | y;

/**
 * A `TileLayer` that won't even request tiles the extractor never wrote (the blank
 * corners dropped by `skipBlanks`). Leaflet's `_isValidTile` is the gate it calls
 * before creating each tile — we AND the default bounds check with an existence
 * lookup, so missing tiles produce neither a request nor a 404. Implemented
 * imperatively (not via react-leaflet's `<TileLayer>`) because the gate is a
 * subclass override, not an option.
 */
function ExistenceTileLayer({
  url,
  tileSize,
  maxNativeZoom,
  bounds,
  exists,
}: {
  url: string;
  tileSize: number;
  maxNativeZoom: number;
  bounds: LatLngBounds;
  exists: (z: number, x: number, y: number) => boolean;
}) {
  const map = useMap();
  useEffect(() => {
    // `.extend()` loses TileLayer's `(url, options)` constructor signature in
    // @types/leaflet, so re-assert it.
    const ExistenceTL = LeafletTileLayer.extend({
      _isValidTile(coords: { x: number; y: number; z: number }) {
        // Our tile pyramids are SPARSE — the extractor's `skipBlanks` drops
        // fully-transparent tiles and most maps don't span the whole grid — so by
        // default Leaflet would request every tile within the layer bounds and get
        // a flood of 404s for the ones that were never written. We override
        // `_isValidTile` to additionally consult the on-disk manifest (`exists`),
        // so Leaflet simply never requests a tile that isn't there.
        // `GridLayer._isValidTile` applies the `bounds`/`noWrap` envelope; we add existence.
        // @types/leaflet doesn't expose GridLayer.prototype._isValidTile; reach
        // the private envelope check through a typed view of the prototype.
        // oxlint-disable-next-line unknown-cast/forbidden -- see comment above
        const gridProto = GridLayer.prototype as unknown as {
          _isValidTile(c: { x: number; y: number; z: number }): boolean;
        };
        const inEnvelope = gridProto._isValidTile.call(this, coords);
        return inEnvelope && exists(coords.z, coords.x, coords.y);
      },
      // oxlint-disable-next-line unknown-cast/forbidden -- extend() loses TileLayer's (url, options) ctor signature in @types/leaflet (see comment above)
    }) as unknown as typeof LeafletTileLayer;
    const layer = new ExistenceTL(url, {
      tileSize,
      minNativeZoom: 0,
      maxNativeZoom,
      noWrap: true,
      bounds,
    });
    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, url, tileSize, maxNativeZoom, bounds, exists]);
  return null;
}

// Marker colour by pin category — graces gold, bosses red, item pickups cyan
// (mirrors the design kit's PIN_COLOR). Pins are otherwise identical teardrops;
// the colour is what distinguishes them at a glance. See the legend in
// `map-section.tsx`.
const PIN_COLOR = {
  grace: '#ecbd4a',
  boss: '#e24a4a',
  item: '#3cbfdb',
  default: '#a89a87',
} as const;

export function categoryColor(category: string): string {
  const c = category.toLowerCase();
  if (c.includes('grace')) return PIN_COLOR.grace;
  if (c.includes('boss')) return PIN_COLOR.boss;
  if (c.includes('treasure') || c.includes('drop')) return PIN_COLOR.item;
  return PIN_COLOR.default;
}

// One divIcon per colour, cached and shared across markers.
const pinIconCache = new Map<string, ReturnType<typeof divIcon>>();
function pinIcon(category: string) {
  const color = categoryColor(category);
  const cached = pinIconCache.get(color);
  if (cached) return cached;
  const html =
    `<svg width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="#fff" ` +
    `stroke-width="1.5" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.55))">` +
    `<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>` +
    `<circle cx="12" cy="10" r="2.6" fill="#fff" stroke="none"/></svg>`;
  const ic = divIcon({
    className: '',
    html,
    iconSize: [24, 24],
    iconAnchor: [12, 22],
    popupAnchor: [0, -20],
  });
  pinIconCache.set(color, ic);
  return ic;
}

/** Distinct "you are here" marker — a pulsing amber dot, centered on its point. */
const playerIcon = divIcon({
  className: '',
  html:
    '<div style="width:18px;height:18px;border-radius:50%;background:#f59e0b;' +
    'border:3px solid #fff;box-shadow:0 0 0 2px #f59e0b,0 0 8px 2px rgba(245,158,11,.8)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

/** Pins — already in master-pixel space; unproject at native zoom → latlng. */
function MarkerLayer({ pins, zoom }: { pins: MapPin[]; zoom: number }) {
  const map = useMap();
  return (
    <>
      {pins.map((pin, i) => (
        <Marker
          key={i}
          position={map.unproject([pin.px, pin.py], zoom)}
          icon={pinIcon(pin.category)}
        >
          <Popup>
            <div className='select-text'>
              <strong>{pin.name}</strong>
              {pin.category && <p>{pin.category}</p>}
              {pin.description && (
                <p
                  className='prose max-w-sm dark:prose-invert'
                  dangerouslySetInnerHTML={{ __html: pin.description }}
                />
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

/** Click-to-read master-pixel readout, for verifying / recalibrating the projection. */
function CalibrationReadout({ zoom }: { zoom: number }) {
  const [pt, setPt] = useState<[number, number] | null>(null);
  useMapEvents({
    click(e) {
      const p = e.target.project(e.latlng, zoom);
      const xy: [number, number] = [Math.round(p.x), Math.round(p.y)];
      setPt(xy);
      console.log(`[map] clicked master pixel: x=${xy[0]} y=${xy[1]}`);
    },
  });
  return (
    <div className='leaflet-bottom leaflet-left'>
      <div className='leaflet-control rounded bg-black/70 px-2 py-1 font-mono text-xs text-white'>
        px: {pt ? `${pt[0]}, ${pt[1]}` : '— click to read —'}
      </div>
    </div>
  );
}

function MapBody({
  manifest,
  activeMapId,
  pins,
  playerPin,
  calibrate,
  tileIndex,
}: {
  manifest: MapManifest;
  activeMapId: string;
  pins: MapPin[];
  playerPin?: MapPin | null;
  calibrate: boolean;
  tileIndex?: TileIndex;
}) {
  const map = useMap();
  const z = manifest.maxNativeZoom;

  // Existence lookup for the active map. No index (not loaded / fetch failed) →
  // allow every tile, i.e. fall back to the previous request-and-maybe-404 behavior.
  const exists = useMemo(() => {
    const perZoom = tileIndex?.[activeMapId];
    if (!perZoom) return () => true;
    const sets = new Map<number, Set<number>>();
    for (const [zoom, pairs] of Object.entries(perZoom)) {
      const set = new Set<number>();
      for (let i = 0; i + 1 < pairs.length; i += 2) {
        const x = pairs[i];
        const y = pairs[i + 1];
        if (x !== undefined && y !== undefined) set.add(tileKey(x, y));
      }
      sets.set(Number(zoom), set);
    }
    return (tz: number, tx: number, ty: number) => sets.get(tz)?.has(tileKey(tx, ty)) ?? false;
  }, [tileIndex, activeMapId]);

  // rastercoords getMaxBounds(): SW = unproject([0,h]), NE = unproject([w,0]).
  const bounds = useMemo(
    () =>
      latLngBounds(map.unproject([0, manifest.height], z), map.unproject([manifest.width, 0], z)),
    [map, manifest.height, manifest.width, z],
  );

  const [didInit, setDidInit] = useState(false);
  useEffect(() => {
    map.setMaxBounds(bounds);
    if (!didInit) {
      map.fitBounds(bounds);
      setDidInit(true);
    }
  }, [map, bounds, didInit]);

  return (
    <>
      <ExistenceTileLayer
        key={activeMapId}
        url={`/map-tiles/${activeMapId}/${BASE_LAYER}/{z}/{y}/{x}.webp`}
        tileSize={manifest.tileSize}
        maxNativeZoom={z}
        bounds={bounds}
        exists={exists}
      />
      <MarkerLayer pins={pins.filter((p) => p.master === activeMapId)} zoom={z} />
      {playerPin && playerPin.master === activeMapId && (
        <Marker position={map.unproject([playerPin.px, playerPin.py], z)} icon={playerIcon}>
          <Popup>
            <div className='select-text'>
              <strong>{playerPin.name}</strong>
              {playerPin.description && <p>{playerPin.description}</p>}
            </div>
          </Popup>
        </Marker>
      )}
      {calibrate && <CalibrationReadout zoom={z} />}
    </>
  );
}

export default function LeafletMap({
  manifest,
  activeMapId,
  pins,
  playerPin,
  calibrate = false,
  tileIndex,
}: {
  manifest: MapManifest;
  activeMapId: string;
  pins: MapPin[];
  playerPin?: MapPin | null;
  calibrate?: boolean;
  tileIndex?: TileIndex;
}) {
  return (
    <MapContainer
      crs={CRS.Simple}
      minZoom={0}
      maxZoom={manifest.maxNativeZoom + 2}
      center={[0, 0]}
      zoom={2}
      attributionControl={false}
      style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
    >
      <MapBody
        manifest={manifest}
        activeMapId={activeMapId}
        pins={pins}
        playerPin={playerPin}
        calibrate={calibrate}
        tileIndex={tileIndex}
      />
    </MapContainer>
  );
}

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

import { CRS, icon, latLngBounds } from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';

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

const BASE_LAYER = 'base';

const markerIcon = icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/** Pins — already in master-pixel space; unproject at native zoom → latlng. */
function MarkerLayer({ pins, zoom }: { pins: MapPin[]; zoom: number }) {
  const map = useMap();
  return (
    <>
      {pins.map((pin, i) => (
        <Marker key={i} position={map.unproject([pin.px, pin.py], zoom)} icon={markerIcon}>
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
      // eslint-disable-next-line no-console
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
  calibrate,
}: {
  manifest: MapManifest;
  activeMapId: string;
  pins: MapPin[];
  calibrate: boolean;
}) {
  const map = useMap();
  const z = manifest.maxNativeZoom;

  // rastercoords getMaxBounds(): SW = unproject([0,h]), NE = unproject([w,0]).
  const bounds = useMemo(
    () =>
      latLngBounds(
        map.unproject([0, manifest.height], z),
        map.unproject([manifest.width, 0], z),
      ),
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
      <TileLayer
        key={activeMapId}
        url={`/map-tiles/${activeMapId}/${BASE_LAYER}/{z}/{y}/{x}.webp`}
        tileSize={manifest.tileSize}
        minNativeZoom={0}
        maxNativeZoom={z}
        noWrap
        bounds={bounds}
      />
      <MarkerLayer pins={pins.filter((p) => p.master === activeMapId)} zoom={z} />
      {calibrate && <CalibrationReadout zoom={z} />}
    </>
  );
}

export default function LeafletMap({
  manifest,
  activeMapId,
  pins,
  calibrate = false,
}: {
  manifest: MapManifest;
  activeMapId: string;
  pins: MapPin[];
  calibrate?: boolean;
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
        calibrate={calibrate}
      />
    </MapContainer>
  );
}

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
 */
import 'leaflet/dist/leaflet.css';

import { CRS, latLngBounds } from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { LayersControl, MapContainer, TileLayer, useMap } from 'react-leaflet';

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

const BASE_LAYER = '00000000';

/** Tile layers + bounds/view, mounted inside the map so `useMap()` is available. */
function MapLayers({ manifest }: { manifest: MapManifest }) {
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
    <LayersControl position='topright'>
      {manifest.maps.map((m, i) => (
        <LayersControl.BaseLayer key={m.id} name={m.name} checked={i === 0}>
          <TileLayer
            url={`/map-tiles/${m.id}/${BASE_LAYER}/{z}/{y}/{x}.webp`}
            tileSize={manifest.tileSize}
            minNativeZoom={0}
            maxNativeZoom={z}
            noWrap
            bounds={bounds}
          />
        </LayersControl.BaseLayer>
      ))}
    </LayersControl>
  );
}

export default function LeafletMap({ manifest }: { manifest: MapManifest }) {
  return (
    <MapContainer
      crs={CRS.Simple}
      minZoom={0}
      maxZoom={manifest.maxNativeZoom + 2}
      center={[0, 0]}
      zoom={2}
      style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
    >
      <MapLayers manifest={manifest} />
    </MapContainer>
  );
}

/**
 * Map section — the SSR boundary for the tiled, interactive map.
 *
 * TanStack Start renders server-side, but Leaflet touches `window` at import. So
 * the real map (`leaflet-map.tsx`) is loaded only on the client: a mounted guard
 * gates a `React.lazy` dynamic import, so the leaflet module never executes during
 * SSR. The manifest (tile geometry + map list) is fetched from `/map-tiles/`.
 *
 * NOTE: markers (graces / bosses / items) are not wired yet — they need the
 * world→pixel affine calibrated (manifest `worldToPixelAffine` is currently null).
 * This component currently renders the base-map pyramid with zoom/pan + a base
 * layer switcher (overworld / underground / DLC). Supersedes `interactive-map.tsx`.
 */
import { lazy, Suspense, useEffect, useState } from 'react';

import type { MapManifest } from './leaflet-map';

const LeafletMap = lazy(() => import('./leaflet-map'));

function MapFallback({ message }: { message: string }) {
  return (
    <div className='flex h-full w-full items-center justify-center bg-[#0a0a0a] text-sm text-muted-foreground'>
      {message}
    </div>
  );
}

export function MapSection() {
  const [mounted, setMounted] = useState(false);
  const [manifest, setManifest] = useState<MapManifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    fetch('/map-tiles/manifest.json')
      .then((r) => {
        if (!r.ok) throw new Error(`manifest ${r.status}`);
        return r.json() as Promise<MapManifest>;
      })
      .then((m) => {
        if (!cancelled) setManifest(m);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [mounted]);

  return (
    <div className='flex flex-col gap-2 p-4 sm:px-8 md:px-24 lg:px-32'>
      <div
        className='relative w-full overflow-hidden rounded-lg border border-muted'
        style={{ height: 720 }}
      >
        {error ? (
          <MapFallback message={`Failed to load map: ${error}`} />
        ) : mounted && manifest ? (
          <Suspense fallback={<MapFallback message='Loading map…' />}>
            <LeafletMap manifest={manifest} />
          </Suspense>
        ) : (
          <MapFallback message='Loading map…' />
        )}
      </div>
    </div>
  );
}

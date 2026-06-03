/**
 * Map section — the SSR boundary for the tiled, interactive map.
 *
 * TanStack Start renders server-side, but Leaflet touches `window` at import. So
 * the real map (`leaflet-map.tsx`) is loaded only on the client: a mounted guard
 * gates a `React.lazy` dynamic import, so the leaflet module never executes during
 * SSR. The manifest (tile geometry + map list) is fetched from `/map-tiles/`.
 *
 * This component owns the non-map UI (map switcher, grace/boss selection buttons,
 * calibration toggle) and computes the selected markers from the shared data-table
 * selection (effect-atom) — same wiring as the old `interactive-map.tsx`. Supersedes it.
 */
import { InfoIcon } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';

import { useDataTableData } from '@/lib/data-table-data';
import { ERDB, useAllErdb } from '@/lib/erdb';
import type { MapItem } from '@/lib/map-db';

import { useRowSelectionControls, useTableStateMap } from '../data-table/data-table-store';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import type { MapManifest } from './leaflet-map';

const LeafletMap = lazy(() => import('./leaflet-map'));

function MapFallback({ message }: { message: string }) {
  return (
    <div className='flex h-full w-full items-center justify-center bg-[#0a0a0a] text-sm text-muted-foreground'>
      {message}
    </div>
  );
}

/** Selected markers across events/regions/inventory tables (effect-atom selection). */
function useSelectedMapItems(): MapItem[] {
  const tableState = useTableStateMap();
  const eventsItems = useDataTableData('events');
  const regionItems = useDataTableData('regions');
  const allErdb = useAllErdb();

  return useMemo(
    () =>
      Object.entries(tableState).flatMap(([tableId, sel]) =>
        Object.entries(sel?.rowSelection ?? {})
          .filter(([, v]) => v)
          .flatMap(([id]) => {
            if (tableId === 'events')
              return eventsItems.find((e) => e.id.toString() === id)?.map_data ?? [];
            if (tableId === 'regions')
              return regionItems.find((r) => r.id.toString() === id)?.map_data ?? [];
            return (
              allErdb[tableId as keyof typeof ERDB].items.find((e) => e.id.toString() === id)
                ?.map_data ?? []
            );
          }),
      ),
    [tableState, eventsItems, regionItems, allErdb],
  );
}

export function MapSection() {
  const [mounted, setMounted] = useState(false);
  const [manifest, setManifest] = useState<MapManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeMapId, setActiveMapId] = useState('M00');
  const [calibrate, setCalibrate] = useState(false);

  const items = useSelectedMapItems();
  const eventsItems = useDataTableData('events');
  const { setRowSelection, clearAllRowSelection: clearPins } = useRowSelectionControls();

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

  /** Select all events of `type` matching `on`, that have map data. */
  const selectEvents = (type: 'grace' | 'boss', on: boolean) => {
    const matches = eventsItems.filter((e) => e.type === type && e.on === on && e.map_data);
    setRowSelection('events')(
      matches.reduce<Record<string, boolean>>((acc, e) => {
        acc[e.id.toString()] = true;
        return acc;
      }, {}),
    );
  };

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
            <LeafletMap
              manifest={manifest}
              activeMapId={activeMapId}
              items={items}
              calibrate={calibrate}
            />
          </Suspense>
        ) : (
          <MapFallback message='Loading map…' />
        )}
      </div>

      {/* Map switcher */}
      {manifest && (
        <div className='flex flex-wrap gap-2'>
          {manifest.maps.map((m) => (
            <Button
              key={m.id}
              variant={m.id === activeMapId ? 'default' : 'secondary'}
              size='sm'
              onClick={() => setActiveMapId(m.id)}
            >
              {m.name}
            </Button>
          ))}
          <Button
            variant={calibrate ? 'default' : 'outline'}
            size='sm'
            onClick={() => setCalibrate((c) => !c)}
            title='Toggle click-to-read pixel readout (affine calibration)'
          >
            Calibrate
          </Button>
        </div>
      )}

      {/* Marker selection (overworld). Mirrors the old map's buttons. */}
      <div className='flex flex-wrap gap-2'>
        <Button variant='secondary' onClick={() => selectEvents('grace', true)}>
          Discovered Graces
        </Button>
        <Button variant='secondary' onClick={() => selectEvents('grace', false)}>
          Undiscovered Graces
        </Button>
        <Button variant='secondary' onClick={() => selectEvents('boss', true)}>
          Completed Bosses
        </Button>
        <Button variant='secondary' onClick={() => selectEvents('boss', false)}>
          Incomplete Bosses
        </Button>
        <Button variant='ghost' onClick={clearPins}>
          Clear Pins
        </Button>
        <Tooltip>
          <TooltipTrigger>
            <InfoIcon />
          </TooltipTrigger>
          <TooltipContent>
            <p>Not all bosses or graces have map data.</p>
            <p>Markers show on the overworld (Lands Between) map.</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

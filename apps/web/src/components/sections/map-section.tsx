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
 * selection (effect-atom).
 */
import { InfoIcon } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';

import { useDataTableData } from '@/lib/data-table-data';
import {
  type InventoryTableType,
  TABLE_PLACEMENT_TYPE,
  useInventoryTables,
} from '@/lib/inventory-catalog';
import { playerToMasterPixel } from '@/lib/map-affine';
import { itemPins } from '@/lib/vm/map-pins';
import { useSelectedSlot } from '@/stores/slot-selection-store';

import { useRowSelectionControls, useTableStateMap } from '../data-table/data-table-store';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import type { MapManifest, MapPin, TileIndex } from './leaflet-map';

const LeafletMap = lazy(() => import('./leaflet-map'));

/**
 * Maps hidden from the switcher. `M11` (DLC / Land of Shadow underground) is cut
 * content: the Realm of Shadow has no in-game underground map — its few
 * underground graces show on the normal map — so these tiles are unimplemented
 * assets. We still extract them (for a possible future "cut content" tab) but
 * don't surface them on the main map.
 */
const HIDDEN_MAP_IDS = new Set(['M11']);

function MapFallback({ message }: { message: string }) {
  return (
    <div className='flex h-full w-full items-center justify-center bg-[#0a0a0a] text-sm text-muted-foreground'>
      {message}
    </div>
  );
}

/** Selected markers across the events/inventory tables → extracted overworld pins. */
function useSelectedPins(): MapPin[] {
  const tableState = useTableStateMap();
  const eventsItems = useDataTableData('events');
  const allTables = useInventoryTables();

  return useMemo(
    () =>
      Object.entries(tableState).flatMap(([tableId, sel]) =>
        Object.entries(sel?.rowSelection ?? {})
          .filter(([, v]) => v)
          .flatMap(([id]): MapPin[] => {
            if (tableId === 'events') {
              const e = eventsItems.find((ev) => ev.id.toString() === id);
              if (!e?.pixel) return [];
              return [
                {
                  name: e.name,
                  category: e.type === 'grace' ? 'Site of Grace' : 'Boss',
                  description: e.subtitle ?? '',
                  master: e.pixel.master,
                  px: e.pixel.px,
                  py: e.pixel.py,
                },
              ];
            }
            // Inventory item → its extracted overworld pickup locations.
            if (tableId === 'regions' || tableId === 'weapons') return [];
            const type = TABLE_PLACEMENT_TYPE[tableId as InventoryTableType];
            const row = allTables[tableId as InventoryTableType].items.find(
              (e) => e.id.toString() === id,
            );
            if (!row) return [];
            return itemPins(type, row.id).map((p) => ({
              name: row.name,
              category: p.source === 'map' ? 'Treasure' : p.approx ? 'Drop · approx. area' : 'Drop',
              description:
                p.chance < 1 ? `${(p.chance * 100).toFixed(0)}% drop` : '',
              master: p.master,
              px: p.px,
              py: p.py,
            }));
          }),
      ),
    [tableState, eventsItems, allTables],
  );
}

/** "You are here" pin from the active save's player position (overworld only). */
function usePlayerPin(): MapPin | null {
  const slot = useSelectedSlot();
  return useMemo(() => {
    if (!slot) return null;
    const { player_coords, map_id } = slot.player_coords;
    const px = playerToMasterPixel(map_id, player_coords);
    if (!px) return null; // in a dungeon / not overworld
    return {
      name: slot.player_game_data.character_name || 'Current location',
      category: '',
      description: 'Your current position',
      master: px.master,
      px: px.px,
      py: px.py,
    };
  }, [slot]);
}

export function MapSection() {
  const [mounted, setMounted] = useState(false);
  const [manifest, setManifest] = useState<MapManifest | null>(null);
  const [tileIndex, setTileIndex] = useState<TileIndex | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [activeMapId, setActiveMapId] = useState('M00');
  const [calibrate, setCalibrate] = useState(false);

  const pins = useSelectedPins();
  const playerPin = usePlayerPin();
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
    // Existence index — best-effort: if it fails the map still works (it just
    // falls back to requesting every tile, blank ones included).
    fetch('/map-tiles/tile-index.json')
      .then((r) => (r.ok ? (r.json() as Promise<TileIndex>) : null))
      .then((idx) => {
        if (!cancelled && idx) setTileIndex(idx);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mounted]);

  /** Select all events of `type` matching `on`, that have a placeable position. */
  const selectEvents = (type: 'grace' | 'boss', on: boolean) => {
    const matches = eventsItems.filter((e) => e.type === type && e.on === on && e.pixel);
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
        className='relative isolate w-full overflow-hidden rounded-lg border border-muted'
        style={{ height: 720 }}
      >
        {error ? (
          <MapFallback message={`Failed to load map: ${error}`} />
        ) : mounted && manifest ? (
          <Suspense fallback={<MapFallback message='Loading map…' />}>
            <LeafletMap
              manifest={manifest}
              activeMapId={activeMapId}
              pins={pins}
              playerPin={playerPin}
              calibrate={calibrate}
              tileIndex={tileIndex}
            />
          </Suspense>
        ) : (
          <MapFallback message='Loading map…' />
        )}
      </div>

      {/* Map switcher */}
      {manifest && (
        <div className='flex flex-wrap gap-2'>
          {manifest.maps
            .filter((m) => !HIDDEN_MAP_IDS.has(m.id))
            .map((m) => (
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

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
import { LocateFixedIcon, MapPinIcon, PackageIcon, SkullIcon, Trash2Icon } from 'lucide-react';
import { MapPinGlyph } from '@/components/icons/map-pin-glyph';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';

import { useDataTableData } from '@/lib/data-table-data';
import { cn } from '@/lib/utils';
import { wikiNameForItem } from '@/lib/wiki';
import {
  type InventoryTableType,
  TABLE_PLACEMENT_TYPE,
  useInventoryTables,
} from '@/lib/inventory-catalog';
import { BADGE_LABEL, bossBadges, bossMapName, bossReward } from '@/lib/boss-meta';
import { playerToMasterPixel } from '@/lib/map-affine';
import { bossMapIdByFlag, bossPinByFlag, itemPins } from '@/lib/vm/map-pins';
import { useSelectedSlot } from '@/stores/slot-selection-store';

import { useRowSelectionControls, useTableStateMap } from '../data-table/data-table-store';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
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

/** The three toggleable content layers a pin can belong to. */
type LayerKey = 'graces' | 'bosses' | 'items';
function pinLayer(category: string): LayerKey {
  const c = category.toLowerCase();
  if (c.includes('grace')) return 'graces';
  if (c.includes('boss')) return 'bosses';
  return 'items';
}

const LAYER_META = [
  { key: 'graces', label: 'Graces', icon: MapPinIcon, color: '#ecbd4a' },
  { key: 'bosses', label: 'Bosses', icon: SkullIcon, color: '#e24a4a' },
  { key: 'items', label: 'Items', icon: PackageIcon, color: '#3cbfdb' },
] as const;

/** A labeled cluster of controls under the map (e.g. "Map", "Layers"). */
function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='flex items-center gap-2'>
      <span className='shrink-0 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'>
        {label}
      </span>
      {children}
    </div>
  );
}

function MapFallback({ message }: { message: string }) {
  return (
    <div className='flex h-full w-full items-center justify-center bg-[#0a0a0a] text-sm text-muted-foreground'>
      {message}
    </div>
  );
}

/** Selected markers across the events/inventory tables → extracted overworld pins. */
/**
 * Shared boss-pin enrichment from boss-meta — reward / map-area / badges / status.
 * `defeated` is `undefined` when we don't know the save state (status omitted then).
 */
function bossEnrichment(flag: number, mapId: string | undefined, defeated: boolean | undefined) {
  const reward = bossReward(flag);
  return {
    area: mapId ? bossMapName(mapId) : undefined,
    badges: mapId ? bossBadges(flag, mapId).map((b) => BADGE_LABEL[b]) : undefined,
    reward: reward ? { name: reward.name, iconUrl: reward.iconUrl } : undefined,
    status: defeated === undefined ? undefined : defeated ? 'Defeated' : 'Remaining',
  };
}

function useSelectedPins(): MapPin[] {
  const tableState = useTableStateMap();
  const eventsItems = useDataTableData('events');
  const allTables = useInventoryTables();

  return useMemo(() => {
    // Defeat state by flag, so bosses-table pins (which only know the flag) get the
    // same Defeated/Remaining status the events table already computed from the save.
    const defeatedByFlag = new Map(eventsItems.map((e) => [e.id, e.on]));

    return Object.entries(tableState).flatMap(([tableId, sel]) =>
      Object.entries(sel?.rowSelection ?? {})
        .filter(([, v]) => v)
        .flatMap(([id]): MapPin[] => {
          if (tableId === 'events') {
            const e = eventsItems.find((ev) => ev.id.toString() === id);
            if (!e?.pixel) return [];
            const base = { master: e.pixel.master, px: e.pixel.px, py: e.pixel.py };
            if (e.type === 'grace') {
              return [
                {
                  kind: 'grace',
                  name: e.name,
                  category: 'Site of Grace',
                  description: '',
                  discovered: e.on, // found → brighter shade
                  area: e.subtitle ?? undefined,
                  status: e.on ? 'Discovered' : 'Undiscovered',
                  ...base,
                },
              ];
            }
            return [
              {
                kind: 'boss',
                name: e.name,
                category: 'Boss',
                description: '',
                discovered: e.on, // defeated → brighter shade
                ...bossEnrichment(e.id, bossMapIdByFlag.get(e.id), e.on),
                ...base,
              },
            ];
          }
          if (tableId === 'bosses') {
            const pin = bossPinByFlag.get(Number(id));
            if (!pin) return [];
            const defeated = defeatedByFlag.get(pin.flag);
            return [
              {
                kind: 'boss',
                name: pin.name,
                category: 'Boss',
                description: '',
                discovered: defeated,
                ...bossEnrichment(pin.flag, pin.mapId, defeated),
                master: pin.master,
                px: pin.px,
                py: pin.py,
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
          const locations = itemPins(type, row.id);
          const owned = row.quantity > 0;
          return locations.map((p) => ({
            kind: 'item',
            name: row.name,
            wikiName: wikiNameForItem(row) ?? undefined,
            category: p.source === 'map' ? 'Treasure' : p.approx ? 'Drop · approx. area' : 'Drop',
            description: '',
            discovered: owned, // owned → brighter "collected" shade
            sourceLabel:
              p.source === 'map' ? 'Treasure' : p.approx ? 'Drop · approx. area' : 'Drop',
            chancePct: p.chance < 1 ? Math.round(p.chance * 100) : undefined,
            quantity: row.quantity,
            locationCount: locations.length,
            status: owned ? 'Collected' : 'Not collected',
            master: p.master,
            px: p.px,
            py: p.py,
          }));
        }),
    );
  }, [tableState, eventsItems, allTables]);
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
      kind: 'player',
      name: slot.player_game_data.character_name || 'Current location',
      category: '',
      description: 'Your current position',
      status: 'You are here',
      master: px.master,
      px: px.px,
      py: px.py,
    };
  }, [slot]);
}

/**
 * "Lost runes" bloodstain pin from the active save's last-death record
 * (`blood_stain`). The save stores the death `coords` + `map_id` and a `runes`
 * count:
 *   - `runes > 0`  → an ACTIVE bloodstain: that many runes are on the ground.
 *   - `runes <= 0` → no runes pending (`-1` is the game's "cleared" sentinel,
 *     `0` an empty stain). When the retained coords still project to the map we
 *     show a faded "recovered" marker so the last-death spot is still visible;
 *     `leaflet-map.tsx` picks the active vs. recovered icon from `runes`.
 * Returns `null` only when the death location can't be placed (interior with no
 * conv data) — same limitation as the player pin.
 */
function useBloodstainPin(): MapPin | null {
  const slot = useSelectedSlot();
  return useMemo(() => {
    if (!slot) return null;
    const { coords, map_id, runes } = slot.blood_stain;
    const px = playerToMasterPixel(map_id, coords);
    if (!px) return null; // interior we can't place on the world map
    const active = runes > 0;
    const runeText = active ? `${runes.toLocaleString()} runes` : null;
    return {
      kind: 'bloodstain',
      name: active ? 'Lost runes' : 'Last death',
      category: '',
      // status drives the hover tooltip; description the popup sentence.
      status: active ? `${runeText} on the ground` : 'Last death · runes recovered',
      description: active
        ? `${runeText} waiting to be recovered`
        : 'Runes here have already been recovered',
      master: px.master,
      px: px.px,
      py: px.py,
      runes,
    };
  }, [slot]);
}

export function MapSection({ embedded = false }: { embedded?: boolean } = {}) {
  const [mounted, setMounted] = useState(false);
  const [manifest, setManifest] = useState<MapManifest | null>(null);
  const [tileIndex, setTileIndex] = useState<TileIndex | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [activeMapId, setActiveMapId] = useState('M00');
  // Layer visibility — hide (but don't clear) graces/bosses/items on the map.
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    graces: true,
    bosses: true,
    items: true,
  });
  // Bumped to ask the map to recenter on the player ("center on me").
  const [recenterToken, setRecenterToken] = useState(0);

  const pins = useSelectedPins();
  const playerPin = usePlayerPin();
  const bloodstainPin = useBloodstainPin();
  const slotConnected = !!useSelectedSlot();
  const visiblePins = useMemo(
    () => pins.filter((p) => layers[pinLayer(p.category)]),
    [pins, layers],
  );
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
    <div
      className={
        embedded ? 'flex flex-col gap-3' : 'flex flex-col gap-2 p-4 sm:px-8 md:px-24 lg:px-32'
      }
    >
      <div
        className='relative isolate w-full overflow-hidden rounded-lg border border-muted'
        style={{ height: embedded ? 'min(72vh, 720px)' : 720 }}
      >
        {error ? (
          <MapFallback message={`Failed to load map: ${error}`} />
        ) : mounted && manifest ? (
          <Suspense fallback={<MapFallback message='Loading map…' />}>
            <LeafletMap
              manifest={manifest}
              activeMapId={activeMapId}
              pins={visiblePins}
              playerPin={playerPin}
              bloodstainPin={bloodstainPin}
              tileIndex={tileIndex}
              recenterToken={recenterToken}
            />
          </Suspense>
        ) : (
          <MapFallback message='Loading map…' />
        )}
      </div>

      {/* Controls under the map — labeled groups so each cluster reads as what
          it is: a segmented map switcher, toggleable layers, and quick-select
          presets. Kept below the map so they never cover it. */}
      {manifest && (
        <div className='flex flex-col gap-3 pt-1'>
          {/* Map switcher (segmented control) + view actions */}
          <div className='flex flex-wrap items-center gap-x-5 gap-y-2'>
            <ControlGroup label='Map'>
              <ToggleGroup
                spacing={0}
                className='rounded-lg border border-border bg-muted/50 p-0.5'
                value={[activeMapId]}
                onValueChange={(v) => {
                  // ToggleGroup is multi-select by default; take the last toggled
                  // value to get single-select (and ignore deselect-to-empty).
                  const next = v[v.length - 1];
                  if (next) setActiveMapId(next);
                }}
              >
                {manifest.maps
                  .filter((m) => !HIDDEN_MAP_IDS.has(m.id))
                  .map((m) => (
                    <ToggleGroupItem
                      key={m.id}
                      value={m.id}
                      size='sm'
                      className='rounded-md px-3 text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm'
                    >
                      {m.name}
                    </ToggleGroupItem>
                  ))}
              </ToggleGroup>
            </ControlGroup>

            <Button
              variant='outline'
              size='sm'
              disabled={!playerPin}
              onClick={() => {
                if (!playerPin) return;
                if (playerPin.master !== activeMapId) setActiveMapId(playerPin.master);
                setRecenterToken((t) => t + 1);
              }}
              title={
                !slotConnected
                  ? 'Connect a save to center on your character'
                  : playerPin
                    ? 'Center the map on your character'
                    : 'Your character is in an interior (dungeon/cave) we can’t place on the world map yet'
              }
            >
              <LocateFixedIcon /> Center on me
            </Button>
          </div>

          {/* Layer visibility — hide (but keep) graces / bosses / items. Switches
              read unambiguously as on/off toggles. */}
          <ControlGroup label='Layers'>
            <div className='flex flex-wrap items-center gap-x-4 gap-y-1.5'>
              {LAYER_META.map(({ key, label, icon: Icon, color }) => (
                <label
                  key={key}
                  className='flex cursor-pointer items-center gap-2 text-sm select-none'
                >
                  <Switch
                    checked={layers[key]}
                    onCheckedChange={(checked) => {
                      setLayers((l) => ({ ...l, [key]: checked }));
                    }}
                  />
                  <Icon style={{ color }} className={cn('size-4', !layers[key] && 'opacity-40')} />
                  {label}
                </label>
              ))}
            </div>
          </ControlGroup>

          {/* Quick-select presets — these select sets of pins (actions, not toggles). */}
          <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
            <ControlGroup label='Quick select'>
              <div className='flex flex-wrap gap-2'>
                <Button variant='outline' size='sm' onClick={() => selectEvents('grace', true)}>
                  <MapPinIcon className='text-amber-400' /> Discovered Graces
                </Button>
                <Button variant='outline' size='sm' onClick={() => selectEvents('grace', false)}>
                  <MapPinIcon /> Undiscovered Graces
                </Button>
                <Button variant='outline' size='sm' onClick={() => selectEvents('boss', true)}>
                  <SkullIcon /> Completed Bosses
                </Button>
                <Button variant='outline' size='sm' onClick={() => selectEvents('boss', false)}>
                  <SkullIcon /> Incomplete Bosses
                </Button>
              </div>
            </ControlGroup>
            <Button variant='ghost' size='sm' className='text-muted-foreground' onClick={clearPins}>
              <Trash2Icon /> Clear Pins
            </Button>
          </div>
        </div>
      )}

      {/* Legend — colored pins matching the map markers. Graces/bosses use a
          brighter "discovered" shade and a muted "undiscovered" one. */}
      <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground'>
        <span className='flex items-center gap-1'>
          <MapPinGlyph className='size-3.5' style={{ color: '#ecbd4a' }} filled />
          <MapPinGlyph className='size-3.5' style={{ color: '#8c7a3e' }} filled /> Graces (found /
          undiscovered)
        </span>
        <span className='flex items-center gap-1'>
          <MapPinGlyph className='size-3.5' style={{ color: '#e24a4a' }} filled />
          <MapPinGlyph className='size-3.5' style={{ color: '#8a4040' }} filled /> Bosses (defeated
          / remaining)
        </span>
        <span className='flex items-center gap-1'>
          <MapPinGlyph className='size-3.5' style={{ color: '#3cbfdb' }} filled />
          <MapPinGlyph className='size-3.5' style={{ color: '#356e7a' }} filled /> Items (collected
          / not collected)
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='size-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/40' /> You are
          here
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='size-2.5 rotate-45 bg-yellow-400 shadow-[0_0_5px_1px_rgba(250,204,21,.7)]' />
          <span className='size-2.5 rotate-45 border border-yellow-400/70' /> Lost runes (active /
          recovered)
        </span>
      </div>
    </div>
  );
}

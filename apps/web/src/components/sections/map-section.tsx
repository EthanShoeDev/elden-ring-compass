import { useAtomValue } from '@effect/atom-react';
import { useHydrated } from '@tanstack/react-router';
import {
  Array as Arr,
  Option,
  Order,
  Record as Rec,
  String as Str,
} from 'effect';
import * as AsyncResult from 'effect/reactivity/AsyncResult';
/**
 * Map section — the SSR boundary for the tiled, interactive map.
 *
 * TanStack Start renders server-side, but Leaflet touches `window` at import. So
 * the real map (`leaflet-map.tsx`) is loaded only on the client: a mounted guard
 * gates a `React.lazy` dynamic import, so the leaflet module never executes during
 * SSR. The manifest (tile geometry + map list) comes from `mapManifestAtom` (lib/map-tiles.ts).
 *
 * This component owns the non-map UI — the floating control overlays (map
 * switcher, layer toggles, quick-select presets, locate button, legend) — and
 * computes the selected markers from the shared data-table selection
 * (effect-atom). The overlays are absolutely-positioned SIBLINGS of the Leaflet
 * container, not children, so their pointer/wheel events never reach Leaflet's
 * drag/zoom handlers.
 */
import {
  ChevronDownIcon,
  LayersIcon,
  LocateFixedIcon,
  MapPinIcon,
  PackageIcon,
  PackageSearchIcon,
  SkullIcon,
  Trash2Icon,
} from 'lucide-react';
import { lazy, Suspense, useMemo, useState } from 'react';

import { MapPinGlyph } from '@/components/icons/map-pin-glyph';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  BADGE_LABEL,
  bossBadges,
  bossMapName,
  bossReward,
} from '@/lib/boss-meta';
import { type DlcScope, inDlcScope } from '@/lib/dlc';
import { useDlcScope } from '@/lib/dlc-scope';
import {
  type InventoryTableType,
  TABLE_PLACEMENT_TYPE,
  useInventoryTables,
} from '@/lib/inventory-catalog';
import { playerToMasterPixel, REALM_LABEL } from '@/lib/map-affine';
import { mapManifestAtom, mapTileIndexAtom } from '@/lib/map-tiles';
import { cn } from '@/lib/utils';
import { eventsDbView } from '@/lib/vm/events';
import { bossMapIdByFlag, bossPinByFlag, itemPins } from '@/lib/vm/map-pins';
import { wikiNameForItem } from '@/lib/wiki';
import { useSelectedSlot } from '@/stores/slot-selection-store';

import {
  useRowSelectionControls,
  useTableStateMap,
} from '../data-table/data-table-store';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import type { MapPin } from './leaflet-map';
import { PanelLabel } from './map-overlay-chrome';
import { OVERLAY_BUTTON, OVERLAY_PANEL } from './map-overlay-styles';
import { NearbyItemsPanel } from './nearby-items-panel';

// dynamic-import -- Leaflet touches `window` at import time, so the map is code-split and loaded client-only.
const LeafletMap = lazy(() => import('./leaflet-map'));

/**
 * Maps hidden from the switcher. `M11` (DLC / Land of Shadow underground) is cut
 * content: the Realm of Shadow has no in-game underground map — its few
 * underground graces show on the normal map — so these tiles are unimplemented
 * assets. We still extract them (for a possible future "cut content" tab) but
 * don't surface them on the main map.
 */
const HIDDEN_MAP_IDS = new Set(['M11']);

/**
 * Compact labels for the floating map switcher — the manifest names
 * ("Lands Between (Overworld)", …) are too wide for an on-map control,
 * especially on phones. Unknown ids fall back to the manifest name.
 */
const SHORT_MAP_NAME: Record<string, string> = REALM_LABEL;

/** The three toggleable content layers a pin can belong to. */
type LayerKey = 'graces' | 'bosses' | 'items';
function pinLayer(category: string): LayerKey {
  const c = Str.toLowerCase(category);
  if (Str.includes('grace')(c)) return 'graces';
  if (Str.includes('boss')(c)) return 'bosses';
  return 'items';
}

const LAYER_META = [
  { key: 'graces', label: 'Graces', icon: MapPinIcon, color: '#ecbd4a' },
  { key: 'bosses', label: 'Bosses', icon: SkullIcon, color: '#e24a4a' },
  { key: 'items', label: 'Items', icon: PackageIcon, color: '#3cbfdb' },
] as const;

/**
 * Top-right floating rail: a button row toggling the two right-side panels —
 * "Nearby items" (closed by default; opt-in glance tool) and the map controls
 * (layer visibility, quick-select presets, clear-pins). `defaultControlsOpen`
 * is read once at mount — the rail only mounts after the manifest loads
 * (client-side), by which point `useIsMobile` has settled, so desktop starts
 * with controls open / phones start collapsed without a flash.
 */
function MapRightRail({
  defaultControlsOpen,
  layers,
  onLayerChange,
  onQuickSelect,
  onClearPins,
  pinCount,
  playerPin,
  slotConnected,
}: {
  defaultControlsOpen: boolean;
  layers: Record<LayerKey, boolean>;
  onLayerChange: (key: LayerKey, visible: boolean) => void;
  onQuickSelect: (type: 'grace' | 'boss', on: boolean) => void;
  onClearPins: () => void;
  pinCount: number;
  playerPin: MapPin | null;
  slotConnected: boolean;
}) {
  const [controlsOpen, setControlsOpen] = useState(defaultControlsOpen);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  return (
    // Full-height column so the panels can scroll instead of spilling past the
    // map on short viewports; pointer-events pass through everywhere but the
    // actual buttons/panels.
    <div className='pointer-events-none absolute inset-y-3 right-3 z-[1000] flex flex-col items-end gap-2'>
      <div className='flex gap-2'>
        <Button
          variant='outline'
          size='icon'
          aria-label={nearbyOpen ? 'Hide nearby items' : 'Show nearby items'}
          aria-expanded={nearbyOpen}
          title='Nearby items'
          className={cn('pointer-events-auto', OVERLAY_BUTTON)}
          onClick={() => setNearbyOpen((o) => !o)}
        >
          <PackageSearchIcon />
        </Button>
        <Button
          variant='outline'
          size='icon'
          aria-label={controlsOpen ? 'Hide map controls' : 'Show map controls'}
          aria-expanded={controlsOpen}
          title='Map controls'
          className={cn('pointer-events-auto', OVERLAY_BUTTON)}
          onClick={() => setControlsOpen((o) => !o)}
        >
          <LayersIcon />
        </Button>
      </div>
      {nearbyOpen && (
        <NearbyItemsPanel playerPin={playerPin} slotConnected={slotConnected} />
      )}
      {controlsOpen && (
        <div
          className={cn(
            OVERLAY_PANEL,
            'pointer-events-auto flex min-h-0 w-60 flex-col gap-3 overflow-y-auto p-3',
          )}
        >
          <div>
            <PanelLabel>Layers</PanelLabel>
            <div className='flex flex-col gap-1.5'>
              {Arr.map(LAYER_META, ({ key, label, icon: Icon, color }) => (
                <label
                  key={key}
                  className='flex cursor-pointer items-center gap-2 text-sm select-none'
                >
                  <Icon
                    style={{ color }}
                    className={cn('size-4', !layers[key] && 'opacity-40')}
                  />
                  {label}
                  <Switch
                    className='ml-auto'
                    checked={layers[key]}
                    onCheckedChange={(checked) => onLayerChange(key, checked)}
                  />
                </label>
              ))}
            </div>
          </div>
          <div className='border-t border-border pt-2.5'>
            <PanelLabel>Quick select</PanelLabel>
            <div className='flex flex-col gap-0.5'>
              <Button
                variant='ghost'
                size='sm'
                className='w-full justify-start font-normal'
                onClick={() => onQuickSelect('grace', true)}
              >
                <MapPinIcon className='text-amber-400' /> Discovered Graces
              </Button>
              <Button
                variant='ghost'
                size='sm'
                className='w-full justify-start font-normal'
                onClick={() => onQuickSelect('grace', false)}
              >
                <MapPinIcon /> Undiscovered Graces
              </Button>
              <Button
                variant='ghost'
                size='sm'
                className='w-full justify-start font-normal'
                onClick={() => onQuickSelect('boss', true)}
              >
                <SkullIcon /> Completed Bosses
              </Button>
              <Button
                variant='ghost'
                size='sm'
                className='w-full justify-start font-normal'
                onClick={() => onQuickSelect('boss', false)}
              >
                <SkullIcon /> Incomplete Bosses
              </Button>
            </div>
          </div>
          <div className='border-t border-border pt-2'>
            <Button
              variant='ghost'
              size='sm'
              className='w-full justify-start font-normal text-muted-foreground'
              disabled={pinCount === 0}
              onClick={onClearPins}
            >
              <Trash2Icon /> Clear pins{pinCount > 0 ? ` (${pinCount})` : ''}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Bottom-left floating legend — colored pins matching the map markers, with a
 * brighter "discovered" and a muted "undiscovered" shade per category.
 * Collapses to a small "Legend" pill (the mobile default).
 */
function MapLegendOverlay({ defaultOpen }: { defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!open) {
    return (
      <div className='absolute bottom-3 left-3 z-[1000]'>
        <Button
          variant='outline'
          size='sm'
          className={OVERLAY_BUTTON}
          onClick={() => setOpen(true)}
        >
          <MapPinGlyph className='size-3.5 text-amber-400' filled /> Legend
        </Button>
      </div>
    );
  }
  return (
    <div
      className={cn(
        OVERLAY_PANEL,
        'absolute bottom-3 left-3 z-[1000] p-3 text-[11.5px] text-muted-foreground',
      )}
    >
      <button
        type='button'
        aria-label='Collapse legend'
        className='mb-1.5 flex w-full cursor-pointer items-center justify-between gap-6'
        onClick={() => setOpen(false)}
      >
        <span className='text-[11px] font-semibold tracking-wide uppercase'>
          Legend
        </span>
        <ChevronDownIcon className='size-3.5' />
      </button>
      <div className='flex flex-col gap-1'>
        <span className='flex items-center gap-1'>
          <MapPinGlyph
            className='size-3.5'
            style={{ color: '#ecbd4a' }}
            filled
          />
          <MapPinGlyph
            className='size-3.5'
            style={{ color: '#8c7a3e' }}
            filled
          />{' '}
          Graces (found / undiscovered)
        </span>
        <span className='flex items-center gap-1'>
          <MapPinGlyph
            className='size-3.5'
            style={{ color: '#e24a4a' }}
            filled
          />
          <MapPinGlyph
            className='size-3.5'
            style={{ color: '#8a4040' }}
            filled
          />{' '}
          Bosses (defeated / remaining)
        </span>
        <span className='flex items-center gap-1'>
          <MapPinGlyph
            className='size-3.5'
            style={{ color: '#3cbfdb' }}
            filled
          />
          <MapPinGlyph
            className='size-3.5'
            style={{ color: '#356e7a' }}
            filled
          />{' '}
          Items (collected / not collected)
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='size-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/40' />{' '}
          You are here
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='size-2.5 rotate-45 bg-yellow-400 shadow-[0_0_5px_1px_rgba(250,204,21,.7)]' />
          <span className='size-2.5 rotate-45 border border-yellow-400/70' />{' '}
          Lost runes (active / recovered)
        </span>
      </div>
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
function bossEnrichment(
  flag: number,
  mapId: string | undefined,
  defeated: boolean | undefined,
) {
  const reward = bossReward(flag);
  return {
    area: mapId !== undefined && mapId !== '' ? bossMapName(mapId) : undefined,
    badges:
      mapId !== undefined && mapId !== ''
        ? Arr.map(bossBadges(flag, mapId), (b) => BADGE_LABEL[b])
        : undefined,
    reward: reward ? { name: reward.name, iconUrl: reward.iconUrl } : undefined,
    status:
      defeated === undefined ? undefined : defeated ? 'Defeated' : 'Remaining',
  };
}

const DLC_REALMS: ReadonlySet<string> = new Set(['M10', 'M11']);
/** `id` if its realm is inside `scope`, else that scope's main realm. */
const realmInScope = (id: string, scope: DlcScope): string => {
  const isDlc = DLC_REALMS.has(id);
  if (scope === 'base' && isDlc) return 'M00';
  if (scope === 'dlc' && !isDlc) return 'M10';
  return id;
};

/** Graces + bosses within the global content scope (the data tables list every row). */
function useScopedEvents() {
  const slot = useSelectedSlot();
  const { scope } = useDlcScope();
  return useMemo(() => eventsDbView(slot, scope), [slot, scope]);
}

function useSelectedPins(): MapPin[] {
  const tableState = useTableStateMap();
  const eventsItems = useScopedEvents();
  const allTables = useInventoryTables();
  const { scope } = useDlcScope();

  return useMemo(() => {
    // Defeat state by flag, so bosses-table pins (which only know the flag) get the
    // same Defeated/Remaining status the events table already computed from the save.
    const defeatedByFlag = new Map(Arr.map(eventsItems, (e) => [e.id, e.on]));

    return Arr.flatMap(Rec.toEntries(tableState), ([tableId, sel]) => {
      const selected = Arr.filter(
        Rec.toEntries(sel?.rowSelection ?? {}),
        ([, v]) => v,
      );
      return Arr.flatMap(selected, ([id]): MapPin[] => {
        if (tableId === 'events') {
          const e = Option.getOrUndefined(
            Arr.findFirst(eventsItems, (ev) => ev.id.toString() === id),
          );
          if (!e?.pixel) return [];
          const base = {
            master: e.pixel.master,
            px: e.pixel.px,
            py: e.pixel.py,
          };
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
          if (!pin || !inDlcScope(scope, pin.isDlc)) return [];
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
        const row = Option.getOrUndefined(
          Arr.findFirst(
            allTables[tableId as InventoryTableType].items,
            (e) => e.id.toString() === id,
          ),
        );
        if (!row) return [];
        const locations = itemPins(type, row.id);
        const owned = row.quantity > 0;
        return Arr.map(locations, (p) => ({
          kind: 'item',
          name: row.name,
          wikiName: wikiNameForItem(row) ?? undefined,
          category:
            p.source === 'map'
              ? 'Treasure'
              : p.approx
                ? 'Drop · approx. area'
                : 'Drop',
          description: '',
          discovered: owned, // owned → brighter "collected" shade
          sourceLabel:
            p.source === 'map'
              ? 'Treasure'
              : p.approx
                ? 'Drop · approx. area'
                : 'Drop',
          chancePct: p.chance < 1 ? Math.round(p.chance * 100) : undefined,
          quantity: row.quantity,
          locationCount: locations.length,
          status: owned ? 'Collected' : 'Not collected',
          master: p.master,
          px: p.px,
          py: p.py,
        }));
      });
    });
  }, [tableState, eventsItems, allTables, scope]);
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
      status: active
        ? `${runeText} on the ground`
        : 'Last death · runes recovered',
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

const byPinCountDesc = Order.flip(
  Order.mapInput(Order.Number, ([, count]: readonly [string, number]) => count),
);

export function MapSection({ embedded = false }: { embedded?: boolean } = {}) {
  const mounted = useHydrated();
  const manifestResult = useAtomValue(mapManifestAtom);
  const manifest = manifestResult.pipe(AsyncResult.value, Option.getOrNull);
  const error = manifestResult.pipe(
    AsyncResult.error,
    Option.map((e) => e.message),
    Option.getOrNull,
  );
  // Best-effort (see mapTileIndexAtom): on failure every tile is requested.
  const tileIndexResult = useAtomValue(mapTileIndexAtom);
  const tileIndex = tileIndexResult.pipe(
    AsyncResult.value,
    Option.getOrUndefined,
  );
  // The realm tabs follow the base game / DLC scope like the tables do: a realm
  // the scope hides isn't shown (Base → the Lands Between, DLC → the Land of
  // Shadow), and picking one widens the scope for this character instead.
  const { scope, adjustScope } = useDlcScope();
  const [pickedMapId, setPickedMapId] = useState('M00');
  const activeMapId = realmInScope(pickedMapId, scope);
  const setActiveMapId = (id: string) => {
    if (realmInScope(id, scope) !== id) adjustScope('all');
    setPickedMapId(id);
  };
  // Layer visibility — hide (but don't clear) graces/bosses/items on the map.
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    graces: true,
    bosses: true,
    items: true,
  });
  // Bumped to ask the map to recenter on the player ("center on me").
  const [recenterToken, setRecenterToken] = useState(0);

  // Settled well before the manifest fetch resolves (the atom only fetches on the client),
  // so the overlays' mount-time `defaultOpen` is reliable.
  const isMobile = useIsMobile();

  const pins = useSelectedPins();
  const playerPin = usePlayerPin();
  const bloodstainPin = useBloodstainPin();
  const slotConnected = !!useSelectedSlot();
  // Pins on a realm the scope hides (a base-game item's Land of Shadow drop
  // under Base) aren't shown or counted, so no "switch" chip offers a jump
  // that would widen the scope for the whole app.
  const visiblePins = useMemo(
    () =>
      Arr.filter(
        pins,
        (p) =>
          layers[pinLayer(p.category)] &&
          realmInScope(p.master, scope) === p.master,
      ),
    [pins, layers, scope],
  );
  // Selected-pin counts per realm, surfaced as badges on the map switcher so a
  // pin dropped on a non-active map is never a silent no-op. Counts what would
  // actually RENDER (layer-hidden pins excluded); the player/bloodstain markers
  // aren't counted — they always exist and "Center on me" handles that jump.
  const pinCountByMaster = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of visiblePins)
      counts.set(p.master, (counts.get(p.master) ?? 0) + 1);
    return counts;
  }, [visiblePins]);
  // The acute case: the selection has pins, but NONE on the active map — show a
  // one-click "switch" chip per realm that has them (most pins first).
  const offRealmPins = useMemo(
    () =>
      (pinCountByMaster.get(activeMapId) ?? 0) > 0
        ? []
        : Arr.sort(pinCountByMaster.entries(), byPinCountDesc),
    [pinCountByMaster, activeMapId],
  );
  const eventsItems = useScopedEvents();
  const { setRowSelection, clearAllRowSelection: clearPins } =
    useRowSelectionControls();

  /**
   * Add all events of `type` matching `on` (that have a placeable position) to the
   * current pin selection. Additive, not replacing — clicking "Undiscovered Graces"
   * then "Incomplete Bosses" leaves both pinned; use "Clear pins" to reset.
   */
  const selectEvents = (type: 'grace' | 'boss', on: boolean) => {
    const matches = Arr.filter(
      eventsItems,
      (e) => e.type === type && e.on === on && e.pixel !== undefined,
    );
    setRowSelection('events')((prev) => {
      const next = { ...prev };
      for (const e of matches) next[e.id.toString()] = true;
      return next;
    });
  };

  return (
    <div className={embedded ? undefined : 'p-4 sm:px-8 md:px-24 lg:px-32'}>
      <div
        className='relative isolate w-full overflow-hidden rounded-lg border border-muted'
        // Taller than the old layout — the controls float on the map now, so the
        // height they used to occupy below it goes to the map itself.
        style={{ height: embedded ? 'min(78vh, 860px)' : 720 }}
      >
        {error !== null && error !== '' ? (
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

        {/* Floating chrome — all controls overlay the map instead of stacking
            under it. They are siblings of the Leaflet container, so Leaflet
            never sees their pointer/wheel events; z-[1000] is Leaflet's own
            control tier (above tile panes and pin popups). */}
        {manifest && (
          <>
            {/* Map switcher — top-left, offset to clear Leaflet's zoom control;
                wraps inside the panel on narrow screens. Each segment badges how
                many selected pins live on that realm (amber = pins you can't see
                from the active map), and when the active map has NONE of them a
                "switch" chip offers the one-click jump. */}
            <div className='absolute top-3 left-14 z-[1000] flex max-w-[calc(100%-7.5rem)] flex-col items-start gap-2'>
              <ToggleGroup
                spacing={0}
                className={cn(OVERLAY_PANEL, 'flex-wrap p-0.5')}
                value={[activeMapId]}
                onValueChange={(v) => {
                  // ToggleGroup is multi-select by default; take the last toggled
                  // value to get single-select (and ignore deselect-to-empty).
                  const next = v.at(-1);
                  if (next !== undefined) setActiveMapId(next);
                }}
              >
                {Arr.map(
                  Arr.filter(manifest.maps, (m) => !HIDDEN_MAP_IDS.has(m.id)),
                  (m) => {
                    const count = pinCountByMaster.get(m.id) ?? 0;
                    return (
                      <ToggleGroupItem
                        key={m.id}
                        value={m.id}
                        size='sm'
                        className='rounded-md px-2.5 text-xs text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm'
                      >
                        {SHORT_MAP_NAME[m.id] ?? m.name}
                        {count > 0 && (
                          <span
                            title={`${count} selected pin${count === 1 ? '' : 's'} on this map`}
                            className={cn(
                              'ml-1.5 rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums',
                              m.id === activeMapId
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-amber-400/20 text-amber-600 dark:text-amber-400',
                            )}
                          >
                            {count}
                          </span>
                        )}
                      </ToggleGroupItem>
                    );
                  },
                )}
              </ToggleGroup>
              {Arr.map(offRealmPins, ([id, count]) => (
                <Button
                  key={id}
                  variant='outline'
                  size='sm'
                  className={OVERLAY_BUTTON}
                  onClick={() => setActiveMapId(id)}
                >
                  <MapPinGlyph className='size-3.5 text-amber-400' filled />
                  {count} pin{count === 1 ? '' : 's'} on{' '}
                  {SHORT_MAP_NAME[id] ??
                    Option.getOrUndefined(
                      Arr.findFirst(manifest.maps, (m) => m.id === id),
                    )?.name ??
                    id}{' '}
                  — switch
                </Button>
              ))}
            </div>

            <MapRightRail
              defaultControlsOpen={!isMobile}
              layers={layers}
              onLayerChange={(key, visible) =>
                setLayers((l) => ({ ...l, [key]: visible }))
              }
              onQuickSelect={selectEvents}
              onClearPins={clearPins}
              pinCount={pins.length}
              playerPin={playerPin}
              slotConnected={slotConnected}
            />

            {/* "Center on me" — a locate button bottom-right, above the
                zoom/center readout. Title on the wrapper so the disabled
                explanation still shows (the disabled button drops pointer
                events). */}
            <div
              className='absolute right-3 bottom-12 z-[1000]'
              title={
                !slotConnected
                  ? 'Connect a save to center on your character'
                  : playerPin
                    ? 'Center the map on your character'
                    : 'Your character is in an interior (dungeon/cave) we can’t place on the world map yet'
              }
            >
              <Button
                variant='outline'
                size='icon'
                className={OVERLAY_BUTTON}
                aria-label='Center the map on your character'
                disabled={!playerPin}
                onClick={() => {
                  if (!playerPin) return;
                  if (playerPin.master !== activeMapId)
                    setActiveMapId(playerPin.master);
                  setRecenterToken((t) => t + 1);
                }}
              >
                <LocateFixedIcon />
              </Button>
            </div>

            <MapLegendOverlay defaultOpen={!isMobile} />
          </>
        )}
      </div>
    </div>
  );
}

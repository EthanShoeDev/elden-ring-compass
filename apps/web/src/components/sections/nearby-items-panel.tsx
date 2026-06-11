/**
 * "Nearby items" — the glance-while-playing companion panel (see
 * docs/projects/complete/nearby-items.md). Lists item pickups around the
 * player's current save position so a user serving their save over the local
 * HTTP server can check, after each save, that they aren't leaving anything
 * behind before moving on. Recomputes automatically when the save reloads
 * (it derives from the player pin + catalog ownership).
 *
 * Spatial model: master-pixel space, where 1 px = 1 world-unit (≈1 m) — see
 * `map-affine.ts` — so a radius in "meters" is a plain pixel-distance check
 * against `ALL_ITEM_PINS`, scoped to the player's master. Multiple placements
 * of the same item collapse to one row (nearest first, with a ×N count).
 *
 * Rows toggle the item's row selection in its OWN inventory table's store —
 * i.e. exactly the table pin toggle — so a pin dropped here shows on the map,
 * syncs with the table UI, persists, and clears via the normal "Clear pins".
 */
import { itemIconUrl } from '@elden-ring-compass/data/images';
import { useDeferredValue, useMemo, useState } from 'react';

import { MapPinGlyph } from '@/components/icons/map-pin-glyph';
import {
  type InventoryRow,
  type InventoryTableType,
  TABLE_PLACEMENT_TYPE,
  useInventoryTables,
} from '@/lib/inventory-catalog';
import { cn } from '@/lib/utils';
import { ALL_ITEM_PINS, type PlacedItemPin } from '@/lib/vm/map-pins';

import { useRowSelectionControls, useTableStateMap } from '../data-table/data-table-store';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import type { MapPin } from './leaflet-map';
import { OVERLAY_PANEL, PanelLabel } from './map-overlay-chrome';

/** Search-radius slider bounds, in world-units (≈ meters; 1 master pixel = 1 world-unit). */
const MIN_RADIUS = 50;
const MAX_RADIUS = 2000;
const RADIUS_STEP = 25;
const DEFAULT_RADIUS = 250;
/** Cap the visible list; the header still reports the full in-range count. */
const MAX_ROWS = 40;

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
/** 8-way compass label for a pixel-space offset (+x = east, +y = SOUTH). */
function compassLabel(dx: number, dy: number): string {
  const angle = Math.atan2(dx, -dy); // 0 = north, clockwise, -π..π
  const idx = (((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8) as 0;
  return COMPASS[idx];
}

interface NearbyEntry {
  key: string;
  tableId: InventoryTableType;
  row: InventoryRow;
  distance: number;
  direction: string;
  /** Placements of this item within the radius (the row shows the nearest). */
  nearbyCount: number;
  source: string;
  chance: number;
  approx: boolean;
}

function useNearbyItems(
  playerPin: MapPin | null,
  radius: number,
  includeOwned: boolean,
  includeChanceDrops: boolean,
): NearbyEntry[] {
  const allTables = useInventoryTables();

  // (placement type, item id) → catalog row + which table owns it. Tables can
  // share a placement type (all the goods tables), but an id resolves to one row.
  const rowByKey = useMemo(() => {
    const m = new Map<string, { row: InventoryRow; tableId: InventoryTableType }>();
    for (const [tableId, result] of Object.entries(allTables)) {
      const type = TABLE_PLACEMENT_TYPE[tableId as InventoryTableType];
      for (const row of result.items) {
        const k = `${type}:${row.id.toString()}`;
        if (!m.has(k)) m.set(k, { row, tableId: tableId as InventoryTableType });
      }
    }
    return m;
  }, [allTables]);

  return useMemo(() => {
    if (!playerPin) return [];
    const r2 = radius * radius;
    const best = new Map<
      string,
      { pin: PlacedItemPin; d2: number; dx: number; dy: number; count: number }
    >();
    for (const pin of ALL_ITEM_PINS) {
      if (pin.master !== playerPin.master) continue;
      // Sure-drop filter applies per PLACEMENT, before grouping — an item can
      // have both a guaranteed treasure spot and a <100% enemy drop in range.
      if (!includeChanceDrops && pin.chance < 1) continue;
      const dx = pin.px - playerPin.px;
      const dy = pin.py - playerPin.py;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const k = `${pin.itemType}:${pin.itemId.toString()}`;
      const cur = best.get(k);
      if (!cur) best.set(k, { pin, d2, dx, dy, count: 1 });
      else {
        cur.count += 1;
        if (d2 < cur.d2) Object.assign(cur, { pin, d2, dx, dy });
      }
    }
    const entries: NearbyEntry[] = [];
    for (const [key, { pin, d2, dx, dy, count }] of best) {
      const hit = rowByKey.get(key);
      if (!hit) continue;
      if (!includeOwned && hit.row.quantity > 0) continue;
      entries.push({
        key,
        tableId: hit.tableId,
        row: hit.row,
        distance: Math.sqrt(d2),
        direction: compassLabel(dx, dy),
        nearbyCount: count,
        source: pin.source,
        chance: pin.chance,
        approx: pin.approx,
      });
    }
    return entries.toSorted((a, b) => a.distance - b.distance);
  }, [playerPin, radius, includeOwned, includeChanceDrops, rowByKey]);
}

function entryMeta(e: NearbyEntry): string {
  const source = e.source === 'map' ? 'Treasure' : e.approx ? 'Drop · approx. area' : 'Drop';
  const parts = [
    `${Math.round(e.distance).toString()}m ${e.direction}`,
    e.chance < 1 ? `${source} ${Math.round(e.chance * 100).toString()}%` : source,
  ];
  if (e.nearbyCount > 1) parts.push(`×${e.nearbyCount.toString()}`);
  if (e.row.quantity > 0) parts.push('owned');
  return parts.join(' · ');
}

export function NearbyItemsPanel({
  playerPin,
  slotConnected,
}: {
  playerPin: MapPin | null;
  slotConnected: boolean;
}) {
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS);
  const [includeOwned, setIncludeOwned] = useState(false);
  const [includeChanceDrops, setIncludeChanceDrops] = useState(true);
  // Defer the scan/regroup while the slider is dragged; the label stays live.
  const deferredRadius = useDeferredValue(radius);
  const entries = useNearbyItems(playerPin, deferredRadius, includeOwned, includeChanceDrops);
  const tableState = useTableStateMap();
  const { setRowSelection } = useRowSelectionControls();
  const shown = entries.slice(0, MAX_ROWS);

  const togglePin = (e: NearbyEntry) => {
    setRowSelection(e.tableId)((prev) => {
      const id = e.row.id.toString();
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  return (
    <div
      className={cn(
        OVERLAY_PANEL,
        'pointer-events-auto flex min-h-0 w-72 flex-col gap-2.5 overflow-y-auto p-3',
      )}
    >
      <div>
        <PanelLabel>Nearby items</PanelLabel>
        <div className='flex items-center gap-2.5'>
          <Slider
            min={MIN_RADIUS}
            max={MAX_RADIUS}
            step={RADIUS_STEP}
            value={radius}
            onValueChange={(v) => {
              setRadius(Array.isArray(v) ? (v[0] ?? DEFAULT_RADIUS) : v);
            }}
            aria-label='Search radius'
            className='flex-1'
          />
          <span className='w-12 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums'>
            {radius}m
          </span>
        </div>
        <div className='mt-2 flex items-center justify-between gap-2'>
          <label
            htmlFor='nearby-include-chance'
            title='Include chance-based enemy drops (below 100%) — off shows only guaranteed pickups'
            className='flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground select-none'
          >
            % drops
            <Switch
              id='nearby-include-chance'
              checked={includeChanceDrops}
              onCheckedChange={setIncludeChanceDrops}
            />
          </label>
          <label
            htmlFor='nearby-include-owned'
            title='Include items you already own'
            className='flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground select-none'
          >
            Owned
            <Switch
              id='nearby-include-owned'
              checked={includeOwned}
              onCheckedChange={setIncludeOwned}
            />
          </label>
        </div>
      </div>

      {!slotConnected ? (
        <p className='text-xs text-muted-foreground'>
          Connect a save to see the item pickups around your character.
        </p>
      ) : !playerPin ? (
        <p className='text-xs text-muted-foreground'>
          Your character is in an interior (dungeon/cave) we can't place on the world map, so
          there's no position to search around.
        </p>
      ) : entries.length === 0 ? (
        <p className='text-xs text-muted-foreground'>
          Nothing {includeOwned ? 'placeable' : 'uncollected'} within {deferredRadius}m. Try a wider
          radius.
        </p>
      ) : (
        <>
          <p className='text-xs text-muted-foreground'>
            {entries.length} item{entries.length === 1 ? '' : 's'} within {deferredRadius}m — click
            to pin on the map.
          </p>
          <div className='flex flex-col'>
            {shown.map((e) => {
              const pinned = !!tableState[e.tableId]?.rowSelection?.[e.row.id.toString()];
              const iconUrl = itemIconUrl(e.row.icon);
              return (
                <button
                  key={e.key}
                  type='button'
                  title={pinned ? 'Remove pin' : 'Pin on map'}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-muted',
                    pinned && 'bg-muted/60',
                  )}
                  onClick={() => togglePin(e)}
                >
                  {iconUrl != null ? (
                    <img src={iconUrl} alt='' className='size-6 shrink-0' loading='lazy' />
                  ) : (
                    <span className='size-6 shrink-0' />
                  )}
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate'>{e.row.name}</span>
                    <span className='block truncate text-[11px] text-muted-foreground'>
                      {entryMeta(e)}
                    </span>
                  </span>
                  <MapPinGlyph
                    filled={pinned}
                    className={cn(
                      'size-4 shrink-0',
                      pinned ? 'text-amber-400' : 'text-muted-foreground/50',
                    )}
                  />
                </button>
              );
            })}
          </div>
          {entries.length > shown.length && (
            <p className='text-[11px] text-muted-foreground'>
              +{entries.length - shown.length} more in range (closest {MAX_ROWS} shown).
            </p>
          )}
        </>
      )}
    </div>
  );
}

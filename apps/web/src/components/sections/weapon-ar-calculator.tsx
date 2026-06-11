import { itemIconThumbUrl, itemIconUrl } from '@elden-ring-compass/data/images';
import { useMemo, useState } from 'react';

import { type Attributes, MAX_UPGRADE_LEVEL } from '@/lib/ar';
import { type BuildArchetype, weaponScalesWith } from '@/lib/build-archetypes';
import { bestAffinityPerWeapon, type RatedWeapon, rateWeapons } from '@/lib/weapon-rating';

import { wikiNameForItem } from '@/lib/wiki';

import { commonAccessorColumnDef, commonWikiColumnDef } from '../data-table/common-column-defs';
import { DataTable } from '../data-table/data-table';
import { createAppColumnHelper, DataTableColumnDef } from '../data-table/table-hook';
import { TooltipImg } from '../misc/tooltip-img';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';

const sliderNum = (v: number | readonly number[]): number =>
  typeof v === 'number' ? v : (v[0] ?? 0);

/**
 * Weapon AR Calculator — the save-aware min-maxing table. Rates every armament's
 * Attack Rating at the given attributes (driven by the Build Doctor, which
 * prefill from the connected save / chosen archetype) and ranks them, so "what's
 * the best weapon for my build?" is answered by the top of the table.
 *
 * Modes:
 *  - default (collapsed): one row per base weapon, showing its **best affinity**
 *    for the current stats — a built-in affinity recommender.
 *  - "show every affinity": all ~3.2k infused variants.
 *  - "only weapons I own": rate the armaments actually in the save's inventory.
 *  - when an archetype is active, "fits {archetype}" filters to weapons that scale
 *    with the build's stats (toggle off to see everything).
 */
export function WeaponArTable({
  attrs,
  archetype,
  ownedById,
}: {
  attrs: Attributes;
  archetype?: BuildArchetype | undefined;
  ownedById: ReadonlyMap<number, number>;
}) {
  const hasSave = ownedById.size > 0;

  const [upgrade, setUpgrade] = useState(MAX_UPGRADE_LEVEL);
  const [twoHanding, setTwoHanding] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [relevantOnly, setRelevantOnly] = useState(true);
  const [search, setSearch] = useState('');

  const rows = useMemo<RatedWeapon[]>(() => {
    const query = search.trim().toLowerCase();
    const rated = rateWeapons(attrs, upgrade, twoHanding, ownedById);

    // Restrict to weapons that scale with the chosen archetype's stats.
    let pool = rated;
    if (relevantOnly && archetype) {
      pool = pool.filter((r) => weaponScalesWith(r.scaling, archetype));
    }

    // Mode selection.
    let selected: RatedWeapon[];
    if (ownedOnly) {
      selected = pool.filter((r) => r.owned);
    } else if (showVariants) {
      selected = pool;
    } else {
      selected = bestAffinityPerWeapon(pool);
    }

    const filtered =
      query === ''
        ? selected
        : selected.filter(
            (r) => r.name.toLowerCase().includes(query) || String(r.id).includes(query),
          );

    // Default order = highest AR first ("best weapon for your build").
    return filtered.toSorted((a, b) => b.ar - a.ar);
  }, [
    attrs,
    upgrade,
    twoHanding,
    showVariants,
    ownedOnly,
    relevantOnly,
    archetype,
    search,
    ownedById,
  ]);

  // The Owned column is only meaningful with a save connected.
  const columns = useMemo<Array<DataTableColumnDef<RatedWeapon>>>(() => {
    const cols: Array<DataTableColumnDef<RatedWeapon>> = [
      iconColumn,
      commonAccessorColumnDef(columnHelper, 'name', 'Name'),
      commonWikiColumnDef(columnHelper, wikiNameForItem),
      commonAccessorColumnDef(columnHelper, 'affinity', 'Affinity'),
      commonAccessorColumnDef(columnHelper, 'ar', 'AR', { size: 1 }),
      commonAccessorColumnDef(columnHelper, 'physical', 'Phys'),
      commonAccessorColumnDef(columnHelper, 'magic', 'Mag'),
      commonAccessorColumnDef(columnHelper, 'fire', 'Fire'),
      commonAccessorColumnDef(columnHelper, 'lightning', 'Lgt'),
      commonAccessorColumnDef(columnHelper, 'holy', 'Holy'),
      commonAccessorColumnDef(columnHelper, 'level', '+', { size: 1 }),
      commonAccessorColumnDef(columnHelper, 'wieldable', 'Wieldable'),
    ];
    if (hasSave) cols.push(commonAccessorColumnDef(columnHelper, 'owned', 'Owned'));
    return cols;
  }, [hasSave]);

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle>Weapon AR Calculator</CardTitle>
        <CardDescription>
          {rows.length} {ownedOnly ? 'owned armaments' : 'weapons'} ranked by Attack Rating at the
          target attributes{archetype && relevantOnly ? ` · fits ${archetype.label}` : ''}.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-5'>
        {/* Controls */}
        <div className='flex flex-wrap items-end gap-4'>
          <div className='flex w-44 flex-col gap-1'>
            <Label className='text-[11px] text-muted-foreground'>Upgrade +{upgrade}</Label>
            <Slider
              min={0}
              max={MAX_UPGRADE_LEVEL}
              value={upgrade}
              onValueChange={(v) => {
                setUpgrade(sliderNum(v));
              }}
            />
          </div>
          <Input
            className='max-w-xs'
            placeholder='Search weapons by name or id…'
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
          />
          <Label className='flex items-center gap-2 text-sm'>
            <Checkbox
              checked={twoHanding}
              onCheckedChange={(c) => {
                setTwoHanding(c);
              }}
            />
            Two-handed
          </Label>
          {archetype && (
            <Label className='flex items-center gap-2 text-sm'>
              <Checkbox
                checked={relevantOnly}
                onCheckedChange={(c) => {
                  setRelevantOnly(c);
                }}
              />
              Fits {archetype.label}
            </Label>
          )}
          <Label className='flex items-center gap-2 text-sm'>
            <Checkbox
              checked={showVariants}
              disabled={ownedOnly}
              onCheckedChange={(c) => {
                setShowVariants(c);
              }}
            />
            Show every affinity
          </Label>
          {hasSave && (
            <Label className='flex items-center gap-2 text-sm'>
              <Checkbox
                checked={ownedOnly}
                onCheckedChange={(c) => {
                  setOwnedOnly(c);
                }}
              />
              Only weapons I own
            </Label>
          )}
        </div>

        {!ownedOnly && !showVariants && (
          <p className='text-[11px] text-muted-foreground'>
            Showing the best-scaling affinity per weapon for your stats. Two-handing adds 50% Str.
            Weapons you can&apos;t wield (unmet requirements) keep a −40% penalty in their AR.
          </p>
        )}

        <DataTable tableId='weapon-calculator' columns={columns} data={rows} />
      </CardContent>
    </Card>
  );
}

const columnHelper = createAppColumnHelper<RatedWeapon>();

// Module-scoped so it isn't re-created on every render (and isn't flagged as a
// nested component). Mirrors the inventory tables' icon column.
const iconColumn = columnHelper.display({
  id: 'icon',
  header: 'Icon',
  // The icon is a fixed 40px (`size-10`) image; give the column a real width so
  // the virtualized grid layout (fixed `getSize()` widths) doesn't clip it.
  size: 56,
  enableResizing: false,
  cell: (cell) => (
    <TooltipImg
      imgSrc={itemIconUrl(cell.row.original.icon) ?? ''}
      thumbSrc={itemIconThumbUrl(cell.row.original.icon)}
      alt={cell.row.original.name}
    />
  ),
  enableHiding: true,
}) as DataTableColumnDef<RatedWeapon>;

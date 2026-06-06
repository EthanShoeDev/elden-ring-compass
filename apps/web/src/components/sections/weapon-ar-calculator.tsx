import { WEAPONS } from '@elden-ring-compass/data';
import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import { baseIdOf, enrichWeapon } from '@/lib/atoms/weapons';
import {
  arCalculator,
  type Attributes,
  maxUpgradeFor,
  MAX_UPGRADE_LEVEL,
  weaponScalingById,
} from '@/lib/ar';
import { inventoryDbView } from '@/lib/vm/inventory';
import { useSelectedSlot } from '@/stores/slot-selection-store';

import { commonAccessorColumnDef } from '../data-table/common-column-defs';
import { DataTable } from '../data-table/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';

// Non-armament placeholders that have an AR row but aren't real weapons:
// "DLC dummy" (id 1000, absurd all-element scaling) and "Unarmed" (110000).
const EXCLUDED_WEAPON_IDS = new Set([1000, 110000]);

const sliderNum = (v: number | readonly number[]): number =>
  typeof v === 'number' ? v : (v[0] ?? 0);

interface RatedWeapon {
  readonly id: number;
  readonly name: string;
  readonly affinity: string;
  readonly ar: number;
  readonly physical: number;
  readonly magic: number;
  readonly fire: number;
  readonly lightning: number;
  readonly holy: number;
  readonly level: number;
  readonly wieldable: boolean;
  readonly owned: boolean;
}

/**
 * Weapon AR Calculator — the save-aware min-maxing table. Rates every armament's
 * Attack Rating at the given attributes (driven by the Build Planner's sliders,
 * which prefill from the connected save) and ranks them, so "what's the best
 * weapon for my build?" is answered by the top of the table.
 *
 * Three modes:
 *  - default (collapsed): one row per base weapon, showing its **best affinity**
 *    for the current stats — a built-in affinity recommender.
 *  - "show every affinity": all ~3.2k infused variants.
 *  - "only weapons I own": rate the armaments actually in the save's inventory.
 */
export function WeaponArTable({ attrs }: { attrs: Attributes }) {
  const slot = useSelectedSlot();

  const [upgrade, setUpgrade] = useState(MAX_UPGRADE_LEVEL);
  const [twoHanding, setTwoHanding] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [search, setSearch] = useState('');

  // weapon id → highest owned upgrade level, from the save's inventory.
  const ownedById = useMemo(() => {
    const owned = new Map<number, number>();
    if (slot) {
      for (const item of inventoryDbView(slot).items) {
        if (item.type !== 'WEAPON') continue;
        owned.set(item.item_id, Math.max(owned.get(item.item_id) ?? 0, item.upgrade_level));
      }
    }
    return owned;
  }, [slot]);

  const rows = useMemo<RatedWeapon[]>(() => {
    const query = search.trim().toLowerCase();

    // Rate every armament that has an AR scaling row, at the chosen (clamped) level.
    const rated: RatedWeapon[] = [];
    for (const w of WEAPONS) {
      if (EXCLUDED_WEAPON_IDS.has(w.id)) continue;
      const scaling = weaponScalingById.get(w.id);
      if (!scaling) continue; // ammo / no-damage items have no AR
      const level = Math.min(upgrade, maxUpgradeFor(scaling));
      const ar = arCalculator.compute(scaling, attrs, level, { twoHanding });
      const e = enrichWeapon(w);
      rated.push({
        id: w.id,
        name: e.affinityIndex === 0 ? e.baseName : `${e.affinity} ${e.baseName}`,
        affinity: e.affinity,
        ar: Math.round(ar.total),
        physical: Math.round(ar.damage.physical ?? 0),
        magic: Math.round(ar.damage.magic ?? 0),
        fire: Math.round(ar.damage.fire ?? 0),
        lightning: Math.round(ar.damage.lightning ?? 0),
        holy: Math.round(ar.damage.holy ?? 0),
        level,
        wieldable: !ar.ineffective,
        owned: ownedById.has(w.id),
      });
    }

    // Mode selection.
    let selected: RatedWeapon[];
    if (ownedOnly) {
      selected = rated.filter((r) => r.owned);
    } else if (showVariants) {
      selected = rated;
    } else {
      // Collapse to the best-AR affinity per base weapon (affinity recommender).
      const best = new Map<number, RatedWeapon>();
      for (const r of rated) {
        const base = baseIdOf(r.id);
        const cur = best.get(base);
        if (!cur || r.ar > cur.ar) best.set(base, r);
      }
      selected = [...best.values()];
    }

    const filtered =
      query === ''
        ? selected
        : selected.filter(
            (r) => r.name.toLowerCase().includes(query) || String(r.id).includes(query),
          );

    // Default order = highest AR first ("best weapon for your build").
    return filtered.toSorted((a, b) => b.ar - a.ar);
  }, [attrs, upgrade, twoHanding, showVariants, ownedOnly, search, ownedById]);

  // The Owned column is only meaningful with a save connected.
  const columns = useMemo<Array<ColumnDef<RatedWeapon>>>(() => {
    const cols = [
      commonAccessorColumnDef(columnHelper, 'name', 'Name'),
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
    if (slot) cols.push(commonAccessorColumnDef(columnHelper, 'owned', 'Owned'));
    return cols;
  }, [slot]);

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle>Weapon AR Calculator</CardTitle>
        <CardDescription>
          {rows.length} {ownedOnly ? 'owned armaments' : 'weapons'} ranked by Attack Rating at the
          attributes above.
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
          {slot && (
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

const columnHelper = createColumnHelper<RatedWeapon>();

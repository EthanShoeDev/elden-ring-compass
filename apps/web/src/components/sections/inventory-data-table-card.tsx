import { itemIconThumbUrl, itemIconUrl } from '@elden-ring-compass/data/images';
import { useNavigate } from '@tanstack/react-router';
import { useAtom } from '@effect/atom-react';
import {
  ChevronsUpDownIcon,
  FileCheckIcon,
  FlameIcon,
  HammerIcon,
  InfoIcon,
  ListChecksIcon,
  PackageIcon,
  SkullIcon,
  SparklesIcon,
  StarIcon,
  SwordsIcon,
  WrenchIcon,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

import {
  commonAccessorColumnDef,
  commonPinColumnDef,
  quantityFilterFn,
} from '@/components/data-table/common-column-defs';
import { DataTable } from '@/components/data-table/data-table';
import { useColumnFilterValue } from '@/components/data-table/data-table-store';
import {
  createAppColumnHelper,
  DataTableCellContext,
  DataTableColumnDef,
  DataTableColumnHelper,
} from '@/components/data-table/table-hook';
import { MapPinGlyph } from '@/components/icons/map-pin-glyph';
import { TooltipImg } from '@/components/misc/tooltip-img';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { showAffinityVariantsAtom } from '@/lib/atoms/weapons';
import { useDataTableData } from '@/lib/data-table-data';
import { CATALOG, useInventoryTables, type WithOwnership } from '@/lib/inventory-catalog';
import { TABLE_LABEL, TYPE_TO_SLUG } from '@/lib/inventory-tables';
import { cn } from '@/lib/utils';

export type { InventoryTableType } from '@/lib/inventory-catalog';
import type { InventoryTableType } from '@/lib/inventory-catalog';

// Per-category icon (Lucide).
const CAT_ICON: Record<InventoryTableType, LucideIcon> = {
  armaments: SwordsIcon,
  ammo: SwordsIcon,
  armor: PackageIcon,
  talismans: StarIcon,
  ashes: FlameIcon,
  spells: SparklesIcon,
  spirits: SkullIcon,
  tools: WrenchIcon,
  craftingMaterials: PackageIcon,
  upgradeMaterials: HammerIcon,
  keyItems: FileCheckIcon,
  infoItems: InfoIcon,
  gestures: ListChecksIcon,
};

// The item classes, mirroring Elden Ring's own inventory tabs, lightly grouped for the picker.
const INV_GROUPS: ReadonlyArray<{
  label: string;
  keys: ReadonlyArray<InventoryTableType>;
}> = [
  {
    label: 'Equipment',
    keys: ['armaments', 'ammo', 'armor', 'talismans', 'ashes'],
  },
  { label: 'Magic', keys: ['spells', 'spirits'] },
  {
    label: 'Items',
    keys: ['tools', 'craftingMaterials', 'upgradeMaterials', 'keyItems', 'infoItems', 'gestures'],
  },
];

/**
 * Grouped category dropdown — the card title doubles as the picker. Mirrors the
 * design kit's `CategoryPicker`: a chevron trigger opening a scrollable menu of
 * the 19 item classes, grouped into subcategories, each with its icon and an
 * owned/total readout.
 */
function CategoryPicker({
  table,
  onSelect,
  allTables,
}: {
  table: InventoryTableType;
  onSelect: (k: InventoryTableType) => void;
  allTables: ReturnType<typeof useInventoryTables>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type='button'
            aria-label='Select item category'
            className='inline-flex items-center gap-2 text-2xl font-semibold tracking-tight outline-none'
          />
        }
      >
        {TABLE_LABEL[table]}
        <ChevronsUpDownIcon className='size-5 opacity-50' />
      </PopoverTrigger>
      <PopoverContent align='start' className='w-80 p-1'>
        <div className='flex max-h-[60vh] flex-col overflow-y-auto'>
          {INV_GROUPS.map((group) => (
            <div key={group.label} className='pb-1'>
              <div className='px-2 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'>
                {group.label}
              </div>
              {group.keys.map((key) => {
                const Icon = CAT_ICON[key];
                const owned = allTables[key].ownedCount;
                const total = allTables[key].items.length;
                const active = key === table;
                return (
                  <button
                    key={key}
                    type='button'
                    onClick={() => {
                      onSelect(key);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                      active
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-foreground hover:bg-muted',
                    )}
                  >
                    <Icon className='size-[15px] shrink-0 opacity-70' />
                    <span className='flex-1 text-left'>{TABLE_LABEL[key]}</span>
                    <span className='font-mono text-[11px] text-muted-foreground'>
                      {owned}/{total} ({total > 0 ? Math.round((owned / total) * 100) : 0}%)
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function InventoryDataTableCard({ table }: { table: InventoryTableType }) {
  // Category selection is the URL now (route param) — the picker navigates between
  // the per-category routes rather than writing a persisted atom.
  const navigate = useNavigate();
  const setTableType = (next: InventoryTableType) =>
    void navigate({
      to: '/inventory/$category',
      params: { category: TYPE_TO_SLUG[next] },
    });
  const [showVariants, setShowVariants] = useAtom(showAffinityVariantsAtom);
  const allTables = useInventoryTables();

  const allItems = useDataTableData(table);

  // Only armaments carry affinity variants; collapse them to one base row per weapon
  // unless the user opts in. See docs/projects/future/coalesce-items-with-affinities.md.
  const collapsible = table === 'armaments';
  const items =
    collapsible && !showVariants
      ? allItems.filter((i) => (i as { affinityIndex?: number }).affinityIndex === 0)
      : allItems;
  const hiddenVariantCount = collapsible ? allItems.length - items.length : 0;
  const ownedCount = items.filter((i) => i.quantity > 0).length;

  // Ownership filter — "what I've collected" vs "what's left" vs the whole catalogue.
  // Pairs with the affinity-variant toggle (variants = "every variant in the game").
  // This segmented control and the Quantity column's faceted chip are the SAME
  // filter (it writes the `'owned'`/`'missing'` presets that `quantityFilterFn`
  // reads, the facet writes exact values) — one shared source of truth, so the two
  // controls can't drift out of sync.
  const [qtyFilter, setQtyFilter] = useColumnFilterValue(table, 'Quantity');
  // The toggle reflects the shared Quantity filter: its presets light up, an
  // explicit value-facet selection (e.g. `[2]`) lights up nothing (null), and a
  // cleared filter is "all". So picking exact quantities in the facet doesn't
  // falsely highlight "All".
  const ownerFilter: 'all' | 'owned' | 'missing' | null =
    qtyFilter === 'owned'
      ? 'owned'
      : qtyFilter === 'missing'
        ? 'missing'
        : qtyFilter == null
          ? 'all'
          : null;

  // Full-bleed: the table *is* the route now (no Card chrome, no page padding —
  // see the `/inventory/$category` route's `fullBleed` staticData). A slim header
  // bar carries the category picker + ownership readout + filters; the
  // virtualized DataTable fills the rest of the frame.
  return (
    <div className='flex min-h-0 w-full flex-1 flex-col'>
      <div className='flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3'>
        <div className='flex flex-wrap items-baseline gap-x-3 gap-y-1'>
          <CategoryPicker table={table} onSelect={setTableType} allTables={allTables} />
          <span className='text-sm text-muted-foreground'>
            {ownedCount} / {items.length} ({((ownedCount / items.length) * 100).toFixed(0)}% owned)
            {collapsible && !showVariants && hiddenVariantCount > 0 && (
              <> · {hiddenVariantCount} affinity variants hidden</>
            )}
          </span>
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          <div className='inline-flex rounded-lg border border-border p-0.5'>
            {(['all', 'owned', 'missing'] as const).map((key) => (
              <button
                key={key}
                type='button'
                onClick={() => {
                  setQtyFilter(key === 'all' ? undefined : key);
                }}
                className={cn(
                  'rounded-md px-3 py-1 text-sm capitalize transition-colors',
                  ownerFilter === key
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {key}
              </button>
            ))}
          </div>
          {collapsible && (
            <Label className='flex items-center gap-2'>
              <Checkbox
                checked={showVariants}
                onCheckedChange={(checked) => {
                  setShowVariants(checked);
                }}
              />
              Show affinity variants
            </Label>
          )}
        </div>
      </div>
      <div className='flex min-h-0 flex-1 flex-col p-2'>
        <DataTable tableId={table} columns={tables[table]} data={items} fill />
      </div>
    </div>
  );
}

// Row element types per category, joined with save ownership.
type Row<K extends InventoryTableType> = WithOwnership<(typeof CATALOG)[K][number]>;
type BaseRow = WithOwnership<{
  id: number;
  name: string;
  icon: number;
  rarity: string;
}>;

type Effect = {
  attribute: string;
  value: number;
  model: string;
  type: string;
  conditions?: readonly string[];
};

const effectsText = (effects: readonly Effect[]) =>
  effects
    .map((e) => {
      const sign =
        e.type == 'positive'
          ? e.model == 'additive'
            ? '+'
            : '* '
          : e.model == 'additive'
            ? '-'
            : '* -';
      const conditions = e.conditions && e.conditions.length ? ` ${e.conditions.join(',')}` : '';
      return `${e.attribute} ${sign}${e.value.toString()}${conditions}`;
    })
    .join('\n');

/** id / icon / name / quantity / rarity / has-coords — shared by every inventory table. */
function defaultColumns<T extends BaseRow>(
  columnHelperT: DataTableColumnHelper<T>,
): Array<DataTableColumnDef<T>> {
  // oxlint-disable-next-line unknown-cast/forbidden -- TanStack ColumnHelper is invariant in its row type; we reuse one helper across the shared BaseRow shape
  const columnHelper = columnHelperT as unknown as DataTableColumnHelper<BaseRow>;
  return [
    commonPinColumnDef(columnHelper),
    commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
    columnHelper.display({
      id: 'icon',
      header: 'Icon',
      // The icon is a fixed 40px (`size-10`) image; give the column a real width so
      // the virtualized grid layout (fixed `getSize()` widths) doesn't clip it.
      size: 56,
      enableResizing: false,
      cell: (cell) => (
        <div>
          <TooltipImg
            imgSrc={itemIconUrl(cell.row.original.icon) ?? ''}
            thumbSrc={itemIconThumbUrl(cell.row.original.icon)}
            alt={cell.row.original.name}
          />
        </div>
      ),
      enableHiding: true,
    }),
    commonAccessorColumnDef(columnHelper, 'name', 'Name', {
      filterFn: 'includesString',
    }),
    // Quantity shares one filter between the prominent All/Owned/Missing segmented
    // control (which writes the `'owned'`/`'missing'` presets) and its faceted chip
    // (which writes exact values like `[2]` — "weapons I have 2 of"). See
    // `quantityFilterFn`; both stay in sync because it's a single column filter.
    commonAccessorColumnDef(columnHelper, 'quantity', 'Quantity', { filterFn: quantityFilterFn }),
    commonAccessorColumnDef(columnHelper, 'rarity', 'Rarity'),
    // How many map pins selecting this row drops (supersedes the old boolean
    // "Has Coordinates" column — a count is strictly more informative). Sortable +
    // faceted-filterable; 0 = can't be pinned (matches the muted pin cell).
    commonAccessorColumnDef(columnHelper, 'locationCount', 'Locations', {
      size: 120,
      // The override slot erases the accessor's TValue to `unknown`, so narrow at
      // the read (`getValue<number>()`) instead of in the context annotation.
      cell: (cell: DataTableCellContext<BaseRow>) => {
        const n = cell.getValue<number>();
        return n > 0 ? (
          <div className='flex items-center gap-1.5'>
            <MapPinGlyph filled className='size-3.5 text-amber-400/80' />
            <span>{n}</span>
          </div>
        ) : (
          <span className='text-muted-foreground/40'>—</span>
        );
      },
    }),
    // oxlint-disable-next-line unknown-cast/forbidden -- columns built against BaseRow are structurally valid for the caller's narrower T
  ] as unknown as Array<DataTableColumnDef<T>>;
}

const armamentColumns = (() => {
  const h = createAppColumnHelper<Row<'armaments'>>();
  return [
    ...defaultColumns(h),
    commonAccessorColumnDef(h, 'category', 'Category'),
    commonAccessorColumnDef(h, 'affinity', 'Affinity'),
    commonAccessorColumnDef(h, 'allowAshOfWar', 'Allow AOW'),
    commonAccessorColumnDef(h, 'isBuffable', 'Buffable'),
    commonAccessorColumnDef(h, 'weaponUpgradeLevel', 'Upgrade Level'),
    commonAccessorColumnDef(h, 'weight', 'Weight'),
    // Stat requirements (Str/Dex/Int/Fai/Arc) — same fields the weapons browser shows.
    commonAccessorColumnDef(h, 'reqStrength', 'Str'),
    commonAccessorColumnDef(h, 'reqDexterity', 'Dex'),
    commonAccessorColumnDef(h, 'reqIntelligence', 'Int'),
    commonAccessorColumnDef(h, 'reqFaith', 'Fai'),
    commonAccessorColumnDef(h, 'reqArcane', 'Arc'),
    commonAccessorColumnDef(h, 'upgradeMaterial', 'Upgrade Material'),
    commonAccessorColumnDef(h, (row) => effectsText(row.effects), 'Effects'),
  ];
})();

const ammoColumns = (() => {
  const h = createAppColumnHelper<Row<'ammo'>>();
  return [
    ...defaultColumns(h),
    commonAccessorColumnDef(h, 'category', 'Category'),
    commonAccessorColumnDef(h, (row) => effectsText(row.effects), 'Effects'),
  ];
})();

const armorColumns = (() => {
  const h = createAppColumnHelper<Row<'armor'>>();
  return [
    ...defaultColumns(h),
    commonAccessorColumnDef(h, 'category', 'Category'),
    commonAccessorColumnDef(h, 'weight', 'Weight'),
    commonAccessorColumnDef(h, (row) => effectsText(row.effects), 'Effects'),
  ];
})();

const talismanColumns = (() => {
  const h = createAppColumnHelper<Row<'talismans'>>();
  return [
    ...defaultColumns(h),
    commonAccessorColumnDef(h, 'weight', 'Weight'),
    commonAccessorColumnDef(h, (row) => effectsText(row.effects), 'Effects'),
    commonAccessorColumnDef(h, (row) => row.conflicts.join(', '), 'Conflicts'),
  ];
})();

const ashesColumns = (() => {
  const h = createAppColumnHelper<Row<'ashes'>>();
  return [
    ...defaultColumns(h),
    commonAccessorColumnDef(h, (row) => row.armamentCategories.join(', '), 'Armament Categories'),
    commonAccessorColumnDef(h, 'defaultAffinity', 'Default Affinity'),
  ];
})();

const spellColumns = (() => {
  const h = createAppColumnHelper<Row<'spells'>>();
  return [
    ...defaultColumns(h),
    // Sorcery vs Incantation — the Spells tab unions both, so surface which is which.
    commonAccessorColumnDef(h, 'category', 'Category'),
    commonAccessorColumnDef(h, 'fpCost', 'FP Cost'),
    commonAccessorColumnDef(h, 'spCost', 'Stamina Cost'),
    commonAccessorColumnDef(h, 'slotsUsed', 'Slots'),
    commonAccessorColumnDef(h, 'isWeaponBuff', 'Is Weapon Buff'),
  ];
})();

const spiritColumns = (() => {
  const h = createAppColumnHelper<Row<'spirits'>>();
  return [
    ...defaultColumns(h),
    commonAccessorColumnDef(h, 'hpCost', 'HP Cost'),
    commonAccessorColumnDef(h, 'fpCost', 'FP Cost'),
    commonAccessorColumnDef(h, 'upgradeMaterial', 'Upgrade Material'),
    commonAccessorColumnDef(h, 'summonName', 'Summon Name', {
      filterFn: 'includesString',
    }),
  ];
})();

const goodsColumns = (() => {
  const h = createAppColumnHelper<BaseRow & { maxHeld: number }>();
  return [...defaultColumns(h), commonAccessorColumnDef(h, 'maxHeld', 'Max Held')];
})();

// Tools / Key Items each union several dataset categories — add a Category column so the
// sub-types (Cookbook, Crystal Tear, Remembrance, Great Rune, …) stay distinguishable.
const mixedGoodsColumns = (() => {
  const h = createAppColumnHelper<BaseRow & { category: string; maxHeld: number }>();
  return [
    ...defaultColumns(h),
    commonAccessorColumnDef(h, 'category', 'Category'),
    commonAccessorColumnDef(h, 'maxHeld', 'Max Held'),
  ];
})();

// Columns per category. Labels/slugs/order live in `@/lib/inventory-tables`
// (shared with the sidebar nav + the route); this map only owns the columns.
const tables: Record<InventoryTableType, Array<DataTableColumnDef<any>>> = {
  armaments: armamentColumns,
  ammo: ammoColumns,
  armor: armorColumns,
  talismans: talismanColumns,
  ashes: ashesColumns,
  spells: spellColumns,
  spirits: spiritColumns,
  tools: mixedGoodsColumns,
  craftingMaterials: goodsColumns,
  upgradeMaterials: goodsColumns,
  keyItems: mixedGoodsColumns,
  infoItems: goodsColumns,
  gestures: goodsColumns,
};

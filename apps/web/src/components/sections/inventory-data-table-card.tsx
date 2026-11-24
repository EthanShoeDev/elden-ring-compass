import { useAtom } from '@effect/atom-react';
import { itemIconThumbUrl, itemIconUrl } from '@elden-ring-compass/data/images';
import { useNavigate } from '@tanstack/react-router';
import { Array as Arr, Match, Predicate } from 'effect';
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
  renderNameCell,
  commonPinColumnDef,
  commonWikiColumnDef,
  contentColumnDef,
  multiValueColumnDef,
  realmColumnDef,
} from '@/components/data-table/common-column-defs';
import { DataTable } from '@/components/data-table/data-table';
import { useColumnFilterValue } from '@/components/data-table/data-table-store';
import type {
  DataTableCellContext,
  DataTableColumnDef,
  DataTableColumnHelper,
} from '@/components/data-table/table-hook';
import { createAppColumnHelper } from '@/components/data-table/table-hook';
import { MapPinGlyph } from '@/components/icons/map-pin-glyph';
import { TooltipImg } from '@/components/misc/tooltip-img';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { showAffinityVariantsAtom } from '@/lib/atoms/weapons';
import { useDataTableData } from '@/lib/data-table-data';
import { inDlcScope } from '@/lib/dlc';
import { useDlcScope } from '@/lib/dlc-scope';
import {
  type CATALOG,
  type ItemStatus,
  OWNED_STATUSES,
  useInventoryTables,
  type WithOwnership,
  type InventoryTableType,
} from '@/lib/inventory-catalog';
import { TABLE_LABEL, TYPE_TO_SLUG } from '@/lib/inventory-tables';
import { cn } from '@/lib/utils';
import { wikiNameForItem } from '@/lib/wiki';

export type { InventoryTableType } from '@/lib/inventory-catalog';

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
    keys: [
      'tools',
      'craftingMaterials',
      'upgradeMaterials',
      'keyItems',
      'infoItems',
      'gestures',
    ],
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
          {Arr.map(INV_GROUPS, (group) => (
            <div key={group.label} className='pb-1'>
              <div className='px-2 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'>
                {group.label}
              </div>
              {Arr.map(group.keys, (key) => {
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
                      {owned}/{total} (
                      {total > 0 ? Math.round((owned / total) * 100) : 0}%)
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

export function InventoryDataTableCard({
  table,
}: {
  table: InventoryTableType;
}) {
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
      ? Arr.filter(
          allItems,
          (i) => (i as { affinityIndex?: number }).affinityIndex === 0,
        )
      : allItems;
  const hiddenVariantCount = collapsible ? allItems.length - items.length : 0;
  // Rows cover all content (the Content filter mirrors the scope); the headline
  // counts follow the scope itself.
  const { scope } = useDlcScope();
  const scoped = Arr.filter(items, (i) => inDlcScope(scope, i.isDlc));
  const ownedCount = Arr.filter(
    scoped,
    (i) => !i.status.includes('Missing'),
  ).length;

  // Ownership is ONE filter: the Status column (Equipped / Carried / Sorting Chest
  // / Missing — an item can be several). This All / Owned / Missing toggle just
  // writes presets into it, and the Status dropdown in the toolbar refines it
  // ("only what's in my Sorting Chest"), so the two can't disagree. Owned = every
  // "have it" status this KIND of table can have — fixed, not "the ones present
  // right now", which drifts as the scope / save / variant toggle changes and
  // leaves a stale preset silently hiding items while no segment is lit.
  const [statusFilter, setStatusFilter] = useColumnFilterValue(table, 'Status');
  const ownedPreset: readonly ItemStatus[] =
    table === 'gestures'
      ? ['Unlocked']
      : Arr.filter(OWNED_STATUSES, (s) => s !== 'Unlocked');
  const ownerFilter = ((): OwnerFilter | null => {
    if (Predicate.isNullish(statusFilter)) return 'all';
    if (sameValues(statusFilter, ['Missing'])) return 'missing';
    if (sameValues(statusFilter, ownedPreset)) return 'owned';
    return null; // a custom Status selection
  })();
  const setOwnerFilter = (key: OwnerFilter) =>
    setStatusFilter(
      Match.value(key).pipe(
        Match.when('all', () => undefined),
        Match.when('missing', () => ['Missing']),
        Match.when('owned', () => [...ownedPreset]),
        Match.exhaustive,
      ),
    );

  // Full-bleed: the table *is* the route now (no Card chrome, no page padding —
  // see the `/inventory/$category` route's `fullBleed` staticData). A slim header
  // bar carries the category picker + ownership readout + filters; the
  // virtualized DataTable fills the rest of the frame.
  return (
    <div className='flex min-h-0 w-full flex-1 flex-col'>
      <div className='flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3'>
        <div className='flex flex-wrap items-baseline gap-x-3 gap-y-1'>
          <CategoryPicker
            table={table}
            onSelect={setTableType}
            allTables={allTables}
          />
          <span className='text-sm text-muted-foreground'>
            {ownedCount} / {scoped.length} (
            {((ownedCount / scoped.length) * 100).toFixed(0)}% owned)
            {collapsible && !showVariants && hiddenVariantCount > 0 && (
              <> · {hiddenVariantCount} affinity variants hidden</>
            )}
          </span>
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          <div className='inline-flex rounded-lg border border-border p-0.5'>
            {Arr.map(OWNER_FILTERS, (key) => (
              <button
                key={key}
                type='button'
                aria-pressed={ownerFilter === key}
                onClick={() => {
                  setOwnerFilter(key);
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

const OWNER_FILTERS = ['all', 'owned', 'missing'] as const;
type OwnerFilter = (typeof OWNER_FILTERS)[number];

const sameValues = (value: unknown, preset: readonly ItemStatus[]) =>
  Arr.isArray(value) &&
  value.length === preset.length &&
  Arr.every(preset, (v) => value.includes(v));

const STATUS_BADGE: Record<ItemStatus, string> = {
  Equipped:
    'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300',
  Carried:
    'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  'Sorting Chest':
    'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  Unlocked:
    'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  Missing: '',
};

/** Status cell: a badge per place your copies are, with the count for stacks. */
const renderStatusCell = ({ row }: { row: { original: BaseRow } }) => {
  const r = row.original;
  if (r.status.includes('Missing'))
    return <span className='text-muted-foreground/40'>—</span>;
  const count = (s: ItemStatus) =>
    s === 'Carried' && r.heldQuantity > 1
      ? ` ${r.heldQuantity.toLocaleString()}`
      : s === 'Sorting Chest' && r.storedQuantity > 1
        ? ` ${r.storedQuantity.toLocaleString()}`
        : '';
  return (
    <div className='flex flex-wrap gap-1'>
      {Arr.map(r.status, (s) => (
        <span
          key={s}
          className={cn(
            'rounded border px-1.5 py-0.5 text-[11px] leading-none font-medium whitespace-nowrap',
            STATUS_BADGE[s],
          )}
        >
          {s}
          {count(s)}
        </span>
      ))}
    </div>
  );
};

// Row element types per category, joined with save ownership.
type Row<K extends InventoryTableType> = WithOwnership<
  (typeof CATALOG)[K][number]
>;
type BaseRow = WithOwnership<{
  id: number;
  name: string;
  icon: number;
  rarity: string;
  isDlc: boolean;
  /**
   * Armaments only (see `EnrichedWeapon`): the affinity-0 sibling's name
   * ("Dagger" for "Heavy Dagger"). The wiki column links it when present —
   * affinity/upgrade variants share the base weapon's wiki page.
   */
  baseName?: string;
}>;

type Effect = {
  attribute: string;
  value: number;
  model: string;
  type: string;
  conditions?: readonly string[];
};

const effectsText = (effects: readonly Effect[]) =>
  Arr.join(
    Arr.map(effects, (e) => {
      const sign =
        e.type === 'positive'
          ? e.model === 'additive'
            ? '+'
            : '* '
          : e.model === 'additive'
            ? '-'
            : '* -';
      const conditions =
        e.conditions && e.conditions.length > 0
          ? ` ${Arr.join(e.conditions, ',')}`
          : '';
      return `${e.attribute} ${sign}${e.value.toString()}${conditions}`;
    }),
    '\n',
  );

/** id / icon / name / quantity / rarity / has-coords — shared by every inventory table. */
function defaultColumns<T extends BaseRow>(
  columnHelperT: DataTableColumnHelper<T>,
): Array<DataTableColumnDef<T>> {
  const columnHelper =
    // oxlint-disable-next-line anti-slop/no-chained-type-assertions -- TanStack ColumnHelper is invariant in its row type; we reuse one helper across the shared BaseRow shape
    columnHelperT as unknown as DataTableColumnHelper<BaseRow>;
  // oxlint-disable-next-line anti-slop/no-chained-type-assertions -- columns built against BaseRow are structurally valid for the caller's narrower T (the `as unknown as` closing this array)
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
      cell: renderNameCell,
    }),
    commonWikiColumnDef(columnHelper, wikiNameForItem),
    // Total owned — sort only. Filtering by ownership is the Status column's job.
    // (`filterFn` ignores a value persisted by the old Owned/Missing toggle, which
    // used to write here.)
    commonAccessorColumnDef(columnHelper, 'quantity', 'Quantity', {
      enableColumnFilter: false,
      filterFn: () => true,
    }),
    // Where your copies are: Equipped / Carried / Sorting Chest, or Missing.
    multiValueColumnDef(columnHelper, (r) => r.status, 'Status', {
      size: 200,
      cell: renderStatusCell,
    }),
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
    realmColumnDef(columnHelper, (r) => r.realms),
    contentColumnDef(columnHelper),
    // Cast: columns built against BaseRow are structurally valid for the caller's narrower T
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
    commonAccessorColumnDef(
      h,
      (row) => Arr.join(row.conflicts, ', '),
      'Conflicts',
    ),
  ];
})();

const ashesColumns = (() => {
  const h = createAppColumnHelper<Row<'ashes'>>();
  return [
    ...defaultColumns(h),
    commonAccessorColumnDef(
      h,
      (row) => Arr.join(row.armamentCategories, ', '),
      'Armament Categories',
    ),
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
  return [
    ...defaultColumns(h),
    commonAccessorColumnDef(h, 'maxHeld', 'Max Held'),
  ];
})();

// Tools / Key Items each union several dataset categories — add a Category column so the
// sub-types (Cookbook, Crystal Tear, Remembrance, Great Rune, …) stay distinguishable.
const mixedGoodsColumns = (() => {
  const h = createAppColumnHelper<
    BaseRow & { category: string; maxHeld: number }
  >();
  return [
    ...defaultColumns(h),
    commonAccessorColumnDef(h, 'category', 'Category'),
    commonAccessorColumnDef(h, 'maxHeld', 'Max Held'),
  ];
})();

// Columns per category. Labels/slugs/order live in `@/lib/inventory-tables`
// (shared with the sidebar nav + the route); this map only owns the columns.
// oxlint-disable-next-line typescript/no-explicit-any -- each category's columns are typed to its own row shape and ColumnDef is invariant in it; the consumer pairs them with that category's rows
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

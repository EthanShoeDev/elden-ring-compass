import { itemIconUrl } from '@elden-ring-compass/data/images';
import { ColumnDef, ColumnHelper, createColumnHelper } from '@tanstack/react-table';
import { Schema } from 'effect';
import { Atom } from 'effect/unstable/reactivity';
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
} from '@/components/data-table/common-column-defs';
import { DataTable } from '@/components/data-table/data-table';
import { TooltipImg } from '@/components/misc/tooltip-img';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { browserKvsRuntime } from '@/lib/atoms/kvs';
import { showAffinityVariantsAtom } from '@/lib/atoms/weapons';
import { useDataTableData } from '@/lib/data-table-data';
import { CATALOG, useInventoryTables, type WithOwnership } from '@/lib/inventory-catalog';
import { cn } from '@/lib/utils';

export type { InventoryTableType } from '@/lib/inventory-catalog';
import type { InventoryTableType } from '@/lib/inventory-catalog';

// Persisted current inventory table category (typesafe kvs; replaced the Zustand
// `persist` store). Stored as a plain string and narrowed to `InventoryTableType`
// at the use site — the valid keys are defined by `tables` below.
const inventoryTableSelectionAtom = Atom.kvs({
  runtime: browserKvsRuntime,
  key: 'inventory-table-selection',
  schema: Schema.String,
  defaultValue: () => 'armaments',
});

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
const INV_GROUPS: ReadonlyArray<{ label: string; keys: ReadonlyArray<InventoryTableType> }> = [
  { label: 'Equipment', keys: ['armaments', 'ammo', 'armor', 'talismans', 'ashes'] },
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
        {tables[table].label}
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
                    <span className='flex-1 text-left'>{tables[key].label}</span>
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

export function InventoryDataTableCard() {
  const [tableName, setTableName] = useAtom(inventoryTableSelectionAtom);
  const table = (tableName in tables ? tableName : 'armaments') as InventoryTableType;
  const setTableType = (next: InventoryTableType) => setTableName(next);
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

  return (
    <Card className='w-full'>
      <CardHeader>
        <CategoryPicker table={table} onSelect={setTableType} allTables={allTables} />
        <CardDescription>
          {ownedCount} / {items.length}
          <br />
          {((ownedCount / items.length) * 100).toFixed(0)}% owned
          {collapsible && !showVariants && hiddenVariantCount > 0 && (
            <>
              <br />
              {hiddenVariantCount} affinity variants hidden
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
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
        <DataTable tableId={table} columns={tables[table].columns} data={items} />
      </CardContent>
    </Card>
  );
}

// Row element types per category, joined with save ownership.
type Row<K extends InventoryTableType> = WithOwnership<(typeof CATALOG)[K][number]>;
type BaseRow = WithOwnership<{ id: number; name: string; icon: number; rarity: string }>;

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
function defaultColumns<T extends BaseRow>(columnHelperT: ColumnHelper<T>): Array<ColumnDef<T>> {
  // oxlint-disable-next-line unknown-cast/forbidden -- TanStack ColumnHelper is invariant in its row type; we reuse one helper across the shared BaseRow shape
  const columnHelper = columnHelperT as unknown as ColumnHelper<BaseRow>;
  return [
    commonPinColumnDef(columnHelper),
    commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
    columnHelper.display({
      id: 'icon',
      header: 'Icon',
      size: 1,
      maxSize: 1,
      cell: (cell) => (
        <div>
          <TooltipImg
            imgSrc={itemIconUrl(cell.row.original.icon) ?? ''}
            alt={cell.row.original.name}
          />
        </div>
      ),
      enableHiding: true,
    }),
    commonAccessorColumnDef(columnHelper, 'name', 'Name', { filterFn: 'includesString' }),
    commonAccessorColumnDef(columnHelper, 'quantity', 'Quantity'),
    commonAccessorColumnDef(columnHelper, 'rarity', 'Rarity'),
    commonAccessorColumnDef(columnHelper, (row) => row.hasCoords, 'Has Coordinates'),
    // oxlint-disable-next-line unknown-cast/forbidden -- columns built against BaseRow are structurally valid for the caller's narrower T
  ] as unknown as Array<ColumnDef<T>>;
}

const armamentColumns = (() => {
  const h = createColumnHelper<Row<'armaments'>>();
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
  const h = createColumnHelper<Row<'ammo'>>();
  return [
    ...defaultColumns(h),
    commonAccessorColumnDef(h, 'category', 'Category'),
    commonAccessorColumnDef(h, (row) => effectsText(row.effects), 'Effects'),
  ];
})();

const armorColumns = (() => {
  const h = createColumnHelper<Row<'armor'>>();
  return [
    ...defaultColumns(h),
    commonAccessorColumnDef(h, 'category', 'Category'),
    commonAccessorColumnDef(h, 'weight', 'Weight'),
    commonAccessorColumnDef(h, (row) => effectsText(row.effects), 'Effects'),
  ];
})();

const talismanColumns = (() => {
  const h = createColumnHelper<Row<'talismans'>>();
  return [
    ...defaultColumns(h),
    commonAccessorColumnDef(h, 'weight', 'Weight'),
    commonAccessorColumnDef(h, (row) => effectsText(row.effects), 'Effects'),
    commonAccessorColumnDef(h, (row) => row.conflicts.join(', '), 'Conflicts'),
  ];
})();

const ashesColumns = (() => {
  const h = createColumnHelper<Row<'ashes'>>();
  return [
    ...defaultColumns(h),
    commonAccessorColumnDef(h, (row) => row.armamentCategories.join(', '), 'Armament Categories'),
    commonAccessorColumnDef(h, 'defaultAffinity', 'Default Affinity'),
  ];
})();

const spellColumns = (() => {
  const h = createColumnHelper<Row<'spells'>>();
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
  const h = createColumnHelper<Row<'spirits'>>();
  return [
    ...defaultColumns(h),
    commonAccessorColumnDef(h, 'hpCost', 'HP Cost'),
    commonAccessorColumnDef(h, 'fpCost', 'FP Cost'),
    commonAccessorColumnDef(h, 'upgradeMaterial', 'Upgrade Material'),
    commonAccessorColumnDef(h, 'summonName', 'Summon Name', { filterFn: 'includesString' }),
  ];
})();

const goodsColumns = (() => {
  const h = createColumnHelper<BaseRow & { maxHeld: number }>();
  return [...defaultColumns(h), commonAccessorColumnDef(h, 'maxHeld', 'Max Held')];
})();

// Tools / Key Items each union several dataset categories — add a Category column so the
// sub-types (Cookbook, Crystal Tear, Remembrance, Great Rune, …) stay distinguishable.
const mixedGoodsColumns = (() => {
  const h = createColumnHelper<BaseRow & { category: string; maxHeld: number }>();
  return [
    ...defaultColumns(h),
    commonAccessorColumnDef(h, 'category', 'Category'),
    commonAccessorColumnDef(h, 'maxHeld', 'Max Held'),
  ];
})();

const tables: Record<InventoryTableType, { columns: Array<ColumnDef<any>>; label: string }> = {
  armaments: { label: 'Weapons & Shields', columns: armamentColumns },
  ammo: { label: 'Ammunition', columns: ammoColumns },
  armor: { label: 'Armor', columns: armorColumns },
  talismans: { label: 'Talismans', columns: talismanColumns },
  ashes: { label: 'Ashes of War', columns: ashesColumns },
  spells: { label: 'Spells', columns: spellColumns },
  spirits: { label: 'Spirit Ashes', columns: spiritColumns },
  tools: { label: 'Tools', columns: mixedGoodsColumns },
  craftingMaterials: { label: 'Crafting Materials', columns: goodsColumns },
  upgradeMaterials: { label: 'Bolstering Materials', columns: goodsColumns },
  keyItems: { label: 'Key Items', columns: mixedGoodsColumns },
  infoItems: { label: 'Info Items', columns: goodsColumns },
  gestures: { label: 'Gestures', columns: goodsColumns },
};

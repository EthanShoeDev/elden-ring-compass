import { itemIconUrl } from '@elden-ring-compass/data/images';
import { ColumnDef, ColumnHelper, createColumnHelper } from '@tanstack/react-table';
import { Schema } from 'effect';
import { Atom } from 'effect/unstable/reactivity';
import { useAtom } from '@effect/atom-react';

import {
  commonAccessorColumnDef,
  commonSelectColumnDef,
} from '@/components/data-table/common-column-defs';
import { DataTable } from '@/components/data-table/data-table';
import { TooltipImg } from '@/components/misc/tooltip-img';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { browserKvsRuntime } from '@/lib/atoms/kvs';
import { useDataTableData } from '@/lib/data-table-data';
import { CATALOG, useInventoryTables, type WithOwnership } from '@/lib/inventory-catalog';

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

export function InventoryDataTableCard() {
  const [tableName, setTableName] = useAtom(inventoryTableSelectionAtom);
  const table = (tableName in tables ? tableName : 'armaments') as InventoryTableType;
  const setTableType = (next: InventoryTableType) => setTableName(next);
  const allTables = useInventoryTables();

  const items = useDataTableData(table);
  const ownedCount = allTables[table].ownedCount;

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle>
          <Combobox
            placeholder='Filter by category'
            valueState={[
              table,
              (val) => {
                if (!val) return;
                setTableType(val as InventoryTableType);
              },
            ]}
            emptyLabel=''
            items={Object.entries(tables).map(([tableId, info]) => {
              const key = tableId as InventoryTableType;
              const ownedCount = allTables[key].ownedCount;
              const count = allTables[key].items.length;
              return {
                label: info.label,
                value: key,
                dropDownItem: (
                  <>
                    <span>{info.label}</span>
                    <span className='ml-auto font-mono text-muted-foreground'>
                      {ownedCount}/{count} (
                      {((ownedCount / count) * 100).toFixed(0).padStart(2, ' ')}
                      %)
                    </span>
                  </>
                ),
              };
            })}
            triggerButtonClassName='text-2xl font-semibold h-auto'
          />
        </CardTitle>
        <CardDescription>
          {ownedCount} / {items.length}
          <br />
          {((ownedCount / items.length) * 100).toFixed(0)}% owned
        </CardDescription>
      </CardHeader>
      <CardContent>
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
    commonSelectColumnDef(columnHelper),
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
    commonAccessorColumnDef(columnHelper, (row) => !!row.map_data, 'Has Coordinates'),
    // oxlint-disable-next-line unknown-cast/forbidden -- columns built against BaseRow are structurally valid for the caller's narrower T
  ] as unknown as Array<ColumnDef<T>>;
}

const armamentColumns = (() => {
  const h = createColumnHelper<Row<'armaments'>>();
  return [
    ...defaultColumns(h),
    commonAccessorColumnDef(h, 'category', 'Category'),
    commonAccessorColumnDef(h, 'allowAshOfWar', 'Allow AOW'),
    commonAccessorColumnDef(h, 'isBuffable', 'Buffable'),
    commonAccessorColumnDef(h, 'weaponUpgradeLevel', 'Upgrade Level'),
    commonAccessorColumnDef(h, 'weight', 'Weight'),
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
  const h = createColumnHelper<Row<'sorceries'>>();
  return [
    ...defaultColumns(h),
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

const tables: Record<InventoryTableType, { columns: Array<ColumnDef<any>>; label: string }> = {
  armaments: { label: 'Armaments', columns: armamentColumns },
  ammo: { label: 'Ammo', columns: ammoColumns },
  armor: { label: 'Armor', columns: armorColumns },
  talismans: { label: 'Talismans', columns: talismanColumns },
  ashes: { label: 'Ashes of War', columns: ashesColumns },
  sorceries: { label: 'Sorceries', columns: spellColumns },
  incantations: { label: 'Incantations', columns: spellColumns },
  spirits: { label: 'Spirit Ashes', columns: spiritColumns },
  consumables: { label: 'Consumables', columns: goodsColumns },
  craftingMaterials: { label: 'Crafting Materials', columns: goodsColumns },
  upgradeMaterials: { label: 'Upgrade Materials', columns: goodsColumns },
  keyItems: { label: 'Key Items', columns: goodsColumns },
  infoItems: { label: 'Info Items', columns: goodsColumns },
  crystalTears: { label: 'Crystal Tears', columns: goodsColumns },
  remembrances: { label: 'Remembrances', columns: goodsColumns },
  greatRunes: { label: 'Great Runes', columns: goodsColumns },
  craftingTools: { label: 'Crafting Tools', columns: goodsColumns },
  gestures: { label: 'Gestures', columns: goodsColumns },
  physick: { label: 'Physick', columns: goodsColumns },
};

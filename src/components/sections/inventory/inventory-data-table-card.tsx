import {
  commonSelectColumnDef,
  commonAccessorColumnDef,
} from '@/components/data-table/common-column-defs';
import { DataTable } from '@/components/data-table/data-table';
import { TooltipImg } from '@/components/tooltip-img';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Armament, ERDB, useErdb } from '@/lib/erdb';
import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useTableSelection = create<{
  table: TableType;
  setTableType: (table: TableType) => void;
}>()(
  persist(
    (set) => ({
      table: 'armaments',
      setTableType: (table) => {
        set({ table });
      },
    }),
    {
      name: 'inventory-table-selection',
    }
  )
);

export function InventoryDataTableCard() {
  const { table, setTableType } = useTableSelection();
  const { items, ownedCount } = useErdb(Object.values(ERDB[table]));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          <Combobox
            placeholder="Filter by category"
            valueState={[
              table,
              (val) => {
                if (!val) return;
                setTableType(val as TableType);
              },
            ]}
            emptyLabel=""
            items={Object.entries(tables).map(([table, info]) => ({
              label: info.label,
              value: table,
            }))}
            triggerButtonClassName="text-2xl font-semibold leading-none tracking-tight h-auto"
          />
        </CardTitle>
        <CardDescription>
          {ownedCount} / {items.length} - (
          {((ownedCount / items.length) * 100).toFixed(0)}% owned)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          tableId={table}
          columns={tables[table].columns}
          data={items}
          initialColumnVisibility={{
            Description: false,
          }}
        />
      </CardContent>
    </Card>
  );
}

type ArmamentItem = Armament & { quantity: number | undefined };
const armColumnHelper = createColumnHelper<ArmamentItem>();
const armColumns: Array<ColumnDef<ArmamentItem>> = [
  commonSelectColumnDef(armColumnHelper),
  armColumnHelper.display({
    id: 'icon',
    header: 'Icon',
    cell: (cell) => {
      const imgUrl = new URL(
        `../../../assets/erdb/icons/armaments/${cell.row.original.icon.toString()}.png`,
        import.meta.url
      ).href;
      return (
        <div>
          <TooltipImg imgSrc={imgUrl} alt={cell.row.original.name} />
        </div>
      );
    },
  }),

  commonAccessorColumnDef(armColumnHelper, 'name', 'Name'),
  commonAccessorColumnDef(armColumnHelper, 'quantity', 'Quantity'),
  commonAccessorColumnDef(armColumnHelper, 'category', 'Category'),
  commonAccessorColumnDef(
    armColumnHelper,
    (row) => row.description.join('\n'),
    'Description',
    {
      filterFn: 'includesString',
    }
  ),
  commonAccessorColumnDef(armColumnHelper, 'allow_ash_of_war', 'Allow AOW'),
  commonAccessorColumnDef(armColumnHelper, 'is_buffable', 'Buffable'),
  commonAccessorColumnDef(armColumnHelper, 'rarity', 'Rarity'),
  commonAccessorColumnDef(armColumnHelper, 'weight', 'Weight'),
  commonAccessorColumnDef(
    armColumnHelper,
    'upgrade_material',
    'Upgrade Material'
  ),
  commonAccessorColumnDef(
    armColumnHelper,
    (row) =>
      row.effects
        .map(
          (e) =>
            `${e.attribute} ${e.type == 'positive' ? (e.model == 'additive' ? '+' : '* ') : e.model == 'additive' ? '-' : '* -'}${e.value.toString()}${e.conditions ? ` ${e.conditions.join(',')}` : ''}`
        )
        .join('\n'),
    'Effects'
  ),
];

const tables = {
  // 'ammo',
  armaments: {
    label: 'Armaments',
    columns: armColumns,
  },
  // 'armor',
  // 'ashes-of-war',
  // 'bolstering-materials',
  // 'correction-attack',
  // 'correction-graph',
  // 'crafting-materials',
  // 'gestures',
  // 'info',
  // 'keys',
  // 'reinforcements',
  // 'shop',
  // 'spells',
  // 'spirit-ashes',
  // 'talismans',
  // 'tools',
} as const;

type TableType = keyof typeof tables;

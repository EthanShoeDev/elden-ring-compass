import armaments from '@/assets/erdb/json/armaments.json';
import { DataTable } from '../data-table/data-table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { commonSelectColumnDef } from '../data-table/common-column-defs';
import { inventoryDbView } from '@/lib/vm/inventory';
import { useSelectedSlot } from '@/stores/slot-selection-store';
import { DataTableColumnHeader } from '../data-table/data-table-column-header';

export function ArmamentsSection() {
  const slot = useSelectedSlot();

  const inventoryQuantityById = new Map(
    slot
      ? inventoryDbView(slot).items.map((item) => [item.item_id, item.quantity])
      : []
  );

  const items = Object.values(armaments).map((value) => ({
    quantity: inventoryQuantityById.get(value.id) ?? undefined,
    ...value,
  }));

  const ownedCount = items.filter(
    (item) => item.quantity != undefined && item.quantity > 0
  ).length;
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Armaments</CardTitle>
        <CardDescription>
          {ownedCount} / {items.length} - (
          {((ownedCount / items.length) * 100).toFixed(0)}% owned)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={items} />
      </CardContent>
    </Card>
  );
}

const items = Object.values(armaments).map((value) => ({
  quantity: undefined,
  ...value,
}));

type Item = (typeof items)[0];
const columnHelper = createColumnHelper<Item>();
const columns: ColumnDef<Item>[] = [
  commonSelectColumnDef(columnHelper),
  columnHelper.accessor('id', {
    id: 'ID',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: (cell) => <div className="w-[80px]">{cell.renderValue()}</div>,
  }) as ColumnDef<Item>,
  columnHelper.accessor('name', {
    id: 'Name', // signal to use search on this column
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: (cell) => <div className="w-[200px]">{cell.renderValue()}</div>,
  }) as ColumnDef<Item>,
  columnHelper.accessor('quantity', {
    id: 'Quantity',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Quantity" />
    ),
    cell: (cell) => <div className="w-[80px]">{cell.renderValue()}</div>,
    filterFn: 'arrIncludesSome',
  }) as ColumnDef<Item>,
  columnHelper.accessor('category', {
    id: 'Category',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category" />
    ),
    cell: (cell) => <div className="w-[100px]">{cell.renderValue()}</div>,
    filterFn: 'arrIncludesSome',
  }) as ColumnDef<Item>,
];

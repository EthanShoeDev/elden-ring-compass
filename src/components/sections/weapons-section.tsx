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

export function WeaponsSection() {
  const slot = useSelectedSlot();

  const inventoryQuantityById = new Map(
    slot
      ? inventoryDbView(slot).items.map((item) => [item.item_id, item.quantity])
      : []
  );

  const items = Object.entries(armaments).map(([key, value]) => ({
    name: key,
    quantity: inventoryQuantityById.get(value.id) ?? undefined,
    ...value,
  }));
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Weapons</CardTitle>
        <CardDescription></CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={items} />
      </CardContent>
    </Card>
  );
}

const items = Object.entries(armaments).map(([key, value]) => ({
  name: key,
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
  columnHelper.accessor('item_name', {
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

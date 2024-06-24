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
import { Armament, ERDB } from '@/lib/erdb';
import { DataTableColumnHeader } from '../data-table/data-table-column-header';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

export function ArmamentsSection() {
  const slot = useSelectedSlot();

  const inventoryQuantityById = new Map(
    slot
      ? inventoryDbView(slot).items.map((item) => [item.item_id, item.quantity])
      : []
  );

  const items = Object.values(ERDB.armaments).map((value) => ({
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

type Item = Armament & { quantity: number | undefined };
const columnHelper = createColumnHelper<Item>();
const columns: Array<ColumnDef<Item>> = [
  commonSelectColumnDef(columnHelper),
  // commonAccessorColumnDef(columnHelper, 'name', 'Name', {
  //   cell: (cell) => (
  //     <div>
  //       <img />
  //       {cell.renderValue() as ReactNode}
  //     </div>
  //   ),
  // }),
  columnHelper.accessor('name', {
    id: 'Name',
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    cell: (cell) => {
      const imgUrl = new URL(
        `../../assets/erdb/icons/armaments/${cell.row.original.icon.toString()}.png`,
        import.meta.url
      ).href;
      const name = cell.renderValue();
      return (
        <div className="flex gap-4">
          <Tooltip>
            <TooltipTrigger>
              <img className="size-10" src={imgUrl} alt={name ?? 'unknown'} />
            </TooltipTrigger>
            <TooltipContent>
              <img className="size-64" src={imgUrl} alt={name ?? 'unknown'} />
            </TooltipContent>
          </Tooltip>
          {name}
        </div>
      );
    },
  }) as ColumnDef<Item>,
  columnHelper.accessor('quantity', {
    id: 'Quantity',
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    cell: (cell) => <div>{cell.renderValue()}</div>,
    filterFn: 'arrIncludesSome',
  }) as ColumnDef<Item>,
  columnHelper.accessor('category', {
    id: 'Category',
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    cell: (cell) => <div>{cell.renderValue()}</div>,
    filterFn: 'arrIncludesSome',
  }) as ColumnDef<Item>,
  columnHelper.accessor('description', {
    id: 'Description',
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    cell: (cell) => <div>{cell.renderValue()}</div>,
  }) as ColumnDef<Item>,
  columnHelper.accessor('is_tradable', {
    id: 'Is Tradable',
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    cell: (cell) => <div>{cell.renderValue()?.toString()}</div>,
    filterFn: 'arrIncludesSome',
  }) as ColumnDef<Item>,
  columnHelper.accessor('allow_ash_of_war', {
    id: 'Allow Ash of War',
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    cell: (cell) => <div>{cell.renderValue()?.toString()}</div>,
    filterFn: 'arrIncludesSome',
  }) as ColumnDef<Item>,
];

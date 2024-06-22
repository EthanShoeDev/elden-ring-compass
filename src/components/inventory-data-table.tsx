import { ColumnDef, createColumnHelper } from '@tanstack/react-table';

import { DataTableColumnHeader } from './data-table/data-table-column-header';
import { DataTable } from './data-table/data-table';
import { useSelectedSlot } from '@/stores/slot-selection-store';
import { inventoryDbView } from '@/lib/vm/inventory';
import { useMemo } from 'react';
import { commonSelectColumnDef } from './data-table/common-column-defs';

type InventoryItem = ReturnType<typeof inventoryDbView>['items'][0];

export function InventoryDataTable() {
  const slot = useSelectedSlot();
  const items = useMemo(
    () => (slot ? inventoryDbView(slot).items : []),
    [slot]
  );

  if (!slot) return <p>Select a slot</p>;

  return (
    <DataTable
      className="not-prose w-full max-w-none"
      columns={columns}
      data={items}
    />
  );
}

const columnHelper = createColumnHelper<InventoryItem>();
const columns: ColumnDef<InventoryItem>[] = [
  commonSelectColumnDef(columnHelper),
  columnHelper.accessor('item_id', {
    id: 'ID',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: (cell) => <div className="w-[80px]">{cell.renderValue()}</div>,
  }) as ColumnDef<InventoryItem>,
  columnHelper.accessor('item_name', {
    id: 'Name', // signal to use search on this column
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: (cell) => <div className="w-[200px]">{cell.renderValue()}</div>,
  }) as ColumnDef<InventoryItem>,
  columnHelper.accessor('quantity', {
    id: 'Quantity',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Quantity" />
    ),
    cell: (cell) => <div className="w-[80px]">{cell.renderValue()}</div>,
    filterFn: 'arrIncludesSome',
  }) as ColumnDef<InventoryItem>,
  columnHelper.accessor('type', {
    id: 'Type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: (cell) => <div className="w-[100px]">{cell.renderValue()}</div>,
    filterFn: 'arrIncludesSome',
  }) as ColumnDef<InventoryItem>,
];

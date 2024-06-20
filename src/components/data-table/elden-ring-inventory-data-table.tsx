import { ColumnDef } from '@tanstack/react-table';

import { Checkbox } from '@/components/ui/checkbox';

import { item_types, statuses } from './data/data';
import { InventoryItem } from './data/schema';
import { DataTableColumnHeader } from './data-table-column-header';
import { DataTableRowActions } from './data-table-row-actions';
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon } from 'lucide-react';
import { useEldenRingSaveQuery } from '@/lib/er-save-file-query';
import { DataTable } from './data-table';
import { useSlotSelection } from '@/stores/slot-selection-store';
import { inventoryDbView } from '@/lib/vm/inventory';
import { playerNameBytesToString } from '@/lib/er-raw-db';

const priorities = [
  {
    label: 'Low',
    value: 'low',
    icon: ArrowDownIcon,
  },
  {
    label: 'Medium',
    value: 'medium',
    icon: ArrowRightIcon,
  },
  {
    label: 'High',
    value: 'high',
    icon: ArrowUpIcon,
  },
];

export function InventoryDataTable() {
  const { query } = useEldenRingSaveQuery();
  const [slotSelectionName] = useSlotSelection();
  if (query.isLoading) return <div>Loading...</div>;
  if (query.isError) return <div>Error: {query.error.message}</div>;
  const slot = query.data?.slots.find(
    (slot) =>
      slotSelectionName ==
      playerNameBytesToString(slot.player_game_data.character_name)
  );
  if (!slot) return <div>No slot selected</div>;

  const items: InventoryItem[] = inventoryDbView(slot)
    .items.filter((i) => i.item_id != 0)
    .map((item) => ({
      id: item.item_id.toString(),
      name: item.item_name,
      quantity: item.quantity,
      type: item.type,
      status: 'todo',
      priority: 'medium',
      tags: [item.type as string],
    }));

  return (
    <DataTable
      className="not-prose w-full max-w-none"
      columns={columns}
      data={items}
    />
  );
}

const columns: ColumnDef<InventoryItem>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => {
          table.toggleAllPageRowsSelected(!!value);
        }}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => {
          row.toggleSelected(!!value);
        }}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Item Id" />
    ),
    cell: ({ row }) => <div className="w-[80px]">{row.getValue('id')}</div>,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => {
      // const label = labels.find((label) => label.value === row.original.name);

      return (
        <div className="flex space-x-2">
          {/* {label && <Badge variant="outline">{label.label}</Badge>} */}
          <span className="max-w-[500px] truncate font-medium">
            {row.getValue('name')}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'quantity',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Quantity" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate font-medium">
            {row.getValue('quantity')}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      const itemType = item_types.find(
        (status) => status.value === row.getValue('type')
      );

      if (!itemType) {
        return null;
      }

      return (
        <div className="flex w-[100px] items-center">
          {<itemType.icon className="mr-2 size-4 text-muted-foreground" />}
          <span>{itemType.label}</span>
        </div>
      );
    },
    filterFn: 'arrIncludesSome',
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = statuses.find(
        (status) => status.value === row.getValue('status')
      );

      if (!status) {
        return null;
      }

      return (
        <div className="flex w-[100px] items-center">
          {<status.icon className="mr-2 size-4 text-muted-foreground" />}
          <span>{status.label}</span>
        </div>
      );
    },
    filterFn: 'arrIncludes',
  },
  {
    accessorKey: 'priority',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Priority" />
    ),
    cell: ({ row }) => {
      const priority = priorities.find(
        (priority) => priority.value === row.getValue('priority')
      );

      if (!priority) {
        return null;
      }

      return (
        <div className="flex items-center">
          {<priority.icon className="mr-2 size-4 text-muted-foreground" />}
          <span>{priority.label}</span>
        </div>
      );
    },
    filterFn: 'arrIncludes',
  },
  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];

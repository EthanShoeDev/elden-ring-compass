import { ColumnDef, createColumnHelper } from '@tanstack/react-table';

import { DataTableColumnHeader } from './data-table/data-table-column-header';
import { DataTable } from './data-table/data-table';
import { useSelectedSlot } from '@/stores/slot-selection-store';
import { useMemo } from 'react';
import { commonSelectColumnDef } from './data-table/common-column-defs';
import { eventsDbView } from '@/lib/vm/events';

type Event = ReturnType<typeof eventsDbView>[0];

export function EventsDataTable() {
  const slot = useSelectedSlot();
  const items = useMemo(() => (slot ? eventsDbView(slot) : []), [slot]);

  if (!slot) return <p>Select a slot</p>;

  return (
    <DataTable
      tableId="old-events"
      className="not-prose w-full max-w-none"
      columns={columns}
      data={items}
    />
  );
}

const columnHelper = createColumnHelper<Event>();
const columns: Array<ColumnDef<Event>> = [
  commonSelectColumnDef(columnHelper),
  columnHelper.accessor('eventId', {
    id: 'ID',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: (cell) => <div className="w-[80px]">{cell.renderValue()}</div>,
  }) as ColumnDef<Event>,
  columnHelper.accessor('name', {
    id: 'Name', // signal to use search on this column
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: (cell) => <div className="w-[200px]">{cell.renderValue()}</div>,
  }) as ColumnDef<Event>,
  columnHelper.accessor('on', {
    id: 'Completed',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Completed" />
    ),
    cell: (cell) => <div className="w-[80px]">{cell.renderValue()}</div>,
    filterFn: 'arrIncludesSome',
  }) as ColumnDef<Event>,
  columnHelper.accessor('type', {
    id: 'Type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: (cell) => <div className="w-[100px]">{cell.renderValue()}</div>,
    filterFn: 'arrIncludesSome',
  }) as ColumnDef<Event>,
];

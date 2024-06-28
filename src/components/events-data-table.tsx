import { ColumnDef, createColumnHelper } from '@tanstack/react-table';

import { eventsDbView } from '@/lib/vm/events';
import { useSelectedSlot } from '@/stores/slot-selection-store';
import { useMemo } from 'react';
import {
  commonAccessorColumnDef,
  commonSelectColumnDef,
} from './data-table/common-column-defs';
import { DataTable } from './data-table/data-table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';

type Event = ReturnType<typeof eventsDbView>[0];

export function EventsDataTable() {
  const slot = useSelectedSlot();
  const items = useMemo(() => eventsDbView(slot), [slot]);
  const ownedCount = items.filter((item) => item.on).length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Events</CardTitle>
        <CardDescription>
          {ownedCount} / {items.length}
          <br />
          {((ownedCount / items.length) * 100).toFixed(0)}% owned
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          tableId="events"
          className=""
          columns={columns}
          data={items}
        />
      </CardContent>
    </Card>
  );
}

const columnHelper = createColumnHelper<Event>();
const columns: Array<ColumnDef<Event>> = [
  commonSelectColumnDef(columnHelper),
  commonAccessorColumnDef(columnHelper, 'eventId', 'ID', { size: 1 }),
  commonAccessorColumnDef(columnHelper, 'name', 'Name'),
  commonAccessorColumnDef(columnHelper, 'on', 'Complete'),
  commonAccessorColumnDef(columnHelper, 'type', 'Type'),
  commonAccessorColumnDef(
    columnHelper,
    (row) => !!row.map_data,
    'Has Coordinates'
  ),
];

import { ColumnDef, createColumnHelper } from '@tanstack/react-table';

import { useDataTableData } from '@/lib/data-table-data';
import { eventsDbView } from '@/lib/vm/events';
import { commonAccessorColumnDef, commonPinColumnDef } from '../data-table/common-column-defs';
import { DataTable } from '../data-table/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

type Event = ReturnType<typeof eventsDbView>[0];

export function EventsDataTable() {
  const items = useDataTableData('events');
  const ownedCount = items.filter((item) => item.on).length;

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle>World Progress</CardTitle>
        <CardDescription>
          Sites of Grace discovered &amp; bosses defeated
          <br />
          {ownedCount} / {items.length}
          <br />
          {((ownedCount / items.length) * 100).toFixed(0)}% complete
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable tableId='events' className='' columns={columns} data={items} />
      </CardContent>
    </Card>
  );
}

const columnHelper = createColumnHelper<Event>();
const columns: Array<ColumnDef<Event>> = [
  commonPinColumnDef(columnHelper),
  commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
  commonAccessorColumnDef(columnHelper, 'name', 'Name', {
    filterFn: 'includesString',
  }),
  commonAccessorColumnDef(columnHelper, 'on', 'Complete'),
  commonAccessorColumnDef(columnHelper, 'type', 'Type'),
  commonAccessorColumnDef(columnHelper, (row) => !!row.pixel, 'Has Coordinates'),
];

import { ColumnDef, createColumnHelper } from '@tanstack/react-table';

import { useDataTableData } from '@/lib/data-table-data';
import { eventsDbView } from '@/lib/vm/events';
import { commonAccessorColumnDef, commonPinColumnDef } from '../data-table/common-column-defs';
import { DataTable } from '../data-table/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

type Grace = ReturnType<typeof eventsDbView>[0];

export function GracesDataTable() {
  // `eventsDbView` carries graces + bosses (it feeds the map pins). Bosses have a
  // dedicated, richer route (/bosses), so this table is graces-only.
  const items = useDataTableData('events').filter((e) => e.type === 'grace');
  const litCount = items.filter((item) => item.on).length;

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle>Sites of Grace</CardTitle>
        <CardDescription>
          Graces discovered across the Lands Between
          <br />
          {litCount} / {items.length}
          <br />
          {((litCount / items.length) * 100).toFixed(0)}% lit
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* tableId stays 'events' so column state + map pin-selection sync are shared. */}
        <DataTable tableId='events' className='' columns={columns} data={items} />
      </CardContent>
    </Card>
  );
}

const columnHelper = createColumnHelper<Grace>();
const columns: Array<ColumnDef<Grace>> = [
  commonPinColumnDef(columnHelper),
  commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
  commonAccessorColumnDef(columnHelper, 'name', 'Name', {
    filterFn: 'includesString',
  }),
  commonAccessorColumnDef(columnHelper, 'subtitle', 'Region', {
    filterFn: 'includesString',
  }),
  commonAccessorColumnDef(columnHelper, 'on', 'Discovered'),
  commonAccessorColumnDef(columnHelper, (row) => !!row.pixel, 'Has Coordinates'),
];

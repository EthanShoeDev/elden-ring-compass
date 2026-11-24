import { Array as Arr } from 'effect';

import { useDataTableData } from '@/lib/data-table-data';
import { inDlcScope } from '@/lib/dlc';
import { useDlcScope } from '@/lib/dlc-scope';
import { realmLabels } from '@/lib/map-affine';
import type { eventsDbView } from '@/lib/vm/events';

import {
  commonAccessorColumnDef,
  renderNameCell,
  commonPinColumnDef,
  contentColumnDef,
  realmColumnDef,
} from '../data-table/common-column-defs';
import { DataTable } from '../data-table/data-table';
import type { DataTableColumnDef } from '../data-table/table-hook';
import { createAppColumnHelper } from '../data-table/table-hook';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';

type Grace = ReturnType<typeof eventsDbView>[0];

export function GracesDataTable() {
  // `eventsDbView` carries graces + bosses (it feeds the map pins). Bosses have a
  // dedicated, richer route (/bosses), so this table is graces-only.
  const items = Arr.filter(
    useDataTableData('events'),
    (e) => e.type === 'grace',
  );
  // Rows cover all content (the Content filter mirrors the scope); the headline
  // counts follow the scope itself.
  const { scope } = useDlcScope();
  const scoped = Arr.filter(items, (g) => inDlcScope(scope, g.isDlc));
  const litCount = Arr.filter(scoped, (item) => item.on).length;

  return (
    <Card className='flex min-h-0 w-full flex-1 flex-col'>
      <CardHeader className='shrink-0'>
        <CardTitle>Sites of Grace</CardTitle>
        <CardDescription>
          Graces discovered across the Lands Between
          <br />
          {litCount} / {scoped.length}
          <br />
          {((litCount / scoped.length) * 100).toFixed(0)}% lit
        </CardDescription>
      </CardHeader>
      <CardContent className='flex min-h-0 flex-1 flex-col'>
        {/* tableId stays 'events' so column state + map pin-selection sync are shared. */}
        <DataTable tableId='events' columns={columns} data={items} fill />
      </CardContent>
    </Card>
  );
}

const columnHelper = createAppColumnHelper<Grace>();
const columns: Array<DataTableColumnDef<Grace>> = [
  commonPinColumnDef(columnHelper),
  commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
  commonAccessorColumnDef(columnHelper, 'name', 'Name', {
    filterFn: 'includesString',
    cell: renderNameCell,
  }),
  commonAccessorColumnDef(columnHelper, 'subtitle', 'Region', {
    filterFn: 'includesString',
  }),
  commonAccessorColumnDef(columnHelper, 'on', 'Discovered'),
  realmColumnDef(columnHelper, (row) =>
    realmLabels([row.pixel?.master ?? null]),
  ),
  contentColumnDef(columnHelper),
  commonAccessorColumnDef(
    columnHelper,
    (row) => !!row.pixel,
    'Has Coordinates',
  ),
];

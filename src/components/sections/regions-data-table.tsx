import { ColumnDef, createColumnHelper } from '@tanstack/react-table';

import { useDataTableData } from '@/lib/data-table-data';
import { regionsDbView } from '@/lib/vm/regions';
import {
  commonAccessorColumnDef,
  commonSelectColumnDef,
} from '../data-table/common-column-defs';
import { DataTable } from '../data-table/data-table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';

type Region = ReturnType<typeof regionsDbView>[0];

export function RegionsDataTable() {
  const items = useDataTableData('regions');

  const ownedCount = items.filter((item) => item.found).length;
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Regions</CardTitle>
        <CardDescription>
          {ownedCount} / {items.length}
          <br />
          {((ownedCount / items.length) * 100).toFixed(0)}% owned
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          tableId="regions"
          className=""
          columns={columns}
          data={items}
        />
      </CardContent>
    </Card>
  );
}

const columnHelper = createColumnHelper<Region>();
const columns: Array<ColumnDef<Region>> = [
  commonSelectColumnDef(columnHelper),
  commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
  commonAccessorColumnDef(columnHelper, 'name', 'Name'),
  commonAccessorColumnDef(columnHelper, 'found', 'Found'),
  commonAccessorColumnDef(columnHelper, 'map', 'Map'),
  commonAccessorColumnDef(columnHelper, 'isBoss', 'Is Boss'),
  commonAccessorColumnDef(columnHelper, 'isDungeon', 'Is Dungeon'),
  commonAccessorColumnDef(columnHelper, 'isOpenWorld', 'Is Open World'),
  commonAccessorColumnDef(
    columnHelper,
    (row) => !!row.map_data,
    'Has Coordinates'
  ),
];

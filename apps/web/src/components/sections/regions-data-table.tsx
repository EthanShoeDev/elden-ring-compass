import { useDataTableData } from '@/lib/data-table-data';
import { regionsDbView } from '@/lib/vm/regions';
import { commonAccessorColumnDef } from '../data-table/common-column-defs';
import { DataTable } from '../data-table/data-table';
import { createAppColumnHelper, DataTableColumnDef } from '../data-table/table-hook';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

type Region = ReturnType<typeof regionsDbView>[0];

export function RegionsDataTable() {
  const items = useDataTableData('regions');

  const ownedCount = items.filter((item) => item.found).length;
  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle>Regions</CardTitle>
        <CardDescription>
          {ownedCount} / {items.length}
          <br />
          {((ownedCount / items.length) * 100).toFixed(0)}% owned
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable tableId='regions' className='' columns={columns} data={items} />
      </CardContent>
    </Card>
  );
}

// Regions are areas, not points — they carry no extracted marker position, so the
// table has no select/pin column (region pins were a scraped-map-db artifact, removed).
const columnHelper = createAppColumnHelper<Region>();
const columns: Array<DataTableColumnDef<Region>> = [
  commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
  commonAccessorColumnDef(columnHelper, 'name', 'Name'),
  commonAccessorColumnDef(columnHelper, 'found', 'Found'),
  commonAccessorColumnDef(columnHelper, 'map', 'Map'),
  commonAccessorColumnDef(columnHelper, 'isDungeon', 'Is Dungeon'),
  commonAccessorColumnDef(columnHelper, 'isOpenWorld', 'Is Open World'),
];

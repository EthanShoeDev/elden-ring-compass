import { ColumnDef, createColumnHelper } from '@tanstack/react-table';

import { DataTable } from './data-table/data-table';
import { useSelectedSlot } from '@/stores/slot-selection-store';
import { useMemo } from 'react';
import {
  commonAccessorColumnDef,
  commonSelectColumnDef,
} from './data-table/common-column-defs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { regionsDbView } from '@/lib/vm/regions';

type Region = ReturnType<typeof regionsDbView>[0];

export function RegionsDataTable() {
  const slot = useSelectedSlot();
  const items = useMemo(() => regionsDbView(slot), [slot]);

  const ownedCount = items.filter((item) => item.found).length;
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Regions</CardTitle>
        <CardDescription>
          {ownedCount} / {items.length} - (
          {((ownedCount / items.length) * 100).toFixed(0)}% owned)
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

const columnHelper = createColumnHelper<Region>();
const columns: Array<ColumnDef<Region>> = [
  commonSelectColumnDef(columnHelper),
  commonAccessorColumnDef(columnHelper, 'eventId', 'ID', { size: 1 }),
  commonAccessorColumnDef(columnHelper, 'name', 'Name'),
  commonAccessorColumnDef(columnHelper, 'found', 'Found'),
  commonAccessorColumnDef(columnHelper, 'map', 'Map'),
  commonAccessorColumnDef(columnHelper, 'isBoss', 'Is Boss'),
  commonAccessorColumnDef(columnHelper, 'isDungeon', 'Is Dungeon'),
  commonAccessorColumnDef(columnHelper, 'isOpenWorld', 'Is Open World'),
];

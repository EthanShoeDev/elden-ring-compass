import { createFileRoute } from '@tanstack/react-router';

import { EventsDataTable } from '@/components/sections/events-data-table';
import { InventoryDataTableCard } from '@/components/sections/inventory-data-table-card';
import { RegionsDataTable } from '@/components/sections/regions-data-table';
import { WeaponsDataTable } from '@/components/sections/weapons-data-table';

export const Route = createFileRoute('/_app/inventory')({
  component: InventoryPage,
});

function InventoryPage() {
  return (
    <>
      <InventoryDataTableCard />
      <EventsDataTable />
      <RegionsDataTable />
      <WeaponsDataTable />
    </>
  );
}

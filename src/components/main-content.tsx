// import { ObjectivesCard } from './objectives-card';

import { InventoryDataTable } from './data-table/elden-ring-inventory-data-table';
import { SlotOverview } from './slot-overview';

export function MainContent() {
  return (
    <main className="flex flex-1 flex-col items-center gap-4 bg-background p-2 md:p-4">
      <h1 className="w-full text-2xl">Overview</h1>
      <SlotOverview />
      <h1 className="w-full text-2xl">Inventory</h1>
      <InventoryDataTable />
      {/* <Card className="max-h-[450px] overflow-hidden">
          <InteractiveMap />
        </Card> */}
      {/* <ObjectivesCard /> */}
    </main>
  );
}

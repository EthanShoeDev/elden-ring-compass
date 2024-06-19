// import { ObjectivesCard } from './objectives-card';

import { InventoryDataTable } from './data-table/elden-ring-inventory-data-table';

export function MainContent() {
  return (
    <main className="flex flex-1 flex-col items-center bg-background p-2 md:p-4">
      <InventoryDataTable />
      {/* <Card className="max-h-[450px] overflow-hidden">
          <InteractiveMap />
        </Card> */}
      {/* <ObjectivesCard /> */}
    </main>
  );
}

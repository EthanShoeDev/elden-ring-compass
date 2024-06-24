// import { ObjectivesCard } from './objectives-card';

import { EventsDataTable } from './events-data-table';
import { InventoryDataTable } from './inventory-data-table';
import { StoryBossSection } from './sections/story-boss-section';
import { ArmamentsSection } from './sections/armaments-section';
import { SlotOverview } from './slot-overview';
import { BolsteringSection } from './sections/bolstering-section';

export function MainContent() {
  return (
    <main className="flex flex-1 flex-col gap-4 bg-background p-2 md:p-4">
      <StoryBossSection />
      <BolsteringSection />
      <ArmamentsSection />
      <h1 className="w-full text-2xl">Overview</h1>
      <SlotOverview />
      <h1 className="w-full text-2xl">Inventory</h1>
      <InventoryDataTable />
      <h1 className="w-full text-2xl">Events</h1>
      <EventsDataTable />
      {/* <Card className="max-h-[450px] overflow-hidden">
          <InteractiveMap />
        </Card> */}
      {/* <ObjectivesCard /> */}
    </main>
  );
}

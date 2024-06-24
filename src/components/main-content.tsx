// import { ObjectivesCard } from './objectives-card';

import { EventsDataTable } from './events-data-table';
import { InventoryDataTable } from './inventory-data-table';
import { StoryBossSection } from './sections/story-boss-section';
import { ArmamentsSection } from './sections/armaments-section';
import { BolsteringSection } from './sections/bolstering-section';

export function MainContent() {
  return (
    <main className="flex flex-1 flex-col gap-4 bg-background p-2 md:p-4">
      <StoryBossSection />
      <BolsteringSection />
      <ArmamentsSection />
      <h1 className="w-full text-2xl">Overview</h1>

      <h1 className="w-full text-2xl">Inventory</h1>
      <InventoryDataTable />
      <h1 className="w-full text-2xl">Events</h1>
      <EventsDataTable />
    </main>
  );
}

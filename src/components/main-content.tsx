// import { ObjectivesCard } from './objectives-card';

import { EventsDataTable } from './events-data-table';
import { OldInventoryDataTable } from './old/old-inventory-data-table';
import { StoryBossSection } from './sections/story-boss-section';
import { BolsteringSection } from './sections/bolstering-section';
import { QuestSection } from './sections/quests-section';
import { InventoryDataTableCard } from './sections/inventory-data-table-card';

export function MainContent() {
  return (
    <main className="flex flex-1 flex-col gap-4 bg-background p-2 md:p-4">
      <QuestSection />
      <BolsteringSection />
      <StoryBossSection />
      <InventoryDataTableCard />
      <OldInventoryDataTable />
      <EventsDataTable />
    </main>
  );
}

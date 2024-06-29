// import { ObjectivesCard } from './objectives-card';

import { EventsDataTable } from './events-data-table';
import { InteractiveMap } from './interactive-map';
import { RegionsDataTable } from './regions-data-table';
import { InventoryDataTableCard } from './sections/inventory-data-table-card';
import { OverviewSection } from './sections/overview-section';
import { QuestSection } from './sections/quests-section';
import { StoryBossSection } from './sections/story-boss-section';

export function MainContent() {
  return (
    <main className="flex flex-1 flex-col gap-4 bg-background p-2 md:p-4">
      <InteractiveMap />
      <StoryBossSection />
      <QuestSection />
      <OverviewSection />
      <InventoryDataTableCard />
      <EventsDataTable />
      <RegionsDataTable />
    </main>
  );
}

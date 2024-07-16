import { EventsDataTable } from './sections/events-data-table';
import { InteractiveMap } from './sections/interactive-map';
import { RegionsDataTable } from './sections/regions-data-table';
import { InventoryDataTableCard } from './sections/inventory-data-table-card';
import { OverviewSection } from './sections/overview-section';
import { QuestSection } from './sections/quests-section';
import { StoryBossSection } from './sections/story-boss-section';
// import { BolsteringCharts } from './sections/bolstering-charts';

export function MainContent() {
  return (
    <main className="flex flex-1 flex-col gap-4 bg-background p-2 md:p-4">
      <InteractiveMap />
      {/* <BolsteringCharts /> */}
      <StoryBossSection />
      <QuestSection />
      <OverviewSection />
      <InventoryDataTableCard />
      <EventsDataTable />
      <RegionsDataTable />
    </main>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { InteractiveMap } from "@/components/sections/interactive-map";
import { StoryBossSection } from "@/components/sections/story-boss-section";
import { QuestSection } from "@/components/sections/quests-section";
import { OverviewSection } from "@/components/sections/overview-section";
import { InventoryDataTableCard } from "@/components/sections/inventory-data-table-card";
import { EventsDataTable } from "@/components/sections/events-data-table";
import { RegionsDataTable } from "@/components/sections/regions-data-table";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="flex flex-1 flex-col gap-4 bg-background p-2 md:p-4">
      <InteractiveMap />
      <StoryBossSection />
      <QuestSection />
      <OverviewSection />
      <InventoryDataTableCard />
      <EventsDataTable />
      <RegionsDataTable />
    </div>
  );
}

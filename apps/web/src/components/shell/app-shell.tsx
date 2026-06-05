import { useState } from 'react';

import { Footer } from '@/components/footer';
import { SharedViewBanner } from '@/components/misc/shared-view-banner';
import { EventsDataTable } from '@/components/sections/events-data-table';
import { InventoryDataTableCard } from '@/components/sections/inventory-data-table-card';
import { MapSection } from '@/components/sections/map-section';
import { OverviewSection } from '@/components/sections/overview-section';
import { RegionsDataTable } from '@/components/sections/regions-data-table';
import { StoryBossSection } from '@/components/sections/story-boss-section';
import { WeaponsDataTable } from '@/components/sections/weapons-data-table';

import { AppSidebar } from './app-sidebar';
import { AppTopBar } from './app-top-bar';
import { BuildView } from './build-view';
import { QuestsView } from './quests-view';
import { type ViewId } from './nav';

function SectionBody({ view }: { view: ViewId }) {
  switch (view) {
    case 'map':
      return <MapSection embedded />;
    case 'bosses':
      return <StoryBossSection />;
    case 'inventory':
      return (
        <>
          <InventoryDataTableCard />
          <EventsDataTable />
          <RegionsDataTable />
          <WeaponsDataTable />
        </>
      );
    case 'build':
      return <BuildView />;
    case 'quests':
      return <QuestsView />;
    case 'overview':
      return <OverviewSection />;
  }
}

/**
 * The redesigned app surface: a sidebar-nav dashboard that lands on the
 * interactive map and is fully explorable without a save. Replaces the old
 * single-scroll stack of cards. Connecting a save personalizes each section.
 *
 * Build & Quests are scaffolded previews (docs/projects/future/*); DLC is a
 * cosmetic toggle until DLC data is wired up.
 */
export function AppShell() {
  const [view, setView] = useState<ViewId>('map');
  const [dlc, setDlc] = useState(false);

  return (
    <div className='flex min-h-screen'>
      <AppSidebar view={view} onSelect={setView} />
      <div className='flex min-w-0 flex-1 flex-col'>
        <AppTopBar view={view} onSelect={setView} dlc={dlc} onToggleDlc={setDlc} />
        <SharedViewBanner />
        <div key={view} className='flex flex-1 flex-col gap-5 p-4 md:p-7'>
          <SectionBody view={view} />
        </div>
        <Footer />
      </div>
    </div>
  );
}
